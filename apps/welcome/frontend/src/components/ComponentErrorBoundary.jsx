import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

class ComponentErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`Component error in ${this.props.name || 'Component'}:`, error, errorInfo);
    this.setState({ error: error });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Show a smaller, inline error UI
      return (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4 my-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">
                {this.props.name || 'Component'} Error
              </h3>
              <p className="text-sm text-red-700 mt-1">
                {this.props.fallbackMessage || 'This component encountered an error and could not be displayed.'}
              </p>
            </div>
            <button
              onClick={this.handleRetry}
              className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1 rounded transition-colors flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
          
          {/* Show error details in development */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-red-700 hover:text-red-900">
                Error Details (Development)
              </summary>
              <div className="mt-2 p-2 bg-red-100 rounded text-xs font-mono text-red-800 overflow-auto max-h-32">
                {this.state.error.toString()}
              </div>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ComponentErrorBoundary;