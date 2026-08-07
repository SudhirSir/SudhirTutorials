"use client";

import React, { memo } from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "success" | "warning" | "danger" | "info" | "neutral";
}

export const Badge = memo(function Badge({
  children,
  variant = "neutral",
  className = "",
  ...props
}: BadgeProps) {
  const variantClasses = {
    success: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    danger: "bg-red-500/15 text-red-500 border-red-500/30",
    info: "bg-blue-500/15 text-blue-500 border-blue-500/30",
    neutral: "bg-[var(--surface-light)] text-[var(--text-muted)] border-[var(--border)]",
  };

  const classNames = [
    "badge-ui",
    "inline-flex items-center gap-1.5 px-3 py-1 text-[0.75rem] font-bold rounded-full uppercase tracking-wider border whitespace-nowrap",
    variantClasses[variant],
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classNames} {...props}>
      {children}
    </span>
  );
});

export default Badge;
