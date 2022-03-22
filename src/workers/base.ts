import { TwitterApiReadOnly } from 'twitter-api-v2';
import Downloader, { IUserData } from '../downloader';
import { EData } from '../typings/enums';

export default abstract class BaseWorker<T> {

	protected _data: T;

	constructor(data: T) {
		this._data = data;
	}

	public async perform(): Promise<void> {
		const app = await Downloader.getApp(this.getDataType());
		try {
			await this._perform(app.getClient(), this._data);
		} catch (error) {
			if (error.code === 429) {
				app.lock(this.getDataType(), new Date(error.rateLimit.reset * 1000));
			}
			throw error;
		}
	}

	public getName(): string {
		return this.constructor.name;
	}

	public getData(): T {
		return this._data;
	}

	public abstract getDataType(): EData;

	protected abstract _perform(client: TwitterApiReadOnly, data: T): Promise<void>;
}
