const apiBaseUrl =
  import.meta.env.VITE_API_URL ?? "https://mekha-api.wen-kt2020.workers.dev";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export const apiRequest = async <T>(
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  const payload = (await response.json()) as T & {
    error?: string;
    code?: string;
    details?: Record<string, unknown>;
  };

  if (!response.ok) {
    throw new ApiError(
      payload.error ?? "Request failed",
      response.status,
      payload.code ?? "REQUEST_FAILED",
      payload.details,
    );
  }

  return payload;
};
