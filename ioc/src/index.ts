/*
	KAfka Functional Proto
    Header key regex pattern
	Copyright Yalo @ 2021 
	License: Legacy
	CODEOWNERS: xOChilpili

	Instructions: 

	start server: npm run start
	to stop the server, press: Ctrl+C 

	Start Docker:
	docker-compose -f docker-compose.yaml up -d 
	Stop Docker:
	docker-compose -f docker-compose.yaml down

*/

import 'reflect-metadata';
import Server from './server';
(async () => {
	await Server.start();
	console.log('Producers: ', Server.getProucersStatus());
	console.log('Consumers: ', Server.getConsumerStatus());
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
