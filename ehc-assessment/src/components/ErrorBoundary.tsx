import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logger } from '../utils/logger';
import { logError } from '../utils/auditLog';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ErrorBoundary caught:', error, info.componentStack);
    logError(error, `ErrorBoundary${info.componentStack ? ' — ' + info.componentStack.slice(0, 200) : ''}`);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <h2 className="text-lg font-semibold text-red-800">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h2>
            <p className="text-sm text-gray-600">
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 text-sm font-medium rounded-lg text-white transition-all"
              style={{ backgroundColor: 'var(--brand-primary)' }}
            >
              Try Again
            </button>
            <p className="text-xs text-gray-500">
              Your data has been auto-saved. Try refreshing the page if the issue persists.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
