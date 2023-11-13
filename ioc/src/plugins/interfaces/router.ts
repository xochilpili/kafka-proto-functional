import { Server } from '@hapi/hapi';

export interface IRouter {
	loadRoutes(server: Server): Promise<void>;
}
