import { createWriteStream } from 'fs';
import { promises as fs } from 'fs';
import { CSV, Logger } from 'mat-utils';
import Config from './config';
import Data from './data';
import Downloader from './downloader';

// #region Typings

/**
 * The affinity output data for given user.
 */
interface IAffinityItem {
	/**
	 * Username of the user.
	 */
	username: string;
	/**
	 * Number of user's followers.
	 */
	followers: number;
	/**
	 * The percentage of followers to the total followers.
	 *
	 * See the `USER_COUNT` in the options.
	 */
	normal: number;
	/**
	 * The percentage of followers to the followers in dataset.
	 *
	 * Followers in dataset are the followers of the analyzed user.
	 */
	percentage: number;
	/**
	 * Calculated affinity.
	 */
	affinity: number;
}

/**
 * The following user of the analyzed user followers.
 */
interface IAffinityUser {
	/**
	 * Username of the user.
	 */
	username: string;
	/**
	 * Total count of followers in the dataset.
	 *
	 * The number says how many of the analyzed user followers are following this user.
	 */
	count: number;
	/**
	 * The list of followers of the user.
	 */
	users: string[];
}

type TCount = Omit<IAffinityUser, 'username'>;

// #endregion

export default class Affinity {

	public static async calculate(): Promise<void> {
		Logger.log('affinity', `Calculating.`);
		await this._createAffinitiesDir();
		for (const username of Downloader.getProfiles()) {
			await this._processUser(username);
		}
	}

	private static async _processUser(username: string): Promise<void> {
		Logger.log('affinity', `Preparing followers of ${username}.`);
		const followers = await Data.getFollowersOf(username);
		const map = await Data.mapFollowings(followers);
		const counts = this._reduceFollowingsMap(map);
		const minimalPercents = Math.round(followers.length * (Config.affinityFollowingThreshold / 100));
		// List of users for calculating affinity
		const affinityUsers: IAffinityUser[] = Object.entries(counts)
			.filter(([, c]) => c.count >= minimalPercents)
			.map(([key, c]) => {
				return { username: key, ...c };
			})
			.sort((a, b) => b.count - a.count);
		const affinities: IAffinityItem[] = [];
		Logger.log('affinity', `Calculating ${affinityUsers.length} users.`);
		for (const affinityUser of affinityUsers) {
			const info = await Data.getProfileInfo(affinityUser.username, true);
			const normal = (info.count.followers / Config.userCount) * 100;
			const percentage = (affinityUser.count / followers.length) * 100;
			const affinity = percentage / normal;
			affinities.push({
				username: affinityUser.username,
				followers: info.count.followers,
				normal,
				percentage,
				affinity,
			});
		}
		affinities.sort((a, b) => b.affinity - a.affinity);
		await this._save(username, affinities);
		await this._saveMatrix(username, followers, affinityUsers);
		Logger.log('affinity', `${username} done.`);
	}

	private static _reduceFollowingsMap(map: Record<string, string[]>): Record<string, TCount> {
		return Object
			.entries(map)
			.reduce((r, [follower, followings]) => {
				for (const f of followings) {
					if (r[f]) {
						r[f].count++;
						r[f].users.push(follower);
					} else {
						r[f] = {
							count: 1,
							users: [follower],
						};
					}
				}
				return r;
			}, {} as Record<string, TCount>);
	}

	private static async _save(username: string, affinities: IAffinityItem[]): Promise<void> {
		Logger.log('affinity', `Saving ${username}.`);
		const filename = `affinities/${username}.csv`;
		const ws = createWriteStream(
			Downloader.getOutDirPath(filename),
			{ flags: 'w' },
		);
		ws.write(CSV.toCSVRow('username', 'followers', 'normal', 'percentage', 'affinity'));
		ws.write('\n');
		for (const item of affinities) {
			ws.write(CSV.toCSVRow(item.username, item.followers, item.normal, item.percentage, item.affinity));
			ws.write('\n');
		}
		ws.end();
		ws.close();
	}

	private static async _saveMatrix(
		username: string,
		followers: string[],
		affinityUsers: IAffinityUser[],
	): Promise<void> {
		Logger.log('affinity', `Saving ${username} matrix.`);
		const filename = `affinities/${username}.matrix.csv`;
		const ws = createWriteStream(
			Downloader.getOutDirPath(filename),
			{ flags: 'w' },
		);
		ws.write(CSV.toCSVRow('username', ...followers));
		ws.write('\n');
		for (const user of affinityUsers) {
			if (user.username === username) {
				continue;
			}
			ws.write(CSV.toCSVRow(user.username, ...followers.map((follower) => {
				return user.users.includes(follower) ? 1 : 0;
			})));
			ws.write('\n');
		}
		ws.end();
		ws.close();
	}

	private static async _createAffinitiesDir(): Promise<void> {
		try {
			await fs.access(Downloader.getOutDirPath('affinities'));
		} catch (error) {
			await fs.mkdir(Downloader.getOutDirPath('affinities'));
		}
	}
}
