import type { ApiError, ApiResponse } from "./types";
import { getToken } from "./auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8081";

type RequestOptions = {
  method?: string;
  body?: BodyInit | null;
  headers?: HeadersInit;
  withAuth?: boolean;
};

function mergeHeaders(defaults: HeadersInit, custom?: HeadersInit): HeadersInit {
  return { ...(defaults as Record<string, string>), ...(custom as Record<string, string>) };
}

async function parseError(response: Response): Promise<never> {
  const payload = await response.json().catch(() => null) as
    | ApiError
    | ApiResponse<unknown>
    | null;

  if (payload && "message" in payload && typeof payload.message === "string") {
    throw new Error(payload.message);
  }

  throw new Error(`Request failed with status ${response.status}`);
}

async function request<T>(
  path: string,
  { method = "GET", body = null, headers, withAuth = false }: RequestOptions = {}
): Promise<T> {
  const baseHeaders: HeadersInit = {};
  if (!(body instanceof FormData)) {
    (baseHeaders as Record<string, string>)["Content-Type"] = "application/json";
  }

  if (withAuth) {
    const token = getToken();
    if (token) {
      (baseHeaders as Record<string, string>)["Authorization"] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: mergeHeaders(baseHeaders, headers),
    body,
  });

  if (!response.ok) {
    return parseError(response);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/pdf")) {
    return (await response.blob()) as T;
  }

  const payload = (await response.json()) as ApiResponse<T>;
  return payload.data;
}

export const api = {
  baseUrl: API_BASE_URL,
  get: <T>(path: string, withAuth = false) => request<T>(path, { withAuth }),
  post: <T>(path: string, data?: unknown, withAuth = false) =>
    request<T>(path, {
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data ?? {}),
      withAuth,
    }),
  put: <T>(path: string, data?: unknown, withAuth = false) =>
    request<T>(path, {
      method: "PUT",
      body: JSON.stringify(data ?? {}),
      withAuth,
    }),
  delete: <T>(path: string, withAuth = false) =>
    request<T>(path, { method: "DELETE", withAuth }),
  downloadPdf: (path: string, withAuth = false) =>
    request<Blob>(path, { withAuth }),
};
