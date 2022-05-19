import { Logger } from 'mat-utils';
import { TweetV2UserTimelineResult, TwitterApiReadOnly } from 'twitter-api-v2';
import { LIMIT_TWEETS } from '../constants';
import Downloader from '../downloader';
import { EData } from '../typings/enums';
import BaseWorker from './base';

interface IData {
	username: string;
}

export default class TweetsWorker extends BaseWorker<IData> {

	public getDataType(): EData {
		return EData.TWEETS;
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
		const timeline = await client.v2.userTimeline(
			userData.id,
			{
				'tweet.fields': ['id', 'text', 'created_at'],
				max_results: LIMIT_TWEETS,
				pagination_token: userData.pagination[this.getDataType()],
			},
		);
		this._processBulk(userData.id, username, timeline.data);
		await Downloader.handlePaginationToken(
			this.getDataType(),
			userData,
			timeline.meta.next_token,
			timeline.meta.result_count,
		);
		if (!timeline.done) {
			Downloader.enqueue(this);
		}
	}

	private _processBulk(userId: string, username: string, data: TweetV2UserTimelineResult): void {
		for (const tweet of data.data) {
			Downloader.writeRow(this.getDataType(), userId, username, tweet.id, tweet.text, tweet.created_at);
		}
	}
}
