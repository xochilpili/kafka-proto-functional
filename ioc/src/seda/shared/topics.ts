export enum TOPICS {
	ERROR_LOGS = 'ErrorLog',
	CORE_MESSAGE_EVENTS = 'YaloMessage',
	FAKE_EVENT = 'FakeEvent',
	CAMPAIGNS = 'CampaignWebhookSent',
	MANAGER_ACTIONS = 'ManagerActions',
}

export enum CORE_HEADERS {
	UNSENT_TO_PROVIDER = 'UnsentToProvider',
	UNSENT_TO_USER = 'UnsentToUser',
	UNDELIVERED = 'undelivered',
}
