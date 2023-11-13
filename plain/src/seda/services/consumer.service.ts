import { Kafka } from 'kafkajs';
import { client, protobuf as proto } from '@engyalo/kafka-ts';
import { mapProtoFiles, root } from '@engyalo/schemas';
import { ILogger, pinoLogger } from '../../logger';

export interface IMessageHandler {
	<T extends Object>(payload: client.MessagePayload<string, proto.ProtobufAlike<T>>): Promise<void>;
}

export interface IConsumerOpts {
	groupId: string;
	topic: string;
	protoTypeName: string;
	fromBeginning: boolean;
	handlers: {
		messageHandler: IMessageHandler;
		deadLetterHandler: IMessageHandler;
	};
}

export interface IConsumerManager {
	startConsumer: (opts: IConsumerOpts) => Promise<void>;
	disconnect: () => Promise<void>;
}

export class ConsumerManager implements IConsumerManager {
	private readonly logger: ILogger = pinoLogger;
	private _kafka: Kafka;
	private _consumer: client.Consumer<string, proto.Protobuf>;
	private isConnected = false;

	constructor(kafka: Kafka) {
		this._kafka = kafka;
	}

	private async setupConsumer(opts: IConsumerOpts): Promise<void> {
		const typesMap = mapProtoFiles().get(opts.protoTypeName);
		if (typesMap === undefined) {
			throw new Error('no types map found');
		}

		const entityResolver = new proto.MessageIndexEntityResolver(root, 'com.yalo.schemas.events', new Map([[opts.topic, typesMap]]));

		const deserializer = new proto.ProtobufDeserializer(entityResolver);
		const kafkaConsumer = this._kafka.consumer({ groupId: opts.groupId });

		this._consumer = new client.Consumer<string, proto.Protobuf>(kafkaConsumer, { messageHandler: opts.handlers.messageHandler, deadLetterHandler: opts.handlers.deadLetterHandler }, new client.StringDeserializer(), deserializer);

		this.setupEventListeners(opts);
		await this._consumer.connect();
		await this._consumer.subscribe(opts.topic, opts.fromBeginning);
		await this._consumer.run();
	}

	private setupEventListeners(opts): void {
		this._consumer.consumer.on('consumer.connect', () => {
			this.logger.info(`Consumer connected to topic: ${opts.topic}!`);
		});
		this._consumer.consumer.on('consumer.group_join', (e) => {
			this.logger.info(`Consumer joined to group: ${opts.groupId}`);
			this.isConnected = true;
		});
		this._consumer.consumer.on('consumer.stop', () => {
			this.logger.error(`Consumer: ${opts.groupId} has stopped operations!`);
		});
		this._consumer.consumer.on('consumer.crash', (e) => {
			this.logger.error({ error: e }, `Consumer: ${opts.groupId} for topic: ${opts.topic} has crashed!`);
			this.isConnected = false;
			this.reconnect(opts);
		});
	}

	public async startConsumer(opts: IConsumerOpts): Promise<void> {
		// Pre-validate if we're reciving a valid protoSchema
		const typesMap = mapProtoFiles().get(opts.protoTypeName);
		if (typesMap === undefined) {
			throw new Error('no types map found');
		}

		while (true) {
			try {
				await this.setupConsumer(opts);
				break;
			} catch (error) {
				this.logger.error(error, `Failed setting up consumer!`);
			}
		}
	}

	private async reconnect(opts): Promise<void> {
		while (true) {
			try {
				if (this._consumer) await this._consumer.disconnect();
				await this.startConsumer(opts);
				this.logger.warn('Reconnected!');
				break;
			} catch (error) {
				this.logger.error('Reconnection Failed!');
				await new Promise((resolve) => setTimeout(resolve, 5000)); // Retry after 5 seconds
			}
		}
	}

	async disconnect(): Promise<void> {
		if (this._consumer) {
			await this._consumer.disconnect();
		}
	}
}
