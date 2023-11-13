import { Server } from '@hapi/hapi';
import { injectable } from 'inversify';
import { IRouter } from '../../plugins/interfaces/router';
import { PublishController } from '../controllers/publish.controller';
import { appContext } from '../../context';

@injectable()
export class PublishRouter implements IRouter {
	private readonly publishController: PublishController = appContext.get<PublishController>(PublishController);

	public loadRoutes = async (server: Server): Promise<void> => {
		server.route({
			method: 'GET',
			path: `/publish`,
			handler: this.publishController.publishWorkflow,
		});
	};
}
