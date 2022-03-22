import config from 'config';
import Downloader from './downloader';
import Friends from './friends';

(async () => {
	try {
		await Downloader.init();
		await Downloader.start();
		await Downloader.exit();
		if (!config.get('ignoreUsers')) {
			await Friends.merge();
		}
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
})();
