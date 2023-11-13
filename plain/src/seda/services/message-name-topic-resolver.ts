import { client, protobuf as proto } from '@engyalo/kafka-ts';
import { Type } from 'protobufjs';
import { com } from '@engyalo/schemas';

// TODO: Add support for other events
// eslint-disable-next-line camelcase
export class MessageNameTopicResolver implements client.TopicResolver<unknown, proto.ProtobufAlike<Record<string, unknown>>> {
	// eslint-disable-next-line camelcase
	public async resolveTopic(_key: unknown | null, value: proto.ProtobufAlike<com.yalo.schemas.events.interpreter.IErrorLog> | proto.ProtobufAlike<com.yalo.schemas.events.channel.IYaloMessage> | null): Promise<string> {
		console.log('topic', value.constructor.name);
		if (value?.constructor?.prototype?.$type instanceof Type) {
			const type = value.constructor.name;
			switch (type) {
				case 'ErrorLog':
					return 'Interpreter' + value.constructor.name;
				case 'YaloMessage':
					return 'CoreMessageEvents';
				case 'FakeEvent':
					return 'flow_builder.interpreter.FakeEvent';
				default:
					throw new Error(`Unable to find type: ${type} resolving topic`);
			}
		}
		throw new Error('unable to find the message event name');
	}
}
