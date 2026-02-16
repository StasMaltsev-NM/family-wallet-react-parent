import { useCallback, useRef, useState } from 'react';

const waitNextPaint = () =>
  new Promise<void>((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
      return;
    }
    setTimeout(resolve, 0);
  });

export const getErrorMessage = (err: unknown, fallback = 'Неизвестная ошибка') => {
  if (err instanceof Error) {
    const message = String(err.message || '').trim();
    return message || fallback;
  }
  if (typeof err === 'string' && err.trim()) return err.trim();
  return fallback;
};

export const useInstantAction = () => {
  const pendingKeysRef = useRef<Set<string>>(new Set());
  const [pendingKeys, setPendingKeys] = useState<Record<string, boolean>>({});

  const isPending = useCallback((key: string) => Boolean(pendingKeys[key]), [pendingKeys]);

  const runInstant = useCallback(async <T>(key: string, action: () => Promise<T>) => {
    if (pendingKeysRef.current.has(key)) return null;
    pendingKeysRef.current.add(key);
    setPendingKeys((prev) => ({ ...prev, [key]: true }));

    // Даем браузеру кадр для визуального отклика кнопки до сетевого запроса.
    await waitNextPaint();

    try {
      return await action();
    } finally {
      pendingKeysRef.current.delete(key);
      setPendingKeys((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  }, []);

  return { runInstant, isPending };
};
