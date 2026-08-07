"use client";

import React, { memo } from "react";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  center?: boolean;
  className?: string;
}

export const Spinner = memo(function Spinner({
  size = "md",
  center = false,
  className = ""
}: SpinnerProps) {
  const sizePx = size === "sm" ? "1rem" : size === "lg" ? "2.5rem" : "1.75rem";

  const spinner = (
    <span
      className={`spinner-ui ${className}`}
      style={{ width: sizePx, height: sizePx }}
      aria-label="Loading..."
    />
  );

  if (center) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "2rem"
        }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
});

export default Spinner;
