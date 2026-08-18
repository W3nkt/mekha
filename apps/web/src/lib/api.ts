const apiBaseUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

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

export const apiDownload = async (
  path: string,
  init?: RequestInit,
): Promise<{ blob: Blob; filename: string | null }> => {
  const response = await fetch(`${apiBaseUrl}${path}`, init);
  if (!response.ok) {
    throw new ApiError("Download failed", response.status, "REQUEST_FAILED");
  }
  const disposition = response.headers.get("content-disposition") ?? "";
  const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? null;
  return { blob: await response.blob(), filename };
};
