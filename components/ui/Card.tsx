"use client";

import React, { memo } from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "standard" | "glass";
  interactive?: boolean;
}

export const Card = memo(function Card({
  children,
  variant = "standard",
  interactive = false,
  className = "",
  ...props
}: CardProps) {
  const baseClasses = "rounded-2xl p-6 transition-all duration-200 border";
  const variantClasses = variant === "glass" 
    ? "bg-[var(--glass-bg)] backdrop-blur-xl border-[var(--glass-border)] shadow-xl"
    : "bg-[var(--card-bg)] border-[var(--border)] shadow-sm";
  const interactiveClasses = interactive ? "hover:-translate-y-1 hover:shadow-xl hover:border-[var(--primary)] cursor-pointer" : "";

  const classNames = [
    variant === "glass" ? "card-glass" : "card-ui",
    baseClasses,
    variantClasses,
    interactiveClasses,
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classNames} {...props}>
      {children}
    </div>
  );
});

export default Card;
