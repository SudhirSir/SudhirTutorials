"use client";

import React, { memo, useEffect } from "react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

export const Modal = memo(function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "640px",
  className = ""
}: ModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" }}
    >
      <div
        className={`modal-container ${className}`}
        style={{ maxWidth, maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-header" style={{ flexShrink: 0, position: "sticky", top: 0, zIndex: 10, background: "var(--surface-light, #1e293b)" }}>
            <h3 className="modal-title">{title}</h3>
            <button
              type="button"
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Close modal"
            >
              ✕
            </button>
          </div>
        )}

        <div className="modal-body" style={{ overflowY: "auto", flex: 1, padding: "1.5rem" }}>{children}</div>

        {footer && <div className="modal-footer" style={{ flexShrink: 0 }}>{footer}</div>}
      </div>
    </div>
  );
});

export default Modal;
