import { injectable } from 'inversify';
import { client, protobuf as proto } from '@engyalo/kafka-ts';
import { Type } from 'protobufjs';

import { TOPICS } from '../shared/topics';

@injectable()
/* eslint-disable */
export class MessageNameTopicResolver implements client.TopicResolver<unknown, proto.ProtobufAlike<Record<string, unknown>>> {
	public async resolveTopic<T extends Object>(_key: unknown | null, value: proto.ProtobufAlike<T> | null): Promise<string> {
		if (value?.constructor?.prototype?.$type instanceof Type) {
			const type = value.constructor.name;
			switch (type) {
				case TOPICS.ERROR_LOGS:
					return 'Interpreter' + value.constructor.name;
				case TOPICS.CORE_MESSAGE_EVENTS:
					return 'CoreMessageEvents';
				case TOPICS.FAKE_EVENT:
					return 'flow_builder.interpreter.FakeEvent';
				case TOPICS.CAMPAIGNS: {
					return `engagement.notification_answer_reference`;
				}
				case TOPICS.MANAGER_ACTIONS: {
					return `flow_builder.manager_actions`;
				}
				default:
					throw new Error(`Unable to find type: ${type} resolving topic`);
			}
		}
		throw new Error('unable to find the message event name');
	}
}
