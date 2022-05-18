import Affinity from './affinity';
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
		for (const typeData of [EData.FOLLOWERS, EData.FOLLOWINGS]) {
			if (Downloader.isWorkerEnabled(typeData)) {
				await NormalizedSocialDistance.createMap(typeData);
				// await Affinity.create(typeData);
			}
		}
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
})();
