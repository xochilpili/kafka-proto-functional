import { client, protobuf as proto } from '@engyalo/kafka-ts';
import { ILogger, pinoLogger } from '../../logger';

export class GenericEventHandler {
	private static logger: ILogger = pinoLogger;

	static messageHandler<T extends Object>(payload: client.MessagePayload<string, proto.ProtobufAlike<T>>): Promise<void> {
		const type = payload?.value?.constructor?.name;
		const { headers, value } = payload;
		switch (type) {
			case 'ErrorLog':
				const { ...rest } = value as T;
				GenericEventHandler.logger.info({ ...rest }, `Message consumed for type: ${type}`);
				break;
			case 'YaloMessage':
				if (headers && (headers['x-message-status'] || headers['x-message-status'])) {
					const headerval = headers['x-message-status'].toString();
					if (headerval === 'Undelivered' || headerval === 'UnsentToProvider') {
						const { ...rest } = value as T;
						GenericEventHandler.logger.info({ ...rest }, `Message consumed for type: ${type}`);
					}
				}
				break;

			default:
				GenericEventHandler.logger.error(`Unable to fetch eventType: ${type} payload: ${JSON.stringify(payload)}`);
				throw new Error(`Unable to find: ${type} message handler`);
		}
		return;
	}
	static deadLetterHandler<T extends Object>(payload: client.MessagePayload<string, proto.ProtobufAlike<T>>): Promise<void> {
		const type = payload?.value?.constructor?.name;
		const { headers, value } = payload;
		switch (type) {
			case 'ErrorLog':
				const { ...rest } = value as T;
				GenericEventHandler.logger.info({ ...rest }, `Message consumed for type: ${type}`);
				break;
			case 'YaloMessage':
				if (headers[''] === 'x') {
					const { ...rest } = value as T;
					GenericEventHandler.logger.info({ ...rest }, `Message consumed for type: ${type}`);
				}
				break;
			default:
				GenericEventHandler.logger.error(`Unable to fetch eventType: ${type} payload: ${JSON.stringify(payload)}`);
				throw new Error(`Unable to find: ${type} message handler`);
		}
		return;
	}
}
