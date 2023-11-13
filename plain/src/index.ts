import Server from './server';
(async () => {
	await Server.start();

	const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
	signalTraps.forEach((type) => {
		process.once(type, async () => {
			try {
				await Server.stop();
			} finally {
				process.kill(process.pid, type);
			}
		});
	});
})();
