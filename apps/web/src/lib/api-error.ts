/** Single error shape for both demo and live transports. */
export class ApiError extends Error {
  constructor(message: string, public status: number, public requestId?: string) {
    super(message);
    this.name = 'ApiError';
  }
}
