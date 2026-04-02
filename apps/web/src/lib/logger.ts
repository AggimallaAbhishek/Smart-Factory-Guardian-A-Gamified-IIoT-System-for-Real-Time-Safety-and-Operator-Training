export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => {
    console.debug(`[guardian][debug] ${message}`, context ?? {});
  },
  info: (message: string, context?: Record<string, unknown>) => {
    console.info(`[guardian][info] ${message}`, context ?? {});
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[guardian][warn] ${message}`, context ?? {});
  },
  error: (message: string, context?: Record<string, unknown>) => {
    console.error(`[guardian][error] ${message}`, context ?? {});
  }
};
