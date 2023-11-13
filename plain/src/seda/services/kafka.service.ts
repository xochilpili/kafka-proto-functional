import { Kafka, SASLOptions } from 'kafkajs';
import { get as configGet } from '../../config';
export class KafkaManager {
	private readonly _kafka: Kafka;

	constructor(clientId: string) {
		const username = configGet('/kafka/username') as string;
		const password = configGet('/kafka/password') as string;
		const brokers = configGet('/kafka/servers') as string;
		const saslOptions: SASLOptions = {
			mechanism: 'plain',
			username,
			password,
		};

		this._kafka = new Kafka({
			clientId,
			brokers: brokers.split(','),
			sasl: !!username ? saslOptions : undefined,
			ssl: !!username,
		});
	}

	getKafka() {
		return this._kafka;
	}
}
