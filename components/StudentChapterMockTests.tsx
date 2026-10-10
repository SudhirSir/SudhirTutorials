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

  // Leaderboard Modal State
  const [leaderboardModal, setLeaderboardModal] = useState<{
    isOpen: boolean;
    scope: "overall" | "test";
    title: string;
    mockTestId?: string;
  }>({
    isOpen: false,
    scope: "overall",
    title: "🏆 Class Leaderboard",
  });
  const [leaderboardEntries, setLeaderboardEntries] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

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

  const fetchLeaderboard = async (scope: "overall" | "test", mockTestId?: string, title?: string) => {
    setLoadingLeaderboard(true);
    setLeaderboardModal({
      isOpen: true,
      scope,
      title: title || (scope === "overall" ? "🏆 Overall Class Leaderboard" : "🏆 Test Leaderboard"),
      mockTestId,
    });

    try {
      const url = scope === "test" && mockTestId
        ? `/api/mock-tests/leaderboard?scope=test&mockTestId=${mockTestId}`
        : `/api/mock-tests/leaderboard?scope=overall`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setLeaderboardEntries(data.leaderboard || []);
      } else {
        setLeaderboardEntries([]);
      }
    } catch (e) {
      console.error("Failed to fetch leaderboard:", e);
      setLeaderboardEntries([]);
    }
    setLoadingLeaderboard(false);
  };

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

  const formatSeconds = (sec: number) => {
    if (!sec || isNaN(sec)) return "0s";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      
      {/* Header Banner */}
      <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 style={{ fontSize: "1.6rem", fontWeight: 900, color: "var(--text-heading)", margin: 0 }}>
            🎯 Mock Tests
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <Button
            variant="outline"
            onClick={() => fetchLeaderboard("overall", undefined, "🏆 Overall Class Leaderboard")}
            style={{ fontWeight: 800, borderRadius: "12px", padding: "0.5rem 1rem", border: "1px solid #f59e0b", color: "#f59e0b", background: "rgba(245, 158, 11, 0.08)" }}
          >
            🏆 Overall Class Leaderboard
          </Button>

          {studentBoard && (
            <div style={{ background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.3)", padding: "0.5rem 1rem", borderRadius: "12px", color: "var(--primary)", fontSize: "0.85rem", fontWeight: 800 }}>
              🎓 Registered Board: {studentBoard} {studentClass ? `(Class ${studentClass})` : ""}
            </div>
          )}
        </div>
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
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                    <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--primary)", letterSpacing: "0.05em" }}>
                      {test.subject}
                    </div>
                    <button
                      type="button"
                      onClick={() => fetchLeaderboard("test", test.id, `🏆 Leaderboard: ${test.chapterName}`)}
                      style={{ background: "rgba(245, 158, 11, 0.12)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#f59e0b", padding: "2px 8px", borderRadius: "6px", fontSize: "0.7rem", fontWeight: 800, cursor: "pointer" }}
                    >
                      🏆 Leaderboard
                    </button>
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

      {/* Leaderboard Modal */}
      {leaderboardModal.isOpen && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(8px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem"
        }}>
          <div className="glass-card animate-scale-up" style={{
            maxWidth: "650px",
            width: "100%",
            maxHeight: "85vh",
            padding: "1.5rem",
            borderRadius: "20px",
            border: "1.5px solid var(--border)",
            background: "var(--card-bg)",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.85rem" }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 900, margin: 0, color: "var(--text-heading)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                {leaderboardModal.title}
              </h3>
              <button
                type="button"
                onClick={() => setLeaderboardModal(prev => ({ ...prev, isOpen: false }))}
                style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: "1.25rem", cursor: "pointer", fontWeight: 900 }}
              >
                ✕
              </button>
            </div>

            {/* Note banner */}
            <div style={{ background: "rgba(245, 158, 11, 0.08)", border: "1px solid rgba(245, 158, 11, 0.3)", padding: "0.6rem 0.85rem", borderRadius: "10px", fontSize: "0.78rem", color: "#f59e0b", fontWeight: 700 }}>
              💡 <strong>Rules:</strong> Only 1st attempts are evaluated. Ranked strictly by highest score, then fastest completion time!
            </div>

            {/* Leaderboard Table / Cards */}
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.25rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {loadingLeaderboard ? (
                <Spinner center size="md" />
              ) : leaderboardEntries.length === 0 ? (
                <div style={{ padding: "2.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  No student attempts logged for this leaderboard yet. Be the first to attempt! 🚀
                </div>
              ) : (
                leaderboardEntries.map((entry) => {
                  const rankIcon = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : `#${entry.rank}`;
                  const isOverall = leaderboardModal.scope === "overall";

                  return (
                    <div
                      key={entry.studentId || entry.rank}
                      style={{
                        padding: "0.85rem 1rem",
                        borderRadius: "12px",
                        background: entry.rank <= 3 ? "rgba(245, 158, 11, 0.04)" : "var(--card-bg-alt)",
                        border: entry.rank === 1 ? "1.5px solid #f59e0b" : "1px solid var(--border)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.75rem",
                        flexWrap: "wrap"
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                        <div style={{
                          width: "38px",
                          height: "38px",
                          borderRadius: "10px",
                          background: entry.rank === 1 ? "#f59e0b" : entry.rank === 2 ? "#94a3b8" : entry.rank === 3 ? "#d97706" : "rgba(255,255,255,0.08)",
                          color: entry.rank <= 3 ? "#fff" : "var(--text)",
                          fontWeight: 900,
                          fontSize: entry.rank <= 3 ? "1.1rem" : "0.9rem",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center"
                        }}>
                          {rankIcon}
                        </div>

                        <div>
                          <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "var(--text-heading)" }}>
                            {entry.studentName}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                            {entry.className ? `Class ${entry.className}` : ""} {entry.board ? `• ${entry.board}` : ""}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", textAlign: "right" }}>
                        <div>
                          <div style={{ fontSize: "1rem", fontWeight: 900, color: "#10b981" }}>
                            {isOverall ? `${entry.totalScore} pts` : `${entry.score} / ${entry.totalMarks}`}
                          </div>
                          <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700 }}>
                            {isOverall ? `${entry.testsAttempted} Tests (${entry.testsPassed} Passed)` : (entry.isPassed ? "🎉 PASSED" : "❌ FAILED")}
                          </div>
                        </div>

                        <div style={{ minWidth: "70px", textAlign: "right" }}>
                          <div style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--primary)", fontFamily: "monospace" }}>
                            ⏱ {formatSeconds(isOverall ? entry.totalTimeTaken : entry.timeTaken)}
                          </div>
                          <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                            Time Taken
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Close Button */}
            <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.75rem", textAlign: "right" }}>
              <Button
                variant="secondary"
                onClick={() => setLeaderboardModal(prev => ({ ...prev, isOpen: false }))}
                style={{ fontWeight: 800, padding: "0.5rem 1.25rem", borderRadius: "10px" }}
              >
                Close Leaderboard
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

export default StudentChapterMockTests;

