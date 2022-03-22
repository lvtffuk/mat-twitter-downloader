import App from './app';
import { EData } from './typings/enums';

export interface IAppTokenInfo {
	id: string;
	tokens: string[];
}

export default class TokenPool {

	private _apps: App[];

	constructor(apps: IAppTokenInfo[]) {
		if (!apps.length || !apps[0].tokens.length) {
			throw new Error('The token pool requires at least one application and token.');
		}
		this._apps = apps.map(({ id, tokens }) => new App(id, tokens));
	}

	public getApp(dataType: EData): App {
		const app = this._apps
			.find((a) => !a.isLocked(dataType));
		return app;
	}

	public getSoonestAvailableApp(dataType: EData): App {
		this._apps.sort((a, b) => {
			return a.getRateLimitResetTime(dataType)?.getTime() - b.getRateLimitResetTime(dataType)?.getTime();
		});
		return this._apps[0];
	}

	public getAppCount(): number {
		return this._apps.length;
	}
}
