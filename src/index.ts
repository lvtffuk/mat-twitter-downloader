import Downloader from './downloader';
import Friends from './friends';
import { EData } from './typings/enums';

(async () => {
	try {
		await Downloader.init();
		await Downloader.start();
		await Downloader.exit();
		if (Downloader.isWorkerEnabled(EData.FOLLOWERS) && Downloader.isWorkerEnabled(EData.FOLLOWINGS)) {
			await Friends.merge();
		}
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
})();
