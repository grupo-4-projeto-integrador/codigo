export type ApiEnvelope<T> = {
  data?: T;
  error?: {
    message: string;
    detail?: unknown;
  };
  request_id?: string;
};

export class ApiError extends Error {
  readonly status: number;
  readonly requestId?: string;
  readonly detail?: unknown;

  constructor(message: string, options: { status: number; requestId?: string; detail?: unknown }) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.requestId = options.requestId;
    this.detail = options.detail;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const payload = await parseJson<T>(response);

  if (!response.ok) {
    const envelope = payload as ApiEnvelope<T> | undefined;
    const message = envelope?.error?.message || (payload as { message?: string } | undefined)?.message || 'Request failed';
    throw new ApiError(message, {
      status: response.status,
      requestId: envelope?.request_id,
      detail: envelope?.error?.detail,
    });
  }

  return unwrapData(payload);
}

async function parseJson<T>(response: Response): Promise<T | ApiEnvelope<T> | undefined> {
  try {
    return (await response.json()) as T | ApiEnvelope<T>;
  } catch {
    return undefined;
  }
}

function unwrapData<T>(payload: T | ApiEnvelope<T> | undefined): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data as T;
  }

  return payload as T;
}
