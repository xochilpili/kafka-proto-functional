import { injectable } from 'inversify';
import { IRouter } from '../../plugins/interfaces/router';
import { Server } from '@hapi/hapi';
import { appContext } from '../../context';
import { CoreEventsController } from '../controllers/core-event.controller';

@injectable()
export class CoreEventsRouter implements IRouter {
	private readonly coreEventController: CoreEventsController = appContext.get<CoreEventsController>(CoreEventsController);

	public loadRoutes = async (server: Server): Promise<void> => {
		server.route({
			method: 'GET',
			path: `/core-event`,
			handler: this.coreEventController.emitCoreEvent,
		});
	};
}
