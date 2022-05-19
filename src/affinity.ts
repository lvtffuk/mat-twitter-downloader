import { createWriteStream } from 'fs';
import {promises as fs} from 'fs';
import { CSV, Logger } from 'mat-utils';
import Config from './config';
import Data from './data';
import Downloader from './downloader';

interface IAffinityItem {
	username: string;
	followers: number;
	followings: number;
	followersInDataset: number;
	affinity: number;
}

export default class Affinity {

	public static async calculate(): Promise<void> {
		Logger.log('affinity', `Calculating.`);
		await this._createAffinitiesDir();
		for (const username of Downloader.getProfiles()) {
			Logger.log('affinity', `Preparing followers of ${username}.`);
			const followers = await Data.getFollowersOf(username);
			const map = await Data.mapFollowings(followers);
			const counts: Record<string, number> = {};
			let count: number = 0;
			for (const followings of Object.values(map)) {
				count += followings.length;
				for (const f of followings) {
					if (counts[f]) {
						counts[f]++;
					} else {
						counts[f] = 1;
					}
				}
			}
			const minimalPercents = Math.round(followers.length / Config.affinityFollowingThreshold);
			const affinityList = Object.entries(counts)
				.filter(([, value]) => value >= minimalPercents)
				.map(([key, value]) => {
					return { username: key, count: value };
				})
				.sort((a, b) => b.count - a.count);
			const affinities: IAffinityItem[] = [];
			for (const affinityUser of affinityList) {
				if (affinityUser.username === username) {
					continue;
				}
				Logger.log('affinity', `Calculating ${affinityUser.username}.`);
				const info = await Data.getProfileInfo(affinityUser.username);
				const affinity = (affinityUser.count / followers.length) / (info.count.followers / Config.userCount);
				affinities.push({
					username: affinityUser.username,
					followers: followers.length,
					followings: affinityUser.count,
					followersInDataset: info.count.followers,
					affinity,
				});
			}
			affinities.sort((a, b) => b.affinity - a.affinity);
			await this._save(username, affinities);
			Logger.log('affinity', `${username} done.`);
		}
	}

	private static async _save(username: string, affinities: IAffinityItem[]): Promise<void> {
		const filename = `affinities/${username}.csv`;
		const ws = createWriteStream(
			Downloader.getOutDirPath(filename),
			{ flags: 'w' },
		);
		ws.write(CSV.toCSVRow('username', 'followers count', 'followings count', 'followers in dataset count', 'affinity'));
		ws.write('\n');
		for (const item of affinities) {
			ws.write(CSV.toCSVRow(item.username, item.followers, item.followings, item.followersInDataset, item.affinity));
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
