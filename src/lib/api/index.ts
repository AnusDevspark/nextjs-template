export {
  createApiClient,
  buildUrl,
  serializeQuery,
  type ApiClient,
  type ApiClientConfig,
  type RequestOptions,
  type HttpMethod,
  type QueryParams,
  type QueryValue,
} from "./api-client";

export {
  clientApi,
  authApi,
  refreshSession,
  setAccessToken,
  getStoredAccessToken,
  setSessionExpiredHandler,
} from "./client-api";

export {
  ERROR_CODES,
  MAX_PAGE_SIZE,
  DEFAULT_PAGE_SIZE,
  FIRST_PAGE,
  TERMINAL_AUTH_CODES,
  isTerminalAuthCode,
  isApiFailure,
  isApiPaginated,
  type ApiSuccess,
  type ApiPaginated,
  type ApiFailure,
  type ApiResponse,
  type PaginationMeta,
  type FieldError,
  type ErrorCode,
} from "./contract";

export {
  downloadFile,
  saveBlob,
  timestampedFilename,
  filenameFromContentDisposition,
  type DownloadOptions,
} from "./download";

// `server-api` is intentionally not re-exported here: it imports `server-only`,
// and pulling it into this barrel would make every client import of `@/lib/api`
// a build error. Import it directly from "@/lib/api/server-api".
