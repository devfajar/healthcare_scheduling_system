import { Prisma } from '../generated/prisma/client';

/**
 * Utility to identify Prisma Known Request Errors by code reliably,
 * accommodating both runtime Prisma errors and Jest test mock errors.
 */
export function isPrismaErrorWithCode(error: unknown, code: string): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === code;
  }
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === code
  );
}
