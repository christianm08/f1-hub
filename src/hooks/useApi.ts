/* useApi: fetch-once hook with loading / error / retry states. */
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "../api/client";
import { useSettings } from "../store/settings";
import type { DictKey } from "../i18n/dict";

export type ApiState<T> =
  | { status: "loading"; data: null; error: null }
  | { status: "ok"; data: T; error: null }
  | { status: "error"; data: null; error: ApiError };

export function useApi<T>(fn: () => Promise<T>, deps: unknown[]): ApiState<T> & { retry: () => void } {
  const { t } = useSettings();
  const [state, setState] = useState<ApiState<T>>({ status: "loading", data: null, error: null });
  const [nonce, setNonce] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const tRef = useRef(t);
  tRef.current = t;

  const retry = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading", data: null, error: null });
    fnRef.current()
      .then((data) => {
        if (!cancelled) setState({ status: "ok", data, error: null });
      })
      .catch((e) => {
        if (!cancelled) setState({ status: "error", data: null, error: e instanceof ApiError ? e : new ApiError(String(e)) });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  return { ...state, retry };
}

export function apiErrorMessage(e: ApiError, t: (k: DictKey) => string): string {
  if (e.message === "network_error") return t("error_body");
  return t("error_body");
}
