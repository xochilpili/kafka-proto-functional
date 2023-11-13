import { injectable } from 'inversify';
import { appContext } from '../../context';
import { ILogger } from '../../shared/logger';
import { Types } from '../../types';
import { KafkaManager } from '../../seda/modules/kafka-manager';
import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi';
import { com } from '@engyalo/schemas';

@injectable()
export class CoreEventsController {
	private readonly logger = appContext.get<ILogger>(Types.Logger);
	private readonly kafkaManager = appContext.get<KafkaManager>(Types.KafkaManager);

	public emitCoreEvent = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
		try {
			await this.kafkaManager.broadCastEvent<com.yalo.schemas.events.channel.IYaloMessage>('core', 'com.yalo.schemas.events.channel.YaloMessage', {
				key: 'key_value',
				headers: {
					'x-message-type': 'MESSAGE_STATUS_UPDATE',
				},
				event: {
					type: 1,
					statusContent: {
						status: 6,
						description: 'Message Undeliverable 3.',
						raw: Buffer.from(
							'eyJpZCI6IjQxYTI0NjU2LTlkZTUtNDEyNC1hOGI1LTA3ZDE2ZjBhODlhZSIsInN0YXR1cyI6ImZhaWxlZCIsInRpbWVzdGFtcCI6MTY4NDY5MjgwODAwMCwicmVjaXBpZW50X2lkIjoiNTIxODMzMjgzMjc2NSIsImVycm9ycyI6W3siY29kZSI6MTMxMDI2LCJ0aXRsZSI6Ik1lc3NhZ2UgVW5kZWxpdmVyYWJsZS4ifV0sImJvdElkIjoiY29wcGVsLXdhLW14IiwiY3JlYXRlZEF0IjoxNjg0NjkyODA4OTIwfQ=='
						),
					},
					Tracking: { namespace: 'platform', service: 'core-data-adapter', messageId: '41a24656-9de5-4124-a8b5-07d16f0a89ae', timestamp: { seconds: '1686088742', nanos: 138449393 }, priority: 1 },
					Routing: { sender: 'xoch-wkf-manager', recipient: '5218332832765', channelType: 'whatsapp', channelId: 'xoch-wkf-manager' },
					profiles: [{ id: 'a', displayName: 'displayName' }],
				},
			});
			return h.response({ message: 'event sent' }).code(200);
		} catch (error) {
			this.logger.error(error, `Error emiting event form controller`);
			throw error;
		}
	};
}
