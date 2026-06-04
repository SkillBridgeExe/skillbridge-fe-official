import { useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { CvBuilderHeader } from "@/components/cv-builder/CvBuilderHeader";
import { CvFormPanel } from "@/components/cv-builder/CvFormPanel";
import { CvPreviewPanel } from "@/components/cv-builder/CvPreviewPanel";
import { useCvBuilderStore } from "@/store/useCvBuilderStore";

export default function CvBuilder() {
  const reset = useCvBuilderStore(state => state.reset);

  // Reset store on mount just in case
  useEffect(() => {
    return () => {
      // Optional: reset on unmount if we don't want to persist builder state across sessions
      // reset();
    };
  }, [reset]);

  return (
    <Layout hideFooter>
      <div className="h-[calc(100vh-80px)] w-full flex flex-col bg-slate-50 overflow-hidden">
        {/* Top Header Toolbar */}
        <CvBuilderHeader />
        
        {/* Main Split Interface */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Form */}
          <div className="w-[45%] h-full border-r border-slate-200 bg-white overflow-y-auto">
            <CvFormPanel />
          </div>

          {/* Right Panel - Live Preview */}
          <div className="w-[55%] h-full bg-slate-100 overflow-y-auto p-4 lg:p-8">
            <CvPreviewPanel />
          </div>
        </div>
      </div>
    </Layout>
  );
}
