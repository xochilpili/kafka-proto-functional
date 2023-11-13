import { client, protobuf as proto } from '@engyalo/kafka-ts';
import { mapProtoFiles, populateMetadata, root } from '@engyalo/schemas';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { IHeaders, Kafka, SASLOptions } from 'kafkajs';

import { get as configGet } from '../../config';
import { populateSource } from '../events/source';
import { MessageNameTopicResolver } from './message-name-topic-resolver';
import { ILogger, pinoLogger } from '../../logger';

export interface IEventBroker {
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	createEventProto: <T>(type: string, event: T) => proto.Protobuf;
	broadcastEvent: (key: string, event: proto.Protobuf, headers?: IHeaders) => Promise<void>;
}

export class EventBroker implements IEventBroker {
	private readonly _kafka: Kafka;
	private readonly _schema: SchemaRegistry;
	private producer: client.Producer<string, proto.ProtobufAlike<Record<string, unknown>>>;
	private readonly logger: ILogger = pinoLogger;

	constructor(kafka: Kafka) {
		this._kafka = kafka;
		this._schema = new SchemaRegistry({
			host: configGet('/kafka/schemaRegistry/host') as string,
			auth: {
				username: configGet('/kafka/schemaRegistry/username') as string,
				password: configGet('/kafka/schemaRegistry/password') as string,
			},
		});
	}

	private async setupProducer(): Promise<client.Producer<string, proto.Protobuf>> {
		const protoIndexes = new Map<string, number[]>();
		(await mapProtoFiles()).forEach((fileMap) => {
			fileMap.forEach((indexes, type) => {
				protoIndexes.set(type, indexes);
			});
		});
		const schemaResolver = new proto.TopicNameSchemaResolver(root, 'com.yalo.schemas.events', protoIndexes, client.SerializationType.ValueSerialization, this._schema);
		const serializer = new proto.ProtobufSerializer(schemaResolver, (event: proto.ProtobufAlike<any>) => populateMetadata(event, populateSource));
		const producer = new client.Producer<string, proto.ProtobufAlike<any>>(this._kafka.producer(), new client.StringSerializer(), serializer, new MessageNameTopicResolver());
		await producer.connect();
		return producer;
	}

	async connect(): Promise<void> {
		try {
			this.producer = await this.setupProducer();
		} catch (error) {
			this.logger.error(error, `Unable to connect producer`);
		}
	}

	async disconnect(): Promise<void> {
		if (this.producer) {
			await this.producer.disconnect();
		}
	}

	createEventProto<T>(type: string, event: T): proto.Protobuf {
		const eventType = root.lookupType(type);
		if (eventType) {
			return eventType.create(event);
		}
	}

	async broadcastEvent(key: string, event: proto.Protobuf, headers?: IHeaders): Promise<void> {
		try {
			await this.producer.send(key, event, headers);
		} catch (error) {
			this.logger.error(error, `Unable to send event!`);
		}
	}
}
