import { Logger } from 'mat-utils';
import { TwitterApiReadOnly, UserV2TimelineResult } from 'twitter-api-v2';
import { LIMIT_USERS } from '../constants';
import Downloader from '../downloader';
import { EData } from '../typings/enums';
import BaseWorker from './base';

interface IData {
	username: string;
}

export default class FollowersWorker extends BaseWorker<IData> {

	public getDataType(): EData {
		return EData.FOLLOWERS;
	}

	protected async _perform(client: TwitterApiReadOnly, data: IData): Promise<void> {
		const { username } = data;
		const userData = await Downloader.getUserData(username);
		if (userData.pagination[this.getDataType()] === null) {
			return;
		}
		if (userData.protected) {
			Logger.warn('worker', `${username} protected.`);
			return;
		}
		const followers = await client.v2.followers(userData.id, {
			max_results: LIMIT_USERS,
			pagination_token: userData.pagination[this.getDataType()],
			asPaginator: true,
		});
		this._processBulk(userData.id, username, followers.data);
		await Downloader.handlePaginationToken(
			this.getDataType(),
			userData,
			followers.meta.next_token,
			followers.meta.result_count,
		);
		if (!followers.done) {
			Downloader.enqueue(this);
		}
	}

	private _processBulk(userId: string, username: string, data: UserV2TimelineResult): void {
		for (const follower of data.data) {
			Downloader.writeRow(this.getDataType(), userId, username, follower.id, follower.username);
		}
	}
}
