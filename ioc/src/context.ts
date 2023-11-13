import { Container, interfaces } from 'inversify';
import { ILogger, Logger } from './shared/logger';
import { Types } from './types';
import { get as configGet } from './config';
import { kafkaModule } from './seda/modules/kafka.module';
import { ConsumerManager, IConsumerManager, IConsumerOpts } from './seda/modules/consumer';
import { ProducerManager } from './seda/modules/producer';
import { Kafka } from 'kafkajs';
import { IKafkaManager, KafkaManager } from './seda/modules/kafka-manager';
import { GenericEventHandler, IGenericEventHandler } from './seda/events/events-handler';
import { LoggerOptions } from 'pino';
import { IRouter } from './plugins/interfaces/router';
import { Router } from './router';

const appContext = new Container({
	defaultScope: 'Request',
	autoBindInjectable: true,
});

const loggerOpts: LoggerOptions = {
	level: configGet('/logger/level') as string,
	formatters: {
		level: (label: string) => {
			return { severity: label.toUpperCase() };
		},
	},
};

appContext.bind<ILogger>(Types.Logger).toConstantValue(Logger(loggerOpts));
appContext.bind<IRouter>(Types.Router).to(Router);
appContext.bind<IGenericEventHandler>(Types.GenericEventHandler).to(GenericEventHandler).inSingletonScope();
appContext.load(kafkaModule);
appContext.bind<IKafkaManager>(Types.KafkaManager).to(KafkaManager).inSingletonScope();
appContext.bind<IConsumerManager>(Types.ConsumerManager).to(ConsumerManager);
appContext.bind<IConsumerManager>(Types.FactoryConsumer).toFactory((context: interfaces.Context) => {
	return (opts: IConsumerOpts) => {
		const logger = context.container.get<ILogger>(Types.Logger);
		const kafka = context.container.get<Kafka>(Types.Kafka);
		const consumer = new ConsumerManager(logger, kafka, opts);
		return consumer;
	};
});
appContext.bind<ProducerManager>(Types.ProducerManager).to(ProducerManager);
export { appContext };
