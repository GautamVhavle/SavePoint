import type { Context } from 'hono';
import { ZodError } from 'zod';

const TITLES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  409: 'Conflict',
  411: 'Length Required',
  413: 'Payload Too Large',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  429: 'Too Many Requests',
  500: 'Internal Server Error',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
};

/** Mirrors FastAPI's HTTPException so route code reads the same as before. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly detail: string,
    readonly headers: Record<string, string> = {},
    readonly extra: Record<string, unknown> = {},
  ) {
    super(detail);
    this.name = 'HttpError';
  }
}

/**
 * RFC 7807 problem document, byte-compatible with the retired FastAPI handler so
 * existing clients and contract tests keep working.
 */
export function problem(
  c: Context,
  status: number,
  detail: string,
  headers: Record<string, string> = {},
  extra: Record<string, unknown> = {},
): Response {
  const body = {
    type: 'about:blank',
    title: TITLES[status] ?? 'Error',
    status,
    detail,
    // Vercel's Node adapter hands Hono a relative request URL, so the pathname
    // is read directly rather than through `new URL(...)`, which would throw.
    instance: c.req.path,
    ...extra,
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/problem+json', ...headers },
  });
}

/**
 * Zod issues are reshaped into FastAPI's validation envelope. Submitted values
 * are deliberately dropped so payloads are never reflected back to the caller.
 */
export function validationProblem(c: Context, error: ZodError): Response {
  const errors = error.issues.map(issue => ({
    loc: ['body', ...issue.path.map(String)],
    msg: issue.message,
    type: issue.code,
  }));
  return problem(c, 422, 'Request validation failed', {}, { errors });
}

/** Postgres unique/foreign-key violations surface as 409, never as raw SQL text. */
function isIntegrityViolation(error: unknown): boolean {
  const code = (error as { code?: string } | null)?.code;
  return code === 'P2002' || code === 'P2003' || code === 'P2014';
}

export function toResponse(c: Context, error: unknown): Response {
  if (error instanceof HttpError) {
    return problem(c, error.status, error.detail, error.headers, error.extra);
  }
  if (error instanceof ZodError) return validationProblem(c, error);
  if (isIntegrityViolation(error)) {
    return problem(c, 409, 'That change conflicts with existing data.');
  }
  console.error('unhandled_api_error', error);
  return problem(c, 500, 'The archive could not complete that request.');
}
