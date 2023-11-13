import Pino from 'pino';

export type ILogger = Pino.Logger;
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
export const Logger = (configs: Pino.LoggerOptions) => Pino(configs);
