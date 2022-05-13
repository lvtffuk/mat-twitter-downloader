import { EData } from './typings/enums';

export const LIMIT_TWEETS = 100;
export const LIMIT_USERS = 200;

export const RATE_LIMIT_TWEETS = 1500;
export const RATE_LIMIT_USERS = 15;

export const WORKERS: EData[] = [
	EData.TWEETS,
	EData.FOLLOWERS,
	EData.FOLLOWINGS,
];

export const OUTPUT_FILENAMES: Record<EData, string> = {
	[EData.TWEETS]: 'tweets.csv',
	[EData.FOLLOWERS]: 'followers.csv',
	[EData.FOLLOWINGS]: 'followings.csv',
};
