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

	constructor(kafka: Kafka) {
		this._kafka = kafka;
	}

	private async setupConsumer(opts: IConsumerOpts): Promise<client.Consumer<string, proto.Protobuf>> {
		const typesMap = mapProtoFiles().get(opts.protoTypeName);
		if (typesMap === undefined) {
			throw new Error('no types map found');
		}

		const entityResolver = new proto.MessageIndexEntityResolver(root, 'com.yalo.schemas.events', new Map([[opts.topic, typesMap]]));

		const deserializer = new proto.ProtobufDeserializer(entityResolver);
		const kafkaConsumer = this._kafka.consumer({ groupId: opts.groupId });

		this._consumer = new client.Consumer<string, proto.Protobuf>(kafkaConsumer, { messageHandler: opts.handlers.messageHandler, deadLetterHandler: opts.handlers.deadLetterHandler }, new client.StringDeserializer(), deserializer);
		await this._consumer.connect();
		await this._consumer.subscribe(opts.topic, opts.fromBeginning);
		return this._consumer;
	}

	async startConsumer(opts: IConsumerOpts): Promise<void> {
		try {
			await this.setupConsumer(opts);
			await this._consumer.run();
		} catch (error) {
			this.logger.error(error, `Unable to setup consumer`);
		}
	}

	async disconnect(): Promise<void> {
		if (this._consumer) {
			await this._consumer.disconnect();
		}
	}
}
