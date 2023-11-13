import Server from './server';
import { com } from '@engyalo/schemas';
(async () => {
	await Server.start();

	// produce errorLog message
	const errorsPayload = {
		key: 'key-test',
		event: {
			workflowId: `1234`,
			workflow: 'fake-workflow-name',
		},
		headers: {
			'correlation-id': '1234',
		},
	};
	await Server.produce<com.yalo.schemas.events.flow_builder.IFakeEvent>('com.yalo.schemas.events.flow_builder.FakeEvent', errorsPayload, 1).catch(console.log);

	// produce coreYaloMessageEvent message

	/*const corePayload = {
		key: '',
		headers: {
			'x-message-type': 'MESSAGE_STATUS_UPDATE',
			'x-message-status': 'Undelivered',
			traceparent: '00-0000000000000000125e0247a474ffe1-008130e7f5f84eed-01',
			tracestate: 'dd=s:1;t.dm:-1',
			'x-datadog-trace-id': '1323497847218569185',
			'x-datadog-parent-id': '36364044817944301',
			'x-datadog-sampling-priority': '1',
			'x-datadog-tags': 'tracestate=dd=s:1;t.dm:-1,_dd.p.dm=-1',
		},
		event: {
			type: 1,
			statusContent: {
				status: 6,
				timestamp: { seconds: '1684692808' },
				description: 'Message Undeliverable 3.',
				raw: Buffer.from(
					'eyJpZCI6IjQxYTI0NjU2LTlkZTUtNDEyNC1hOGI1LTA3ZDE2ZjBhODlhZSIsInN0YXR1cyI6ImZhaWxlZCIsInRpbWVzdGFtcCI6MTY4NDY5MjgwODAwMCwicmVjaXBpZW50X2lkIjoiNTIxODMzMjgzMjc2NSIsImVycm9ycyI6W3siY29kZSI6MTMxMDI2LCJ0aXRsZSI6Ik1lc3NhZ2UgVW5kZWxpdmVyYWJsZS4ifV0sImJvdElkIjoiY29wcGVsLXdhLW14IiwiY3JlYXRlZEF0IjoxNjg0NjkyODA4OTIwfQ=='
				),
			},
			Tracking: { namespace: 'platform', service: 'core-data-adapter', messageId: '41a24656-9de5-4124-a8b5-07d16f0a89ae', timestamp: { seconds: '1686088742', nanos: 138449393 }, priority: 1 },
			Routing: { sender: 'xoch-wkf-01', recipient: '5218332832765', channelType: 'whatsapp', channelId: 'xoch-wkf-01' },
		},
	};

	await Server.produce<com.yalo.schemas.events.channel.IYaloMessage>('com.yalo.schemas.events.channel.YaloMessage', corePayload, 1).catch(console.log);*/

	const signalTraps = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
	signalTraps.forEach((type) => {
		process.once(type, async () => {
			try {
				await Server.stop();
			} finally {
				process.kill(process.pid, type);
			}
		});
	});
})();
