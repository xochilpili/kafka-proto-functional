export const Types = {
	Logger: Symbol.for('Logger'),
	Router: Symbol.for('Router'),
	// kafka
	Kafka: Symbol.for('Kafka'),
	KafkaConfig: Symbol.for('KafkaConfig'),
	SchemaRegistryClient: Symbol.for('SchemaRegistryClient'),
	KafkaSchemaRegister: Symbol.for('KafkaSchemaRegister'),
	KafkaSchemaRegisterClientArgs: Symbol.for('KafkaSchemaRegisterClientArgs'),
	KafkaSchemaRegisterClientOpts: Symbol.for('KafkaSchemaRegisterClientOpts'),
	KafkaSchemaRegisterClient: Symbol.for('KafkaSchemaRegisterClient'),
	// customs
	KafkaManager: Symbol.for('KafkaManager'),
	FactoryConsumer: Symbol.for('Factory<ConsumerManager>'),
	ConsumerManager: Symbol.for('ConsumerManager'),
	ProducerManager: Symbol.for('ProducerManager'),
	GenericEventHandler: Symbol.for('GenericEventHandler'),

	// test
	TestManager: Symbol.for('TestManager'),
	Manager: Symbol.for('Manager'),
};
