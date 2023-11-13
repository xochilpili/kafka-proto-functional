import 'reflect-metadata';
import { appContext } from '../../src/context';
import { Types } from '../../src/types';
import kafkajs, { Kafka, KafkaConfig, logLevel, LogEntry } from 'kafkajs';
import { client, protobuf as proto } from '@engyalo/kafka-ts';
import { ConsumerManager } from '../../src/seda/modules/consumer';
import { ILogger } from '../../src/shared/logger';

describe('Test Consumer', () => {
	let kafkaInstance: Kafka;
	let kafkaConsumer: any, kafkaConsumerConnect: any, kafkaConsumerSubscribe: any, kafkaConsumerRun: any, kafkaConsumerRunEach: any, kafkaConsumerCommitOffsets: any, kafkaConsumerDisconnect: any;
	let kafkaProducer: any;
	beforeAll(() => {
		const mockKafka = jest.spyOn(kafkajs, 'Kafka').mockImplementationOnce(() => ({
			constructor: (config: KafkaConfig) => jest.fn().mockReturnValue(config),
			producer: (kafkaProducer = jest.fn().mockResolvedValue(Promise.resolve())),
			consumer: (kafkaConsumer = jest.fn().mockImplementation(() => ({
				connect: (kafkaConsumerConnect = jest.fn().mockResolvedValue(false as any)),
				subscribe: (kafkaConsumerSubscribe = jest.fn().mockResolvedValue(true as any)),
				run: jest.fn().mockImplementation((args) => {
					kafkaConsumerRunEach = args;
				}),
				events: {
					GROUP_JOIN: 'GROUP_JOIN',
				},
				commitOffsets: (kafkaConsumerCommitOffsets = jest.fn().mockResolvedValue(true as any)),
				disconnect: (kafkaConsumerDisconnect = jest.fn().mockResolvedValue(true as any)),
			}))),
			admin: jest.fn().mockResolvedValue(true as any),
			logger: jest.fn().mockResolvedValueOnce(Promise.resolve()),
		}));

		kafkaInstance = new Kafka({
			clientId: 'fake-client-id',
			brokers: ['fake-broker:9091'],
			logLevel: logLevel.INFO,
			logCreator: () => (event: LogEntry) => {
				console.log(event);
			},
		});
	});

	afterAll(async () => {
		jest.restoreAllMocks();
	});

	it('should load a consumer', async () => {
		const options = {
			groupId: 'consumer-2',
			protoTypeName: 'events/interpreter/errorlog.proto',
			topic: 'InterpreterErrorLog',
			handlers: {
				messageHandler: jest.fn(),
				deadLetterHandler: jest.fn(),
			},
			fromBeginning: false,
		};
		const looger: ILogger = appContext.get<ILogger>(Types.Logger);
		const consumer = new ConsumerManager(looger, kafkaInstance, options);
		expect(consumer).toBeDefined();
		await consumer.connect();
	});

	it('should connect and start consumer', async () => {
		const options = {
			groupId: 'consumer-2',
			protoTypeName: 'events/interpreter/errorlog.proto',
			topic: 'InterpreterErrorLog',
			handlers: {
				messageHandler: jest.fn(),
				deadLetterHandler: jest.fn(),
			},
			fromBeginning: false,
		};
		const looger: ILogger = appContext.get<ILogger>(Types.Logger);
		const consumer = new ConsumerManager(looger, kafkaInstance, options);
		await consumer.connect();
		expect(consumer).toBeDefined();
		expect(kafkaConsumerConnect).toHaveBeenCalled();
		expect(consumer.getConnectionStatus()).toBe(true);
		expect(kafkaConsumerSubscribe).toHaveBeenCalled();
		expect(kafkaConsumerSubscribe).toHaveBeenCalledWith({ fromBeginning: false, topic: 'InterpreterErrorLog' });
	});

	it('should commitOffset when handled deadLetter invalid formatted message', async () => {
		const messageHandler = jest.fn().mockImplementation((payload: client.MessagePayload<string, proto.ProtobufAlike<any>>) => jest.fn().mockResolvedValue(payload));
		const deadLetterHandler = jest.fn().mockImplementation((payload: client.MessagePayload<string, proto.ProtobufAlike<any>>) => jest.fn().mockResolvedValue(payload));
		const options = {
			groupId: 'consumer-2',
			protoTypeName: 'events/interpreter/errorlog.proto',
			topic: 'InterpreterErrorLog',
			handlers: {
				messageHandler: messageHandler,
				deadLetterHandler: deadLetterHandler,
			},
			fromBeginning: false,
		};
		const looger: ILogger = appContext.get<ILogger>(Types.Logger);
		const consumer = new ConsumerManager(looger, kafkaInstance, options);
		await consumer.connect();
		expect(consumer).toBeDefined();
		expect(kafkaConsumerConnect).toHaveBeenCalled();
		expect(consumer.getConnectionStatus()).toBe(true);
		expect(kafkaConsumerSubscribe).toHaveBeenCalled();
		expect(kafkaConsumerSubscribe).toHaveBeenCalledWith({ fromBeginning: false, topic: 'InterpreterErrorLog' });
		// fake consume BAD Json message
		await kafkaConsumerRunEach.eachMessage({
			topic: options.topic,
			partition: 1,
			message: {
				value: 'BAD',
				offset: 1,
			},
		});
		expect(kafkaConsumerCommitOffsets).toBeCalled();
		expect(messageHandler).not.toHaveBeenCalled();
		expect(deadLetterHandler).toHaveBeenCalled();
		expect(kafkaConsumerCommitOffsets).toHaveBeenCalledWith([{ offset: 1, partition: 1, topic: options.topic }]);
	});

	it('should consume correctly a proto message', async () => {
		const messageHandler = jest.fn().mockImplementation((payload: client.MessagePayload<string, proto.ProtobufAlike<any>>) => jest.fn().mockResolvedValue(payload));
		const deadLetterHandler = jest.fn().mockImplementation((payload: client.MessagePayload<string, proto.ProtobufAlike<any>>) => jest.fn().mockResolvedValue(payload));
		const options = {
			groupId: 'consumer-2',
			protoTypeName: 'events/interpreter/errorlog.proto',
			topic: 'InterpreterErrorLog',
			handlers: {
				messageHandler: messageHandler,
				deadLetterHandler: messageHandler,
			},
			fromBeginning: false,
		};
		const looger: ILogger = appContext.get<ILogger>(Types.Logger);
		const consumer = new ConsumerManager(looger, kafkaInstance, options);
		await consumer.connect();
		expect(consumer).toBeDefined();
		expect(kafkaConsumerConnect).toHaveBeenCalled();
		expect(consumer.getConnectionStatus()).toBe(true);
		expect(kafkaConsumerSubscribe).toHaveBeenCalled();
		expect(kafkaConsumerSubscribe).toHaveBeenCalledWith({ fromBeginning: false, topic: 'InterpreterErrorLog' });
		// fake consume VALID proto messageq
		await kafkaConsumerRunEach.eachMessage({
			topic: options.topic,
			partition: 1,
			message: {
				key: 'aa',
				value: new Uint8Array([
					0, 0, 0, 0, 35, 2, 0, 10, 92, 18, 12, 8, 178, 187, 150, 164, 6, 16, 128, 198, 152, 131, 3, 26, 76, 8, 4, 18, 17, 119, 111, 114, 107, 102, 108, 111, 119, 115, 45, 109, 97, 110, 97, 103, 101, 114, 26, 26, 119, 111, 114, 107, 102, 108, 111, 119, 115,
					45, 109, 97, 110, 97, 103, 101, 114, 45, 105, 110, 115, 116, 97, 110, 99, 101, 34, 25, 119, 111, 114, 107, 102, 108, 111, 119, 115, 45, 109, 97, 110, 97, 103, 101, 114, 45, 97, 100, 100, 114, 101, 115, 115, 18, 14, 120, 111, 99, 104, 45, 119, 107,
					102, 45, 107, 97, 102, 107, 97, 26, 9, 115, 111, 109, 101, 116, 104, 105, 110, 103, 34, 5, 101, 114, 114, 111, 114, 42, 4, 120, 111, 99, 104, 50, 1, 49, 58, 4, 116, 121, 112, 101, 66, 7, 109, 101, 115, 115, 97, 103, 101, 74, 5, 115, 116, 97, 99, 107,
					90, 0,
				]),
				offset: 1,
			},
		});
		expect(kafkaConsumerCommitOffsets).toBeCalled();
		expect(messageHandler).toHaveBeenCalled();
		expect(messageHandler).toHaveBeenCalledWith({
			headers: undefined,
			key: 'aa',
			offset: 1,
			partition: 1,
			topic: 'InterpreterErrorLog',
			value: expect.objectContaining({
				context: '',
				errorId: 'error',
				message: 'message',
				stacktrace: 'stack',
				step: '1',
				type: 'type',
				user: 'xoch',
				workflow: 'something',
				workflowId: 'xoch-wkf-kafka',
			}),
		});
		expect(deadLetterHandler).not.toHaveBeenCalled();
		expect(kafkaConsumerCommitOffsets).toHaveBeenCalledWith([{ offset: 1, partition: 1, topic: options.topic }]);
	});
});
