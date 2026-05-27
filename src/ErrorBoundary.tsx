import React, { ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

interface Props {
  children?: ReactNode;
}

function ErrorFallback({ error, resetErrorBoundary }: any) {
  return (
    <div className="min-h-screen bg-[#010409] text-[#e6edf3] flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-[#0d1117] border border-[#ff7b72]/30 rounded-xl p-6 shadow-2xl flex flex-col items-center text-center">
        <div className="w-12 h-12 bg-[#ff7b72]/10 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-[#ff7b72]" />
        </div>
        <h1 className="text-xl font-bold mb-2">Something went wrong</h1>
        <p className="text-sm text-[#8b949e] mb-6">
          The application encountered a critical runtime error and could not render correctly.
        </p>
        
        <div className="w-full bg-[#010409] rounded-lg border border-[#30363d] p-3 overflow-auto text-left mb-6 max-h-32">
          <pre className="text-xs font-mono text-[#ff7b72] whitespace-pre-wrap">
            {error?.message || "Unknown Error"}
          </pre>
        </div>

        <button
          onClick={() => {
            resetErrorBoundary();
            window.location.reload();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#238636] hover:bg-[#2ea043] text-white rounded-lg text-sm font-semibold transition-colors w-full justify-center"
        >
          <RefreshCw className="w-4 h-4" />
          Reload Application
        </button>
      </div>
    </div>
  );
}

export function ErrorBoundary({ children }: Props) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  );
}
