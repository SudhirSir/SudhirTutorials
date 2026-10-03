"use client";

import React, { useState, useEffect, useCallback } from "react";
import Button from "./ui/Button";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";
import { renderLatex } from "@/lib/katex";

const CLASSES_LIST = ["10th", "12th", "9th", "11th", "8th", "7th", "6th"];
const BOARDS_LIST = ["CBSE", "ICSE", "UP Board", "All Boards"];
const SUBJECTS_LIST = ["Mathematics", "Science", "Physics", "Chemistry", "Biology", "English", "Social Science"];

export function ChapterMockTestManager() {
  const [mockTests, setMockTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedClass, setSelectedClass] = useState("10th");
  const [selectedBoard, setSelectedBoard] = useState("ALL");
  const [selectedSubject, setSelectedSubject] = useState("ALL");
  const [searchChapter, setSearchChapter] = useState("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTest, setEditingTest] = useState<any>(null);
  const [activeTestForQuestions, setActiveTestForQuestions] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [activeTestForResults, setActiveTestForResults] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // New/Edit Test Form
  const [testForm, setTestForm] = useState({
    title: "",
    className: "10th",
    board: "CBSE",
    subject: "Mathematics",
    chapterName: "",
    description: "",
    durationMinutes: 15,
    totalMarks: 10,
    passingMarks: 4,
    allowedAttempts: 3,
    isPublished: true,
  });

  // Question Form State
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionType, setQuestionType] = useState<"MCQ" | "INPUT">("MCQ");
  const [inputAnswer, setInputAnswer] = useState("");
  const [questionForm, setQuestionForm] = useState({
    questionText: "",
    optA: "",
    optB: "",
    optC: "",
    optD: "",
    correctOption: 0,
    marks: 1,
    explanation: "",
    boardTag: "CBSE 2023 Pattern",
  });

  // AI MCQ Extractor States
  const [showAiExtractorModal, setShowAiExtractorModal] = useState(false);
  const [extractorText, setExtractorText] = useState("");
  const [extractorFileBase64, setExtractorFileBase64] = useState<string | null>(null);
  const [extractorFileName, setExtractorFileName] = useState("");
  const [extractorMimeType, setExtractorMimeType] = useState("application/pdf");
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedQuestions, setExtractedQuestions] = useState<any[]>([]);
  const [isBatchSaving, setIsBatchSaving] = useState(false);

  const handleRunAiExtraction = async () => {
    if (!extractorText.trim() && !extractorFileBase64) return;
    setIsExtracting(true);
    try {
      const res = await fetch("/api/admin/ai/extract-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: extractorText,
          fileBase64: extractorFileBase64,
          mimeType: extractorMimeType,
          subject: activeTestForQuestions?.subject,
          board: activeTestForQuestions?.board
        })
      });
      const data = await res.json();
      if (res.ok && data.questions && data.questions.length > 0) {
        setExtractedQuestions(data.questions);
        alert(`Successfully extracted ${data.questions.length} MCQs!`);
      } else {
        alert(data.error || "No valid MCQs could be extracted. Please try with clearer content.");
      }
    } catch (e) {
      console.error(e);
      alert("Error connecting to AI extraction service.");
    } finally {
      setIsExtracting(false);
    }
  };

  const handleBatchSaveExtractedQuestions = async () => {
    if (!activeTestForQuestions || extractedQuestions.length === 0) return;
    setIsBatchSaving(true);
    try {
      const formattedQs = extractedQuestions.map(q => ({
        questionText: q.questionText,
        options: [q.optA, q.optB, q.optC, q.optD].filter(Boolean),
        correctOption: q.correctOption,
        marks: 1,
        explanation: q.explanation,
        boardTag: q.boardTag
      }));

      const res = await fetch("/api/mock-tests/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mockTestId: activeTestForQuestions.id,
          questions: formattedQs
        })
      });

      if (res.ok) {
        alert(`Batch added ${formattedQs.length} questions successfully!`);
        setShowAiExtractorModal(false);
        setExtractedQuestions([]);
        setExtractorText("");
        setExtractorFileBase64(null);
        setExtractorFileName("");
        openQuestionsManager(activeTestForQuestions);
        fetchMockTests();
      } else {
        alert("Failed to batch save extracted questions.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsBatchSaving(false);
    }
  };

  const handleImportSingleExtractedQuestion = async (q: any) => {
    if (!activeTestForQuestions) return;
    try {
      const formattedQ = {
        questionText: q.questionText,
        options: [q.optA, q.optB, q.optC, q.optD].filter(Boolean),
        correctOption: q.correctOption,
        marks: 1,
        explanation: q.explanation || "",
        boardTag: q.boardTag || `${activeTestForQuestions.board} Pattern`
      };

      const res = await fetch("/api/mock-tests/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mockTestId: activeTestForQuestions.id,
          questions: [formattedQ]
        })
      });

      if (res.ok) {
        alert("Single question imported successfully!");
        openQuestionsManager(activeTestForQuestions);
        fetchMockTests();
      } else {
        alert("Failed to import question.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchMockTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedClass && selectedClass !== "ALL") params.append("className", selectedClass);
      if (selectedBoard && selectedBoard !== "ALL") params.append("board", selectedBoard);
      if (selectedSubject && selectedSubject !== "ALL") params.append("subject", selectedSubject);
      if (searchChapter) params.append("chapterName", searchChapter);

      const res = await fetch(`/api/mock-tests?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMockTests(data.mockTests || []);
      }
    } catch (e) {
      console.error("Failed to load chapter mock tests:", e);
    }
    setLoading(false);
  }, [selectedClass, selectedBoard, selectedSubject, searchChapter]);

  useEffect(() => {
    const handleBackButton = (e: Event) => {
      if (activeTestForQuestions) {
        e.preventDefault();
        setActiveTestForQuestions(null);
      } else if (activeTestForResults) {
        e.preventDefault();
        setActiveTestForResults(null);
      } else if (showCreateModal) {
        e.preventDefault();
        setShowCreateModal(false);
      }
    };

    window.addEventListener('backbuttonpress', handleBackButton);
    return () => {
      window.removeEventListener('backbuttonpress', handleBackButton);
    };
  }, [activeTestForQuestions, activeTestForResults, showCreateModal]);

  useEffect(() => {
    fetchMockTests();
  }, [fetchMockTests]);

  const handleSaveTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.title || !testForm.chapterName) {
      alert("Please enter title and chapter name!");
      return;
    }

    try {
      const url = "/api/mock-tests";
      const method = editingTest ? "PUT" : "POST";
      const body = editingTest ? { id: editingTest.id, ...testForm } : testForm;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert(editingTest ? "Mock test updated successfully!" : "Mock test created successfully!");
        setShowCreateModal(false);
        setEditingTest(null);
        setTestForm({
          title: "",
          className: "10th",
          board: "CBSE",
          subject: "Mathematics",
          chapterName: "",
          description: "",
          durationMinutes: 15,
          totalMarks: 10,
          passingMarks: 4,
          allowedAttempts: 3,
          isPublished: true,
        });
        fetchMockTests();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to save mock test.");
      }
    } catch (e) {
      console.error(e);
      alert("Error connecting to server.");
    }
  };

  const handleDeleteTest = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete the mock test "${title}"? All associated questions will be removed.`)) return;
    try {
      const res = await fetch(`/api/mock-tests?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("Mock test deleted successfully.");
        fetchMockTests();
      } else {
        alert("Failed to delete mock test.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleTogglePublish = async (test: any) => {
    try {
      const res = await fetch("/api/mock-tests", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: test.id, isPublished: !test.isPublished }),
      });
      if (res.ok) {
        fetchMockTests();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Questions Manager
  const openQuestionsManager = async (test: any) => {
    setActiveTestForQuestions(test);
    setLoadingQuestions(true);
    setEditingQuestionId(null);
    setQuestionType("MCQ");
    setInputAnswer("");
    setQuestionForm({
      questionText: "",
      optA: "",
      optB: "",
      optC: "",
      optD: "",
      correctOption: 0,
      marks: 1,
      explanation: "",
      boardTag: `${test.board} Pattern`,
    });
    try {
      const res = await fetch(`/api/mock-tests/questions?mockTestId=${test.id}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingQuestions(false);
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionForm.questionText?.trim()) {
      alert("Please enter question text!");
      return;
    }

    let optionsArr: string[] = [];
    if (questionType === "INPUT") {
      if (!inputAnswer.trim()) {
        alert("Please enter the correct expected answer for this question!");
        return;
      }
      optionsArr = ["INPUT_ANSWER", inputAnswer.trim()];
    } else {
      if (!questionForm.optA || !questionForm.optB) {
        alert("Please enter question text and at least options A & B!");
        return;
      }
      optionsArr = [questionForm.optA, questionForm.optB, questionForm.optC, questionForm.optD].filter(Boolean);
    }

    try {
      const url = "/api/mock-tests/questions";
      const method = editingQuestionId ? "PUT" : "POST";
      const body = editingQuestionId
        ? {
            id: editingQuestionId,
            questionText: questionForm.questionText,
            options: optionsArr,
            correctOption: questionForm.correctOption,
            marks: questionForm.marks,
            explanation: questionForm.explanation,
            boardTag: questionForm.boardTag,
          }
        : {
            mockTestId: activeTestForQuestions.id,
            questionText: questionForm.questionText,
            options: optionsArr,
            correctOption: questionForm.correctOption,
            marks: questionForm.marks,
            explanation: questionForm.explanation,
            boardTag: questionForm.boardTag,
          };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert(editingQuestionId ? "Question updated!" : "Question added!");
        setEditingQuestionId(null);
        setQuestionType("MCQ");
        setInputAnswer("");
        setQuestionForm({
          questionText: "",
          optA: "",
          optB: "",
          optC: "",
          optD: "",
          correctOption: 0,
          marks: 1,
          explanation: "",
          boardTag: `${activeTestForQuestions.board} Pattern`,
        });
        openQuestionsManager(activeTestForQuestions);
        fetchMockTests();
      } else {
        const d = await res.json();
        alert(d.error || "Failed to save question.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      const res = await fetch(`/api/mock-tests/questions?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        openQuestionsManager(activeTestForQuestions);
        fetchMockTests();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Quick Preset Sample Board Questions Generator
  const handlePrefillSampleQuestions = async () => {
    if (!activeTestForQuestions) return;
    if (!confirm("Add 3 pre-configured high-probability Board Specimen MCQs to this chapter test?")) return;

    const sampleQs = [
      {
        questionText: `If one root of quadratic equation 2x² - 8x + k = 0 is reciprocal of other, find the value of k.`,
        options: ["k = 2", "k = 4", "k = 8", "k = 1"],
        correctOption: 0,
        marks: 1,
        explanation: "Product of roots = c/a. Let roots be α and 1/α. Product α * (1/α) = 1 => k/2 = 1 => k = 2.",
        boardTag: `${activeTestForQuestions.board} 2023 Repeated`
      },
      {
        questionText: `The discriminant of the quadratic equation 3x² - 5x + 2 = 0 is:`,
        options: ["1", "49", "-1", "25"],
        correctOption: 0,
        marks: 1,
        explanation: "Discriminant D = b² - 4ac = (-5)² - 4(3)(2) = 25 - 24 = 1. Since D > 0, roots are real and distinct.",
        boardTag: `${activeTestForQuestions.board} Board Specimen`
      },
      {
        questionText: `What is the nature of roots of 4x² - 12x + 9 = 0?`,
        options: ["Real & Equal", "Real & Distinct", "No Real Roots", "Imaginary"],
        correctOption: 0,
        marks: 1,
        explanation: "D = b² - 4ac = (-12)² - 4(4)(9) = 144 - 144 = 0. Equal roots!",
        boardTag: `${activeTestForQuestions.board} Standard`
      }
    ];

    try {
      const res = await fetch("/api/mock-tests/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mockTestId: activeTestForQuestions.id,
          questions: sampleQs
        })
      });
      if (res.ok) {
        alert("3 Board Specimen questions added successfully!");
        openQuestionsManager(activeTestForQuestions);
        fetchMockTests();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Open Results Leaderboard
  const openResultsView = async (test: any) => {
    setActiveTestForResults(test);
    setLoadingResults(true);
    try {
      const res = await fetch(`/api/mock-tests/results?mockTestId=${test.id}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.submissions || []);
      }
    } catch (e) {
      console.error(e);
    }
    setLoadingResults(false);
  };

  return (
    <div style={{ marginTop: "1rem" }}>
      
      {/* Header & Quick Search Controller */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text-heading)", margin: 0, whiteSpace: "nowrap" }}>
            🎯 Mock Tests
          </h2>
          <div style={{ position: "relative", minWidth: "240px" }}>
            <input
              type="text"
              placeholder="🔍 Search chapter..."
              value={searchChapter}
              onChange={(e) => setSearchChapter(e.target.value)}
              style={{
                width: "100%",
                padding: "0.55rem 0.9rem",
                borderRadius: "10px",
                border: "1px solid var(--border)",
                background: "var(--card-bg)",
                color: "var(--text)",
                fontWeight: 600,
                fontSize: "0.88rem",
                boxShadow: "var(--shadow-sm)"
              }}
            />
          </div>
        </div>

        <Button
          variant="primary"
          onClick={() => {
            setEditingTest(null);
            setTestForm({
              title: "",
              className: "10th",
              board: "CBSE",
              subject: "Mathematics",
              chapterName: "",
              description: "",
              durationMinutes: 15,
              totalMarks: 10,
              passingMarks: 4,
              allowedAttempts: 3,
              isPublished: true,
            });
            setShowCreateModal(true);
          }}
          style={{ padding: "0.65rem 1.25rem", borderRadius: "12px", fontWeight: 800, fontSize: "0.88rem" }}
        >
          ➕ Create New Mock Test
        </Button>
      </div>

      {/* Filter Toolbar */}
      <Card variant="glass" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
              Class / Grade
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)", fontWeight: 700 }}
            >
              <option value="ALL">All Classes</option>
              {CLASSES_LIST.map((c) => (
                <option key={c} value={c}>Class {c}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
              Board Pattern
            </label>
            <select
              value={selectedBoard}
              onChange={(e) => setSelectedBoard(e.target.value)}
              style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)", fontWeight: 700 }}
            >
              <option value="ALL">All Boards</option>
              {BOARDS_LIST.map((b) => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", display: "block", marginBottom: "0.35rem" }}>
              Subject
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              style={{ width: "100%", padding: "0.6rem 0.8rem", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)", fontWeight: 700 }}
            >
              <option value="ALL">All Subjects</option>
              {SUBJECTS_LIST.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Tests Grid */}
      {loading ? (
        <Spinner center size="lg" />
      ) : mockTests.length === 0 ? (
        <Card variant="glass" style={{ padding: "3rem", textAlign: "center" }}>
          <h3 style={{ fontSize: "1.3rem", fontWeight: 800, marginBottom: "0.5rem" }}>No Chapter Mock Tests Found</h3>
          <p style={{ color: "var(--text-muted)", marginBottom: "1.5rem" }}>Create your first chapter mock test to let students test their preparation!</p>
          <Button
            variant="primary"
            onClick={() => {
              setEditingTest(null);
              setShowCreateModal(true);
            }}
          >
            Create Mock Test
          </Button>
        </Card>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: "0.75rem" }}>
          {mockTests.map((test) => (
            <Card key={test.id} variant="glass" style={{ padding: "0.75rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.3rem" }}>
                  <div>
                    <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      {test.subject} • Class {test.className}
                    </span>
                    {test.title && (
                      <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", marginTop: "0.15rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                        <span>📝</span>
                        <span>{test.title}</span>
                      </div>
                    )}
                    <h3 style={{ fontSize: "0.92rem", fontWeight: 800, margin: "0.1rem 0 0 0", color: "var(--text-heading)", lineHeight: "1.25" }}>
                      {test.chapterName}
                    </h3>
                  </div>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.5rem" }}>
                  <Badge variant="neutral" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>⏱ {test.durationMinutes} Mins</Badge>
                  <Badge variant="neutral" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>{test._count?.questions || 0} Ques</Badge>
                  <Badge variant="neutral" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>Attempts: {test.allowedAttempts || 3}</Badge>
                </div>
              </div>

              {/* Card Action Controls */}
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "0.5rem", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.3rem", flexWrap: "wrap" }}>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openQuestionsManager(test)}
                  style={{ fontSize: "0.68rem", padding: "0.3rem 0.45rem" }}
                >
                  📝 Questions
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openResultsView(test)}
                  style={{ fontSize: "0.68rem", padding: "0.3rem 0.45rem" }}
                >
                  🏆 Results
                </Button>

                <button
                  onClick={() => {
                    setEditingTest(test);
                    setTestForm({
                      title: test.title,
                      className: test.className,
                      board: test.board,
                      subject: test.subject,
                      chapterName: test.chapterName,
                      description: test.description || "",
                      durationMinutes: test.durationMinutes,
                      totalMarks: test.totalMarks,
                      passingMarks: test.passingMarks || 4,
                      allowedAttempts: test.allowedAttempts || 3,
                      isPublished: test.isPublished,
                    });
                    setShowCreateModal(true);
                  }}
                  style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "8px", padding: "0.3rem 0.45rem", cursor: "pointer", fontSize: "0.75rem" }}
                  title="Edit Test Settings"
                >
                  ✏️
                </button>

                <button
                  onClick={() => handleTogglePublish(test)}
                  style={{
                    padding: "0.3rem 0.45rem",
                    borderRadius: "8px",
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    border: "1px solid",
                    cursor: "pointer",
                    borderColor: test.isPublished ? "rgba(34, 197, 94, 0.4)" : "rgba(239, 68, 68, 0.4)",
                    background: test.isPublished ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                    color: test.isPublished ? "#22c55e" : "#ef4444",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px"
                  }}
                  title={test.isPublished ? "Click to Unpublish (Set Draft)" : "Click to Publish Mock Test"}
                >
                  {test.isPublished ? "Published ✓" : "Publish 🚀"}
                </button>

                <button
                  onClick={() => handleDeleteTest(test.id, test.chapterName)}
                  style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", borderRadius: "8px", padding: "0.3rem 0.45rem", cursor: "pointer", fontSize: "0.75rem" }}
                  title="Delete Mock Test"
                >
                  🗑️
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MOCK TEST MODAL */}
      {showCreateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-card" style={{ maxWidth: "600px", width: "100%", padding: "2rem", borderRadius: "20px", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "1.4rem", fontWeight: 900, marginBottom: "1.25rem", color: "var(--text-heading)" }}>
              {editingTest ? "Edit Chapter Mock Test" : "Create New Chapter Mock Test"}
            </h3>

            <form onSubmit={handleSaveTest} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}>Class / Grade</label>
                  <select
                    value={testForm.className}
                    onChange={(e) => setTestForm({ ...testForm, className: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)" }}
                  >
                    {CLASSES_LIST.map((c) => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}>Board Pattern</label>
                  <select
                    value={testForm.board}
                    onChange={(e) => setTestForm({ ...testForm, board: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)" }}
                  >
                    {BOARDS_LIST.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}>Subject</label>
                  <select
                    value={testForm.subject}
                    onChange={(e) => setTestForm({ ...testForm, subject: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)" }}
                  >
                    {SUBJECTS_LIST.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}>Chapter Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quadratic Equations"
                    value={testForm.chapterName}
                    onChange={(e) => setTestForm({ ...testForm, chapterName: e.target.value })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}>Mock Test Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Quadratic Equations - Board Special Mock Test"
                  value={testForm.title}
                  onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Duration (Mins)</label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    value={testForm.durationMinutes}
                    onChange={(e) => setTestForm({ ...testForm, durationMinutes: parseInt(e.target.value) || 15 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Total Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={testForm.totalMarks}
                    onChange={(e) => setTestForm({ ...testForm, totalMarks: parseFloat(e.target.value) || 10 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Passing Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={testForm.passingMarks}
                    onChange={(e) => setTestForm({ ...testForm, passingMarks: parseFloat(e.target.value) || 4 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Max Attempts</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={testForm.allowedAttempts}
                    onChange={(e) => setTestForm({ ...testForm, allowedAttempts: parseInt(e.target.value) || 3 })}
                    style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)" }}>Instructions / Syllabus Notes</label>
                <textarea
                  rows={2}
                  placeholder="Optional instructions for students..."
                  value={testForm.description}
                  onChange={(e) => setTestForm({ ...testForm, description: e.target.value })}
                  style={{ width: "100%", padding: "0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--card-bg-alt)", color: "var(--text)" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <input
                  type="checkbox"
                  id="isPublishedCheck"
                  checked={testForm.isPublished}
                  onChange={(e) => setTestForm({ ...testForm, isPublished: e.target.checked })}
                  style={{ width: "1.1rem", height: "1.1rem", accentColor: "var(--primary)" }}
                />
                <label htmlFor="isPublishedCheck" style={{ fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
                  Publish immediately (Students will see this test)
                </label>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <Button variant="outline" type="button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit">
                  {editingTest ? "Update Test" : "Create Test"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUESTIONS SETTER MODAL */}
      {activeTestForQuestions && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "1.25rem 1rem" }}>
          <div className="glass-card" style={{ position: "relative", maxWidth: "880px", width: "100%", maxHeight: "88vh", overflowY: "auto", padding: "1.25rem 1.5rem", borderRadius: "16px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            
            <button
              onClick={() => setActiveTestForQuestions(null)}
              style={{
                position: "absolute",
                top: "1rem",
                right: "1rem",
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "var(--card-bg-alt)",
                border: "1px solid var(--border)",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.1rem",
                cursor: "pointer",
                zIndex: 10
              }}
              title="Close Questions Modal"
            >
              ✕
            </button>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "0.6rem", paddingRight: "2.5rem", flexShrink: 0 }}>
              <div>
                <span style={{ fontSize: "0.72rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase" }}>
                  SET QUESTIONS • CLASS {activeTestForQuestions.className} {activeTestForQuestions.board}
                </span>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 900, margin: "0.1rem 0 0 0" }}>
                  {activeTestForQuestions.chapterName} - Questions Bank
                </h3>
              </div>
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "nowrap", alignItems: "center" }}>
                <Button 
                  variant="primary" 
                  size="sm" 
                  onClick={() => setShowAiExtractorModal(true)}
                  style={{ background: "linear-gradient(135deg, #ef4444, #2563eb)", color: "#fff", fontWeight: 800, fontSize: "0.75rem", padding: "0.35rem 0.6rem", whiteSpace: "nowrap" }}
                >
                  ✨ AI Extract MCQs
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={handlePrefillSampleQuestions} 
                  style={{ fontSize: "0.75rem", padding: "0.35rem 0.6rem", whiteSpace: "nowrap" }}
                >
                  ⚡ Load Board Specimen
                </Button>
              </div>
            </div>

            {/* Question Creator Form */}
            <form onSubmit={handleSaveQuestion} style={{ background: "var(--card-bg-alt)", padding: "0.85rem 1rem", borderRadius: "12px", border: "1px solid var(--border)", display: "flex", flexDirection: "column", gap: "0.6rem", flexShrink: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ fontWeight: 800, fontSize: "0.88rem", color: "var(--primary)" }}>
                  {editingQuestionId ? "✏️ Edit Question" : "➕ Add New Question"}
                </div>
                
                {/* Question Type Radio Selector */}
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", color: questionType === "MCQ" ? "var(--primary)" : "var(--text)" }}>
                    <input
                      type="radio"
                      name="qType"
                      value="MCQ"
                      checked={questionType === "MCQ"}
                      onChange={() => setQuestionType("MCQ")}
                      style={{ accentColor: "var(--primary)" }}
                    />
                    🔘 MCQ Options
                  </label>
                  <label style={{ fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", color: questionType === "INPUT" ? "var(--primary)" : "var(--text)" }}>
                    <input
                      type="radio"
                      name="qType"
                      value="INPUT"
                      checked={questionType === "INPUT"}
                      onChange={() => setQuestionType("INPUT")}
                      style={{ accentColor: "var(--primary)" }}
                    />
                    ✏️ Direct Answer Input
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Question Text *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Find the discriminant of equation 2x² - 4x + 3 = 0"
                  value={questionForm.questionText}
                  onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                  style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", fontSize: "0.85rem" }}
                />
              </div>

              {questionType === "INPUT" ? (
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Correct Expected Answer (Text / Value) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9.8 or 25 or New Delhi"
                    value={inputAnswer}
                    onChange={(e) => setInputAnswer(e.target.value)}
                    style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "8px", border: "1px solid var(--primary)", background: "var(--background)", color: "var(--text)", fontWeight: 700, fontSize: "0.85rem" }}
                  />
                </div>
              ) : (
                <>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Option A *</label>
                      <input
                        type="text"
                        required={questionType === "MCQ"}
                        placeholder="Option A"
                        value={questionForm.optA}
                        onChange={(e) => setQuestionForm({ ...questionForm, optA: e.target.value })}
                        style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", fontSize: "0.82rem" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Option B *</label>
                      <input
                        type="text"
                        required={questionType === "MCQ"}
                        placeholder="Option B"
                        value={questionForm.optB}
                        onChange={(e) => setQuestionForm({ ...questionForm, optB: e.target.value })}
                        style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", fontSize: "0.82rem" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Option C</label>
                      <input
                        type="text"
                        placeholder="Option C"
                        value={questionForm.optC}
                        onChange={(e) => setQuestionForm({ ...questionForm, optC: e.target.value })}
                        style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", fontSize: "0.82rem" }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Option D</label>
                      <input
                        type="text"
                        placeholder="Option D"
                        value={questionForm.optD}
                        onChange={(e) => setQuestionForm({ ...questionForm, optD: e.target.value })}
                        style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", fontSize: "0.82rem" }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Correct Option *</label>
                    <select
                      value={questionForm.correctOption}
                      onChange={(e) => setQuestionForm({ ...questionForm, correctOption: parseInt(e.target.value) })}
                      style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", fontWeight: 700, fontSize: "0.82rem" }}
                    >
                      <option value={0}>Option A</option>
                      <option value={1}>Option B</option>
                      <option value={2}>Option C</option>
                      <option value={3}>Option D</option>
                    </select>
                  </div>
                </>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.6rem" }}>
                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={questionForm.marks}
                    onChange={(e) => setQuestionForm({ ...questionForm, marks: parseFloat(e.target.value) || 1 })}
                    style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", fontSize: "0.82rem" }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Board Tag / Year</label>
                  <input
                    type="text"
                    placeholder="e.g. CBSE 2023"
                    value={questionForm.boardTag}
                    onChange={(e) => setQuestionForm({ ...questionForm, boardTag: e.target.value })}
                    style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", fontSize: "0.82rem" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)" }}>Textbook Solution / Explanation</label>
                <input
                  type="text"
                  placeholder="Step-by-step reasoning or formula..."
                  value={questionForm.explanation}
                  onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                  style={{ width: "100%", padding: "0.45rem 0.6rem", borderRadius: "8px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", fontSize: "0.82rem" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.2rem" }}>
                {editingQuestionId && (
                  <Button variant="outline" size="sm" type="button" onClick={() => {
                    setEditingQuestionId(null);
                    setQuestionType("MCQ");
                    setInputAnswer("");
                    setQuestionForm({
                      questionText: "",
                      optA: "",
                      optB: "",
                      optC: "",
                      optD: "",
                      correctOption: 0,
                      marks: 1,
                      explanation: "",
                      boardTag: `${activeTestForQuestions.board} Pattern`,
                    });
                  }} style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}>
                    Cancel Edit
                  </Button>
                )}
                <Button variant="primary" size="sm" type="submit" style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}>
                  {editingQuestionId ? "Update Question" : "Add Question"}
                </Button>
              </div>
            </form>

            {/* Questions List Container */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.4rem" }}>
              <h4 style={{ fontSize: "0.98rem", fontWeight: 800, marginBottom: "0.4rem" }}>
                Questions in Test ({questions.length})
              </h4>

              {loadingQuestions ? (
                <Spinner center />
              ) : questions.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>
                  No questions added yet. Use the form above or click "⚡ Load Board Specimen"!
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  {questions.map((q, idx) => {
                    const opts = JSON.parse(q.options || "[]");
                    const isInputType = Array.isArray(opts) && opts[0] === "INPUT_ANSWER";
                    return (
                      <div key={q.id} style={{ background: "var(--card-bg-alt)", padding: "0.65rem 0.85rem", borderRadius: "10px", border: "1px solid var(--border)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.35rem" }}>
                          <div>
                            <span style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--primary)" }}>
                              Q{idx + 1}. {q.boardTag && `[${q.boardTag}]`} (+{q.marks} Marks) {isInputType && "✏️ Direct Answer Input"}
                            </span>
                            <p style={{ fontWeight: 700, margin: "0.15rem 0", fontSize: "0.88rem", lineHeight: "1.3" }}>
                              {q.questionText}
                            </p>
                          </div>
                          <div style={{ display: "flex", gap: "0.3rem" }}>
                            <button
                              onClick={() => {
                                setEditingQuestionId(q.id);
                                if (isInputType) {
                                  setQuestionType("INPUT");
                                  setInputAnswer(opts[1] || "");
                                  setQuestionForm({
                                    questionText: q.questionText,
                                    optA: "",
                                    optB: "",
                                    optC: "",
                                    optD: "",
                                    correctOption: 0,
                                    marks: q.marks,
                                    explanation: q.explanation || "",
                                    boardTag: q.boardTag || "",
                                  });
                                } else {
                                  setQuestionType("MCQ");
                                  setInputAnswer("");
                                  setQuestionForm({
                                    questionText: q.questionText,
                                    optA: opts[0] || "",
                                    optB: opts[1] || "",
                                    optC: opts[2] || "",
                                    optD: opts[3] || "",
                                    correctOption: q.correctOption,
                                    marks: q.marks,
                                    explanation: q.explanation || "",
                                    boardTag: q.boardTag || "",
                                  });
                                }
                              }}
                              style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: "6px", padding: "0.25rem 0.4rem", cursor: "pointer", fontSize: "0.75rem" }}
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteQuestion(q.id)}
                              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#ef4444", borderRadius: "6px", padding: "0.25rem 0.4rem", cursor: "pointer", fontSize: "0.75rem" }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        {isInputType ? (
                          <div style={{ padding: "0.35rem 0.6rem", borderRadius: "6px", border: "1px solid rgba(59, 130, 246, 0.4)", background: "rgba(59, 130, 246, 0.08)", color: "var(--primary)", fontWeight: 700, fontSize: "0.8rem" }}>
                            ✏️ Direct Input Answer • Expected Answer: <span style={{ color: "#10b981", fontWeight: 900 }}>"{opts[1]}"</span>
                          </div>
                        ) : (
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", fontSize: "0.8rem" }}>
                            {opts.map((opt: string, optIdx: number) => (
                              <div
                                key={optIdx}
                                style={{
                                  padding: "0.3rem 0.5rem",
                                  borderRadius: "6px",
                                  border: "1px solid var(--border)",
                                  background: optIdx === q.correctOption ? "rgba(34,197,94,0.12)" : "transparent",
                                  borderColor: optIdx === q.correctOption ? "#22c55e" : "var(--border)",
                                  color: optIdx === q.correctOption ? "#22c55e" : "var(--text)",
                                  fontWeight: optIdx === q.correctOption ? 700 : 500
                                }}
                              >
                                <span>{String.fromCharCode(65 + optIdx)}. </span>
                                <span dangerouslySetInnerHTML={{ __html: renderLatex(opt) }} />
                                {optIdx === q.correctOption && " ✓"}
                              </div>
                            ))}
                          </div>
                        )}

                        {q.explanation && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem", fontStyle: "italic" }}>
                            💡 Solution: <span dangerouslySetInnerHTML={{ __html: renderLatex(q.explanation) }} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* STUDENT RESULTS LEADERBOARD MODAL */}
      {activeTestForResults && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-card" style={{ maxWidth: "800px", width: "100%", padding: "2rem", borderRadius: "20px", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--border)" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--primary)", textTransform: "uppercase" }}>
                  STUDENT ATTEMPTS LEADERBOARD
                </span>
                <h3 style={{ fontSize: "1.4rem", fontWeight: 900, margin: "0.1rem 0 0 0" }}>
                  {activeTestForResults.chapterName}
                </h3>
              </div>
              <button
                onClick={() => setActiveTestForResults(null)}
                style={{ background: "transparent", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}
              >
                ✕
              </button>
            </div>

            {loadingResults ? (
              <Spinner center />
            ) : results.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "3rem" }}>
                No students have attempted this chapter mock test yet.
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border)", color: "var(--text-muted)", fontSize: "0.75rem", textTransform: "uppercase" }}>
                      <th style={{ padding: "0.75rem" }}>Rank</th>
                      <th style={{ padding: "0.75rem" }}>Student Name</th>
                      <th style={{ padding: "0.75rem" }}>Roll No / Class</th>
                      <th style={{ padding: "0.75rem" }}>Score</th>
                      <th style={{ padding: "0.75rem" }}>Time Taken</th>
                      <th style={{ padding: "0.75rem" }}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((sub, idx) => (
                      <tr key={sub.id} style={{ borderBottom: "1px solid var(--border)" }}>
                        <td style={{ padding: "0.75rem", fontWeight: 900, color: idx === 0 ? "#f59e0b" : "var(--text)" }}>
                          {idx === 0 ? "🥇 1st" : idx === 1 ? "🥈 2nd" : idx === 2 ? "🥉 3rd" : `#${idx + 1}`}
                        </td>
                        <td style={{ padding: "0.75rem", fontWeight: 700 }}>
                          {sub.student?.name || sub.student?.username}
                        </td>
                        <td style={{ padding: "0.75rem", color: "var(--text-muted)" }}>
                          {sub.student?.studentProfile?.rollNumber || "N/A"} ({sub.student?.studentProfile?.className || sub.mockTest?.className})
                        </td>
                        <td style={{ padding: "0.75rem", fontWeight: 900, color: sub.score >= (sub.mockTest?.passingMarks || 4) ? "#22c55e" : "#ef4444" }}>
                          {sub.score} / {sub.totalMarks}
                        </td>
                        <td style={{ padding: "0.75rem", color: "var(--text-muted)" }}>
                          ⏱ {Math.floor(sub.timeTaken / 60)}m {sub.timeTaken % 60}s {sub.autoSubmitted && "⚠️ Auto-submitted"}
                        </td>
                        <td style={{ padding: "0.75rem", color: "var(--text-muted)", fontSize: "0.8rem" }}>
                          {new Date(sub.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        </div>
      )}

      {/* AI MCQ EXTRACTION MODAL */}
      {showAiExtractorModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(10px)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div className="glass-card" style={{ maxWidth: "750px", width: "100%", padding: "2rem", borderRadius: "20px", maxHeight: "90vh", overflowY: "auto", border: "1px solid var(--primary)", background: "var(--card-bg)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem", borderBottom: "1px solid var(--border)", paddingBottom: "0.75rem" }}>
              <div>
                <h3 style={{ fontSize: "1.35rem", fontWeight: 900, color: "var(--text-heading)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  ✨ AI MCQ Auto-Extractor
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                  Attach a PDF/Image or paste question text to automatically extract questions, options & answers!
                </p>
              </div>
              <button onClick={() => setShowAiExtractorModal(false)} style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              {/* Upload PDF / Image File */}
              <div style={{ border: "2px dashed var(--border)", padding: "1.25rem", borderRadius: "14px", background: "var(--card-bg-alt)", textAlign: "center" }}>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", marginBottom: "0.4rem", color: "var(--text)" }}>📁 Attach PDF or Question Paper Image</div>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 10 * 1024 * 1024) {
                      alert("File size should be under 10MB");
                      return;
                    }
                    setExtractorFileName(file.name);
                    setExtractorMimeType(file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain'));
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setExtractorFileBase64(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }}
                  style={{ fontSize: "0.85rem", color: "var(--text)" }}
                />
                {extractorFileName && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.82rem", color: "#10b981", fontWeight: 700 }}>
                    ✓ Selected: {extractorFileName}
                  </div>
                )}
              </div>

              {/* Paste Text Alternative */}
              <div>
                <label style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text-muted)", display: "block", marginBottom: "0.35rem" }}>
                  ...OR Paste Question Bank / Notes Text Below
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste text containing questions and options (e.g. Q1. Solve x² + 5x + 6 = 0...)"
                  value={extractorText}
                  onChange={(e) => setExtractorText(e.target.value)}
                  style={{ width: "100%", padding: "0.75rem", borderRadius: "10px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--text)", fontSize: "0.88rem" }}
                />
              </div>

              {/* Extract Trigger Button */}
              <Button
                variant="primary"
                onClick={handleRunAiExtraction}
                disabled={isExtracting || (!extractorText.trim() && !extractorFileBase64)}
                style={{ width: "100%", padding: "0.75rem", fontWeight: 800, fontSize: "0.95rem" }}
              >
                {isExtracting ? "⚡ Extracting Questions & Math Formulas with AI..." : "🚀 Auto-Extract Questions & Options"}
              </Button>

              {/* Extracted Preview & Actions */}
              {extractedQuestions.length > 0 && (
                <div style={{ marginTop: "1rem", borderTop: "1px solid var(--border)", paddingTop: "1.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
                    <div style={{ fontWeight: 800, color: "#10b981", fontSize: "1rem" }}>
                      🎉 Successfully Extracted {extractedQuestions.length} Questions!
                    </div>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleBatchSaveExtractedQuestions}
                      disabled={isBatchSaving}
                      style={{ background: "#10b981", fontWeight: 900, padding: "0.5rem 1rem", fontSize: "0.88rem" }}
                    >
                      {isBatchSaving ? "Saving..." : `⚡ Batch Import ALL ${extractedQuestions.length} Questions`}
                    </Button>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "360px", overflowY: "auto", paddingRight: "0.25rem" }}>
                    {extractedQuestions.map((q, idx) => (
                      <div key={idx} style={{ background: "var(--card-bg-alt)", padding: "0.85rem", borderRadius: "10px", border: "1px solid var(--border)", fontSize: "0.85rem" }}>
                        <div style={{ fontWeight: 700, marginBottom: "0.35rem", color: "var(--text-heading)" }}>
                          <span>Q{idx + 1}: </span>
                          <span dangerouslySetInnerHTML={{ __html: renderLatex(q.questionText) }} />
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.35rem", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          <span style={{ color: q.correctOption === 0 ? "#10b981" : "inherit", fontWeight: q.correctOption === 0 ? 800 : 400 }}>
                            A) <span dangerouslySetInnerHTML={{ __html: renderLatex(q.optA) }} />
                          </span>
                          <span style={{ color: q.correctOption === 1 ? "#10b981" : "inherit", fontWeight: q.correctOption === 1 ? 800 : 400 }}>
                            B) <span dangerouslySetInnerHTML={{ __html: renderLatex(q.optB) }} />
                          </span>
                          <span style={{ color: q.correctOption === 2 ? "#10b981" : "inherit", fontWeight: q.correctOption === 2 ? 800 : 400 }}>
                            C) <span dangerouslySetInnerHTML={{ __html: renderLatex(q.optC) }} />
                          </span>
                          <span style={{ color: q.correctOption === 3 ? "#10b981" : "inherit", fontWeight: q.correctOption === 3 ? 800 : 400 }}>
                            D) <span dangerouslySetInnerHTML={{ __html: renderLatex(q.optD) }} />
                          </span>
                        </div>
                        {q.explanation && (
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.35rem", fontStyle: "italic" }}>
                            💡 Solution: <span dangerouslySetInnerHTML={{ __html: renderLatex(q.explanation) }} />
                          </div>
                        )}
                        <div style={{ marginTop: "0.6rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                          <button
                            type="button"
                            onClick={() => handleImportSingleExtractedQuestion(q)}
                            style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid #10b981", background: "rgba(16,185,129,0.1)", color: "#10b981", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
                          >
                            ➕ Import This Question Only
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setQuestionForm({
                                questionText: q.questionText,
                                optA: q.optA,
                                optB: q.optB,
                                optC: q.optC,
                                optD: q.optD,
                                correctOption: q.correctOption,
                                marks: 1,
                                explanation: q.explanation || "",
                                boardTag: q.boardTag || `${activeTestForQuestions?.board || 'CBSE'} Pattern`
                              });
                              setShowAiExtractorModal(false);
                            }}
                            style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--background)", color: "var(--primary)", fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}
                          >
                            ✏️ Fill into Form Editor
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "1rem", textAlign: "center" }}>
                    <Button
                      variant="primary"
                      onClick={handleBatchSaveExtractedQuestions}
                      disabled={isBatchSaving}
                      style={{ background: "#10b981", fontWeight: 900, width: "100%", padding: "0.75rem", fontSize: "0.95rem" }}
                    >
                      {isBatchSaving ? "Saving..." : `⚡ Batch Import ALL ${extractedQuestions.length} Questions`}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ChapterMockTestManager;
