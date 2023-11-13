import { injectable } from 'inversify';
import { Server } from '@hapi/hapi';
import { IRouter } from '../../plugins/interfaces/router';
import { appContext } from '../../context';
import { EngagementController } from '../controllers/engagement.controller';

@injectable()
export class EngagementRouter implements IRouter {
	private readonly engagementController: EngagementController = appContext.get<EngagementController>(EngagementController);

	public loadRoutes = async (server: Server): Promise<void> => {
		server.route({
			method: 'GET',
			path: `/engagment`,
			handler: this.engagementController.emitErrorLogEvent,
		});
	};
}
