"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";

const BOARDS_LIST = ["ALL", "CBSE", "ICSE", "UP Board"];
const SUBJECTS_LIST = ["ALL", "Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Social Science"];

export function StudentChapterMockTests() {
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [studentBoard, setStudentBoard] = useState<string | null>(null);
  const [studentClass, setStudentClass] = useState<string | null>(null);
  const router = useRouter();

  // Filters
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          const prof = data.profile;
          if (prof?.board) setStudentBoard(prof.board);
          if (prof?.className) setStudentClass(prof.className);
        }
      } catch (e) {
        console.error("Failed to load student profile:", e);
      }
    };
    fetchProfile();
  }, []);

  const fetchMockTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSubject !== "ALL") params.append("subject", selectedSubject);
      if (searchQuery) params.append("chapterName", searchQuery);

      const res = await fetch(`/api/mock-tests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMockTests(data.mockTests || []);
      }
    } catch (e) {
      console.error("Failed to load student chapter mock tests:", e);
    }
    setLoading(false);
  }, [selectedSubject, searchQuery]);

  useEffect(() => {
    fetchMockTests();
  }, [fetchMockTests]);

  return (
    <div style={{ marginTop: "1rem" }}>
      
      {/* Header Banner */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text-heading)", margin: 0 }}>
            🎯 Mock Tests
          </h2>
        </div>

        {studentBoard && (
          <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "0.5rem 1rem", borderRadius: "12px", color: "var(--primary)", fontSize: "0.85rem", fontWeight: 800 }}>
            🎓 Registered Board: {studentBoard} {studentClass ? `(Class ${studentClass})` : ""}
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <Card variant="glass" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
              Filter by Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)", fontWeight: 700 }}
            >
              {SUBJECTS_LIST.map((s) => (
                <option key={s} value={s}>{s === "ALL" ? "All Subjects" : s}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
              Search Chapter
            </label>
            <input
              type="text"
              placeholder="e.g. Electricity, Quadratic Equations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)", fontWeight: 600 }}
            />
          </div>
        </div>
      </Card>

      {/* Tests Grid */}
      {loading ? (
        <Spinner center size="lg" />
      ) : mockTests.length === 0 ? (
        <Card variant="glass" style={{ padding: "3rem", textAlign: "center" }}>
          <h3 style={{ fontSize: "1.4rem", fontWeight: 800, marginBottom: "0.5rem" }}>
            No Mock Tests Available
          </h3>
          <p style={{ color: "var(--text-muted)" }}>
            There are currently no published mock tests matching your selected filters. Check back soon or select another subject!
          </p>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {mockTests.map((test) => {
            const submissionsCount = test.submissions?.length || 0;
            const maxAttempts = test.allowedAttempts || 3;
            const isCompleted = submissionsCount > 0;
            const currentAttemptDisplay = isCompleted 
              ? Math.min(submissionsCount, maxAttempts)
              : Math.min(submissionsCount + 1, maxAttempts);
            const isMaxReached = submissionsCount >= maxAttempts;
            const lastSubmission = test.submissions?.[0];

            return (
              <Card
                key={test.id}
                variant="glass"
                interactive
                style={{
                  padding: "1rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderColor: isCompleted ? "rgba(34, 197, 94, 0.4)" : undefined,
                }}
              >
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>
                    {test.subject}
                  </div>
                  {test.title && (
                    <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", marginBottom: "0.2rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <span>📝</span>
                      <span>{test.title}</span>
                    </div>
                  )}
                  <h3 style={{ margin: "0 0 0.6rem 0", fontSize: "1.05rem", fontWeight: 800, color: "var(--text-heading)" }}>
                    {test.chapterName}
                  </h3>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.75rem" }}>
                    <Badge variant="neutral">⏱ {test.durationMinutes} Mins</Badge>
                    <Badge variant="neutral">{test._count?.questions || 0} Questions</Badge>
                    <Badge variant={isMaxReached ? "danger" : "neutral"}>
                      Attempt {currentAttemptDisplay} / {maxAttempts}
                    </Badge>
                    {isCompleted && lastSubmission && (
                      <Badge variant={lastSubmission.score >= (test.passingMarks || 4) ? "success" : "danger"}>
                        {lastSubmission.score >= (test.passingMarks || 4) ? "🎉 PASSED" : "❌ FAILED"}
                      </Badge>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: "auto" }}>
                  <Button
                    variant={isCompleted ? "outline" : "primary"}
                    fullWidth
                    onClick={() => {
                      if (isMaxReached) {
                        alert(`You have reached the maximum allowed attempts (${maxAttempts}/${maxAttempts}) for this mock test.`);
                        return;
                      }
                      router.push(`/dashboard/student/mock-test/${test.id}`);
                    }}
                    style={{ fontWeight: 800, padding: "0.45rem 0.85rem", fontSize: "0.82rem", borderRadius: "8px", opacity: isMaxReached ? 0.75 : 1 }}
                  >
                    {isMaxReached 
                      ? `Max Attempts Reached (${maxAttempts}/${maxAttempts})` 
                      : isCompleted 
                        ? `Retake Test (${currentAttemptDisplay + 1}/${maxAttempts})` 
                        : "Start Mock Test"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StudentChapterMockTests;
