"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Returns `value` after it has stopped changing for `delay` ms.
 *
 * Used by search inputs and async comboboxes so typing a search term fires one
 * request instead of eleven.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    if (value === debounced) return;

    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
    // `debounced` is deliberately excluded: including it would restart the
    // timer on every settle and double the effective delay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, delay]);

  return debounced;
}

/**
 * Debounces a callback. The returned function keeps a stable identity, so it is
 * safe to pass to memoized children.
 */
export function useDebouncedCallback<TArgs extends unknown[]>(
  callback: (...args: TArgs) => void,
  delay = 300,
): (...args: TArgs) => void {
  // Held in a ref so the returned function stays stable even when the caller
  // passes a new closure on every render.
  const callbackRef = useRef(callback);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return useCallback(
    (...args: TArgs) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => callbackRef.current(...args), delay);
    },
    [delay],
  );
}
