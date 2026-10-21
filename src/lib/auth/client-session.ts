/**
 * Client-side session handling shared by every fetch() call to our API.
 *
 * - 401 from an API route: refresh the session once and retry the request. If the
 *   refresh fails (expired, revoked, account disabled/removed/reset), go to /login.
 * - 403 "Password change required": go to /change-password.
 *
 * Installed once as a window.fetch wrapper so the many existing fetch() call sites
 * get this behavior without changes. /api/auth/* is left alone.
 */

const PASSWORD_CHANGE_REQUIRED = "Password change required";

let originalFetch: typeof fetch | null = null;
let refreshInFlight: Promise<boolean> | null = null;
let redirecting = false;

/**
 * Refresh the access token. Single-flight: concurrent callers share one request,
 * because refresh tokens are one-time use and a parallel second refresh would be
 * treated as token theft and revoke the whole session.
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    const doFetch = originalFetch ?? fetch;
    refreshInFlight = doFetch("/api/auth/refresh", { method: "POST" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function redirectTo(path: string) {
  if (redirecting || window.location.pathname === path.split("?")[0]) return;
  redirecting = true;
  // Full navigation so all client state from the old session is dropped
  window.location.assign(path);
}

function isInterceptedApiUrl(input: RequestInfo | URL): boolean {
  const raw = input instanceof Request ? input.url : input.toString();
  const url = new URL(raw, window.location.origin);
  return (
    url.origin === window.location.origin &&
    url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/api/auth/")
  );
}

async function isPasswordChangeRequired(res: Response): Promise<boolean> {
  if (res.status !== 403) return false;
  try {
    const data = await res.clone().json();
    return data?.error === PASSWORD_CHANGE_REQUIRED;
  } catch {
    return false;
  }
}

export function installSessionFetchInterceptor(): void {
  if (typeof window === "undefined" || originalFetch) return;

  const baseFetch = window.fetch.bind(window);
  originalFetch = baseFetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isInterceptedApiUrl(input)) {
      return baseFetch(input, init);
    }

    // A Request body can only be read once — keep a copy for a possible retry
    const retryInput = input instanceof Request ? input.clone() : input;
    let res = await baseFetch(input, init);

    if (res.status === 401) {
      if (!(await refreshSession())) {
        redirectTo("/login?error=Your session has ended. Please sign in again.");
        return res;
      }
      res = await baseFetch(retryInput, init);
      if (res.status === 401) {
        redirectTo("/login?error=Your session has ended. Please sign in again.");
        return res;
      }
    }

    if (await isPasswordChangeRequired(res)) {
      redirectTo("/change-password");
    }

    return res;
  };
}
