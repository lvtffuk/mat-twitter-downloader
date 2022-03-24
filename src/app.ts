import { randomNumber } from 'mat-utils';
import { TwitterApiReadOnly } from 'twitter-api-v2';
import { EData } from './typings/enums';

export default class App {

	public id: string;

	public tokens: string[];

	private _dataRateLimitReset: Partial<Record<EData, Date>> = {};

	constructor(id: string, tokens: string[]) {
		this.id = id;
		this.tokens = tokens;
	}

	public lock(dataType: EData, until: Date): void {
		this._dataRateLimitReset[dataType] = until;
	}

	public isLocked(dataType: EData): boolean {
		if (!this.getRateLimitResetTime(dataType)) {
			return false;
		}
		return this.getRateLimitResetTime(dataType) > new Date();
	}

	public getClient(): TwitterApiReadOnly {
		return new TwitterApiReadOnly(this.getToken());
	}

	public getToken(): string {
		return this.tokens[randomNumber(0, this.tokens.length - 1)];
	}

	public getAvailableIn(dataType: EData): number {
		return this.getRateLimitResetTime(dataType).getTime() - new Date().getTime();
	}

	public getRateLimitResetTime(dataType: EData): Date {
		return this._dataRateLimitReset[dataType] || null;
	}
}
