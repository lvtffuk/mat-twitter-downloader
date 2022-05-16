import config from 'config';
import { createWriteStream } from 'fs';
import { intersection } from 'lodash';
import { CSV, Logger } from 'mat-utils';
import Downloader from './downloader';
import { EData } from './typings/enums';

interface IAffinityItem {
	username: string;
	followers: number;
	followersInDataset: number;
	affinity: number;
}

const USER_COUNT: number = config.get('userCount');

export default class Affinity {

	public static async create(typeData: EData): Promise<void> {
		Logger.log('affinity', `Creating affinity of ${typeData}`);
		const map = await this._getMap(typeData);
		const affinities = this._calculateAffinity(map);
		await this._save(typeData, affinities);
	}

	private static async _getMap(typeData: EData): Promise<Record<string, string[]>> {
		const map: Record<string, string[]> = {};
		await CSV.readFile(
			Downloader.getOutDirPath(Downloader.getOutputFilename(typeData)),
			false,
			(row) => {
				const username = row['1'];
				const fUser = row['3'];
				if (!map[username]) {
					map[username] = [];
				}
				map[username].push(fUser);
			}
		);
		return map;
	}

	private static _calculateAffinity(map: Record<string, string[]>): IAffinityItem[] {
		const dataset = Downloader.getProfiles();
		return Downloader.getProfiles().map((username) => {
			const followers = map[username];
			const followersInDataset = intersection(dataset, followers).length;
			const followersRatio = followers.length / USER_COUNT;
			const followersInDatasetRatio = followersInDataset / dataset.length;
			const affinity = followersInDatasetRatio / followersRatio;
			// console.log(profile, { followersInDataset, followersRatio, followersInDatasetRatio, affinity });
			return {
				username,
				followers: followers.length,
				followersInDataset,
				affinity,
			};
		});
	}

	private static async _save(typeData: EData, affinities: IAffinityItem[]): Promise<void> {
		const filename = `${typeData}.affinity.csv`;
		const ws = createWriteStream(
			Downloader.getOutDirPath(filename),
			{ flags: 'w' },
		);
		ws.write(CSV.toCSVRow('username', 'followers count', 'followers in dataset count', 'affinity'));
		ws.write('\n');
		for (const item of affinities) {
			ws.write(CSV.toCSVRow(item.username, item.followers, item.followersInDataset, item.affinity));
			ws.write('\n');
		}
		ws.end();
		ws.close();
	}
}
