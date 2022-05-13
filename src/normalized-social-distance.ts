import config from 'config';
import { createWriteStream } from 'fs';
import { intersection } from 'lodash';
import { CSV, Logger } from 'mat-utils';
import Downloader from './downloader';
import { EData } from './typings/enums';

const USER_COUNT: number = config.get('userCount');

export default class NormalizedSocialDistance {

	public static async createMap(typeData: EData): Promise<void> {
		Logger.log('normalized-social-distance', `Creating NSD map of ${typeData}`);
		const map: Record<string, string[]> = await this._getMap(typeData);
		const distances: Record<string, number> = this._calculateDistances(map);
		await this._save(typeData, distances);
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

	private static _calculateDistances(map: Record<string, string[]>): Record<string, number> {
		const distances: Record<string, number> = {};
		const profiles = [...Downloader.getProfiles()];
		while (profiles.length) {
			const username = profiles.shift();
			const fx = map[username].length;
			for (const nextUsername of profiles) {
				const key = this._getUsernameKey(username, nextUsername);
				const fy = map[nextUsername].length;
				const fi = intersection(map[username], map[nextUsername]).length;
				distances[key] = this._calculateNormalizedSocialDistance(fx, fy, fi);
			}
		}
		return distances;
	}

	private static async _save(typeData: EData, distances: Record<string, number>): Promise<void> {
		const rows: string[] = [CSV.toCSVRow('', ...Downloader.getProfiles())];
		for (const profile of Downloader.getProfiles()) {
			const rowData: any[] = [profile];
			for (const p of Downloader.getProfiles()) {
				if (profile === p) {
					rowData.push('');
					continue;
				}
				const key = this._getUsernameKey(profile, p);
				rowData.push(distances[key]);
			}
			rows.push(CSV.toCSVRow(...rowData));
		}
		const filename = `${typeData}.nsd.csv`;
		const ws = createWriteStream(
			Downloader.getOutDirPath(filename),
			{ flags: 'w' },
		);
		for (const row of rows) {
			ws.write(row);
			ws.write('\n');
		}
		ws.end();
		ws.close();
	}

	private static _calculateNormalizedSocialDistance(fx: number, fy: number, fi: number): number {
		return (Math.max(Math.log(fx), Math.log(fy)) - Math.log(fi))
			/
			(Math.log(USER_COUNT) - Math.min(Math.log(fx), Math.log(fy)));
	}

	private static _getUsernameKey(username1: string, username2: string): string {
		return [username1, username2].sort((a, b) => {
			return a.localeCompare(b);
		}).join('-');
	}
}
