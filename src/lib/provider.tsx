import { Bugdump, type BugdumpConfig } from '@bugdump/sdk';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

// The SDK's own cap on errors sent per minute.
const MAX_HELD_ERRORS = 10;

interface HeldError {
  error: unknown;
  context: Record<string, unknown>;
}

export interface BugdumpContextValue {
  instance: Bugdump | null;
  report: (error: unknown, context: Record<string, unknown>) => void;
}

export const BugdumpContext = createContext<BugdumpContextValue | null>(null);

export interface BugdumpProviderProps {
  config: BugdumpConfig;
  /** Starts the widget only while `true`, e.g. after the user logs in or consents. Defaults to `true`. */
  enabled?: boolean;
  children: ReactNode;
}

/**
 * Starts the Bugdump widget once, after the first render, and destroys it on unmount. Only a change
 * of `apiKey`, `endpoint`, `locale` or `enabled` restarts it; every other option is read once.
 */
export function BugdumpProvider({ config, enabled = true, children }: BugdumpProviderProps) {
  const [instance, setInstance] = useState<Bugdump | null>(null);
  // Errors the boundary caught before the widget started: React calls componentDidCatch before
  // this provider's effect runs, so a crash in the first render has no instance to go to yet.
  const heldErrors = useRef<HeldError[]>([]);
  const { apiKey, endpoint, locale } = config;

  const report = useCallback(
    (error: unknown, context: Record<string, unknown>) => {
      if (!enabled) return;
      const current = Bugdump.getInstance();
      if (current) current.captureException(error, { context });
      else if (heldErrors.current.length < MAX_HELD_ERRORS) heldErrors.current.push({ error, context });
    },
    [enabled],
  );

  useEffect(() => {
    if (!enabled) {
      heldErrors.current = [];
      return;
    }
    const existing = Bugdump.getInstance();
    let current: Bugdump;
    try {
      current = existing ?? Bugdump.init(config);
    } catch (error) {
      // init publishes the instance before its collectors and widget start.
      Bugdump.getInstance()?.destroy();
      heldErrors.current = [];
      console.error('[Bugdump] The widget could not start:', error);
      return;
    }
    for (const { error, context } of heldErrors.current.splice(0)) {
      current.captureException(error, { context });
    }
    setInstance(current);
    return () => {
      if (!existing) current.destroy();
      setInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- every other option is read once, at init
  }, [apiKey, endpoint, locale, enabled]);

  const value = useMemo(() => ({ instance, report }), [instance, report]);
  return <BugdumpContext.Provider value={value}>{children}</BugdumpContext.Provider>;
}

/** The running Bugdump instance, or `null` on the server, before the widget starts and while it is disabled. */
export function useBugdump(): Bugdump | null {
  const value = useContext(BugdumpContext);
  if (!value) throw new Error('useBugdump must be used within a <BugdumpProvider>');
  return value.instance;
}
