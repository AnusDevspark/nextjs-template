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
  downloadFile,
  saveBlob,
  timestampedFilename,
  filenameFromContentDisposition,
  type DownloadOptions,
} from "./download";

// `server-api` is intentionally not re-exported here: it imports `server-only`,
// and pulling it into this barrel would make every client import of `@/lib/api`
// a build error. Import it directly from "@/lib/api/server-api".
