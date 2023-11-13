import { injectable } from 'inversify';
import { appContext } from '../../context';
import { Types } from '../../types';
import { ILogger } from '../../shared/logger';
import { KafkaManager } from '../../seda/modules/kafka-manager';
import { Request, ResponseToolkit, ResponseObject } from '@hapi/hapi';
import { com } from '@engyalo/schemas';

@injectable()
export class EngagementController {
	private readonly logger = appContext.get<ILogger>(Types.Logger);
	private readonly kafkaManager = appContext.get<KafkaManager>(Types.KafkaManager);

	public emitErrorLogEvent = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
		try {
			await this.kafkaManager.broadCastEvent<com.yalo.schemas.events.engagement.ICampaignWebhookSent>('engagement', 'com.yalo.schemas.events.engagement.CampaignWebhookSent', {
				key: `key:value`,
				event: {
					channelIds: [],
					stepId: 4,
					userId: '5512283057927',
					workflowId: '64a0b852dadbf44c7610daf6',
				},
				headers: {
					executionId: `execution-id`,
					workflowId: `wokflow-id`,
					workflowName: `workflow-name`,
					userId: `user-id`,
				},
			});
			return h.response({ message: 'sent' }).code(200);
		} catch (error) {
			this.logger.error(error, `Error sending event on controller`);
			throw error;
		}
	};
}
