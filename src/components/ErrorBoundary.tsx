'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
          <div className="bg-zinc-900 border border-red-500/30 rounded-2xl p-8 max-w-md w-full space-y-4 text-center">
            <div className="flex justify-center">
              <div className="p-3 bg-red-500/10 rounded-full">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-white">Something went wrong</h2>
            {this.state.message && (
              <p className="text-zinc-400 text-sm font-mono bg-zinc-950 rounded-lg px-4 py-2">
                {this.state.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg transition-colors font-medium text-sm"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
