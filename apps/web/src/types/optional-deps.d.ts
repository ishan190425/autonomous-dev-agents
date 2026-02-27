// Stubs for optional peer dependencies from @ada-ai/core
// These are only needed at runtime in specific contexts, not in the web app
declare module '@xenova/transformers' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function pipeline(...args: any[]): Promise<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export const env: any;
}

declare module 'better-sqlite3' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Database: any;
  export default Database;
}

declare module 'sqlite-vec' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function load(...args: any[]): any;
}
