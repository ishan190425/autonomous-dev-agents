/**
 * Prisma Client Singleton
 *
 * Prevents multiple Prisma Client instances in development
 * due to hot module reloading.
 *
 * Note: Run `npx prisma generate` after installing dependencies
 * to generate the Prisma Client types.
 *
 * @author ⚙️ Engineering (Cycle 1190)
 * @see https://www.prisma.io/docs/guides/database/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client') as {
  PrismaClient: new (options?: {
    log?: ('query' | 'info' | 'warn' | 'error')[];
  }) => PrismaClientType;
};

/**
 * Prisma Client type
 * This is a placeholder until `npx prisma generate` is run
 */
type PrismaClientType = {
  $connect(): Promise<void>;
  $disconnect(): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientType | undefined;
};

/**
 * Prisma Client instance
 * Reuses existing instance in development to prevent connection exhaustion
 */
export const prisma: PrismaClientType =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
