import { get as configGet } from './config';
import { ILogger, pinoLogger } from './logger';
import { ConsumerManager, IConsumerOpts } from './seda/services/consumer.service';
import { Kafka } from 'kafkajs';
import { KafkaManager } from './seda/services/kafka.service';
import { GenericEventHandler } from './seda/events/generic-message-handler';

export default class Server {
	private static logger: ILogger = pinoLogger;
	private static kafka: Kafka = new KafkaManager('kafka-poc-functional').getKafka();
	private static processingActionsConsumer = new ConsumerManager(Server.kafka);
	private static genericEventHandler = new GenericEventHandler();

	public static async start(): Promise<void> {
		try {
			// start kafka producer
			if (configGet('/kafka/enabled')) {
				await this.startConsumers();
				// await this.producerManager.connect();
			}
		} catch (error) {
			this.logger.error(`Something went wrong starting the server`, error);
			throw error;
		}
	}

	private static async startConsumers(): Promise<void> {
		// Interpreter will consume messages from flows-proxy using: flow_builder.interpreter_processing_actions topic
		const processingActionsOpts: IConsumerOpts = {
			groupId: 'processing-actions-consumer-group-test',
			fromBeginning: false,
			protoTypeName: 'events/flow_builder/interpreter_processing_actions.proto',
			topic: 'flow_builder.interpreter_processing_actions',
			handlers: {
				messageHandler: Server.genericEventHandler.messageHandler,
				deadLetterHandler: Server.genericEventHandler.deadLetterHandler,
			},
		};
		await this.processingActionsConsumer.startConsumer(processingActionsOpts);

		/*
		const errorOpts: IConsumerOpts = {
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
		/*
		const coreOpts: IConsumerOpts = {
			groupId: 'core-yalomessage',
			fromBeginning: true,
			protoTypeName: 'events/channel/yalo_message.proto',
			topic: 'CoreMessageEvents',
			handlers: {
				messageHandler: Server.genericEventHandler.messageHandler,
				deadLetterHandler: Server.genericEventHandler.deadLetterHandler,
			},
		};
		await this.coreMessageConsumer.startConsumer(coreOpts);
		*/
	}

	public static async stop(): Promise<Error | void> {
		this.logger.info('Server - Stopping execution');
		if (configGet('/kafka/enabled')) {
			await this.processingActionsConsumer.disconnect();
		}
	}
}
