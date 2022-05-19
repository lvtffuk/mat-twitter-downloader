let workers = null;
if (process.env.IGNORE_USERS) {
	workers = ['tweets'];
} else if (process.env.WORKERS) {
	workers = process.env.WORKERS.split(',');
}

const getNumericVar = (value, defaultValue = 0) => {
	return value ? parseInt(value, 10) : defaultValue;
};

const getBooleanVar = (value) => {
	return !!getNumericVar(value, 0);
}

module.exports = {
	tokensFilePath: process.env.TOKENS_FILE_PATH,
	outDir: process.env.OUT_DIR,
	profilesFilePath: process.env.PROFILES_FILE_PATH,
	csvSeparator: process.env.CSV_SEPARATOR || ';',
	redis: process.env.REDIS_HOST ? {
		host: process.env.REDIS_HOST,
		port: process.env.REDIS_PORT || 6379,
	} : null,
	workerConcurrency: getNumericVar(process.env.WORKER_CONCURRENCY, 5),
	clear: getBooleanVar(process.env.CLEAR),
	workers,
	userCount: getNumericVar(process.env.USER_COUNT, 500000),
	affinity: getBooleanVar(process.env.AFFINITY),
	affinityFollowingThreshold: getNumericVar(process.env.AFFINITY_FOLLOWING_THRESHOLD, 10),
};
