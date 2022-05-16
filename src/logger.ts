import { Logger as BaseLogger } from 'mat-utils';

/** @deprecated */
export default class Logger extends BaseLogger {

	public static log(tag: string, ...data: any[]): void {
		// tslint:disable-next-line: no-console
		console.log(new Date(), 'LOG', `[${tag}]`, ...data);
	}

	public static warn(tag: string, ...data: any[]): void {
		console.warn(new Date(), 'WARN', `[${tag}]`, ...data);
	}
}
