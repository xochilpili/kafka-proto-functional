import { injectable } from 'inversify';
import { appContext } from '../../context';
import { ILogger } from '../../shared/logger';
import { Types } from '../../types';
import { KafkaManager } from '../../seda/modules/kafka-manager';
import { Request, ResponseObject, ResponseToolkit } from '@hapi/hapi';
import { root, com } from '@engyalo/schemas';

@injectable()
export class PublishController {
	private readonly logger = appContext.get<ILogger>(Types.Logger);
	private readonly kafkaManager = appContext.get<KafkaManager>(Types.KafkaManager);

	public publishWorkflow = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
		try {
			const actionEnum = root.lookupEnum('com.yalo.schemas.events.flow_builder.ManagerActions.ActionType');
			const statusEnum = root.lookupEnum('com.yalo.schemas.events.flow_builder.GeneralStatus');
			const channelType = root.lookupEnum('com.yalo.schemas.events.flow_builder.Workflow.Channel.ChannelType');
			const type = 'whatsapp';
			const channel = channelType.values[type.toUpperCase()];
			await this.kafkaManager.broadCastEvent<com.yalo.schemas.events.flow_builder.IManagerActions>('core', 'com.yalo.schemas.events.flow_builder.ManagerActions', {
				key: 'test-core',
				headers: {
					'x-datadog-tags': 'tracestate=dd=s:1;t.dm:-1,_dd.p.dm=-1',
				},
				event: {
					actionType: actionEnum.values.WORKFLOW_PUBLISHED,
					publishWorkflow: JSON.stringify({
						_id: 'aa',
						name: 'test',
						language: 'es',
						customerId: '',
						partnerId: '',
						sessionTimeHrs: 24,
						status: statusEnum.values.ACTIVE,
						stepSequence: 0,
						channels: [
							{
								channelId: 'asd',
								type: channel,
								url: '',
								WhatsappConfig: {
									phoneNumber: '',
									url: '',
								},
							},
						],
					}),
				},
			});
			return h.response({ message: 'event sent' }).code(200);
		} catch (error) {
			this.logger.error(error, `Error emiting event form controller`);
			throw error;
		}
	};
}
