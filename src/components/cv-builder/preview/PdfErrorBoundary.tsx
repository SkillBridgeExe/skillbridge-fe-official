import React, { Component, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Translation } from 'react-i18next';
import { captureStudioEvent } from '@/lib/studio-telemetry';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class PdfErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('PDF Renderer Error:', error, errorInfo);
    captureStudioEvent('preview_render', { outcome: 'failure', errorCode: 'render_crash' });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <Translation ns="diagnosis">
          {(t) => (
            <div className="w-[794px] h-[1123px] bg-slate-50 flex items-center justify-center p-8 relative overflow-hidden shrink-0">
              <div className="relative bg-white border border-red-100 rounded-2xl p-8 max-w-[420px] shadow-sm text-center">
                <div className="w-14 h-14 bg-red-50 border-2 border-dashed border-red-200 rounded-2xl flex items-center justify-center mx-auto mb-5 transform -rotate-3">
                  <AlertCircle className="w-6 h-6 text-red-500 rotate-3" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-2">
                  {t("builder.previewErrorTitle")}
                </h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">
                  {t("builder.previewErrorDesc")}
                </p>
                <details className="text-left mb-6 group">
                  <summary className="text-[11px] font-semibold text-slate-500 cursor-pointer hover:text-slate-700 outline-none select-none">
                    {t("builder.previewTechnicalDetails")}
                  </summary>
                  <div className="mt-2 bg-red-50 p-3 rounded-lg text-[10px] text-red-600 font-mono w-full overflow-auto max-h-32 border border-red-100/50 custom-scrollbar">
                    {this.state.error?.message || t("builder.previewUnknownError")}
                  </div>
                </details>
                <button
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                >
                  {t("builder.previewRetry")}
                </button>
              </div>
            </div>
          )}
        </Translation>
      );
    }

    return this.props.children;
  }
}
