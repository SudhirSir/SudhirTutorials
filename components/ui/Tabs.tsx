"use client";

import React, { memo } from "react";

export interface TabItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (tabId: string) => void;
  className?: string;
}

export const Tabs = memo(function Tabs({
  tabs,
  activeTab,
  onChange,
  className = ""
}: TabsProps) {
  return (
    <div className={`tab-nav ${className}`} role="tablist">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            className={`tab-btn ${isActive ? "tab-btn-active" : ""}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.icon && <span style={{ marginRight: "0.35rem" }}>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                style={{
                  marginLeft: "0.4rem",
                  padding: "0.15rem 0.45rem",
                  borderRadius: "999px",
                  fontSize: "0.75rem",
                  backgroundColor: isActive ? "var(--primary)" : "var(--border)",
                  color: isActive ? "#ffffff" : "var(--text-muted)"
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});

export default Tabs;
