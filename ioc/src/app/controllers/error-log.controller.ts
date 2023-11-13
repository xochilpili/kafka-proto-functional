import { injectable } from 'inversify';
import { appContext } from '../../context';
import { Types } from '../../types';
import { ILogger } from '../../shared/logger';
import { KafkaManager } from '../../seda/modules/kafka-manager';
import { Request, ResponseToolkit, ResponseObject } from '@hapi/hapi';
import { com } from '@engyalo/schemas';

@injectable()
export class ErrorLogController {
	private readonly logger = appContext.get<ILogger>(Types.Logger);
	private readonly kafkaManager = appContext.get<KafkaManager>(Types.KafkaManager);

	public emitErrorLogEvent = async (request: Request, h: ResponseToolkit): Promise<ResponseObject> => {
		try {
			await this.kafkaManager.broadCastEvent<com.yalo.schemas.events.flow_builder.IInterpreterErrorLog>('errorlogs', 'com.yalo.schemas.events.flow_builder.InterpreterErrorLog', {
				key: `key:value`,
				event: {
					errorId: 'error-1',
					workflowId: 'abc',
					workflow: `workflowName`,
					user: `xochilpili`,
					type: 'some type',
					message: 'the message',
					step: '1',
					context: 'the context',
					stacktrace: `the error stack trace`,
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
