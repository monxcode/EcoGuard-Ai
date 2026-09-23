import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import { useApp } from "../context/AppContext";

export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

interface Entry<T> {
  key: string;
  data: T | null;
  error: string | null;
  loading: boolean;
}

/**
 * Generic GET data hook with loading/error/retry states.
 * Refetches when the path (e.g. locationId query), Demo Mode, or reload changes.
 * While a fetch for the current key has not completed, the hook reports
 * `{ data: null, loading: true }` so previous-location data is never shown.
 */
export function useApi<T>(path: string | null): ApiState<T> {
  const { settings } = useApp();
  const { demoMode } = settings;
  const [nonce, setNonce] = useState(0);
  const key = path ? `${path}|${demoMode ? 1 : 0}|${nonce}` : "";
  const [entry, setEntry] = useState<Entry<T>>({
    key,
    data: null,
    error: null,
    loading: Boolean(path),
  });

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    fetch(path)
      .then(async (res) => {
        if (!res.ok) {
          let message = `Request failed (${res.status}).`;
          try {
            const body = (await res.json()) as { error?: { message?: string } };
            if (body.error?.message) message = body.error.message;
          } catch {
            /* keep default */
          }
          throw new Error(message);
        }
        return res.json();
      })
      .then((json: T) => {
        if (!cancelled) setEntry({ key, data: json, error: null, loading: false });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setEntry({
            key,
            data: null,
            error: err instanceof Error ? err.message : "Something went wrong.",
            loading: false,
          });
      });
    return () => {
      cancelled = true;
    };
  }, [key, path]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  if (!path) return { data: null, loading: false, error: null, reload };
  if (entry.key !== key) return { data: null, loading: true, error: null, reload };
  return { data: entry.data, loading: entry.loading, error: entry.error, reload };
}

/** Run an async action with pending/error state (for buttons and forms). */
export function useAction<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
): {
  run: (...args: Args) => Promise<R | undefined>;
  pending: boolean;
  error: string | null;
  reset: () => void;
} {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (...args: Args): Promise<R | undefined> => {
      setPending(true);
      setError(null);
      try {
        return await fn(...args);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [fn],
  );

  const reset = useCallback(() => setError(null), []);
  return { run, pending, error, reset };
}

export { api };
