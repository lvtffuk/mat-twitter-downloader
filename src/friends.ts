import { createReadStream, createWriteStream, promises as fs } from 'fs';
import { intersection } from 'lodash';
import { Logger } from 'mat-utils';
import readline from 'readline';
import Downloader from './downloader';
import { EData } from './typings/enums';

export default class Friends {

	public static async merge(): Promise<void> {
		Logger.log('friends', 'Merging friends');
		const friends = intersection(
			await this._readCSVFile(Downloader.getOutDirPath(Downloader.getOutputFilename(EData.FOLLOWERS))),
			await this._readCSVFile(Downloader.getOutDirPath(Downloader.getOutputFilename(EData.FOLLOWINGS))),
		);
		const ws = createWriteStream(
			Downloader.getOutDirPath('friends.csv'),
			{ flags: 'w' },
		);
		for (const friend of friends) {
			ws.write(friend);
			ws.write('\n');
		}
		ws.end();
		ws.close();
	}

	private static async _readCSVFile(path: string): Promise<string[]> {
		await fs.access(path);
		const output: string[] = [];
		const rl = readline.createInterface({
			input: createReadStream(path),
			crlfDelay: Infinity,
		});
		for await (const line of rl) {
			if (!line) {
				continue;
			}
			output.push(line);
		}
		return output;
	}
}
