const isDev = import.meta.env.DEV

export const log = {
  debug(message: string, ...args: unknown[]): void {
    if (isDev) console.debug(`[Diverge] ${message}`, ...args)
  },
  info(message: string, ...args: unknown[]): void {
    if (isDev) console.info(`[Diverge] ${message}`, ...args)
  },
  warn(message: string, ...args: unknown[]): void {
    if (isDev) console.warn(`[Diverge] ${message}`, ...args)
  },
  error(message: string, ...args: unknown[]): void {
    console.error(`[Diverge] ${message}`, ...args)
  },
}
