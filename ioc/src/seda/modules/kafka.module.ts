import { protobuf as proto } from '@engyalo/kafka-ts';
import { SchemaRegistry } from '@kafkajs/confluent-schema-registry';
import { SchemaRegistryAPIClientArgs } from '@kafkajs/confluent-schema-registry/dist/api';
import { ContainerModule, decorate, inject, injectable, interfaces, optional } from 'inversify';
import { Kafka, KafkaConfig, LogEntry, logLevel, SASLOptions } from 'kafkajs';
import { Types } from '../../types';
import { ILogger } from '../../shared/logger';
import { get as getConfig } from '../../config';

export const kafkaModule = new ContainerModule((bind: interfaces.Bind) => {
	bind<KafkaConfig>(Types.KafkaConfig).toDynamicValue((context: interfaces.Context) => {
		const logger = context.container.get<ILogger>(Types.Logger);

		const saslOptions: SASLOptions = {
			mechanism: 'plain',
			username: (getConfig('/kafka/username') as string) || '',
			password: (getConfig('/kafka/password') as string) || '',
		};

		const kafkaConfig: KafkaConfig = {
			clientId: 'workflows-manager',
			brokers: ((getConfig('/kafka/servers') as string) || 'localhost:9092').split(','),
			sasl: (getConfig('/kafka/username') as string) !== undefined && (getConfig('/kafka/username') as string).length > 0 ? saslOptions : undefined,
			ssl: (getConfig('/kafka/username') as string) !== undefined && (getConfig('/kafka/username') as string).length > 0,
			logLevel: logLevel.INFO,
			logCreator: () => (entry: LogEntry) => {
				logger.debug(entry);
			},
		};
		return kafkaConfig;
	});

	// make Kafka injectable
	decorate(injectable(), Kafka);
	// @inject(KafkaConfig) 1st arg to Kafka constructor
	decorate(inject(Types.KafkaConfig), Kafka, 0);
	// bind Kafka to Kafka as a singleton
	bind<Kafka>(Types.Kafka).to(Kafka).inSingletonScope();

	// bind SchemaRegistryAPIClientArgs for use by SchemaRegistry constructor
	bind<SchemaRegistryAPIClientArgs>(Types.KafkaSchemaRegisterClientArgs).toDynamicValue(() => {
		return {
			host: getConfig('/kafka/schemaRegistry/host') as string,
			auth: {
				username: getConfig('/kafka/schemaRegistry/username') as string,
				password: getConfig('/kafka/schemaRegistry/password') as string,
			},
		};
	});

	// annotate SchemaRegistry so constructor will be injected correctly
	decorate(injectable(), SchemaRegistry);
	decorate(inject(Types.KafkaSchemaRegisterClientArgs), SchemaRegistry, 0);
	decorate(optional(), SchemaRegistry, 1);
	decorate(inject(Types.KafkaSchemaRegisterClientOpts), SchemaRegistry, 1);
	bind<proto.SchemaRegistryClient>(Types.KafkaSchemaRegisterClient).to(SchemaRegistry).inSingletonScope();
});
