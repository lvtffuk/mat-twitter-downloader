import config from 'config';

const value = (target: typeof Config, propertyName: string) => {
	Object.defineProperty(target, propertyName, {
		get: () => config.get(propertyName),
	});
};

export default class Config {

	@value
	public static tokensFilePath: string;

	@value
	public static outDir: string;

	@value
	public static profilesFilePath: string;

	@value
	public static csvSeparator: string;

	@value
	public static workerConcurrency: number;

	@value
	public static clear: boolean;

	@value
	public static workers: string[];

	@value
	public static userCount: number;

	@value
	public static affinity: boolean;

	@value
	public static affinityFollowingThreshold: number;
}
