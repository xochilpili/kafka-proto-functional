import { injectable } from 'inversify';
import { appContext } from './context';
import { RequestRoute, Server } from '@hapi/hapi';
import Pino from 'pino';
import { Types } from './types';
import { IRouter } from './plugins/interfaces/router';
import { ErrorLogRouter } from './app/routes/error-log.route';
import { CoreEventsRouter } from './app/routes/core-events.route';
import { HealthzRouter } from './app/routes/healthz.router';
import { EngagementRouter } from './app/routes/engagement.route';
import { PublishRouter } from './app/routes/publish.route';

@injectable()
export class Router implements IRouter {
	private logger = appContext.get<Pino.Logger>(Types.Logger);
	private errorLogRouter = appContext.get<ErrorLogRouter>(ErrorLogRouter);
	private coreEventRouter = appContext.get<CoreEventsRouter>(CoreEventsRouter);
	private healthzRouter = appContext.get<HealthzRouter>(HealthzRouter);
	private engagementRouter = appContext.get<EngagementRouter>(EngagementRouter);
	private publishRouter = appContext.get<PublishRouter>(PublishRouter);
	public async loadRoutes(server: Server): Promise<void> {
		this.logger.info('Registering routes');

		await this.errorLogRouter.loadRoutes(server);
		await this.coreEventRouter.loadRoutes(server);
		await this.healthzRouter.loadRoutes(server);
		await this.engagementRouter.loadRoutes(server);
		await this.publishRouter.loadRoutes(server);

		this.logger.info('Routes registered');
		server.table().forEach((route: RequestRoute) => this.logger.info(`${route.method.toString().toUpperCase()} ${route.path}`));
	}
}
