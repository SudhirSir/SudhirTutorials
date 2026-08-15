"use client";

import React, { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 999999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem 1rem",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)"
      }}
    >
      <div
        className={`modal-container ${className}`}
        style={{
          maxWidth,
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          borderRadius: "20px",
          overflow: "hidden"
        }}
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

  return createPortal(modalContent, document.body);
});

export default Modal;
