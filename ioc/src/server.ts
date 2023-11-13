import * as Hapi from '@hapi/hapi';
import * as Boom from '@hapi/boom';
import Joi from 'joi';
import { appContext } from './context';
import { ILogger } from './shared/logger';
import { Types } from './types';
import { get as configGet } from './config';
import { IKafkaManager } from './seda/modules/kafka-manager';
import { IRouter } from './plugins/interfaces/router';
import * as Plugins from './plugins';

export default class Server {
	private static logger: ILogger = appContext.get<ILogger>(Types.Logger);
	private static routes = appContext.get<IRouter>(Types.Router);
	private static kafkaManager: IKafkaManager = appContext.get<IKafkaManager>(Types.KafkaManager);
	private static _instance: Hapi.Server;

	public static async start(): Promise<Hapi.Server> {
		try {
			this._instance = new Hapi.Server({
				host: configGet('/service/host') as string,
				port: configGet('/service/port') as number,
				routes: {
					validate: {
						options: {
							abortEarly: false,
						},
						failAction: async (_request, _response, err) => {
							this.logger.error({ err }, 'Request validation error.');
							// TODO Map this error to IError
							// throw Boom.badRequest(err?.details?.map((error) => error.message).join('/'));
							throw Boom.badRequest(err?.message);
						},
					},
					cors: {
						origin: ['*'],
						// Whitelist headers to run locally with Studio
						headers: ['Access-Control-Allow-Headers', 'Access-Control-Allow-Origin', 'Accept', 'Authorization', 'Content-Type', 'If-None-Match'],
						additionalHeaders: ['cache-control', 'x-requested-with', 'authorization', 'www-authenticate', 'sentry-trace'],
					},
				},
			});

			this._instance.validator(Joi);

			// register plugins

			await new Plugins.LoggerLoader().register(this._instance);

			// start kafka producer & consumers
			if (configGet('/kafka/enabled')) {
				await this.startProducers();
				await this.startConsumers();
			}
			// register routes
			await this.routes.loadRoutes(this._instance);

			// Start this instance
			await this._instance.start();
			this.logger.info(`App started in port: ${configGet('/service/port')}`);

			return this._instance;
		} catch (error) {
			this.logger.error(`Something went wrong starting the server`, error);
			throw error;
		}
	}

	public static async startConsumers() {
		await this.kafkaManager.setupConsumer('core', {
			groupId: 'workflows-manager-consumer-1',
			protoTypeName: 'events/channel/yalo_message.proto',
			topic: 'CoreMessageEvents',
			fromBeginning: false,
		});

		await this.kafkaManager.setupConsumer('errorlogs', {
			groupId: 'workflows-manager-consumer-2',
			protoTypeName: 'events/flow_builder/errorlog.proto',
			topic: 'flow_builder.interpreter_error_log',
			fromBeginning: false,
		});

		await this.kafkaManager.setupConsumer('protos', {
			groupId: 'workflows-manager-consumer-3',
			protoTypeName: 'events/flow_builder/manager_actions.proto',
			topic: 'flow_builder.manager_actions',
			fromBeginning: true,
		});
	}

	public static async startProducers() {
		await this.kafkaManager.setupProducer('errorlogs');
		await this.kafkaManager.setupProducer('core');
		await this.kafkaManager.setupProducer('engagement');
	}

	public static getProucersStatus() {
		return this.kafkaManager.getProducersStatus();
	}

	public static getConsumerStatus() {
		return this.kafkaManager.getConsumersStatus();
	}

	public static async disconnectConsumers() {
		await this.kafkaManager.diconnectConsumers('errorlogs');
	}

	public static async stop(): Promise<Error | void> {
		if (configGet('/kafka/enabled')) {
			await this.kafkaManager.disonnectProducers();
			await this.kafkaManager.diconnectConsumers();
		}
		this.logger.info('Server - Stopping execution');
		await this._instance.stop();
	}
}

/*
				await this.kafkaManager.broadCastEvent<com.yalo.schemas.events.interpreter.IErrorLog>('errorLogs', 'com.yalo.schemas.events.interpreter.ErrorLog', {
					key: 'key-test',
					event: {
						errorId: `error`,
						workflowId: `xoch-wkf-manager`,
						workflow: 'something',
						user: 'xoch',
						type: 'type',
						message: `message from manager`,
						step: '1',
						context: '',
						stacktrace: 'stack',
					},
					headers: {
						'correlation-id': '1234',
					},
				});
				*/

// core Producer
/*
				await this.kafkaManager.setupProducer('core');
				await this.kafkaManager.broadCastEvent<com.yalo.schemas.events.channel.IYaloMessage>('core', 'com.yalo.schemas.events.channel.YaloMessage', {
					key: 'test-core',
					headers: {
						'x-message-type': 'MESSAGE_STATUS_UPDATE',
						'x-message-status': 'Undelivered',
						traceparent: '00-0000000000000000125e0247a474ffe1-008130e7f5f84eed-01',
						tracestate: 'dd=s:1;t.dm:-1',
						'x-datadog-trace-id': '1323497847218569185',
						'x-datadog-parent-id': '36364044817944301',
						'x-datadog-sampling-priority': '1',
						'x-datadog-tags': 'tracestate=dd=s:1;t.dm:-1,_dd.p.dm=-1',
					},
					event: {
						type: 1,
						statusContent: {
							status: 6,
							timestamp: { seconds: '1684692808' },
							description: 'Message Undeliverable 3.',
							raw: Buffer.from(
								'eyJpZCI6IjQxYTI0NjU2LTlkZTUtNDEyNC1hOGI1LTA3ZDE2ZjBhODlhZSIsInN0YXR1cyI6ImZhaWxlZCIsInRpbWVzdGFtcCI6MTY4NDY5MjgwODAwMCwicmVjaXBpZW50X2lkIjoiNTIxODMzMjgzMjc2NSIsImVycm9ycyI6W3siY29kZSI6MTMxMDI2LCJ0aXRsZSI6Ik1lc3NhZ2UgVW5kZWxpdmVyYWJsZS4ifV0sImJvdElkIjoiY29wcGVsLXdhLW14IiwiY3JlYXRlZEF0IjoxNjg0NjkyODA4OTIwfQ=='
							),
						},
						Tracking: { namespace: 'platform', service: 'core-data-adapter', messageId: '41a24656-9de5-4124-a8b5-07d16f0a89ae', timestamp: { seconds: '1686088742', nanos: 138449393 }, priority: 1 },
						Routing: { sender: 'xoch-wkf-manager', recipient: '5218332832765', channelType: 'whatsapp', channelId: 'xoch-wkf-manager' },
					},
				});
				*/

// FakeEvents
/*await this.kafkaManager.setupProducer('fakeevents');
				await this.kafkaManager.broadCastEvent<com.yalo.schemas.events.flow_builder.IFakeEvent>('fakeevents', 'com.yalo.schemas.events.flow_builder.FakeEvent', {
					key: 'test-fake',
					headers: {
						'x-app-name': 'proto-functional',
					},
					event: {
						workflowId: '123',
						workflowName: 'fake-workflow-name',
					},
				});*/
