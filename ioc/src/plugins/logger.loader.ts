import { Server } from '@hapi/hapi';
import { appContext } from '../context';
import { ILogger } from '../shared/logger';
import { Types } from '../types';
import { get as configGet } from '../config';

export class LoggerLoader {
	private logger = appContext.get<ILogger>(Types.Logger);

	register = async (server: Server): Promise<void> => {
		try {
			const logEvents = configGet('/logger/events') as string;

			await server.register({
				options: {
					instance: this.logger,
					logEvents: logEvents,
				},
				plugin: require('hapi-pino'),
			});
			this.logger.info('Plugin Logger Registered');
		} catch (error) {
			this.logger.error({ error }, 'Error Loading Logger Plugin');
		}
	};
}
