import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let details = "";

      if (this.state.error?.message) {
        try {
          const parsedError = JSON.parse(this.state.error.message);
          if (parsedError.error) {
            errorMessage = parsedError.error;
            details = `Operation: ${parsedError.operationType} | Path: ${parsedError.path}`;
          }
        } catch (e) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="flex flex-col items-center justify-center h-screen w-full bg-background text-foreground p-4 text-center">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h1 className="text-2xl font-bold mb-2">Oops! Something went wrong.</h1>
          <p className="text-muted-foreground mb-4 max-w-md">
            {errorMessage}
          </p>
          {details && (
            <p className="text-xs text-muted-foreground mb-6 font-mono bg-muted p-2 rounded">
              {details}
            </p>
          )}
          <Button onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
