import BetterQueue from 'better-queue';
import config from 'config';
import { createWriteStream, promises as fs, WriteStream } from 'fs';
import { sleep } from 'mat-utils';
import { createClient, RedisClientType } from 'redis';
import App from './app';
import { LIMIT_TWEETS, LIMIT_USERS, RATE_LIMIT_TWEETS, RATE_LIMIT_USERS } from './constants';
import CSV from './csv';
import Logger from './logger';
import TokenPool from './token-pool';
import { EData } from './typings/enums';
import { wait } from './utils';
import BaseWorker from './workers/base';
import FollowersWorker from './workers/followers';
import FollowingsWorker from './workers/followings';
import TweetsWorker from './workers/tweets';

interface ITokenRow {
	app: string;
	token: string;
}

export interface IUserData {
	id: string;
	username: string;
	pagination: Partial<Record<EData, string>>;
	count: Record<string, number>;
	done: Partial<Record<EData, number>>;
}

interface IBaseWorkerData {
	username: string;
}

const TMP_DIR = './tmp';

export default class Downloader {

	private static _tokenPool: TokenPool;

	private static _profiles: string[];

	private static _redis: RedisClientType;

	private static _userData: Record<string, IUserData> = {};

	private static _writeStreams: Record<EData, WriteStream>;

	private static _queues: Record<EData, BetterQueue> = {
		[EData.TWEETS]: new BetterQueue(this._exec, {
			concurrent: this.getWorkerConcurrency(),
			maxRetries: 5,
			retryDelay: 1000,
		}),
		[EData.FOLLOWERS]: new BetterQueue(this._exec, {
			concurrent: 1,
			maxRetries: 10,
			retryDelay: 5000,
		}),
		[EData.FOLLOWINGS]: new BetterQueue(this._exec, {
			concurrent: 1,
			maxRetries: 10,
			retryDelay: 5000,
		}),
	};

	public static async init(): Promise<void> {
		await Promise.all([
			this._connectRedis(),
			this._validateTokens(),
			this._validateProfiles(),
			this._validateOutputDir(),
			this._createTmpDir(),
			this._clear(),
		]);
		this._writeStreams = {
			[EData.TWEETS]: createWriteStream(
				this.getOutDirPath('tweets.csv'),
				{ flags: 'a' },
			),
			[EData.FOLLOWERS]: createWriteStream(
				this.getOutDirPath('followers.csv'),
				{ flags: 'a' },
			),
			[EData.FOLLOWINGS]: createWriteStream(
				this.getOutDirPath('followings.csv'),
				{ flags: 'a' },
			),
		};
	}

	public static async start(): Promise<void> {
		await Promise.all([
			this._startQueue(EData.TWEETS, TweetsWorker),
			...!config.get('ignoreUsers') ? [
				this._startQueue(EData.FOLLOWERS, FollowersWorker),
				this._startQueue(EData.FOLLOWINGS, FollowingsWorker),
			] : [],
		]);
	}

	public static async exit(): Promise<void> {
		if (this._redis) {
			await this._redis.disconnect();
		}
		for (const ws of Object.values(this._writeStreams)) {
			ws.end();
			ws.close();
		}
	}

	public static writeRow(dataType: EData, ...data: any[]): void {
		this._writeStreams[dataType].write(this.toCSVRow(...data));
		this._writeStreams[dataType].write('\n');
	}

	/** @deprecated */
	public static toCSVRow(...data: any[]): string {
		return CSV.toCSVRow(...data);
	}

	public static async handlePaginationToken(
		key: EData,
		userData: IUserData,
		nextToken: string,
		resultCount: number,
	): Promise<void> {
		if (nextToken) {
			if (userData.pagination[key] !== nextToken) {
				userData.pagination[key] = nextToken;
			}
		} else if (userData.pagination[key] !== null) {
			userData.pagination[key] = null;
		}
		if (userData.done[key]) {
			userData.done[key] += resultCount;
		} else {
			userData.done[key] = resultCount;
		}
		await this.updateUserData(userData.username, userData);
	}

	public static async updateUserData(username: string, userData: Partial<IUserData>): Promise<void> {
		const actualData = this._userData[username];
		this._userData[username] = {
			...actualData,
			...userData,
			pagination: {
				...actualData?.pagination,
				...userData.pagination,
			},
		};
		await fs.writeFile(this.getUserDataPath(username), JSON.stringify(this._userData[username]));
	}

	/** @deprecated */
	public static async saveUserData(userData: IUserData): Promise<void> {
		await fs.writeFile(this.getUserDataPath(userData.username), JSON.stringify(userData));
		this._userData[userData.username] = userData;
	}

	// #region Getters

	public static async getUserData(username: string): Promise<IUserData> {
		if (this._userData[username]) {
			return this._userData[username];
		}
		try {
			return JSON.parse((await fs.readFile(this.getUserDataPath(username))).toString());
		} catch (error) {
			const client = (await this.getApp(EData.TWEETS)).getClient();
			const { data } = await client.v2.userByUsername(username);
			const { data: showData } = await client.v2.user(data.id, {
				'user.fields': ['public_metrics'],
			});
			const userData: IUserData = {
				id: data.id,
				username,
				pagination: {},
				count: {
					tweets: showData.public_metrics?.tweet_count || 0,
					followers: showData.public_metrics?.followers_count || 0,
					followings: showData.public_metrics?.following_count || 0,
					listed: showData.public_metrics?.listed_count || 0,
				},
				done: {},
			};
			await this.updateUserData(username, userData);
			return userData;
		}
	}

	public static getWorkerConcurrency(): number {
		return config.get('workerConcurrency');
	}

	public static getOutDirPath(filename: string): string {
		return `${config.get('outDir')}/${filename}`;
	}

	/** @deprecated */
	public static getCSVSeparator(): string {
		return CSV.getSeparator();
	}

	public static getUserDataPath(username: string): string {
		return `${TMP_DIR}/${username}-data.json`;
	}

	/** @deprecated */
	public static getTweetsWriteStream(): WriteStream {
		return this._writeStreams[EData.TWEETS];
	}

	/** @deprecated */
	public static getFollowersWriteSTream(): WriteStream {
		return this._writeStreams[EData.FOLLOWERS];
	}

	public static async getApp(dataType: EData): Promise<App> {
		let app = this._tokenPool.getApp(dataType);
		if (!app) {
			app = this._tokenPool.getSoonestAvailableApp(dataType);
			const availableIn = app.getAvailableIn(dataType);
			this._log('worker', 'Waiting for reset of the rate limit.', app.getRateLimitResetTime(dataType));
			await wait(availableIn);
			return this.getApp(dataType);
		}
		return app;
	}

	// #endregion

	public static enqueue<T>(worker: BaseWorker<T>): void {
		const queue = this._queues[worker.getDataType()];
		let start: number;
		queue
			.push(worker)
			.on('started', () => {
				this._log('worker', 'Job started', worker.getName(), worker.getData());
				start = Date.now();
			})
			.on('finish', () => {
				this._log('worker', 'Job finished', worker.getName(), worker.getData(), `${Date.now() - start}ms`);
			})
			.on('failed', (error) => {
				this._log('worker', 'Job failed', error, worker.getName(), worker.getData(), `${Date.now() - start}ms`);
			})
			.on('error', console.error);
	}

	private static async _startQueue<T extends IBaseWorkerData>(
		dataType: EData,
		Worker: new (data: T) => BaseWorker<T>,
		transformWorkerData: (username: string) => T = (username) => ({ username } as T),
	): Promise<void> {
		const queue = this._queues[dataType];
		return new Promise((resolve, reject) => {
			queue
				.on('drain', async () => {
					await sleep(1000);
					// @ts-ignore
					if (queue.length > 0) {
						return;
					}
					resolve();
				})
				.on('error', reject);
			for (const username of this._profiles) {
				this.enqueue(new Worker(transformWorkerData(username)));
			}
		});
	}

	private static async _exec<T>(worker: BaseWorker<T>, cb: (err?: any) => void): Promise<void> {
		try {
			await worker.perform();
			cb();
		} catch (error) {
			cb(error);
		}
	}

	// #region Init

	private static async _clear(): Promise<void> {
		if (!config.get('clear')) {
			return;
		}
		for (const file of await fs.readdir(TMP_DIR)) {
			await fs.unlink(`${TMP_DIR}/${file}`);
		}
		for (const file of await fs.readdir(config.get('outDir'))) {
			await fs.unlink(this.getOutDirPath(file));
		}
	}

	private static async _connectRedis(): Promise<void> {
		if (config.get('redis')) {
			this._redis = createClient(config.get('redis'));
			await this._redis.connect();
		}
	}

	private static async _createTmpDir(): Promise<void> {
		try {
			await fs.access(TMP_DIR);
		} catch (error) {
			await fs.mkdir(TMP_DIR);
		}
	}

	// #region Validators

	private static async _validateTokens(): Promise<void> {
		const rows = await this._readCSVFile<ITokenRow>(
			config.get('tokensFilePath'),
		);
		this._tokenPool = new TokenPool(rows.reduce((apps, row) => {
			const index = apps.findIndex(({ id }) => row.app === id);
			if (index >= 0) {
				apps[index].tokens.push(row.token);
			} else {
				apps.push({
					id: row.app,
					tokens: [row.token],
				});
			}
			return apps;
		}, []));
		if (this._tokenPool.getAppCount() === 0) {
			throw new Error('No tokens');
		}
	}

	private static async _validateProfiles(): Promise<void> {
		this._profiles = await this._readCSVFile<string>(
			config.get('profilesFilePath'),
			(row) => row.username,
		);
		if (!this._profiles.filter((username) => !!username).length) {
			throw new Error('No profiles');
		}
		let tweets = 0;
		let followers = 0;
		let followings = 0;
		for (const username of this._profiles) {
			const { count } = await this.getUserData(username);
			tweets += count.tweets;
			followers += count.followers;
			followings += count.followings;
		}
		const tokens = this._tokenPool.getAppCount();
		const tweetsRequests = tweets / LIMIT_TWEETS;
		const followersRequests = followers / LIMIT_USERS;
		const followingsRequests = followings / LIMIT_USERS;
		const tweetsPerHour = 4 * RATE_LIMIT_TWEETS * tokens;
		const usersPerHour = (4 * RATE_LIMIT_USERS * tokens);
		this._log('estimation', 'Tweets', `(${tweets}) ${(tweetsRequests / tweetsPerHour).toFixed(3)} hours`);
		if (!config.get('ignoreUsers')) {
			this._log('estimation', 'Followers', `(${followers}) ${(followersRequests / usersPerHour).toFixed(3)} hours`);
			this._log('estimation', 'Followings', `(${followings}) ${(followingsRequests / usersPerHour).toFixed(3)} hours`);
		}
	}

	private static async _validateOutputDir(): Promise<void> {
		await fs.access(config.get('outDir'));
	}

	// #endregion

	// #endregion

	private static async _readCSVFile<T>(
		path: string,
		transformRow: (row: any) => T = (row) => row,
	): Promise<T[]> {
		return CSV.readFile(path, true, transformRow);
	}

	private static _log(tag: string, ...data: any[]): void {
		Logger.log(tag, ...data);
	}
}
