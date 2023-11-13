import { injectable } from 'inversify';
import { IRouter } from '../../plugins/interfaces/router';
import { Request, ResponseObject, ResponseToolkit, Server } from '@hapi/hapi';

@injectable()
export class HealthzRouter implements IRouter {
	public loadRoutes = async (server: Server): Promise<void> => {
		server.route({
			method: 'GET',
			path: `/healthz`,
			handler: async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
				return h.response({ message: 'ok' }).code(200);
			},
		});
	};
}
