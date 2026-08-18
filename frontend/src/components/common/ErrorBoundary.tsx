import { Component } from 'react';
import type { ReactNode } from 'react';
import { ErrorState } from './ErrorState';

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[ErrorBoundary]', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Well, that's a tangle"
          message="Something went wrong on our end. No laundry was harmed — try reloading."
          actionLabel="Reload spin"
          onAction={() => window.location.reload()}
        />
      );
    }
    return this.props.children;
  }
}
