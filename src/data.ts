import { CSV } from 'mat-utils';
import Downloader, { IUserData } from './downloader';
import { EData } from './typings/enums';

export default class Data {

	public static getFollowers(): Promise<string[]> {
		return this._getUsers(EData.FOLLOWERS);
	}

	public static getFollowersOf(username: string): Promise<string[]> {
		return this._getUsersOf(username, EData.FOLLOWERS);
	}

	public static getFollowings(): Promise<string[]> {
		return this._getUsers(EData.FOLLOWINGS);
	}

	public static getFollowingsOf(username: string): Promise<string[]> {
		return this._getUsersOf(username, EData.FOLLOWINGS);
	}

	public static mapFollowers(usernames?: string[]): Promise<Record<string, string[]>> {
		return this._mapUsers(EData.FOLLOWERS, usernames);
	}

	public static mapFollowings(usernames?: string[]): Promise<Record<string, string[]>> {
		return this._mapUsers(EData.FOLLOWINGS, usernames);
	}

	public static getProfileInfo(username: string, handleRateLimit: boolean = false): Promise<IUserData> {
		return Downloader.getUserData(username, handleRateLimit);
	}

	private static _getUsers(typeData: EData): Promise<string[]> {
		return CSV.readFile(
			Downloader.getOutDirPath(Downloader.getOutputFilename(typeData)),
			false,
			(row) => {
				return row['3'];
			}
		);
	}

	private static async _getUsersOf(username: string, typeData: EData): Promise<string[]> {
		const users: string[] = [];
		await CSV.readFile(
			Downloader.getOutDirPath(Downloader.getOutputFilename(typeData)),
			false,
			(row) => {
				if (row['1'] === username) {
					users.push(row['3']);
				}
			}
		);
		return users;
	}

	private static async _mapUsers(typeData: EData, usernames?: string[]): Promise<Record<string, string[]>> {
		const map: Record<string, string[]> = {};
		await CSV.readFile(
			Downloader.getOutDirPath(Downloader.getOutputFilename(typeData)),
			false,
			(row) => {
				const username = row['1'];
				if (usernames instanceof Array && !usernames.includes(username)) {
					return;
				}
				const fUser = row['3'];
				if (!map[username]) {
					map[username] = [];
				}
				map[username].push(fUser);
			}
		);
		return map;
	}
}
