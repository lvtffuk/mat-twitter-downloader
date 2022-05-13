import Downloader from './downloader';
import Friends from './friends';
import NormalizedSocialDistance from './normalized-social-distance';
import { EData } from './typings/enums';

(async () => {
	try {
		await Downloader.init();
		await Downloader.start();
		await Downloader.exit();
		if (Downloader.isWorkerEnabled(EData.FOLLOWERS) && Downloader.isWorkerEnabled(EData.FOLLOWINGS)) {
			await Friends.merge();
		}
		if (Downloader.isWorkerEnabled(EData.FOLLOWERS)) {
			await NormalizedSocialDistance.createMap(EData.FOLLOWERS);
		}
		if (Downloader.isWorkerEnabled(EData.FOLLOWINGS)) {
			await NormalizedSocialDistance.createMap(EData.FOLLOWINGS);
		}
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
})();
