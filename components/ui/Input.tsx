"use client";

import React, { memo } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = memo(function Input({
  label,
  error,
  helperText,
  className = "",
  id,
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="input-group flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="input-label text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={[
          "input-field w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border)] rounded-xl text-[var(--text)] text-sm outline-none transition-all duration-200 focus:bg-[var(--input-focus-bg)] focus:border-[var(--primary)] focus:ring-2 focus:ring-red-500/20 placeholder:text-[var(--text-muted)]/70",
          error ? "input-error border-red-500 focus:ring-red-500/30" : "",
          className
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {error && <span className="input-error-msg text-xs font-semibold text-red-500 mt-1">{error}</span>}
      {!error && helperText && <span className="text-xs text-[var(--text-muted)] mt-1">{helperText}</span>}
    </div>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = memo(function Textarea({
  label,
  error,
  helperText,
  className = "",
  id,
  ...props
}: TextareaProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="input-group flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="input-label text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        className={[
          "input-field w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border)] rounded-xl text-[var(--text)] text-sm outline-none transition-all duration-200 focus:bg-[var(--input-focus-bg)] focus:border-[var(--primary)] focus:ring-2 focus:ring-red-500/20 placeholder:text-[var(--text-muted)]/70 resize-y min-h-[90px]",
          error ? "input-error border-red-500 focus:ring-red-500/30" : "",
          className
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
      {error && <span className="input-error-msg text-xs font-semibold text-red-500 mt-1">{error}</span>}
      {!error && helperText && <span className="text-xs text-[var(--text-muted)] mt-1">{helperText}</span>}
    </div>
  );
});

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
}

export const Select = memo(function Select({
  label,
  error,
  helperText,
  options,
  className = "",
  id,
  ...props
}: SelectProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

  return (
    <div className="input-group flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="input-label text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={[
          "input-field w-full px-4 py-3 bg-[var(--input-bg)] border border-[var(--border)] rounded-xl text-[var(--text)] text-sm font-semibold outline-none transition-all duration-200 focus:bg-[var(--input-focus-bg)] focus:border-[var(--primary)] focus:ring-2 focus:ring-red-500/20",
          error ? "input-error border-red-500 focus:ring-red-500/30" : "",
          className
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="input-error-msg text-xs font-semibold text-red-500 mt-1">{error}</span>}
      {!error && helperText && <span className="text-xs text-[var(--text-muted)] mt-1">{helperText}</span>}
    </div>
  );
});

export default Input;
