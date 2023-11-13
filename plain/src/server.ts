import { get as configGet } from './config';
import { ILogger, pinoLogger } from './logger';
import { Message } from 'protobufjs/light';
import { EventBroker, IEventBroker } from './seda/services/producer.service';
import { ConsumerManager, IConsumerOpts } from './seda/services/consumer.service';
import { IHeaders, Kafka } from 'kafkajs';
import { KafkaManager } from './seda/services/kafka.service';
import { GenericEventHandler } from './seda/events/generic-message-handler';

export default class Server {
	private static logger: ILogger = pinoLogger;
	private static kafka: Kafka = new KafkaManager('kafka-poc-functional').getKafka();
	private static producerManager: IEventBroker = new EventBroker(Server.kafka);
	private static errorLogConsumer = new ConsumerManager(Server.kafka);
	private static coreMessageConsumer = new ConsumerManager(Server.kafka);
	private static genericEventHandler = GenericEventHandler;

	public static async start(): Promise<void> {
		try {
			// start kafka producer
			if (configGet('/kafka/enabled')) {
				await this.producerManager.connect();
				/*const errorOpts: IConsumerOpts = {
					groupId: 'error-log-consumer',
					fromBeginning: false,
					protoTypeName: 'events/interpreter/errorlog.proto',
					topic: 'InterpreterErrorLog',
					handlers: {
						messageHandler: Server.genericEventHandler.messageHandler,
						deadLetterHandler: Server.genericEventHandler.deadLetterHandler,
					},
				};
				await this.errorLogConsumer.startConsumer(errorOpts);*/
				/*const coreOpts: IConsumerOpts = {
					groupId: 'core-yalomessage',
					fromBeginning: true,
					protoTypeName: 'events/channel/yalo_message.proto',
					topic: 'CoreMessageEvents',
					handlers: {
						messageHandler: Server.genericEventHandler.messageHandler,
						deadLetterHandler: Server.genericEventHandler.deadLetterHandler,
					},
				};
				await this.coreMessageConsumer.startConsumer(coreOpts);*/
			}
		} catch (error) {
			this.logger.error(`Something went wrong starting the server`, error);
			throw error;
		}
	}

	public static async produce<T>(rootSchema: string, payload: { key: string; event: T; headers: IHeaders }, totalMsg: number): Promise<void> {
		if (!configGet('/kafka/enabled')) {
			this.logger.info("ErrorLogs won't be sent, Kafka is disabled");
			return;
		}
		try {
			for (let i = 1; i <= totalMsg; i++) {
				const msg = this.producerManager.createEventProto<T>(rootSchema, payload.event);
				if (msg instanceof Message) {
					await this.producerManager.broadcastEvent(payload.key, msg, payload.headers);
					this.logger.info(`Message sent!`);
				} else {
					throw new Error(`Event couldnt be verified as proto!`);
				}
			}
		} catch (error) {
			this.logger.error(error, `Unable to send message [server]`);
		}
	}

	public static async stop(): Promise<Error | void> {
		this.logger.info('Server - Stopping execution');
		if (configGet('/kafka/enabled')) {
			await this.producerManager.disconnect();
			await this.errorLogConsumer.disconnect();
			await this.coreMessageConsumer.disconnect();
		}
	}
}
