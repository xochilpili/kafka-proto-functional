import { injectable, interfaces } from 'inversify';
import { appContext } from '../../context';
import { Types } from '../../types';
import { IConsumerOpts, IConsumerManager } from './consumer';
import { IProduceOptions, IProducerManager } from './producer';
import { ILogger } from '../../shared/logger';
import { IGenericEventHandler } from '../events/events-handler';

export interface IKafkaManager {
	setupConsumer: (identifier: string, options: Partial<IConsumerOpts>) => Promise<void>;
	setupProducer: (identifier: string) => Promise<void>;
	getProducersStatus: (identifier?: string) => boolean;
	getConsumersStatus: (identifier?: string) => boolean;
	getProducers: (identifier?: string) => Map<string, IProducerManager>;
	broadCastEvent: <T>(idenfitier: string, rootSchema: string, opts: IProduceOptions<T>) => Promise<void>;
	diconnectConsumers: (identifier?: string) => Promise<void>;
	disonnectProducers: (identifier?: string) => Promise<void>;
}

@injectable()
export class KafkaManager implements IKafkaManager {
	private readonly logger: ILogger = appContext.get<ILogger>(Types.Logger);
	private readonly handlers: IGenericEventHandler = appContext.get<IGenericEventHandler>(Types.GenericEventHandler);
	private _consumers: Map<string, IConsumerManager> = new Map();
	private _producers: Map<string, IProducerManager> = new Map();

	async setupConsumer(identifier: string, options: Partial<IConsumerOpts>): Promise<void> {
		if (this._consumers.has(identifier)) return;
		const factory = appContext.get<interfaces.Factory<IConsumerManager>>(Types.FactoryConsumer);
		const defaultOpts: Partial<IConsumerOpts> = {
			handlers: {
				messageHandler: this.handlers.messageHandler,
				deadLetterHandler: this.handlers.deadletterHandler,
			},
		};
		const opts = Object.assign({}, options, defaultOpts);
		const consumer = factory(opts) as IConsumerManager;
		this._consumers.set(identifier, consumer);
		try {
			await consumer.startConsumer();
			this.logger.info(`Consumer: ${identifier} connected?`);
		} catch (error) {
			this.logger.error(error, `Unable to connect to consumer: ${identifier}`);
			throw error;
		}
	}

	async setupProducer(identifier: string): Promise<void> {
		if (this._consumers.has(identifier)) return;
		const producer = appContext.get<IProducerManager>(Types.ProducerManager);
		this._producers.set(identifier, producer);
		try {
			await producer.connect();
			this.logger.info(`Producer ${identifier} connected?`);
		} catch (error) {
			this.logger.error(error, `Unable to connect to producer: ${identifier}`);
			throw error;
		}
	}

	getProducersStatus(identifier?: string): boolean {
		if (identifier) {
			if (!this._producers.has(identifier)) return;
			const producer = this._producers.get(identifier);
			return producer.getConnectionStatus();
		}

		const statuses = [];
		this._producers.forEach((producer) => {
			statuses.push(producer.getConnectionStatus());
		});
		if (statuses.length === 0) return false;
		return !statuses.some((v) => v === false);
	}

	getConsumersStatus(identifier?: string): boolean {
		if (identifier) {
			if (!this._consumers.has(identifier)) return;
			const consumer = this._consumers.get(identifier);
			return consumer.getConnectionStatus();
		}
		const statuses = [];
		this._consumers.forEach((consumer) => {
			statuses.push(consumer.getConnectionStatus());
		});
		if (statuses.length === 0) return false;
		return !statuses.some((v) => v === false);
	}

	getProducers(identifier?: string): Map<string, IProducerManager> {
		if (identifier) {
			if (!this._producers.has(identifier)) return;
			const producer = this._producers.get(identifier);
			const m = new Map();
			m.set(identifier, producer);
			return m;
		}

		return this._producers;
	}

	getConsumers(identifier?: string): Map<string, IConsumerManager> {
		if (identifier) {
			if (!this._consumers.has(identifier)) return;
			const producer = this._consumers.get(identifier);
			const m = new Map();
			m.set(identifier, producer);
			return m;
		}

		return this._consumers;
	}

	async broadCastEvent<T>(identifier: string, rootSchema: string, opts: IProduceOptions<T>): Promise<void> {
		if (!this._producers.has(identifier)) return;
		const producer = this._producers.get(identifier);
		try {
			await producer.produce<T>(rootSchema, opts);
			this.logger.info({ rootSchema, opts }, `Broadcast event to producer: ${identifier}`);
		} catch (error) {
			this.logger.error(error, `Error broadcasting event to producer: ${identifier}`);
			throw error;
		}
	}

	async diconnectConsumers(identifier?: string): Promise<void> {
		if (identifier) {
			if (!this._consumers.has(identifier)) return;
			const consumer = this._consumers.get(identifier);
			await consumer.disconnect();
			this.logger.info(`Disconnecting consumer: ${identifier}`);
			return;
		}
		this._consumers.forEach(async (consumer) => {
			this.logger.info(`Disconnecting consumer`);
			await consumer.disconnect();
		});
	}

	async disonnectProducers(identifier?: string): Promise<void> {
		if (identifier) {
			if (!this._producers.has(identifier)) return;
			const producer = this._producers.get(identifier);
			await producer.disconnect();
			this.logger.info(`Disonnecct producer: ${identifier}`);
			return;
		}

		this._producers.forEach(async (producer) => {
			this.logger.info(`Disonnecting producer`);
			await producer.disconnect();
		});
	}
}
