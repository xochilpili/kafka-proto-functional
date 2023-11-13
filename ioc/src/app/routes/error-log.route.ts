import { injectable } from 'inversify';
import { Server } from '@hapi/hapi';
import { IRouter } from '../../plugins/interfaces/router';
import { appContext } from '../../context';
import { ErrorLogController } from '../controllers/error-log.controller';

@injectable()
export class ErrorLogRouter implements IRouter {
	private readonly errorLogController: ErrorLogController = appContext.get<ErrorLogController>(ErrorLogController);

	public loadRoutes = async (server: Server): Promise<void> => {
		server.route({
			method: 'GET',
			path: `/error-log`,
			handler: this.errorLogController.emitErrorLogEvent,
		});
	};
}
