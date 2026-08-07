"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";

export function StudentTakeTest() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchPurchasedTests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/student/purchases");
      if (res.ok) {
        const data = await res.json();
        const allTests: any[] = [];
        data.purchases.forEach((purchase: any) => {
          const item = purchase.item;
          if (item.type === "TEST_SERIES" && item.onlineTests) {
            item.onlineTests.forEach((test: any) => {
              allTests.push({
                ...test,
                seriesTitle: item.title
              });
            });
          }
        });
        setTests(allTests);
      }
    } catch (e) {
      console.error("Failed to load purchased tests:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPurchasedTests();
  }, [fetchPurchasedTests]);

  if (loading) {
    return <Spinner center size="lg" />;
  }

  if (tests.length === 0) {
    return (
      <Card variant="glass" style={{ padding: "3rem", textAlign: "center", marginTop: "1rem" }}>
        <h3 style={{ fontSize: "1.5rem", marginBottom: "1rem", color: "var(--text-heading)" }}>
          No Tests Available
        </h3>
        <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>
          You haven't purchased any Test Series yet or there are no tests currently active in your series.
        </p>
        <Button
          variant="primary"
          onClick={() => router.push("/dashboard/student?tab=store")}
        >
          Explore Store
        </Button>
      </Card>
    );
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <h2 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1.5rem", color: "var(--text-heading)" }}>
        My Purchased Tests
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
        {tests.map((test) => {
          const bestSubmission = test.submissions?.[0];
          return (
            <Card
              key={test.id}
              variant="glass"
              interactive
              style={{
                display: "flex",
                flexDirection: "column",
                borderColor: bestSubmission ? "rgba(34, 197, 94, 0.3)" : undefined
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.05em", marginBottom: "0.25rem" }}>
                    {test.seriesTitle}
                  </div>
                  <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800, color: "var(--text-heading)" }}>
                    {test.title}
                  </h3>
                </div>
                <span style={{ fontSize: "1.5rem" }}>📝</span>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.5rem" }}>
                <Badge variant="neutral">⏱ {test.durationMinutes} Mins</Badge>
                <Badge variant="neutral">🎯 {test.totalMarks} Marks</Badge>
              </div>

              <div style={{ marginTop: "auto" }}>
                {bestSubmission ? (
                  <div style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", border: "1px solid rgba(34, 197, 94, 0.3)", padding: "0.75rem 1rem", borderRadius: "12px", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#22c55e", fontWeight: 700 }}>COMPLETED</div>
                      <div style={{ fontSize: "1.1rem", fontWeight: 900, color: "#22c55e" }}>
                        {bestSubmission.score} / {test.totalMarks} Marks
                      </div>
                    </div>
                    <span style={{ fontSize: "1.5rem" }}>🎉</span>
                  </div>
                ) : (
                  <div style={{ backgroundColor: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "0.75rem 1rem", borderRadius: "12px", marginBottom: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "#f59e0b", fontWeight: 700 }}>PENDING</div>
                      <div style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Not attempted yet</div>
                    </div>
                    <span style={{ fontSize: "1.5rem" }}>⏳</span>
                  </div>
                )}

                <Button
                  variant={bestSubmission ? "outline" : "primary"}
                  fullWidth
                  onClick={() => router.push(`/dashboard/student/test/${test.id}`)}
                >
                  {bestSubmission ? "Retake Test" : "Start Test Now"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default StudentTakeTest;
