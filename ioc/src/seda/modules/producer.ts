import { injectable } from 'inversify';
import { appContext } from '../../context';
import { ILogger } from '../../shared/logger';
import { Types } from '../../types';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { IHeaders, Kafka } from 'kafkajs';
import { Message } from 'protobufjs/light';
import { client, protobuf as proto } from '@engyalo/kafka-ts';
import { mapProtoFiles, populateMetadata, root } from '@engyalo/schemas';
import { populateSource } from '../events/source';
import { MessageNameTopicResolver } from './mesage-name-topic-resolver';
/* eslint-disable */
export interface IProduceOptions<T extends Object> {
	key: string;
	event: T;
	headers?: IHeaders;
}
/* eslint-enable */
export interface IProducerManager {
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	getConnectionStatus: () => boolean;
	createEventProto: (type: string, event: unknown) => proto.Protobuf;
	produce: <T>(rootSchema: string, payload: IProduceOptions<T>) => Promise<void>;
}

@injectable()
export class ProducerManager implements IProducerManager {
	private readonly logger: ILogger = appContext.get<ILogger>(Types.Logger);
	private readonly kafka: Kafka = appContext.get<Kafka>(Types.Kafka);
	private readonly schemaRegistry: SchemaRegistry = appContext.get<SchemaRegistry>(Types.KafkaSchemaRegisterClient);
	private producer: client.Producer<string, proto.Protobuf>;
	private isConnected = false;

	private async setupProducer(): Promise<client.Producer<string, proto.Protobuf>> {
		const protoIndexes = new Map<string, number[]>();
		(await mapProtoFiles()).forEach((fileMap) => {
			fileMap.forEach((indexes, type) => {
				protoIndexes.set(type, indexes);
			});
		});
		const schemaResolver = new proto.TopicNameSchemaResolver(root, 'com.yalo.schemas.events', protoIndexes, client.SerializationType.ValueSerialization, this.schemaRegistry);
		const serializer = new proto.ProtobufSerializer(schemaResolver, (event: proto.ProtobufAlike<any>) => populateMetadata(event, populateSource));
		const producer = new client.Producer<string, proto.ProtobufAlike<any>>(this.kafka.producer(), new client.StringSerializer(), serializer, new MessageNameTopicResolver());
		await producer.connect();
		return producer;
	}

	async connect(): Promise<void> {
		try {
			this.producer = await this.setupProducer();
			this.isConnected = true;
		} catch (error) {
			this.logger.error({ message: error.message }, 'error connecting kafka producer');
		}
	}

	getConnectionStatus(): boolean {
		return this.isConnected;
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

	async produce<T>(rootSchema: string, payload: IProduceOptions<T>): Promise<void> {
		const msg = this.createEventProto<T>(rootSchema, payload.event);
		if (msg instanceof Message) {
			await this.broadcastEvent(rootSchema, payload.key, msg, payload.headers);
		}
	}

	private async broadcastEvent(rootSchema: string, key: string, event: proto.Protobuf, headers?: IHeaders): Promise<void> {
		try {
			await this.producer.send(key, event, headers);
		} catch (error) {
			this.logger.error({ message: error.message, event }, `Error broadcasting event to schema: ${rootSchema} to kafka!`);
			throw error;
		}
	}
}
