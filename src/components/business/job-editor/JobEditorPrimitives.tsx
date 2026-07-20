import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Field({ label, error, children, optional = false, className = "" }: { label: string; error?: string; children: ReactNode; optional?: boolean; className?: string }) {
  return <label className={`flex flex-col gap-1.5 ${className}`}><span className="text-[13px] font-medium text-slate-700">{label} {optional ? <em className="font-normal text-slate-400">Optional</em> : null}</span>{children}{error ? <span className="text-[13px] text-red-600">{error}</span> : null}</label>;
}

const inputClass = "w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export function TextInput({ hasError, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { hasError?: boolean }) {
  return <input {...props} className={`${inputClass} ${hasError ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-slate-200"} ${className}`} />;
}

export function SelectInput({ hasError, className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement> & { hasError?: boolean }) {
  return <select {...props} className={`${inputClass} appearance-none ${hasError ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-slate-200"} ${className}`} />;
}

export function TextArea({ hasError, className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { hasError?: boolean }) {
  return <textarea {...props} className={`min-h-28 ${inputClass} resize-y ${hasError ? "border-red-400 focus:border-red-500 focus:ring-red-500" : "border-slate-200"} ${className}`} />;
}
