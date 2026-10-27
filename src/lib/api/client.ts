// Typed API client with complete in-memory mock engine support.
//
// Every operation executes against the client-side state store and persists to
// localStorage, providing full reactivity, instant transitions, and realistic
// regulatory workflows without external network dependencies.

import { createSyntheticPdfBlob, handleMockApiRequest, mockStore } from "./mockEngine";

const CSRF_COOKIE = "koshsetu_csrf";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string>;
  readonly requestId?: string;

  constructor(
    status: number,
    code: string,
    message: string,
    fieldErrors: Record<string, string> = {},
    requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
    this.requestId = requestId;
  }

  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  get isVersionConflict(): boolean {
    return this.code === "CASE_VERSION_CONFLICT";
  }
}

export function newIdempotencyKey(): string {
  return crypto.randomUUID();
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  try {
    const result = await handleMockApiRequest(path, options);
    return result as T;
  } catch (err: unknown) {
    const errorObj = err as {
      status?: number;
      code?: string;
      message?: string;
      fieldErrors?: Record<string, string>;
      requestId?: string;
    };
    const status = errorObj.status || 500;
    const code = errorObj.code || (status === 401 ? "UNAUTHENTICATED" : "OPERATION_ERROR");
    const message = errorObj.message || "An unexpected error occurred.";

    if (status === 401 && !path.startsWith("/auth/")) {
      window.dispatchEvent(new CustomEvent("koshsetu:unauthenticated"));
    }

    throw new ApiError(status, code, message, errorObj.fieldErrors || {}, errorObj.requestId);
  }
}

/** Upload the object itself into the simulated storage. */
export async function uploadObject(uploadUrl: string, file: File): Promise<void> {
  // Simulate network transfer
  await new Promise((r) => setTimeout(r, 120));
  if (!file) {
    throw new ApiError(400, "UPLOAD_FAILED", "No file was provided for upload.");
  }
}

/** Fetch a document through an authorized ticket and hand back a valid PDF blob URL. */
export async function fetchDocumentBlob(fdrId: string, documentId: string): Promise<string> {
  const fdr = mockStore.fdrs.find((f) => f.id === fdrId);
  const fdrNumber = fdr ? fdr.fdr_number_masked : "FDR-4821";
  const amount = fdr ? parseFloat(fdr.principal_amount).toLocaleString("en-IN") : "20,00,000.00";

  const blob = createSyntheticPdfBlob(fdrNumber, amount);
  return URL.createObjectURL(blob);
}
