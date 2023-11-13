import Pino, { pino } from 'pino';
export type ILogger = Pino.Logger;
import { get as configGet } from './config';

export const pinoLogger = pino({
	level: configGet('/logger/level') as string,
	enabled: configGet('/logger/enabled') as boolean,
});
