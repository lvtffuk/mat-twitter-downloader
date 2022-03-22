import config from 'config';
import csvParser from 'csv-parser';
import { createReadStream, promises as fs } from 'fs';

export default class CSV {

	public static async readFile<T>(
		path: string,
		headers: boolean = true,
		transformRow: (row: any) => T = (row) => row,
	): Promise<T[]> {
		await fs.access(path);
		const output: T[] = [];
		return new Promise((resolve, reject) => {
			try {
				createReadStream(path)
					.pipe(csvParser({
						separator: this.getSeparator(),
						headers: headers === false ? false : undefined,
					}))
					.on('data', (data) => {
						output.push(transformRow(data));
					})
					.on('end', () => resolve(output));
			} catch (error) {
				reject(error);
			}
		});
	}

	public static toCSVRow(...data: any[]): string {
		return data
			.map((item) => {
				return `"${item}"`.replace(/\n/g, '\\n');
			})
			.join(this.getSeparator());
	}

	public static getSeparator(): string {
		return config.get('csvSeparator');
	}
}
