import { inject, injectable } from 'inversify';
import { root, mapProtoFiles } from '@engyalo/schemas';
import { client, protobuf as proto } from '@engyalo/kafka-ts';
import { ILogger } from '../../shared/logger';
import { Types } from '../../types';
import { Kafka } from 'kafkajs';
import { IMessageHandler } from '../events/events-handler';

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
	getConnectionStatus: () => boolean;
	startConsumer: () => Promise<void>;
	disconnect: () => Promise<void>;
}

@injectable()
export class ConsumerManager implements IConsumerManager {
	private _consumer: client.Consumer<string, proto.Protobuf>;
	private _opts: IConsumerOpts;
	private isConnected = false;

	constructor(@inject(Types.Logger) private logger: ILogger, @inject(Types.Kafka) private kafka: Kafka, options: IConsumerOpts) {
		this.logger = logger;
		this.kafka = kafka;
		this._opts = options;
	}

	private async setupConsumer(): Promise<void> {
		const typesMap = mapProtoFiles().get(this._opts.protoTypeName);
		if (typesMap === undefined) {
			throw new Error('no types map found');
		}

		const entityResolver = new proto.MessageIndexEntityResolver(root, 'com.yalo.schemas.events', new Map([[this._opts.topic, typesMap]]));

		const deserializer = new proto.ProtobufDeserializer(entityResolver);
		const kafkaConsumer = this.kafka.consumer({ groupId: this._opts.groupId });

		this._consumer = new client.Consumer<string, proto.Protobuf>(kafkaConsumer, { messageHandler: this._opts.handlers.messageHandler, deadLetterHandler: this._opts.handlers.deadLetterHandler }, new client.StringDeserializer(), deserializer);
		this.setupEventListeners();
		await this._consumer.connect();
		await this._consumer.subscribe(this._opts.topic, this._opts.fromBeginning);
		await this._consumer.run();
	}

	setupEventListeners(): void {
		this._consumer.consumer.on('consumer.connect', () => {
			this.logger.info(`Consumer connected to topic: ${this._opts.topic}!`);
		});
		this._consumer.consumer.on('consumer.group_join', (e) => {
			this.logger.info(`Consumer joined to group: ${this._opts.groupId}`);
			this.isConnected = true;
		});
		this._consumer.consumer.on('consumer.stop', () => {
			this.logger.info(`Consumer: ${this._opts.groupId} has stopped operations!`);
		});
		this._consumer.consumer.on('consumer.crash', (e) => {
			this.logger.error(`Consumer: ${this._opts.groupId} for topic: ${this._opts.topic} has crashed!`);
			this.isConnected = false;
			this.reconnect();
		});
	}

	async reconnect(): Promise<void> {
		while (true) {
			try {
				if (this._consumer) await this._consumer.disconnect();
				await this.startConsumer();
				this.logger.warn('Reconnected!');
				break;
			} catch (error) {
				this.logger.error('Reconnection Failed!');
				await new Promise((resolve) => setTimeout(resolve, 5000)); // Retry after 5 seconds
			}
		}
	}

	getConnectionStatus(): boolean {
		return this.isConnected;
	}

	public async startConsumer(): Promise<void> {
		while (true) {
			try {
				await this.setupConsumer();
				break;
			} catch (error) {
				this.logger.error(error, `Failed setting up consumer!`);
			}
		}
	}

	async disconnect(): Promise<void> {
		if (this._consumer) {
			await this._consumer.disconnect();
		}
	}
}
