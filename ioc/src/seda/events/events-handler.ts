import { injectable } from 'inversify';
import { appContext } from '../../context';
import { Types } from '../../types';
import { ILogger } from '../../shared/logger';
import { client, protobuf as proto } from '@engyalo/kafka-ts';
import { CORE_HEADERS, TOPICS } from '../shared/topics';
import { com } from '@engyalo/schemas';
/* eslint-disable */
export interface IMessageHandler {
	<T extends Object>(payload: client.MessagePayload<string, proto.ProtobufAlike<T>>): Promise<void>;
}

export interface IGenericEventHandler {
	messageHandler: IMessageHandler;
	deadletterHandler?: IMessageHandler;
}

@injectable()
export class GenericEventHandler {
	messageHandler<T extends Object>(payload: client.MessagePayload<string, proto.ProtobufAlike<T>>): Promise<void> {
		const logger: ILogger = appContext.get<ILogger>(Types.Logger);
		const type = payload?.value?.constructor?.name;
		const { headers, value } = payload;
		switch (type) {
			case TOPICS.ERROR_LOGS: {
				const { ...rest } = value as T;
				logger.info({ ...rest }, `Message consumed for type: ${type}`);
				break;
			}
			case TOPICS.CORE_MESSAGE_EVENTS: {
				if (headers && (headers['x-message-status'] || headers['x-message-status'])) {
					const headerval = headers['x-message-status'].toString();
					if (headerval.toLowerCase() === CORE_HEADERS.UNDELIVERED.toLowerCase() || headerval.toLowerCase() === CORE_HEADERS.UNSENT_TO_PROVIDER.toLowerCase() || headerval.toLowerCase() === CORE_HEADERS.UNSENT_TO_USER.toLowerCase()) {
						const { ...rest } = value as T;
						logger.info({ ...rest }, `Message consumed for type: ${type}`);
					}
				}
				break;
			}
			case TOPICS.MANAGER_ACTIONS: {
				const { ...rest } = value as com.yalo.schemas.events.flow_builder.IManagerActions;
				const size = Buffer.byteLength(JSON.stringify(payload), 'utf-8');
				console.log('payload size ', size, size / 1024, size / (1024 * 1024));
				const size2 = Buffer.byteLength(rest.publishWorkflow, 'utf-8');
				console.log('message size ', size2, size2 / 1024, size2 / (1024 * 1024));
				//logger.info(JSON.parse(rest.publishWorkflow), `Message`);
				break;
			}
			case TOPICS.FAKE_EVENT: {
				const { ...rest } = payload;
				logger.info({ ...rest }, `Message consumed for type: ${type}`);
				break;
			}
			default: {
				logger.error(`Unable to fetch eventType: ${type} payload: ${JSON.stringify(payload)}`);
				throw new Error(`Unable to find: ${type} message handler`);
			}
		}
		return;
	}
}
