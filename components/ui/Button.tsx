"use client";

import React, { memo } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = memo(function Button({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-6 py-3 text-base rounded-xl",
  };

  const variantClasses = {
    primary: "bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] shadow-md hover:shadow-lg active:translate-y-0 border-transparent",
    secondary: "bg-[var(--secondary)] text-white hover:bg-[var(--secondary-hover)] shadow-md hover:shadow-lg active:translate-y-0 border-transparent",
    danger: "bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg border-transparent",
    outline: "bg-transparent border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface-light)] hover:border-[var(--text-muted)]",
    ghost: "bg-transparent text-[var(--text-muted)] hover:bg-[var(--surface-light)] hover:text-[var(--text)] border-transparent",
  };

  const classNames = [
    "btn-ui",
    "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer select-none outline-none active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none",
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? "w-full" : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={classNames} disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <>
          <span className="spinner-ui animate-spin w-4 h-4 border-2 border-white/30 border-t-current rounded-full" aria-hidden="true" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="btn-icon-left inline-flex items-center">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="btn-icon-right inline-flex items-center">{rightIcon}</span>}
        </>
      )}
    </button>
  );
});

export default Button;
