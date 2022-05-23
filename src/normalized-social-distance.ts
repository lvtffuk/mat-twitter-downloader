import config from 'config';
import { createWriteStream } from 'fs';
import { intersection } from 'lodash';
import { CSV, Logger } from 'mat-utils';
import Data from './data';
import Downloader from './downloader';
import { EData } from './typings/enums';

const USER_COUNT: number = config.get('userCount');

export default class NormalizedSocialDistance {

	public static async createMap(typeData: EData): Promise<void> {
		Logger.log('normalized-social-distance', `Creating NSD map of ${typeData}.`);
		const map: Record<string, string[]> = await this._getMap(typeData);
		const distances: Record<string, number> = this._calculateDistances(map, Downloader.getProfiles());
		await this._save(typeData, distances, Downloader.getProfiles());
	}

	public static async createMapFromAffinityData(): Promise<void> {
		Logger.log('normalized-social-distance', `Creating NSD maps of affinity data.`);
		for (const username of Downloader.getProfiles()) {
			Logger.log('affinity', `Creating NSD map of ${username}.`);
			const followers = await Data.getFollowersOf(username);
			const map = await Data.mapFollowings(followers);
			const distances: Record<string, number> = this._calculateDistances(map, followers);
			await this._save(`affinities/${username}`, distances, followers);
		}
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

	private static _calculateDistances(map: Record<string, string[]>, usernames: string[]): Record<string, number> {
		const distances: Record<string, number> = {};
		const profiles = [...usernames];
		while (profiles.length) {
			const username = profiles.shift();
			const fx = map[username]?.length || 0;
			for (const nextUsername of profiles) {
				const key = this._getUsernameKey(username, nextUsername);
				const fy = map[nextUsername]?.length || 0;
				const fi = intersection(map[username] || [], map[nextUsername] || []).length;
				distances[key] = this._calculateNormalizedSocialDistance(fx, fy, fi);
			}
		}
		return distances;
	}

	private static async _save(filename: string, distances: Record<string, number>, usernames: string[]): Promise<void> {
		const rows: string[] = [CSV.toCSVRow('', ...usernames)];
		for (const profile of usernames) {
			const rowData: any[] = [profile];
			for (const p of usernames) {
				if (profile === p) {
					rowData.push('');
					continue;
				}
				const key = this._getUsernameKey(profile, p);
				rowData.push(distances[key]);
			}
			rows.push(CSV.toCSVRow(...rowData));
		}
		const f = `${filename}.nsd.csv`;
		const ws = createWriteStream(
			Downloader.getOutDirPath(f),
			{ flags: 'w' },
		);
		for (const row of rows) {
			ws.write(row);
			ws.write('\n');
		}
		ws.end();
		ws.close();
	}

	/**
	 * Calculates the normalized social distance for two profiles from users (followers, following) of those profiles.
	 *
	 * @param fx Sum of users of the profile.
	 * @param fy Sum of users of the profile to compare.
	 * @param fi Sum of common users.
	 */
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
