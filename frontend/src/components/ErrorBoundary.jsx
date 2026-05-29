import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-tn-bg px-4">
          <div className="glass-panel p-8 sm:p-12 rounded-3xl max-w-md w-full text-center space-y-6 animate-scale-in">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 border border-red-100">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <div className="space-y-2">
              <h2 className="font-display font-bold text-xl text-tn-text">
                Something went wrong
              </h2>
              <p className="text-sm text-tn-text-secondary">
                An unexpected error occurred. Please try refreshing the page.
              </p>
            </div>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn-primary mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh Page</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
