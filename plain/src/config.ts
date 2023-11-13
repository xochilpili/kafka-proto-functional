import { Store } from '@hapipal/confidence';
import dotEnv from 'dotenv';

dotEnv.config();

const document = {
	env: { $env: 'ENV', $default: 'development' },
	logger: {
		options: {
			console: { $env: 'LOGGER_DEBUG', $coerce: 'boolean', $default: false },
		},
		level: { $env: 'LOGGER__LEVEL', $default: 'info' },
		events: { $env: 'LOGGER__EVENTS', $default: '' },
	},
	kafka: {
		enabled: { $env: 'KAFKA__ENABLED', $coerce: 'boolean', $default: true },
		servers: { $env: 'KAFKA__SERVERS' },
		username: { $env: 'KAFKA__USERNAME', $default: '' },
		password: { $env: 'KAFKA__PASSWORD', $default: '' },
		mechanism: { $env: 'KAFKA__MECHANISM', $default: 'PLAIN' },
		schemaRegistry: {
			host: { $env: 'KAFKA__SCHEMA_REGISTRY__HOST' },
			username: { $env: 'KAFKA__SCHEMA_REGISTRY__USERNAME', $default: '' },
			password: { $env: 'KAFKA__SCHEMA_REGISTRY__PASSWORD', $default: '' },
		},
	},
};

const configStore = new Store(document);
export const get = (key: string): string | boolean | number => configStore.get(key);
