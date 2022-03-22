export const wait = (timeout: number) => {
	return new Promise((resolve, reject) => {
		setTimeout(resolve, timeout);
	});
};
