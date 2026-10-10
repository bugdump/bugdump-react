import { Bugdump } from '@bugdump/sdk';
import { Component, type ContextType, type ErrorInfo, type ReactNode } from 'react';
import { BugdumpContext } from './provider';

export interface BugdumpErrorBoundaryProps {
  children: ReactNode;
  fallback: ReactNode | ((error: unknown, reset: () => void) => ReactNode);
  onError?: (error: unknown, info: ErrorInfo) => void;
}

interface BugdumpErrorBoundaryState {
  // A thrown value can be `null` or `undefined`, so the flag is kept apart from the error.
  hasError: boolean;
  error: unknown;
}

/** Shows `fallback` when a child throws, and sends the error to Bugdump with its component stack. */
export class BugdumpErrorBoundary extends Component<BugdumpErrorBoundaryProps, BugdumpErrorBoundaryState> {
  static contextType = BugdumpContext;
  declare context: ContextType<typeof BugdumpContext>;

  state: BugdumpErrorBoundaryState = { hasError: false, error: undefined };

  static getDerivedStateFromError(error: unknown): BugdumpErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    const context = { componentStack: info.componentStack };
    if (this.context) this.context.report(error, context);
    else Bugdump.getInstance()?.captureException(error, { context });
    this.props.onError?.(error, info);
  }

  reset = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;
    const { fallback } = this.props;
    return typeof fallback === 'function' ? fallback(this.state.error, this.reset) : fallback;
  }
}
