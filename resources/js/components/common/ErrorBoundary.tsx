import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  homePath?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    console.error('SIMPRU React ErrorBoundary caught an unhandled exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const homePath = this.props.homePath || '/';
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200/80 p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center mb-4 border border-rose-200 shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
              {this.props.fallbackTitle || 'Terjadi Kendala Memuat Halaman'}
            </h2>

            <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed">
              Aplikasi mengalami kendala teknis saat memproses antarmuka ini. Silakan muat ulang halaman atau kembali ke beranda.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#009966] text-white text-xs font-bold hover:bg-[#008055] transition shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Muat Ulang Halaman
              </button>

              <a
                href={homePath}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                Kembali ke Beranda
              </a>
            </div>

            {this.state.error && (
              <details className="mt-6 text-left border-t border-slate-100 pt-3">
                <summary className="text-[11px] font-semibold text-slate-400 cursor-pointer hover:text-slate-600">
                  Rincian Teknis (Mode Pengembang)
                </summary>
                <div className="mt-2 p-3 rounded-lg bg-slate-950 text-emerald-400 font-mono text-[10px] overflow-x-auto text-left leading-relaxed max-h-40 overflow-y-auto">
                  <p className="font-bold text-rose-400">{this.state.error.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-1 text-slate-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
