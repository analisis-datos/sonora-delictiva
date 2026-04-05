import React from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-[#0d1117] text-gray-200">
          <div className="glass max-w-md w-full p-8 rounded-2xl border border-red-500/30 bg-red-900/10 shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h1 className="text-xl font-bold text-white mb-3">Algo falló al procesar los datos</h1>
            <p className="text-sm text-gray-400 mb-6 leading-relaxed">
              El dashboard encontró un formato inesperado o los datos base están inconsistentes en este momento.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors shadow-lg shadow-red-900/50"
            >
              <RefreshCcw size={16} /> Recargar Inicio
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
