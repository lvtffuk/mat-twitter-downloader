module.exports = {
	tokensFilePath: process.env.TOKENS_FILE_PATH,
	outDir: process.env.OUT_DIR,
	profilesFilePath: process.env.PROFILES_FILE_PATH,
	csvSeparator: process.env.CSV_SEPARATOR || ';',
	redis: process.env.REDIS_HOST ? {
		host: process.env.REDIS_HOST,
		port: process.env.REDIS_PORT || 6379,
	} : null,
	workerConcurrency: process.env.WORKER_CONCURRENCY
		? parseInt(process.env.WORKER_CONCURRENCY, 10)
		: 5,
	clear: process.env.CLEAR
		? !!parseInt(process.env.CLEAR, 10)
		: false,
	ignoreUsers: process.env.IGNORE_USERS
		? !!parseInt(process.env.IGNORE_USERS, 10)
		: false,
};