"use client";

import { useState, useEffect, useRef, Suspense, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { createPortal } from 'react-dom';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { ProfileEditor } from '@/components/ProfileEditor';
import { useSession } from 'next-auth/react';
import { LiveClock } from '@/components/LiveClock';
import { Sidebar } from '@/components/Sidebar';
import { StudentLedger } from '@/components/StudentLedger';
import { LecturesSection } from '@/components/LecturesSection';
import { UserProfileModal } from '@/components/UserProfileModal';
import { AdmissionsSection } from '@/components/AdmissionsSection';
import { AdminStoreManager } from '@/components/AdminStoreManager';
import { QuickServicesWidget } from '@/components/QuickServicesWidget';

function formatDobDisplay(dobStr: string | null | undefined): string {
  if (!dobStr) return 'N/A';
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dobStr)) return dobStr;
  const parts = dobStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  try {
    const d = new Date(dobStr);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch (e) {}
  return dobStr;
}

function formatDateDisplay(dateInput: any): string {
  if (!dateInput) return 'N/A';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return String(dateInput);
  }
}

function TypewriterText({ text, speed = 8, onComplete }: { text: string; speed?: number; onComplete?: () => void }) {
  const [displayedText, setDisplayedText] = useState('');

  useEffect(() => {
    let active = true;
    const tokens = text.split(/(<[^>]*>)/g).filter(Boolean);
    let currentText = '';
    let tokenIndex = 0;
    let charIndex = 0;
    let timeoutId: any;

    const type = () => {
      if (!active) return;
      if (tokenIndex >= tokens.length) {
        if (onComplete) onComplete();
        return;
      }

      const activeToken = tokens[tokenIndex];
      if (activeToken.startsWith('<') && activeToken.endsWith('>')) {
        currentText += activeToken;
        setDisplayedText(currentText);
        tokenIndex++;
        charIndex = 0;
        type();
      } else {
        if (charIndex < activeToken.length) {
          currentText += activeToken[charIndex];
          setDisplayedText(currentText);
          charIndex++;
          timeoutId = setTimeout(type, speed);
        } else {
          tokenIndex++;
          charIndex = 0;
          type();
        }
      }
    };

    type();
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [text, speed]);

  return <span dangerouslySetInnerHTML={{ __html: displayedText }} />;
}

function AdminDashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('overview');
  const [activeProfileUserId, setActiveProfileUserId] = useState<string | null>(null);
  const [chatSelectedUserId, setChatSelectedUserId] = useState<string | null>(null);



  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(pathname + '?' + params.toString());
  };
  const [userSubTab, setUserSubTab] = useState<'DIRECTORY' | 'CREATE'>('DIRECTORY');
  const [financeSubTab, setFinanceSubTab] = useState<'OVERVIEW' | 'LEDGER' | 'ASSIGN' | 'EXPENSES' | 'BILLING_ENGINE' | 'STATEMENT'>('OVERVIEW');
  const [academicSubTab, setAcademicSubTab] = useState<'menu' | 'courses' | 'attendance' | 'materials' | 'tests' | 'analytics' | 'lectures' | 'admissions'>('menu');
  const [lectureSubTab, setLectureSubTab] = useState<'DASHBOARD' | 'LIVE' | 'RECORDED' | 'ASSIGN'>('DASHBOARD');
  const [ledgerViewMode, setLedgerViewMode] = useState<'ALL' | 'FIRST_10' | 'ASSIGNED_FEES' | 'PENDING_FEES'>('ALL');
  const [statementMonth, setStatementMonth] = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [statementYear, setStatementYear] = useState(String(new Date().getFullYear()));
  const [isLedgerListOpen, setIsLedgerListOpen] = useState(true);
  const [courseSubTab, setCourseSubTab] = useState<'COURSES' | 'BATCHES' | 'TIMETABLE'>('COURSES');
  const [pptDifficulty, setPptDifficulty] = useState('Intermediate');
  const [pptDuration, setPptDuration] = useState('45');
  const [batchModalTab, setBatchModalTab] = useState<'CONFIG' | 'STUDENTS'>('CONFIG');

  useEffect(() => {
    // Intercept separate tab clicks to open nested sub-tab layout under academics
    if (['courses', 'attendance', 'materials', 'tests', 'analytics', 'lectures', 'admissions'].includes(activeTab)) {
      setAcademicSubTab(activeTab as any);
      setActiveTab('academics');
    }
  }, [activeTab]);

  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const fetchUnreadCounts = async () => {
    try {
      const res = await fetch('/api/unread-counts');
      if (res.ok) {
        const data = await res.json();
        setUnreadNotifications(data.unreadNotifications);
        setUnreadMessages(data.unreadMessages);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    fetchUnreadCounts();
    fetchSettings();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCounts();
      }
    };

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchUnreadCounts();
      }
    }, 15000);

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
    if (tab === 'courses') {
      Promise.all([
        fetchCourses(),
        fetchBatches(),
        fetchTeachers(),
        fetch('/api/admin/directory?q=').then(res => res.json()).then(data => setDirectoryUsers(data.users || [])),
        fetchAllStudents()
      ]);
    }
  }, [searchParams, session]);

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/admin/directory?role=TEACHER_OR_ADMIN');
      const data = await res.json();
      setAllTeachers(data.users || []);
    } catch (e) {}
  };
  
  // User Creation State
  const [overviewStats, setOverviewStats] = useState<{
    totalStudents: number;
    totalTeachers: number;
    totalBatches: number;
    totalCourses: number;
    revenueThisMonth: number;
    pendingDues: number;
    classStats: Array<{ className: string; count: number }>;
  }>({
    totalStudents: 0,
    totalTeachers: 0,
    totalBatches: 0,
    totalCourses: 0,
    revenueThisMonth: 0,
    pendingDues: 0,
    classStats: []
  });
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [overviewStatsError, setOverviewStatsError] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [newUserRole, setNewUserRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [newUserName, setNewUserName] = useState('');
  const [newStudentClass, setNewStudentClass] = useState('');
  const [newStudentBoard, setNewStudentBoard] = useState('');
  const [newStudentScholarship, setNewStudentScholarship] = useState('');
  const [newTeacherSubject, setNewTeacherSubject] = useState('');
  const [newStudentFatherName, setNewStudentFatherName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [newStudentAddress, setNewStudentAddress] = useState('');
  const [newStudentDob, setNewStudentDob] = useState('');
  const [customClassName, setCustomClassName] = useState('');
  const [isCustomClass, setIsCustomClass] = useState(false);
  const [createdUser, setCreatedUser] = useState<{username: string, password: string, role: string} | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Analytics State
  const [reportData, setReportData] = useState<{ enrollmentData: any[], revenueTrend: any[], attendanceRate: number } | null>(null);
  const [isReportsLoading, setIsReportsLoading] = useState(false);

  // System Settings States
  const [perDayFine, setPerDayFine] = useState(10);
  const [flatFineAfter10Days, setFlatFineAfter10Days] = useState(100);
  const [feeDueDay, setFeeDueDay] = useState(12);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [classFees, setClassFees] = useState<Record<string, number>>({});
  const [newFeeClassName, setNewFeeClassName] = useState('');
  const [newFeeClassAmount, setNewFeeClassAmount] = useState('');
  const [showSettingsLateFee, setShowSettingsLateFee] = useState(false);
  const [showSettingsClassFees, setShowSettingsClassFees] = useState(false);
  const [showSettingsCareers, setShowSettingsCareers] = useState(false);
  const [showSettingsPromote, setShowSettingsPromote] = useState(false);
  const [isPromotingStudents, setIsPromotingStudents] = useState(false);
  const [minAppVersion, setMinAppVersion] = useState('1.0.0');
  const [showSettingsAppVersion, setShowSettingsAppVersion] = useState(false);

  // Staff Salary States
  const [adminSalaries, setAdminSalaries] = useState<any[]>([]);
  const [isFetchingSalaries, setIsFetchingSalaries] = useState(false);
  const [salaryTeacherId, setSalaryTeacherId] = useState('');
  const [salaryMonth, setSalaryMonth] = useState('May 2026');
  const [salaryBaseSalary, setSalaryBaseSalary] = useState('');
  const [salaryBonus, setSalaryBonus] = useState('');
  const [salaryDeductions, setSalaryDeductions] = useState('');
  const [salaryRemarks, setSalaryRemarks] = useState('');
  const [isGeneratingSalary, setIsGeneratingSalary] = useState(false);

  // Salary Payout disbursement states
  const [payoutSalaryRecord, setPayoutSalaryRecord] = useState<any | null>(null);
  const [payoutTransactionId, setPayoutTransactionId] = useState('');
  const [payoutRemarks, setPayoutRemarks] = useState('');
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [showPayoutModal, setShowPayoutModal] = useState(false);

  // Staff Salary Edit States
  const [editingSalaryRecord, setEditingSalaryRecord] = useState<any | null>(null);
  const [editSalaryMonth, setEditSalaryMonth] = useState('');
  const [editSalaryBase, setEditSalaryBase] = useState('');
  const [editSalaryBonus, setEditSalaryBonus] = useState('');
  const [editSalaryDeductions, setEditSalaryDeductions] = useState('');
  const [editSalaryRemarks, setEditSalaryRemarks] = useState('');
  const [editSalaryStatus, setEditSalaryStatus] = useState('PENDING');
  const [editSalaryTxnId, setEditSalaryTxnId] = useState('');
  const [isSavingSalaryEdit, setIsSavingSalaryEdit] = useState(false);
  const [showEditSalaryModal, setShowEditSalaryModal] = useState(false);

  // Activity Log view state
  const [showAllActivities, setShowAllActivities] = useState(false);

  // Deletion Modal State
  const [showDelModal, setShowDelModal] = useState(false);
  const [delTargetId, setDelTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Security Verification State
  const [securityConfirm, setSecurityConfirm] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onVerified: () => void;
    isProcessing: boolean;
  }>({
    isOpen: false,
    title: '',
    description: '',
    onVerified: () => {},
    isProcessing: false
  });
  const [securityPassword, setSecurityPassword] = useState('');

  const requestSecurityVerification = (title: string, description: string, onVerified: () => void) => {
    setSecurityPassword('');
    setSecurityConfirm({
      isOpen: true,
      title,
      description,
      onVerified,
      isProcessing: false
    });
  };

  const handleSecurityVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityConfirm(prev => ({ ...prev, isProcessing: true }));
    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: securityPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSecurityConfirm(prev => ({ ...prev, isOpen: false }));
        securityConfirm.onVerified();
      } else {
        alert(data.error || 'Incorrect password. Verification failed.');
      }
    } catch (e) {
      alert('Error verifying credentials.');
    } finally {
      setSecurityConfirm(prev => ({ ...prev, isProcessing: false }));
    }
  };

  // ── Teacher Features in Admin States ──────────
  // Attendance
  const [attBatchId, setAttBatchId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStudents, setAttStudents] = useState<any[]>([]);
  const [attRecords, setAttRecords] = useState<Record<string, string>>({});
  const [isSavingAtt, setIsSavingAtt] = useState(false);

  const fetchAttendance = async (batchIdVal = attBatchId, dateVal = attDate) => {
    if (!batchIdVal) return;
    try {
      // Fetch students for selected batch using admin-compatible URL
      const batchRes = await fetch(`/api/teacher/students?batchId=${batchIdVal}`);
      if (batchRes.ok) {
        const bData = await batchRes.json();
        setAttStudents(bData.students || []);
        
        // Fetch existing attendance records
        const attRes = await fetch(`/api/teacher/attendance?batchId=${batchIdVal}&date=${dateVal}`);
        if (attRes.ok) {
          const aData = await attRes.json();
          const records: Record<string, string> = {};
          aData.attendance.forEach((r: any) => {
            records[r.studentId] = r.status;
          });
          setAttRecords(records);
        }
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveAttendance = async () => {
    if (!attBatchId) return;
    setIsSavingAtt(true);
    try {
      const records = attStudents.map(s => ({
        studentId: s.id,
        status: attRecords[s.id] || 'PRESENT'
      }));

      const res = await fetch('/api/teacher/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: attBatchId, date: attDate, records })
      });

      if (res.ok) alert('Attendance saved successfully!');
      else alert('Failed to save attendance');
    } catch (e) { console.error(e); }
    finally { setIsSavingAtt(false); }
  };

  const markAll = (status: string) => {
    const records: Record<string, string> = {};
    attStudents.forEach(s => { records[s.id] = status; });
    setAttRecords(records);
  };

  // Study Materials
  const [materials, setMaterials] = useState<any[]>([]);
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState('PDF');
  const [matUrl, setMatUrl] = useState('');
  const [matCourseId, setMatCourseId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Custom File Uploader helper states for Admin
  const [uploadMode, setUploadMode] = useState<'FILE' | 'URL'>('FILE');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('');
  const [filePreview, setFilePreview] = useState('');

  // ─── AI GURU WORKSPACE FOR ADMIN ────────────────────
  const [aiMode, setAiMode] = useState<'GURU' | 'PREPARE'>('GURU');
  const [adminGuruQuestion, setAdminGuruQuestion] = useState('');
  const [adminGuruSubject, setAdminGuruSubject] = useState('Mathematics');
  const [adminGuruLanguage, setAdminGuruLanguage] = useState<'ENGLISH' | 'HINDI' | 'HINGLISH'>('ENGLISH');
  const [adminGuruHistory, setAdminGuruHistory] = useState<Array<{ role: 'user' | 'guru', content: string, subject?: string, file?: string, fileName?: string, image?: string, revealedSteps?: number }>>([]);
  const [adminGuruLoading, setAdminGuruLoading] = useState(false);
  const [adminGuruFile, setAdminGuruFile] = useState<string | null>(null);
  const [adminGuruFileName, setAdminGuruFileName] = useState<string>('');
  const [dbHistoryList, setDbHistoryList] = useState<any[]>([]);
  const [showGuruHistoryPanel, setShowGuruHistoryPanel] = useState(false);

  // Audio recording states
  const [adminIsRecording, setAdminIsRecording] = useState(false);
  const [adminMediaRecorder, setAdminMediaRecorder] = useState<any | null>(null);
  const [adminAudioChunks, setAdminAudioChunks] = useState<any[]>([]);
  const [adminIsTranscribing, setAdminIsTranscribing] = useState(false);

  // Lesson PPT/Notes Generator States
  const [pptTopic, setPptTopic] = useState('');
  const [pptGrade, setPptGrade] = useState('Class 10');
  const [pptFocus, setPptFocus] = useState('Comprehensive explanations, formulas, derivations, and 5 MCQs');
  const [pptSlideCount, setPptSlideCount] = useState(5);
  const [pptGenerating, setPptGenerating] = useState(false);
  const [generatedPpt, setGeneratedPpt] = useState<any>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [pptViewMode, setPptViewMode] = useState<'SLIDES' | 'NOTES'>('SLIDES');

  // Slide inline editing states
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [editedSlideTitle, setEditedSlideTitle] = useState('');
  const [editedSlideSubtitle, setEditedSlideSubtitle] = useState('');
  const [editedSlideContent, setEditedSlideContent] = useState('');

  const handleAdminGuruFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB");
      return;
    }

    setAdminGuruFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setAdminGuruFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startAdminVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: any[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await transcribeAdminAudio(audioBlob);
      };

      recorder.start();
      setAdminMediaRecorder(recorder);
      setAdminAudioChunks(chunks);
      setAdminIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Please check permission settings.");
    }
  };

  const stopAdminVoiceRecording = () => {
    if (adminMediaRecorder && adminIsRecording) {
      adminMediaRecorder.stop();
      setAdminIsRecording(false);
    }
  };

  const transcribeAdminAudio = async (audioBlob: Blob) => {
    setAdminIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_query.webm');
      
      const res = await fetch('/api/student/guru-ji/transcribe', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAdminGuruQuestion(data.text);
      } else {
        alert("Transcription failed. Please try again or type your doubt.");
      }
    } catch (err) {
      console.error("Transcription query error:", err);
    } finally {
      setAdminIsTranscribing(false);
    }
  };

  const renderMath = (text: string) => {
    if (typeof window === 'undefined') return text;
    const katex = (window as any).katex;
    if (!katex) return text;
    try {
      let parsed = text;
      // Replace $$formula$$ with display math
      parsed = parsed.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
        try {
          return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
        } catch (e) {
          return match;
        }
      });
      // Replace $formula$ with inline math
      parsed = parsed.replace(/\$(?!\$)([\s\S]*?)\$/g, (match, formula) => {
        try {
          return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
        } catch (e) {
          return match;
        }
      });
      return parsed;
    } catch (err) {
      console.error("Math rendering error:", err);
      return text;
    }
  };

  const renderAdminSimpleLines = (text: string, baseKey: any, animate: boolean = false) => {
    return text.split('\n').map((line, idx) => {
      let lineText = line.trim();
      if (!lineText) return <div key={`${baseKey}_${idx}`} style={{ height: '0.3rem' }} />;
      
      // Markdown Images: ![alt](url)
      lineText = lineText.replace(/!\[(.*?)\]\((.*?)\)/gi, '<img src="$2" alt="$1" style="max-width:100%; border-radius:8px; margin: 0.5rem 0; display:block; box-shadow:var(--shadow-sm);" />');
      // Markdown Links: [label](url)
      lineText = lineText.replace(/\[(.*?)\]\((.*?)\)/gi, '<a href="$2" target="_blank" rel="noreferrer" style="color:var(--primary);text-decoration:underline;font-weight:600;">$1</a>');
      // Bold formatting
      lineText = lineText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Inline code formatting
      lineText = lineText.replace(/`(.*?)`/g, '<code style="background:var(--surface-light);padding:2px 6px;border-radius:4px;font-family:monospace;color:var(--primary);font-weight:600;">$1</code>');

      // Strip out markdown headings and format as bold header divs
      if (lineText.startsWith('#')) {
        const cleanHeading = lineText.replace(/^#+\s*/, '');
        const finalHeading = cleanHeading.replace(/#(?![0-9a-fA-F]{3}\b|[0-9a-fA-F]{6}\b)/g, '');
        const mathHeading = renderMath(finalHeading);
        return (
          <div key={`${baseKey}_${idx}`} style={{ fontWeight: 800, fontSize: '1.02rem', color: '#ef4444', margin: '0.6rem 0 0.3rem 0' }}>
            {animate ? <TypewriterText text={mathHeading} /> : <span dangerouslySetInnerHTML={{ __html: mathHeading }} />}
          </div>
        );
      }

      // Clean other isolated hash symbols
      lineText = lineText.replace(/#(?![0-9a-fA-F]{3}\b|[0-9a-fA-F]{6}\b)/g, '');

      if (lineText.startsWith('👉 ')) {
        const mathTextLine = renderMath(lineText.slice(2));
        return (
          <div key={`${baseKey}_${idx}`} style={{ background: 'rgba(239,68,68,0.06)', padding: '0.4rem 0.6rem', borderRadius: '8px', borderLeft: '3px solid #ef4444', margin: '0.35rem 0', fontWeight: 700, color: 'var(--text)', fontSize: 'inherit' }}>
            {animate ? <TypewriterText text={mathTextLine} /> : <span dangerouslySetInnerHTML={{ __html: mathTextLine }} />}
          </div>
        );
      }
      if (lineText.startsWith('* ') || lineText.startsWith('- ')) {
        const mathTextLine = renderMath(lineText.slice(2));
        return (
          <li key={`${baseKey}_${idx}`} style={{ marginLeft: '0.75rem', marginBottom: '0.2rem', listStyleType: 'square', color: 'var(--text)', fontSize: 'inherit' }}>
            {animate ? <TypewriterText text={mathTextLine} /> : <span dangerouslySetInnerHTML={{ __html: mathTextLine }} />}
          </li>
        );
      }
      if (lineText.startsWith('---')) {
        return <hr key={`${baseKey}_${idx}`} style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '0.5rem 0' }} />;
      }
      const mathTextLineFinal = renderMath(lineText);
      return (
        <p key={`${baseKey}_${idx}`} style={{ margin: '0.2rem 0', color: 'var(--text)', lineHeight: 1.45, fontSize: 'inherit' }}>
          {animate ? <TypewriterText text={mathTextLineFinal} /> : <span dangerouslySetInnerHTML={{ __html: mathTextLineFinal }} />}
        </p>
      );
    });
  };

  const renderAdminSlideContent = (content: string, baseKey: string) => {
    if (!content) return null;
    const parts = content.split(/(<svg[\s\S]*?<\/svg>)/gi);
    return parts.map((part, idx) => {
      const isSvg = part.trim().toLowerCase().startsWith('<svg') && part.trim().toLowerCase().endsWith('</svg>');
      if (isSvg) {
        return (
          <div 
            key={`${baseKey}_svg_${idx}`}
            className="guru-svg-container"
            style={{ 
              margin: '0.75rem auto', 
              background: 'rgba(255,255,255,0.03)', 
              padding: '1rem', 
              borderRadius: '12px', 
              border: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              overflowX: 'auto',
              maxWidth: '100%'
            }} 
            dangerouslySetInnerHTML={{ __html: part.trim() }} 
          />
        );
      }
      return (
        <div key={`${baseKey}_text_${idx}`}>
          {renderAdminSimpleLines(part, `${baseKey}_lines_${idx}`)}
        </div>
      );
    });
  };

  const formatAdminGuruResponse = (content: string, revealedSteps: number = 1, messageIndex: number = 0, isNew: boolean = false) => {
    if (!content) return null;

    // Split content into blocks of SVG and normal text
    const parts = content.split(/(<svg[\s\S]*?<\/svg>)/gi);

    return (
      <div style={{
        borderRadius: '16px',
        padding: '0.75rem 1rem',
        border: '1px solid var(--border)',
        background: 'var(--surface-light)',
        boxShadow: 'var(--shadow-sm)',
        width: '100%',
        boxSizing: 'border-box'
      }} className="guru-response-card animate-fade-in">
        {parts.map((part, idx) => {
          const isSvg = part.trim().toLowerCase().startsWith('<svg') && part.trim().toLowerCase().endsWith('</svg>');
          if (isSvg) {
            return (
              <div 
                key={idx} 
                className="guru-svg-container"
                style={{ 
                  margin: '0.75rem 0', 
                  background: 'rgba(255,255,255,0.03)', 
                  padding: '1.25rem', 
                  borderRadius: '12px', 
                  border: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  overflowX: 'auto',
                  maxWidth: '100%'
                }} 
                dangerouslySetInnerHTML={{ __html: part.trim() }} 
              />
            );
          }
          return (
            <div key={idx} className="guru-card-text" style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5 }}>
              {renderAdminSimpleLines(part, idx, isNew)}
            </div>
          );
        })}
      </div>
    );
  };

  // Custom prompt slide content generator
  const generateLessonPPT = async () => {
    if (!pptTopic.trim()) return;
    setPptGenerating(true);
    try {
      const finalFocus = `Difficulty Level: ${pptDifficulty}. Target Duration: ${pptDuration} minutes. Core concepts, detailed explanations, formulas, derivations, real-world examples, and 5 multiple choice questions with solutions.`;
      const res = await fetch('/api/admin/ai/ppt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: pptTopic.trim(), grade: pptGrade, focus: finalFocus })
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedPpt(data);
        setActiveSlideIndex(0);
      } else {
        alert('Failed to generate slides. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error occurred.');
    } finally {
      setPptGenerating(false);
    }
  };

  const formatContentForPrint = (content: string) => {
    if (!content) return '';
    const mathRendered = renderMath(content);
    const parts = mathRendered.split(/(<svg[\s\S]*?<\/svg>)/gi);
    return parts.map(part => {
      const isSvg = part.trim().toLowerCase().startsWith('<svg') && part.trim().toLowerCase().endsWith('</svg>');
      if (isSvg) {
        return '<div class="print-svg-container" style="display:flex; justify-content:center; margin:15px auto; max-width:100%; overflow:hidden;">' + part.trim() + '</div>';
      } else {
        return part.replace(/\n/g, '<br/>');
      }
    }).join('');
  };

  const printAdminPpt = () => {
    if (!generatedPpt) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(
      '<html><head><title>Sudhir Tutorials - Premium Lesson Slides: ' + generatedPpt.topic + '</title>' +
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />' +
      '<style>' +
      'body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }' +
      '.slide-page { page-break-after: always; border: 2px solid #ef4444; border-radius: 12px; padding: 30px; margin-bottom: 40px; background: #fff; min-height: 500px; display: flex; flex-direction: column; justify-content: space-between; }' +
      '.header { border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }' +
      '.header h1 { margin: 0; font-size: 20px; color: #ef4444; font-weight: 800; }' +
      '.badge { background: #ef4444; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }' +
      '.meta { font-size: 13px; color: #6b7280; margin-top: 5px; }' +
      '.content { font-size: 16px; line-height: 1.6; color: #374151; flex: 1; }' +
      '.footer { border-top: 1px dashed #d1d5db; padding-top: 15px; margin-top: 20px; display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; font-weight: bold; }' +
      '.logo-text { font-size: 16px; font-weight: 900; color: #ef4444; letter-spacing: 0.5px; }' +
      '</style></head><body>' +
      generatedPpt.slides.map(function(s: any, idx: number) {
        return '<div class="slide-page"><div><div class="header"><div><h1>' + s.title + '</h1>' +
          '<div class="meta">' + (s.subtitle || '') + '</div></div>' +
          '<div class="badge">' + s.badge + '</div></div>' +
          '<div style="font-size:12px; color:#6b7280; margin-bottom: 15px; font-weight: bold;">' + s.meta + '</div>' +
          '<div class="content">' + formatContentForPrint(s.content) + '</div></div>' +
          '<div class="footer"><span class="logo-text">SUDHIR TUTORIALS</span>' +
          '<span>Slide ' + (idx + 1) + ' of ' + generatedPpt.slides.length + '</span></div></div>';
      }).join('') +
      '<script>window.onload = function() { window.print(); };</script></body></html>'
    );
    printWindow.document.close();
  };

  const downloadAdminPptAsPdf = async () => {
    if (!generatedPpt) return;
    try {
      const loadHtml2Pdf = () => {
        return new Promise<void>((resolve, reject) => {
          if ((window as any).html2pdf) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load html2pdf script.'));
          document.head.appendChild(script);
        });
      };

      await loadHtml2Pdf();
      
      const tempDiv = document.createElement('div');
      tempDiv.style.position = 'absolute';
      tempDiv.style.left = '0px';
      tempDiv.style.top = '0px';
      tempDiv.style.zIndex = '-9999';
      tempDiv.style.opacity = '1';
      tempDiv.style.pointerEvents = 'none';
      tempDiv.style.width = '1120px';
      
      tempDiv.innerHTML = '<div style="font-family: \'Segoe UI\', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: #f8f9fa; box-sizing: border-box;">' +
        generatedPpt.slides.map(function(s: any, idx: number) {
          return '<div style="page-break-after: always; border: 2px solid #ef4444; border-radius: 12px; padding: 30px; margin-bottom: 25px; background: #fff; min-height: 520px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">' +
            '<div>' +
              '<div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">' +
                '<div style="display: flex; align-items: center; gap: 10px;">' +
                  '<img src="/logo.png" alt="Sudhir Tutorials" style="width: 38px; height: 38px; object-fit: contain; border-radius: 8px;" />' +
                  '<div>' +
                    '<h1 style="margin: 0; font-size: 20px; color: #ef4444; font-weight: 800;">' + s.title + '</h1>' +
                    '<div style="font-size: 13px; color: #6b7280; margin-top: 2px;">' + (s.subtitle || '') + '</div>' +
                  '</div>' +
                '</div>' +
                '<div style="background: #ef4444; color: white; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px;">' +
                  (s.badge || 'SUDHIR TUTORIALS') +
                '</div>' +
              '</div>' +
              '<div style="font-size: 12px; color: #6b7280; margin-bottom: 15px; font-weight: bold;">' + s.meta + '</div>' +
              '<div style="font-size: 16px; line-height: 1.6; color: #374151; flex: 1;">' +
                formatContentForPrint(s.content) +
              '</div>' +
            '</div>' +
            '<div style="border-top: 1px dashed #d1d5db; padding-top: 15px; margin-top: 20px; display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; font-weight: bold; align-items: center;">' +
              '<span style="font-size: 14px; font-weight: 900; color: #ef4444; letter-spacing: 0.5px; display: flex; align-items: center; gap: 5px;">' +
                '<img src="/logo.png" alt="" style="width: 16px; height: 16px; object-fit: contain;" />' +
                'SUDHIR TUTORIALS' +
              '</span>' +
              '<span>Slide ' + (idx + 1) + ' of ' + generatedPpt.slides.length + '</span>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';
      
      document.body.appendChild(tempDiv);

      const opt = {
        margin: [5, 5, 5, 5],
        filename: 'Lesson_Slides_' + generatedPpt.topic.replace(/[\s\/]/g, '_') + '.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
      };

      const cap = (window as any).Capacitor;
      const isNative = cap && cap.isNativePlatform && cap.isNativePlatform();
      let Filesystem: any = null;
      let Directory: any = null;
      let Share: any = null;
      if (isNative) {
        try {
          const fs = await import('@capacitor/filesystem');
          Filesystem = fs.Filesystem;
          Directory = fs.Directory;
          const sh = await import('@capacitor/share');
          Share = sh.Share;
        } catch (e) {
          console.error('Failed to load Capacitor plugins dynamically:', e);
        }
      }

      if (isNative && Filesystem) {
        const pdfDataUri = await (window as any).html2pdf().from(tempDiv).set(opt).output('datauristring');
        const base64Data = pdfDataUri.split(',')[1];
        const filename = 'Lesson_Slides_' + generatedPpt.topic.replace(/[\s\/]/g, '_') + '.pdf';
        
        try {
          await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Documents
          });
          alert('Slides PDF downloaded successfully! Saved in your Documents/Downloads folder as ' + filename);
        } catch (err) {
          console.error("Failed to write to DOCUMENTS, falling back to cache & share:", err);
          const writeResult = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: Directory.Cache
          });
          if (Share) {
            await Share.share({
              title: 'Lesson Slides: ' + generatedPpt.topic,
              url: writeResult.uri,
              dialogTitle: 'Share/Save Lesson Slides PDF'
            });
          }
        }
      } else {
        await (window as any).html2pdf().from(tempDiv).set(opt).save();
      }

      document.body.removeChild(tempDiv);
    } catch (error) {
      console.error('PDF generation error, falling back to popup print:', error);
      printAdminPpt();
    }
  };

  const askAdminGuru = async () => {
    if (!adminGuruQuestion.trim() && !adminGuruFile) return;
    const q = adminGuruQuestion;
    const subj = adminGuruSubject;
    const fl = adminGuruFile;
    const fn = adminGuruFileName;
    setAdminGuruQuestion('');
    setAdminGuruFile(null);
    setAdminGuruFileName('');
    
    setAdminGuruHistory(prev => [...prev, { role: 'user', content: q, subject: subj, file: fl || undefined, fileName: fn || undefined }]);
    setAdminGuruLoading(true);

    try {
      const res = await fetch('/api/student/guru-ji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, subject: subj, language: adminGuruLanguage, file: fl })
      });

      if (!res.ok) {
        setAdminGuruHistory(prev => [...prev, { role: 'guru', content: '❌ Sorry, I encountered a connection issue. Please try seeking my guidance again.', revealedSteps: 1, isNew: true }]);
        setAdminGuruLoading(false);
        return;
      }

      setAdminGuruLoading(false);
      setAdminGuruHistory(prev => [...prev, { role: 'guru', content: '', revealedSteps: 1, isNew: false }]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setAdminGuruHistory(prev => {
            const updated = [...prev];
            if (updated.length > 0) {
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: accumulatedText
              };
            }
            return updated;
          });

          // Scroll chat feed
          const feed = document.getElementById('admin-guru-chat-feed');
          if (feed) feed.scrollTop = feed.scrollHeight;
        }
      }
    } catch (e) {
      setAdminGuruHistory(prev => [...prev, { role: 'guru', content: '❌ Network connection error occurred. Make sure you are connected to the Internet.', revealedSteps: 1, isNew: true }]);
      setAdminGuruLoading(false);
    }
  };

  const fetchAdminGuruHistory = async () => {
    try {
      const res = await fetch('/api/student/guru-ji/history');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.doubts) {
          setDbHistoryList(data.doubts);
        }
      }
    } catch (e) {
      console.error('Failed to fetch admin guru-ji history:', e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('⚠️ File size exceeds the 3 MB limit.');
      e.target.value = '';
      return;
    }

    setSelectedFileName(file.name);
    const sizeKB = Math.round(file.size / 1024);
    setSelectedFileSize(sizeKB > 1024 ? `${(sizeKB / 1024).toFixed(1)} MB` : `${sizeKB} KB`);

    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    if (!matTitle) {
      setMatTitle(baseName);
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') {
      setMatType('PDF');
    } else if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) {
      setMatType('VIDEO');
    } else if (['doc', 'docx', 'odt', 'rtf'].includes(ext || '')) {
      setMatType('WORD');
    } else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext || '')) {
      setMatType('IMAGE');
      setFilePreview(URL.createObjectURL(file));
    } else {
      setMatType('PDF');
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64 = uploadEvent.target?.result as string;
      setMatUrl(base64);
    };
    reader.readAsDataURL(file);
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/teacher/materials');
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleOpenMaterial = async (mat: any) => {
    if (!mat.url) return;
    const isBase64 = mat.url.startsWith('data:');
    if (!isBase64) {
      window.open(mat.url, '_blank');
      return;
    }
    const cap = (window as any).Capacitor;
    const isNative = cap && cap.isNativePlatform && cap.isNativePlatform();
    if (isNative) {
      try {
        const { Filesystem } = await import('@capacitor/filesystem');
        const { FileOpener } = await import('@capacitor-community/file-opener');
        const parts = mat.url.split(',');
        const base64Data = parts[1];
        let ext = 'pdf';
        let mime = 'application/pdf';
        if (mat.type === 'PDF') { ext = 'pdf'; mime = 'application/pdf'; }
        else if (mat.type === 'VIDEO') { ext = 'mp4'; mime = 'video/mp4'; }
        else if (mat.type === 'WORD') { ext = 'docx'; mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'; }
        else if (mat.type === 'IMAGE') { ext = 'png'; mime = 'image/png'; }
        const cleanTitle = mat.title.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `${cleanTitle}.${ext}`;
        const writeResult = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: 'CACHE' as any
        });
        try {
          await FileOpener.open({
            filePath: writeResult.uri,
            contentType: mime
          });
        } catch (openErr) {
          console.warn("FileOpener failed, falling back to Share:", openErr);
          const { Share } = await import('@capacitor/share');
          await Share.share({
            title: mat.title,
            text: `Study Material: ${mat.title}`,
            files: [writeResult.uri],
            dialogTitle: `Open ${mat.title}`
          });
        }
      } catch (err) {
        console.error("Failed to open material natively:", err);
        alert("Could not open material natively.");
      }
    } else {
      try {
        const parts = mat.url.split(',');
        const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank');
      } catch (err) {
        console.error("Failed to open base64 blob:", err);
        const newWindow = window.open();
        if (newWindow) {
          newWindow.document.write(`<iframe src="${mat.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
          alert("Pop-up blocked. Please allow pop-ups for this site.");
        }
      }
    }
  };

  const handleSendBatchMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchMsgTarget || !batchMsgContent.trim() || isSendingBatchMsg) return;
    setIsSendingBatchMsg(true);
    try {
      const res = await fetch('/api/messages/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batchMsgTarget.id, content: batchMsgContent }),
      });
      if (res.ok) {
        alert(`Message successfully broadcast to all students in batch: ${batchMsgTarget.name}!`);
        setBatchMsgTarget(null);
        setBatchMsgContent('');
      } else {
        const d = await res.json();
        alert(`Error: ${d.error || 'Failed to send message'}`);
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Failed to send message.');
    } finally {
      setIsSendingBatchMsg(false);
    }
  };

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matTitle || !matUrl || !matCourseId) {
      alert("Please fill all material fields!");
      return;
    }
    setIsUploading(true);
    try {
      const res = await fetch('/api/teacher/materials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: matTitle,
          type: matType,
          url: matUrl,
          courseId: matCourseId
        })
      });

      if (res.ok) {
        setMatTitle('');
        setMatUrl('');
        setSelectedFileName('');
        setSelectedFileSize('');
        setFilePreview('');
        fetchMaterials();
        alert('Material uploaded successfully!');
      } else {
        alert('Failed to upload material');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      const res = await fetch(`/api/teacher/materials?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchMaterials();
      } else {
        alert('Failed to delete material');
      }
    } catch (e) { console.error(e); }
  };

  // Tests & Examinations
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [testMarks, setTestMarks] = useState<Record<string, { marks: string, totalMarks: string, remarks: string }>>({});
  const [isSavingMarks, setIsSavingMarks] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [showCreateTestForm, setShowCreateTestForm] = useState(false);
  const [newTest, setNewTest] = useState({ title: '', subject: '', courseId: '', date: new Date().toISOString().split('T')[0], time: '', syllabus: '' });
  const [testStudents, setTestStudents] = useState<any[]>([]);
  const [editingTest, setEditingTest] = useState<any>(null);

  const handleEditTest = (test: any) => {
    setEditingTest({
      id: test.id,
      title: test.title,
      subject: test.subject || '',
      courseId: test.courseId,
      date: new Date(test.date).toISOString().split('T')[0],
      time: test.time || '',
      syllabus: test.syllabus || '',
      isPublished: test.isPublished
    });
  };

  const handleUpdateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest.title || !editingTest.courseId) {
      alert("Please fill all test fields!");
      return;
    }
    try {
      const res = await fetch('/api/teacher/tests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingTest)
      });
      if (res.ok) {
        setEditingTest(null);
        fetchTests();
        alert('Test updated successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update test');
      }
    } catch (e) { console.error(e); }
  };

  const handlePublishResult = async (testId: string) => {
    if (!confirm('Are you sure you want to publish the results for this test? Once published, students will be able to view their marks.')) return;
    try {
      const res = await fetch('/api/teacher/tests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: testId, isPublished: true })
      });
      if (res.ok) {
        fetchTests();
        alert('Results published successfully!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to publish results');
      }
    } catch (e) { console.error(e); }
  };

  const fetchTests = async () => {
    try {
      const res = await fetch('/api/teacher/tests');
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTest.title || !newTest.courseId) {
      alert("Please fill all test fields!");
      return;
    }
    setIsCreatingTest(true);
    try {
      const res = await fetch('/api/teacher/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTest)
      });
      if (res.ok) {
        setNewTest({ title: '', subject: '', courseId: '', date: new Date().toISOString().split('T')[0], time: '', syllabus: '' });
        fetchTests();
        alert('Test created successfully!');
      } else alert('Failed to create test');
    } catch (e) { console.error(e); }
    finally { setIsCreatingTest(false); }
  };

  const handleEnterMarks = async (test: any) => {
    setSelectedTest(test);
    try {
      const res = await fetch(`/api/teacher/students?courseId=${test.courseId}`);
      if (res.ok) {
        const data = await res.json();
        const initialMarks: any = {};
        data.students.forEach((s: any) => {
          const existingResult = test.results?.find((r: any) => r.studentId === s.id);
          initialMarks[s.id] = {
            marks: existingResult?.marks?.toString() || '',
            totalMarks: existingResult?.totalMarks?.toString() || '100',
            remarks: existingResult?.remarks || ''
          };
        });
        setTestMarks(initialMarks);
        setTestStudents(data.students || []);
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveMarks = async () => {
    if (!selectedTest) return;
    setIsSavingMarks(true);
    try {
      const results = Object.entries(testMarks).map(([studentId, data]) => ({
        studentId,
        marks: parseFloat(data.marks),
        totalMarks: parseFloat(data.totalMarks),
        remarks: data.remarks
      })).filter(r => !isNaN(r.marks));

      const res = await fetch('/api/teacher/test-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testId: selectedTest.id, results })
      });
      if (res.ok) {
        alert('Marks saved successfully!');
        setSelectedTest(null);
        fetchTests();
      } else alert('Failed to save marks');
    } catch (e) { console.error(e); }
    finally { setIsSavingMarks(false); }
  };

  const handleDeleteTest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test and all marks?')) return;
    try {
      const res = await fetch(`/api/teacher/tests?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTests();
      } else {
        alert('Failed to delete test');
      }
    } catch (e) { console.error(e); }
  };

  // Directory State
  const [searchQuery, setSearchQuery] = useState('');
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [directoryFilter, setDirectoryFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER' | 'ADMIN'>('ALL');
  const [showPendingVerificationsList, setShowPendingVerificationsList] = useState(false);
  const [showAdmissionsInquiriesList, setShowAdmissionsInquiriesList] = useState(false);
  const [bugReports, setBugReports] = useState<any[]>([]);
  const [isLoadingBugReports, setIsLoadingBugReports] = useState(false);
  const [showBugReportsList, setShowBugReportsList] = useState(false);

  // Job Applications states
  const [jobApplications, setJobApplications] = useState<any[]>([]);
  const [isLoadingJobApplications, setIsLoadingJobApplications] = useState(false);
  const [showJobApplicationsList, setShowJobApplicationsList] = useState(false);

  const filteredDirectoryUsers = useMemo(() => {
    return directoryUsers.filter(u => {
      const matchesFilter = directoryFilter === 'ALL' || u.role === directoryFilter;
      const matchesSearch = !searchQuery.trim() || 
        (u.name && u.name.toLowerCase().includes(searchQuery.toLowerCase())) || 
        (u.username && u.username.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesFilter && matchesSearch;
    });
  }, [directoryUsers, directoryFilter, searchQuery]);  // Finance State
  const [financeStudentSearchQuery, setFinanceStudentSearchQuery] = useState('');
  const [showFinanceSuggestions, setShowFinanceSuggestions] = useState(false);
  const [fees, setFees] = useState<any[]>([]);
  const [ledgerRefreshTrigger, setLedgerRefreshTrigger] = useState(0);

  const handleQuickServiceClick = (tab: string, subTab?: string) => {
    if (tab === 'finances' && subTab) {
      setFinanceSubTab(subTab as any);
    } else if (tab === 'academics' && subTab) {
      setAcademicSubTab(subTab as any);
    }
    handleTabChange(tab);
  };

  const [feeSearchQuery, setFeeSearchQuery] = useState('');
  const [showLedgerSuggestions, setShowLedgerSuggestions] = useState(false);
  const [showDirSuggestions, setShowDirSuggestions] = useState(false);
  const [showAssignSalaryForm, setShowAssignSalaryForm] = useState(false);
  const [showCreateBatchForm, setShowCreateBatchForm] = useState(false);
  const [showUploadedMaterials, setShowUploadedMaterials] = useState(false);
  const [showPublishMaterialForm, setShowPublishMaterialForm] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [addFeeMode, setAddFeeMode] = useState<'INDIVIDUAL' | 'BATCH'>('INDIVIDUAL');
  const [feeStudentId, setFeeStudentId] = useState('');
  const [feeStudentSearch, setFeeStudentSearch] = useState(''); // for combobox display text
  const [feeAmount, setFeeAmount] = useState('');
  const [feeDiscount, setFeeDiscount] = useState('');
  const [feeBillingMonth, setFeeBillingMonth] = useState(() => {
    const d = new Date();
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  });
  const [feeTitle, setFeeTitle] = useState('Monthly Fee');
  const [feeDueDate, setFeeDueDate] = useState('');
  const [feeCreatedAt, setFeeCreatedAt] = useState(new Date().toISOString().split('T')[0]);
  const [isAddingFee, setIsAddingFee] = useState(false);

  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState<string>('');
  const [ledgerFilterMonth, setLedgerFilterMonth] = useState<string>('ALL');
  const [ledgerFilterYear, setLedgerFilterYear] = useState<string>('ALL');

  // Generate 36 months for Assign Fee billing month select dropdown
  const billingMonthOptions = (() => {
    const options = [];
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    for (let i = 0; i < 36; i++) {
      options.push(d.toLocaleString('en-US', { month: 'long', year: 'numeric' }));
      d.setMonth(d.getMonth() + 1);
    }
    return options;
  })();

  const calculateLiveLateFine = (dueDateStr: string, paidAtStr: string, billingMonth?: string) => {
    if (!dueDateStr) return 0;
    const due = new Date(dueDateStr);
    let now = new Date();
    if (paidAtStr) {
      const parts = paidAtStr.split('-');
      if (parts.length === 3) {
        now = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        now = new Date(paidAtStr);
      }
    }
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

    const msPerDay = 1000 * 60 * 60 * 24;
    const daysLate = Math.floor((today.getTime() - dueDay.getTime()) / msPerDay);

    if (daysLate <= 0) return 0;
    if (daysLate <= 10) return daysLate * perDayFine;
    return flatFineAfter10Days;
  };

  // Extract unique months from fees array
  const uniqueBillingMonths = Array.from(new Set(fees.map(f => f.billingMonth).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  
  const uniqueLedgerYears = Array.from(new Set(fees.map(f => {
    const m = f.billingMonth || '';
    const match = m.match(/\d{4}/);
    if (match) return match[0];
    const createdDate = new Date(f.createdAt);
    if (!isNaN(createdDate.getTime())) return createdDate.getFullYear().toString();
    return new Date().getFullYear().toString();
  }).filter(Boolean))).sort((a: any, b: any) => b.localeCompare(a));

  useEffect(() => {
    if (fees.length > 0 && !selectedFinanceMonth) {
      const currentMonthYear = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' });
      if (fees.some(f => f.billingMonth === currentMonthYear)) {
        setSelectedFinanceMonth(currentMonthYear);
      } else {
        setSelectedFinanceMonth(fees[0].billingMonth);
      }
    }
  }, [fees]);

  const [finSummary, setFinSummary] = useState<{
    totalRevenue: number;
    totalExpenses: number;
    totalPending: number;
    currentMonthCollected?: number;
    currentMonthPending?: number;
    netProfit: number;
    monthlyData: any[];
  }>({
    totalRevenue: 0,
    totalExpenses: 0,
    totalPending: 0,
    netProfit: 0,
    monthlyData: []
  });
  const currentMonthCollected = finSummary?.currentMonthCollected || 0;
  const currentMonthPending = finSummary?.currentMonthPending || 0;

  const [isLoadingFinSummary, setIsLoadingFinSummary] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoadingFees, setIsLoadingFees] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: '', category: 'OTHER', amount: '', remarks: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingFee, setPayingFee] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState({ paymentMethod: 'CASH', transactionId: '', discount: 0, remarks: '', paidAmount: '', paidAt: '' });

  // Courses & Batches State
  const [courses, setCourses] = useState<any[]>([]);
  const [batchMsgTarget, setBatchMsgTarget] = useState<{ id: string; name: string } | null>(null);
  const [batchMsgContent, setBatchMsgContent] = useState('');
  const [isSendingBatchMsg, setIsSendingBatchMsg] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchCourseId, setNewBatchCourseId] = useState('');
  const [newBatchTeacherUsername, setNewBatchTeacherUsername] = useState('');
  const [newBatchStudentUsernames, setNewBatchStudentUsernames] = useState('');
  const [newBatchClassName, setNewBatchClassName] = useState('');
  const [newBatchSubjects, setNewBatchSubjects] = useState('');
  const [newBatchDefaultFee, setNewBatchDefaultFee] = useState('');
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);

  // Course Edit State
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingCourseName, setEditingCourseName] = useState('');
  const [editingCourseDesc, setEditingCourseDesc] = useState('');
  const [isSavingCourse, setIsSavingCourse] = useState(false);

  // Advanced Batch Edit State
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ dayOfWeek: '1', startTime: '16:00', endTime: '17:00', room: '', subject: '' });

  // Profile Edit State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserDetail, setSelectedUserDetail] = useState<any>(null);
  const [financeRefreshTrigger, setFinanceRefreshTrigger] = useState(0);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Close modals on route change
  useEffect(() => {
    setShowProfileModal(false);
    setSelectedUserDetail(null);
    setEditingProfile(null);
  }, [pathname, searchParams]);

  // Auto-fetch full relational profile data when opening student details modal
  useEffect(() => {
    if (selectedUserDetail && selectedUserDetail.role === 'STUDENT' && !selectedUserDetail.studentAttendance) {
      (async () => {
        try {
          const res = await fetch(`/api/admin/students/${selectedUserDetail.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.student) {
              setSelectedUserDetail((prev: any) => prev ? { ...prev, ...data.student } : null);
            }
          }
        } catch (e) {
          console.error("Failed to load full student profile details:", e);
        }
      })();
    }
  }, [selectedUserDetail?.id]);
  
  // One-Time Password State
  const [otpValue, setOtpValue] = useState("");
  const [otpGenerating, setOtpGenerating] = useState(false);

  // Fee Edit State
  const [editingFeeRecord, setEditingFeeRecord] = useState<any>(null);
  const [showEditFeeModal, setShowEditFeeModal] = useState(false);
  const [isSavingFeeRecord, setIsSavingFeeRecord] = useState(false);
  
  // Auto-Billing Control Panel State
  const [autoBillingMonth, setAutoBillingMonth] = useState("");
  const [autoBillingPreview, setAutoBillingPreview] = useState<any>(null);
  const [loadingAutoBillingPreview, setLoadingAutoBillingPreview] = useState(false);
  const [runningAutoBilling, setRunningAutoBilling] = useState(false);

  useEffect(() => {
    const isModalOpen = !!(selectedUserDetail || activeProfileUserId || showProfileModal || activeReceipt);
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedUserDetail, activeProfileUserId, showProfileModal, activeReceipt]);

  useEffect(() => {
    const handleBackButton = (e: Event) => {
      if (activeReceipt) {
        e.preventDefault();
        setActiveReceipt(null);
      } else if (activeProfileUserId) {
        e.preventDefault();
        setActiveProfileUserId(null);
      } else if (selectedUserDetail) {
        e.preventDefault();
        setSelectedUserDetail(null);
      } else if (showProfileModal) {
        e.preventDefault();
        setShowProfileModal(false);
      } else if (editingFeeRecord) {
        e.preventDefault();
        setEditingFeeRecord(null);
        setShowEditFeeModal(false);
      }
    };

    window.addEventListener('backbuttonpress', handleBackButton);
    return () => {
      window.removeEventListener('backbuttonpress', handleBackButton);
    };
  }, [activeReceipt, activeProfileUserId, selectedUserDetail, showProfileModal, editingFeeRecord]);

  // --- Handlers ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setErrorMsg('');
    setCreatedUser(null);

    if (!newUserName) {
      setErrorMsg("Name is required.");
      setIsCreating(false);
      return;
    }
    if (newUserName.length > 150 || !/^[a-zA-Z\s]+$/.test(newUserName.trim())) {
      setErrorMsg("Name must contain only alphabets and spaces, and be at most 150 characters.");
      setIsCreating(false);
      return;
    }
    if (newUserRole === 'STUDENT') {
      if (newStudentFatherName && (newStudentFatherName.length > 150 || !/^[a-zA-Z\s]+$/.test(newStudentFatherName.trim()))) {
        setErrorMsg("Father's name must contain only alphabets and spaces, and be at most 150 characters.");
        setIsCreating(false);
        return;
      }
      if (newStudentAddress && newStudentAddress.length > 150) {
        setErrorMsg("Address must be at most 150 characters.");
        setIsCreating(false);
        return;
      }
      if (newStudentPhone && !/^\d{10}$/.test(newStudentPhone.trim())) {
        setErrorMsg("Phone number must be exactly 10 digits.");
        setIsCreating(false);
        return;
      }
    }

    try {
      const finalClassName = newUserRole === 'STUDENT'
        ? (newStudentClass === '__CUSTOM__' ? customClassName : newStudentClass)
        : undefined;

      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          role: newUserRole, 
          name: newUserName,
          className: finalClassName,
          board: newUserRole === 'STUDENT' ? newStudentBoard : undefined,
          scholarship: (newUserRole === 'STUDENT' && newStudentScholarship) ? parseFloat(newStudentScholarship) : undefined,
          subject: newUserRole === 'TEACHER' ? newTeacherSubject : undefined,
          fatherName: newUserRole === 'STUDENT' ? newStudentFatherName : undefined,
          phone: newUserRole === 'STUDENT' ? newStudentPhone : undefined,
          email: newUserRole === 'STUDENT' ? newStudentEmail : undefined,
          address: newUserRole === 'STUDENT' ? newStudentAddress : undefined,
          dob: newUserRole === 'STUDENT' ? newStudentDob : undefined,
        })
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedUser(data.user);
        setNewUserName('');
        setNewStudentClass('');
        setNewStudentBoard('');
        setNewStudentScholarship('');
        setNewTeacherSubject('');
        setNewStudentFatherName('');
        setNewStudentPhone('');
        setNewStudentEmail('');
        setNewStudentAddress('');
        setNewStudentDob('');
        setCustomClassName('');
        setIsCustomClass(false);
        handleSearchDirectory(); // Refresh directory list immediately so new user is visible!
        fetchAllStudents();
      } else {
        setErrorMsg(data.error || "Failed to create user.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearchDirectory = async () => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/admin/directory?q=${encodeURIComponent(searchQuery)}&t=${Date.now()}`);
      const data = await res.json();
      if (res.ok) {
        setDirectoryUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  // Debounce directory search while typing (auto-refresh list from DB after 300ms of inactivity)
  useEffect(() => {
    if (activeTab !== 'users') return;
    const delayDebounceFn = setTimeout(() => {
      handleSearchDirectory();
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, activeTab]);

  const fetchAllStudents = async () => {
    try {
      const res = await fetch(`/api/admin/directory?role=STUDENT&t=${Date.now()}`);
      const data = await res.json();
      if (res.ok) {
        setAllStudents(data.users || []);
      }
    } catch (err) {
      console.error("Failed to fetch all students:", err);
    }
  };

  const fetchFinances = async () => {
    setIsLoadingFees(true);
    try {
      const res = await fetch(`/api/admin/finances?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      const data = await res.json();
      if (res.ok) {
        setFees(data.fees || []);
        setFinanceRefreshTrigger(prev => prev + 1);
        setLedgerRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingFees(false);
    }
  };

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingFee(true);
    try {
      const payload: any = {
        type: addFeeMode,
        amount: feeAmount,
        billingMonth: feeBillingMonth,
        title: feeTitle
      };

      if (feeDueDate) payload.dueDate = feeDueDate;
      if (feeCreatedAt) payload.createdAt = feeCreatedAt;

      if (addFeeMode === 'INDIVIDUAL') {
        payload.studentId = feeStudentId; // username
        payload.discount = parseFloat(feeDiscount || '0');
      } else {
        payload.batchId = feeStudentId; // batch id
      }

      const res = await fetch('/api/admin/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setFeeStudentId('');
        setFeeStudentSearch('');
        setFeeAmount('');
        setFeeDiscount('');
        fetchFinances();
        alert('Fee(s) successfully assigned!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to assign fee.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingFee(false);
    }
  };

  const handleViewReceipt = async (feeId: string) => {
    try {
      const res = await fetch(`/api/student/fees/receipt/${feeId}`);
      if (res.ok) {
        const data = await res.json();
        setActiveReceipt(data.fee);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to open receipt.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to load receipt.');
    }
  };

  const updateFeeStatus = async (id: string, status: string, details?: any) => {
    try {
      const res = await fetch('/api/admin/finances', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          status,
          ...details
        })
      });
      if (res.ok) {
        fetchFinances();
        fetchFinSummary();
        setShowPaymentModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchFinSummary = async () => {
    setIsLoadingFinSummary(true);
    try {
      const res = await fetch(`/api/admin/finances/summary?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (res.ok) setFinSummary(await res.json());
    } catch (err) { console.error(err); }
    finally { setIsLoadingFinSummary(false); }
  };

  const fetchExpenses = async () => {
    setIsLoadingExpenses(true);
    try {
      const res = await fetch(`/api/admin/finances/expenses?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoadingExpenses(false); }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingExpense(true);
    try {
      const res = await fetch('/api/admin/finances/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newExpense, amount: parseFloat(newExpense.amount) })
      });
      if (res.ok) {
        setNewExpense({ title: '', category: 'OTHER', amount: '', remarks: '' });
        fetchExpenses();
        fetchFinSummary();
        setShowExpenseModal(false);
      }
    } catch (err) { console.error(err); }
    finally { setIsAddingExpense(false); }
  };

  const deleteExpense = async (id: string) => {
    requestSecurityVerification(
      "Delete Expense Record",
      "You are deleting an expense record. This will adjust your institute's net cashflow balance. Enter your admin password to authorize.",
      async () => {
        try {
          const res = await fetch(`/api/admin/finances/expenses?id=${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchExpenses();
            fetchFinSummary();
          }
        } catch (err) { console.error(err); }
      }
    );
  };

  const downloadReceiptPDF = async (receiptId: string, isPrint = false) => {
    setDownloadingPDF(true);
    try {
      const loadHtml2Pdf = () => {
        return new Promise<void>((resolve, reject) => {
          if ((window as any).html2pdf) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load html2pdf script.'));
          document.head.appendChild(script);
        });
      };

      await loadHtml2Pdf();
      const original = document.querySelector('.receipt-print-area') as HTMLElement;
      if (!original) {
        alert('Receipt area not found!');
        return;
      }

      // Temporarily hide the no-print action buttons
      const buttons = original.querySelector('.no-print') as HTMLElement;
      if (buttons) buttons.style.display = 'none';

      const opt = {
        margin: [5, 5, 5, 5],
        filename: `Receipt_${activeReceipt?.receiptNo?.replace(/\//g, '_') || 'REC_' + receiptId.slice(-6).toUpperCase()}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const cap = (window as any).Capacitor;
      const isNative = cap && cap.isNativePlatform && cap.isNativePlatform();
      let Filesystem: any = null;
      let Share: any = null;
      if (isNative) {
        try {
          const fs = await import('@capacitor/filesystem');
          Filesystem = fs.Filesystem;
          const sh = await import('@capacitor/share');
          Share = sh.Share;
        } catch (e) {
          console.error('Failed to load Capacitor plugins dynamically:', e);
        }
      }

      if (isNative && Filesystem) {
        const pdfDataUri = await (window as any).html2pdf().from(original).set(opt).output('datauristring');
        const base64Data = pdfDataUri.split(',')[1];
        const filename = `Receipt_${activeReceipt?.receiptNo?.replace(/\//g, '_') || 'REC_' + receiptId.slice(-6).toUpperCase()}.pdf`;
        
        try {
          // Attempt to write to DOCUMENTS directory (accessible downloads/documents on mobile)
          await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: 'DOCUMENTS'
          });
          alert(`Receipt downloaded successfully! Saved in your Documents/Downloads folder as ${filename}`);
        } catch (err) {
          console.error("Failed to write to DOCUMENTS, falling back to cache & share:", err);
          // Fallback to cache and share if documents write fails
          const writeResult = await Filesystem.writeFile({
            path: filename,
            data: base64Data,
            directory: 'CACHE'
          });
          if (Share) {
            await Share.share({
              title: 'Fee Receipt',
              text: `Receipt for ${activeReceipt?.title}`,
              files: [writeResult.uri],
              dialogTitle: 'View/Print Fee Receipt'
            });
          } else {
            alert('Receipt generated in cache.');
          }
        }
      } else {
        await (window as any).html2pdf().from(original).set(opt).save();
        alert('Receipt downloaded successfully!');
      }
      
      // Restore the buttons
      if (buttons) buttons.style.display = 'flex';
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Please use the Print option.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  const downloadStatementPDF = async (isPrint = false) => {
    let tempElement: HTMLDivElement | null = null;
    try {
      const loadHtml2Pdf = () => {
        return new Promise<void>((resolve, reject) => {
          if ((window as any).html2pdf) {
            resolve();
            return;
          }
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load html2pdf script.'));
          document.head.appendChild(script);
        });
      };

      await loadHtml2Pdf();

      const inflow = fees.filter(f => {
        if (!['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status)) return false;
        const date = f.paidAt ? new Date(f.paidAt) : new Date(f.createdAt);
        return date.toLocaleString('en-US', { month: 'long' }) === statementMonth && String(date.getFullYear()) === statementYear;
      });
      
      const outExpenses = expenses.filter(e => {
        const date = new Date(e.date || e.createdAt);
        return date.toLocaleString('en-US', { month: 'long' }) === statementMonth && String(date.getFullYear()) === statementYear;
      });
      
      const outSalaries = adminSalaries.filter(s => {
        if (s.status !== 'PAID') return false;
        const date = s.paidAt ? new Date(s.paidAt) : new Date(s.createdAt);
        return date.toLocaleString('en-US', { month: 'long' }) === statementMonth && String(date.getFullYear()) === statementYear;
      });
      
      const totalIn = inflow.reduce((sum, f) => sum + (f.paidAmount || (f.amount + f.lateFine - f.discount)), 0);
      const totalExp = outExpenses.reduce((sum, e) => sum + e.amount, 0);
      const totalSal = outSalaries.reduce((sum, s) => sum + s.netPaid, 0);
      const net = totalIn - (totalExp + totalSal);

      tempElement = document.createElement('div');
      tempElement.style.position = 'fixed';
      tempElement.style.top = '0';
      tempElement.style.left = '0';
      tempElement.style.zIndex = '-99999';
      tempElement.style.opacity = '0.99';
      tempElement.style.pointerEvents = 'none';
      tempElement.style.width = '790px';
      tempElement.style.padding = '30px';
      tempElement.style.background = '#ffffff';
      tempElement.style.color = '#1f2937';
      tempElement.style.fontFamily = 'sans-serif';
      tempElement.style.boxSizing = 'border-box';

      const formatD = (dStr: any) => {
        const d = new Date(dStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      };

      tempElement.innerHTML = `
        <div style="border-bottom: 3px solid #ef4444; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <img src="/logo.png" alt="Logo" style="width: 45px; height: 45px; object-fit: contain; border-radius: 8px;" />
            <div>
              <div style="font-size: 24px; font-weight: bold; color: #ef4444; line-height: 1.1;">SUDHIR TUTORIALS</div>
              <div style="font-size: 14px; color: #4b5563;">Institute Financial Statement</div>
            </div>
          </div>
          <div style="text-align: right">
            <div style="font-weight: bold; font-size: 16px;">${statementMonth.toUpperCase()} ${statementYear}</div>
            <div style="font-size: 12px; color: #6b7280;">Generated: ${formatD(new Date())}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px;">
          <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: bold;">Fee Inflows</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 5px; color: #059669;">₹${totalIn.toLocaleString()}</div>
          </div>
          <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: bold;">Admin Expenses</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 5px; color: #dc2626;">₹${totalExp.toLocaleString()}</div>
          </div>
          <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: bold;">Salaries Paid</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 5px; color: #dc2626;">₹${totalSal.toLocaleString()}</div>
          </div>
          <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; border-left: 4px solid ${net >= 0 ? '#059669' : '#dc2626'}">
            <div style="font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: bold;">Net Cash Flow</div>
            <div style="font-size: 18px; font-weight: bold; margin-top: 5px; color: ${net >= 0 ? '#059669' : '#dc2626'}">₹${net.toLocaleString()}</div>
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr>
              <th style="background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; font-weight: bold; border-bottom: 2px solid #d1d5db;">Date</th>
              <th style="background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; font-weight: bold; border-bottom: 2px solid #d1d5db;">Receipt/Ref No.</th>
              <th style="background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; font-weight: bold; border-bottom: 2px solid #d1d5db;">Transaction Description</th>
              <th style="background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; font-weight: bold; border-bottom: 2px solid #d1d5db;">Type</th>
              <th style="background: #f3f4f6; padding: 10px; text-align: right; font-size: 12px; font-weight: bold; border-bottom: 2px solid #d1d5db; width: 110px;">Inflow (Cr)</th>
              <th style="background: #f3f4f6; padding: 10px; text-align: right; font-size: 12px; font-weight: bold; border-bottom: 2px solid #d1d5db; width: 110px;">Outflow (Dr)</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ...inflow.map(f => ({
                date: f.paidAt ? new Date(f.paidAt) : new Date(f.createdAt),
                ref: f.receiptNo || `REC-${f.id.slice(-6).toUpperCase()}`,
                desc: `Fee Collected - ${f.student?.name} (${f.student?.username}) - ${f.billingMonth} [${f.title}]`,
                type: 'FEE_INFLOW',
                inflow: f.paidAmount || (f.amount + f.lateFine - f.discount),
                outflow: 0
              })),
              ...outExpenses.map(e => ({
                date: new Date(e.date || e.createdAt),
                ref: `EXP-${e.id.slice(-6).toUpperCase()}`,
                desc: `Administrative Expense - ${e.title} (${e.category})${e.remarks ? ' - ' + e.remarks : ''}`,
                type: 'EXPENSE_OUTFLOW',
                inflow: 0,
                outflow: e.amount
              })),
              ...outSalaries.map(s => ({
                date: s.paidAt ? new Date(s.paidAt) : new Date(s.createdAt),
                ref: `SAL-${s.id.slice(-6).toUpperCase()}`,
                desc: `Salary Disbursed - ${s.teacher?.name || 'Faculty Member'} - ${s.month}`,
                type: 'SALARY_OUTFLOW',
                inflow: 0,
                outflow: s.netPaid
              }))
            ].sort((a,b) => a.date.getTime() - b.date.getTime()).map(t => `
              <tr>
                <td style="padding: 10px; font-size: 12px; border-bottom: 1px solid #e5e7eb;">${formatD(t.date)}</td>
                <td style="padding: 10px; font-size: 12px; border-bottom: 1px solid #e5e7eb; font-family: monospace;">${t.ref}</td>
                <td style="padding: 10px; font-size: 12px; border-bottom: 1px solid #e5e7eb;">${t.desc}</td>
                <td style="padding: 10px; font-size: 12px; border-bottom: 1px solid #e5e7eb;">${t.type}</td>
                <td style="padding: 10px; font-size: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #059669; font-weight: bold;">${t.inflow > 0 ? '₹' + t.inflow.toLocaleString() : '-'}</td>
                <td style="padding: 10px; font-size: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; color: #dc2626; font-weight: bold;">${t.outflow > 0 ? '₹' + t.outflow.toLocaleString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      document.body.appendChild(tempElement);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Sudhir_Tutorials_Statement_${statementMonth}_${statementYear}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1024,
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      const cap = (window as any).Capacitor;
      const isNative = cap && cap.isNativePlatform && cap.isNativePlatform();
      let Filesystem: any = null;
      let Share: any = null;
      if (isNative) {
        try {
          const fs = await import('@capacitor/filesystem');
          Filesystem = fs.Filesystem;
          const sh = await import('@capacitor/share');
          Share = sh.Share;
        } catch (e) {
          console.error('Failed to load Capacitor plugins dynamically:', e);
        }
      }

      if (isNative && Filesystem && Share) {
        const pdfDataUri = await (window as any).html2pdf().from(tempElement).set(opt).output('datauristring');
        const base64Data = pdfDataUri.split(',')[1];
        const filename = `Sudhir_Tutorials_Statement_${statementMonth}_${statementYear}.pdf`;
        
        // Write to CACHE and share to avoid write permission errors on native platforms
        const writeResult = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: 'CACHE'
        });
        await Share.share({
          title: 'Monthly Statement',
          text: `Financial Statement for ${statementMonth} ${statementYear}`,
          files: [writeResult.uri],
          dialogTitle: 'View/Print Monthly Statement'
        });
      } else {
        if (isPrint) {
          await (window as any).html2pdf().from(tempElement).set(opt).toPdf().get('pdf').then((pdf: any) => {
            const blobUrl = pdf.output('bloburl');
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = blobUrl;
            document.body.appendChild(iframe);
            iframe.contentWindow?.print();
            // Remove the iframe after a short delay so it doesn't linger in DOM
            setTimeout(() => document.body.removeChild(iframe), 60000);
          });
        } else {
          await (window as any).html2pdf().from(tempElement).set(opt).save();
          alert('Statement downloaded successfully!');
        }
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate statement PDF.');
    } finally {
      if (tempElement && tempElement.parentNode) {
        tempElement.parentNode.removeChild(tempElement);
      }
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses');
      const data = await res.json();
      if (res.ok) setCourses(data.courses || []);
    } catch (err) { console.error(err); }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/admin/batches');
      const data = await res.json();
      if (res.ok) setBatches(data.batches || []);
    } catch (err) { console.error(err); }
  };

  const fetchOverviewStats = async () => {
    setIsLoadingOverview(true);
    setOverviewStatsError(false);
    try {
      // cache: 'no-store' + timestamp param guarantees a fresh DB hit every call
      const res = await fetch(`/api/admin/overview?t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' }
      });
      if (res.ok) {
        const data = await res.json();
        setOverviewStats(data);
        if (data.activityLogs) setActivityLogs(data.activityLogs);
      } else {
        setOverviewStatsError(true);
      }
    } catch (err) {
      console.error(err);
      setOverviewStatsError(true);
    }
    finally { setIsLoadingOverview(false); }
  };

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setPerDayFine(data.perDayFine ?? 10);
        setFlatFineAfter10Days(data.flatFineAfter10Days ?? 100);
        setFeeDueDay(data.feeDueDay ?? 12);
        setMinAppVersion(data.minAppVersion || "1.0.0");
        setClassFees(data.classFees || {});
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ perDayFine, flatFineAfter10Days, feeDueDay, minAppVersion, classFees })
      });
      if (res.ok) {
        alert('System settings updated successfully!');
      } else {
        alert('Failed to update settings.');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handlePromoteAllStudents = async () => {
    if (!confirm("Are you sure you want to promote all students to the next class grade? This action will instantly update all student profiles.")) {
      return;
    }
    setIsPromotingStudents(true);
    try {
      const res = await fetch('/api/admin/students/promote', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`🎉 Successfully promoted ${data.promotedCount} students!`);
        handleSearchDirectory();
        fetchAllStudents();
      } else {
        alert(`⚠️ Failed to promote: ${data.error || 'Unknown error'}`);
      }
    } catch {
      alert('⚠️ Network error. Please try again.');
    } finally {
      setIsPromotingStudents(false);
    }
  };

  const fetchAdminSalaries = async () => {
    setIsFetchingSalaries(true);
    try {
      const res = await fetch('/api/admin/salaries');
      if (res.ok) {
        const data = await res.json();
        setAdminSalaries(data.salaries || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsFetchingSalaries(false);
    }
  };

  const handleTeacherChange = (teacherId: string) => {
    setSalaryTeacherId(teacherId);
    if (!teacherId) {
      setSalaryBaseSalary('');
      return;
    }
    const teacher = allTeachers.find(t => t.id === teacherId);
    if (teacher && teacher.teacherProfile) {
      setSalaryBaseSalary(String(teacher.teacherProfile.salary || ''));
    } else {
      setSalaryBaseSalary('');
    }
  };

  const handleGenerateSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryTeacherId || !salaryMonth || !salaryBaseSalary) {
      alert("Please fill all required fields!");
      return;
    }
    setIsGeneratingSalary(true);
    try {
      const res = await fetch('/api/admin/salaries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacherId: salaryTeacherId,
          month: salaryMonth,
          baseSalary: salaryBaseSalary,
          bonus: salaryBonus || 0,
          deductions: salaryDeductions || 0,
          remarks: salaryRemarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSalaryTeacherId('');
        setSalaryBaseSalary('');
        setSalaryBonus('');
        setSalaryDeductions('');
        setSalaryRemarks('');
        fetchAdminSalaries();
        alert('Salary slip assigned successfully!');
      } else {
        alert(data.error || 'Failed to assign salary.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error occurred.');
    } finally {
      setIsGeneratingSalary(false);
    }
  };

  const handlePayoutSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payoutSalaryRecord) return;
    setIsProcessingPayout(true);
    try {
      const res = await fetch('/api/admin/salaries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: payoutSalaryRecord.id,
          transactionId: payoutTransactionId,
          remarks: payoutRemarks
        })
      });
      const data = await res.json();
      if (res.ok) {
        setPayoutSalaryRecord(null);
        setPayoutTransactionId('');
        setPayoutRemarks('');
        setShowPayoutModal(false);
        fetchAdminSalaries();
        fetchFinSummary(); // Sync expense tracking totals
        alert('Salary marked as PAID and synchronization with ledger complete!');
      } else {
        alert(data.error || 'Failed to process payout.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error occurred.');
    } finally {
      setIsProcessingPayout(false);
    }
  };

  const handleEditSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSalaryRecord) return;
    setIsSavingSalaryEdit(true);
    try {
      const res = await fetch('/api/admin/salaries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingSalaryRecord.id,
          month: editSalaryMonth,
          baseSalary: editSalaryBase,
          bonus: editSalaryBonus,
          deductions: editSalaryDeductions,
          remarks: editSalaryRemarks,
          status: editSalaryStatus,
          transactionId: editSalaryTxnId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowEditSalaryModal(false);
        setEditingSalaryRecord(null);
        fetchAdminSalaries();
        fetchFinSummary();
        alert('Salary record updated successfully!');
      } else {
        alert(data.error || 'Failed to update salary record.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error occurred.');
    } finally {
      setIsSavingSalaryEdit(false);
    }
  };

  const handleDeleteSalary = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary record?')) return;
    try {
      const res = await fetch(`/api/admin/salaries?id=${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (res.ok) {
        fetchAdminSalaries();
        fetchFinSummary();
        alert('Salary record deleted successfully!');
      } else {
        alert(data.error || 'Failed to delete salary record.');
      }
    } catch (err) {
      console.error(err);
      alert('Connection error occurred.');
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingCourse(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCourseName, description: newCourseDesc })
      });
      if (res.ok) {
        setNewCourseName('');
        setNewCourseDesc('');
        fetchCourses();
      }
    } catch(e) {} finally { setIsAddingCourse(false); }
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourseId) return;
    setIsSavingCourse(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingCourseId, name: editingCourseName, description: editingCourseDesc })
      });
      if (res.ok) {
        setEditingCourseId(null);
        fetchCourses();
        fetchBatches(); // Refresh batches too
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update course');
      }
    } catch (err) {
      console.error("Error updating course:", err);
    } finally {
      setIsSavingCourse(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, courseName: string) => {
    requestSecurityVerification(
      `Delete Course: ${courseName}`,
      `You are deleting the course "${courseName}". This will permanently delete all associated batches, schedules, materials, and test records! Enter your admin password to authorize.`,
      async () => {
        try {
          const res = await fetch(`/api/admin/courses?id=${courseId}`, {
            method: 'DELETE'
          });
          if (res.ok) {
            fetchCourses();
            fetchBatches(); // Refresh batches list too
          } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete course');
          }
        } catch (err) {
          console.error("Error deleting course:", err);
        }
      }
    );
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingBatch(true);
    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newBatchName, 
          courseId: newBatchCourseId, 
          className: newBatchClassName, // need to add state
          subjects: newBatchSubjects, // need to add state
          defaultFee: parseFloat(newBatchDefaultFee || '0'),
          teacherUsernames: newBatchTeacherUsername.split(',').map(u=>u.trim()).filter(Boolean),
          studentUsernames: newBatchStudentUsernames.split(',').map(u=>u.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        setNewBatchName('');
        setNewBatchCourseId('');
        setNewBatchTeacherUsername('');
        setNewBatchStudentUsernames('');
        setNewBatchClassName('');
        setNewBatchSubjects('');
        setNewBatchDefaultFee('');
        fetchBatches();
      }
    } catch(e) {} finally { setIsAddingBatch(false); }
  };

  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const fetchPendingVerifications = async () => {
    try {
      const res = await fetch('/api/admin/verify');
      if (res.ok) {
        const data = await res.json();
        setPendingVerifications(data.users || []);
      }
    } catch (err) { console.error(err); }
  };

  const handleVerifyUser = async (userId: string) => {
    setIsVerifying(userId);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        fetchPendingVerifications();
        fetchOverviewStats();
      }
    } catch (err) { console.error(err); } finally { setIsVerifying(null); }
  };

  const parseNotificationMessage = (msg: string) => {
    let cleanMessage = msg || "";
    let screenshot: string | null = null;
    let email: string | null = null;

    // Extract screenshot: support standard base64 URL format
    const ssMatch = cleanMessage.match(/\[Screenshot:\s*(data:image\/[^\]]+)\]/i);
    if (ssMatch) {
      screenshot = ssMatch[1];
      cleanMessage = cleanMessage.replace(ssMatch[0], '').trim();
    }

    // Extract email metadata
    const emailMatch = cleanMessage.match(/\[Email:\s*([^\]]+)\]/i);
    if (emailMatch) {
      email = emailMatch[1];
      cleanMessage = cleanMessage.replace(emailMatch[0], '').trim();
    }

    return { cleanMessage, screenshot, email };
  };

  const fetchBugReports = async () => {
    setIsLoadingBugReports(true);
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setBugReports(data.reports || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBugReports(false);
    }
  };

  const handleDeleteBugReport = async (reportId: string) => {
    if (!confirm("Are you sure you want to dismiss/delete this report?")) return;
    try {
      const res = await fetch(`/api/reports?id=${reportId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchBugReports();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchJobApplications = async () => {
    setIsLoadingJobApplications(true);
    try {
      const res = await fetch('/api/careers/applications');
      if (res.ok) {
        const data = await res.json();
        setJobApplications(data.applications || []);
      }
    } catch (e) {
      console.error('Failed to fetch job applications:', e);
    } finally {
      setIsLoadingJobApplications(false);
    }
  };

  const handleUpdateJobStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/careers/applications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      if (res.ok) {
        fetchJobApplications();
        alert(`Application status updated to ${status}.`);
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update application status.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error updating application status.');
    }
  };

  const handleDeleteJobApplication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this job application?')) return;
    try {
      const res = await fetch(`/api/careers/applications?id=${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        fetchJobApplications();
        alert('Application deleted successfully.');
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to delete application.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error deleting application.');
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    fetchUnreadCounts();
    if (activeTab === 'overview') {
      fetchOverviewStats();
      
      const handleVisibility = () => {
        if (document.visibilityState === 'visible' && activeTab === 'overview') {
          fetchOverviewStats();
        }
      };

      // Auto-refresh revenue every 60 s while on overview tab
      const overviewInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchOverviewStats();
        }
      }, 60000);

      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        clearInterval(overviewInterval);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
    if (activeTab === 'users') handleSearchDirectory(); // always load all users on tab switch
    if (activeTab === 'finances') {
      fetchFinances();
      fetchExpenses();
      fetchFinSummary();
      fetchAllStudents(); // populate student dropdown
      fetchBatches();          // populate batch dropdown
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const now = new Date();
      const currentMonth = `${months[now.getMonth()]} ${now.getFullYear()}`;
      setAutoBillingMonth(currentMonth);
      fetchAutoBillingPreview(currentMonth);
    }
    if (activeTab === 'verifications') {
      fetchPendingVerifications();
      fetchBugReports();
    }

    if (activeTab === 'courses' || (activeTab === 'academics' && academicSubTab === 'courses')) {
      Promise.all([
        fetchCourses(),
        fetchBatches(),
        fetchTeachers(),
        fetch('/api/admin/directory?q=').then(res => res.json()).then(data => setDirectoryUsers(data.users || [])),
        fetchAllStudents()
      ]);
    }
    if (activeTab === 'attendance' || (activeTab === 'academics' && academicSubTab === 'attendance')) {
      fetchBatches();
    }
    if (activeTab === 'materials' || (activeTab === 'academics' && academicSubTab === 'materials')) {
      fetchMaterials();
      fetchCourses();
    }
    if (activeTab === 'tests' || (activeTab === 'academics' && academicSubTab === 'tests')) {
      fetchTests();
      fetchCourses();
    }
    if (activeTab === 'analytics' || (activeTab === 'academics' && academicSubTab === 'analytics')) {
      fetchReports();
      fetchFinSummary();
    }
    if (activeTab === 'settings') {
      fetchSettings();
      fetchJobApplications();
    }
    if (activeTab === 'salary') {
      fetchTeachers();
      fetchAdminSalaries();
    }
    if (activeTab === 'guru-ai') {
      fetchAdminGuruHistory();
      setAdminGuruHistory([]);
    }
  }, [activeTab, academicSubTab, session]);

  const fetchReports = async () => {
    setIsReportsLoading(true);
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) setReportData(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsReportsLoading(false); }
  };

  const fetchAutoBillingPreview = async (monthVal?: string) => {
    const targetMonth = monthVal || autoBillingMonth;
    if (!targetMonth) return;
    setLoadingAutoBillingPreview(true);
    try {
      const res = await fetch(`/api/admin/finances/auto-assign?billingMonth=${encodeURIComponent(targetMonth)}`);
      if (res.ok) {
        const data = await res.json();
        setAutoBillingPreview(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAutoBillingPreview(false);
    }
  };

  const runAutoBillingEngine = async () => {
    if (!autoBillingMonth) {
      alert("Please select or enter a billing month first.");
      return;
    }
    if (!confirm(`Are you sure you want to run automated fee billing for ${autoBillingMonth}? This will generate fee records for all active students with auto-calculated base fees.`)) return;
    setRunningAutoBilling(true);
    try {
      const res = await fetch('/api/admin/finances/auto-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingMonth: autoBillingMonth })
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Billing generated successfully for ${autoBillingMonth}!\n\nNewly Billed: ${data.count || 0} students\nSkipped (Already Generated): ${data.skippedCount || 0} students`);
        fetchFinances();
        fetchFinSummary();
        fetchAutoBillingPreview(autoBillingMonth);
      } else {
        alert(data.error || 'Failed to trigger automated billing');
      }
    } catch (e) {
      console.error(e);
      alert('Network error while running auto billing');
    } finally {
      setRunningAutoBilling(false);
    }
  };

  const saveFeeRecordEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFeeRecord || !editingFeeRecord.id) return;
    setIsSavingFeeRecord(true);
    try {
      const res = await fetch('/api/admin/finances', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingFeeRecord)
      });
      const data = await res.json();
      if (res.ok) {
        alert('Fee record updated successfully!');
        setShowEditFeeModal(false);
        setEditingFeeRecord(null);
        fetchFinances();
        fetchFinSummary();
      } else {
        alert(data.error || 'Failed to update fee record');
      }
    } catch (e) {
      console.error(e);
      alert('Error updating fee record');
    } finally {
      setIsSavingFeeRecord(false);
    }
  };

  const deleteFee = async () => {
    if (!delTargetId) return;
    
    requestSecurityVerification(
      "Delete Student Fee Record",
      "You are deleting this student's fee record. This will permanently remove all billing and transaction logs for this entry. Enter your admin password to authorize.",
      async () => {
        setIsDeleting(true);
        try {
          const res = await fetch(`/api/admin/finances?id=${delTargetId}`, { method: 'DELETE' });
          if (res.ok) {
            setShowDelModal(false);
            setDelTargetId(null);
            fetchFinances();
          } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete');
          }
        } catch (e) { console.error(e); }
        finally { setIsDeleting(false); }
      }
    );
  };

  const fetchProfile = async (userId: string, role: string) => {
    setIsFetchingProfile(userId);
    fetchBatches(); // Ensure available batches are loaded into dropdown
    try {
      const endpoint = role === 'STUDENT' 
        ? `/api/admin/students/${userId}` 
        : role === 'TEACHER'
        ? `/api/admin/teachers/${userId}`
        : `/api/admin/admins/${userId}`;
      const cacheBustEndpoint = endpoint + (endpoint.includes('?') ? '&' : '?') + 't=' + Date.now();
      const res = await fetch(cacheBustEndpoint);
      const data = await res.json();
      if (res.ok) {
        const userData = role === 'STUDENT' ? data.student : role === 'TEACHER' ? data.teacher : data.admin;
        const profileData = role === 'STUDENT' ? userData.studentProfile : (role === 'TEACHER' || role === 'ADMIN') ? userData.teacherProfile : {};
        
        const profileDob = profileData?.dob;
        const formattedDob = profileDob ? (profileDob.includes('T') ? profileDob.split('T')[0] : profileDob) : '';

        setEditingProfile({ 
          userId: userData.id, 
          role,
          name: userData.name || '',
          username: userData.username,
          isActive: userData.isActive !== undefined ? userData.isActive : true,
          ...(profileData || {}),
          dob: formattedDob,
          ...(role === 'TEACHER' && userData.teacherBatches?.length > 0 && { batch: userData.teacherBatches[0].name })
        });
        setShowProfileModal(true);
      }
    } catch (e) { console.error(e); }
    finally { setIsFetchingProfile(null); }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProfile.name) {
      if (editingProfile.name.length > 150 || !/^[a-zA-Z\s]+$/.test(editingProfile.name.trim())) {
        alert("Name must contain only alphabets and spaces, and be at most 150 characters.");
        return;
      }
    }
    if (editingProfile.role === 'STUDENT' && editingProfile.fatherName) {
      if (editingProfile.fatherName.length > 150 || !/^[a-zA-Z\s]+$/.test(editingProfile.fatherName.trim())) {
        alert("Father's name must contain only alphabets and spaces, and be at most 150 characters.");
        return;
      }
    }
    if (editingProfile.phone) {
      const p = editingProfile.phone.trim().toUpperCase();
      if (p !== 'NA' && p !== 'N/A' && !/^\d{10}$/.test(p)) {
        alert("Student phone number must be a valid 10-digit number or NA.");
        return;
      }
    }
    if (editingProfile.role === 'STUDENT' && editingProfile.parentContact) {
      const pc = editingProfile.parentContact.trim().toUpperCase();
      if (pc !== 'NA' && pc !== 'N/A' && !/^\d{10}$/.test(pc)) {
        alert("Parent contact must be a valid 10-digit number or NA.");
        return;
      }
    }
    if (editingProfile.role === 'STUDENT' && editingProfile.phone && editingProfile.parentContact) {
      const p1 = editingProfile.phone.trim().toUpperCase();
      const p2 = editingProfile.parentContact.trim().toUpperCase();
      if (p1 !== 'NA' && p1 !== 'N/A' && p2 !== 'NA' && p2 !== 'N/A' && p1 === p2) {
        alert("Student contact and Parent contact cannot be the same. Please provide different numbers or NA.");
        return;
      }
    }
    if (editingProfile.address) {
      if (editingProfile.address.length > 150) {
        alert("Address must be at most 150 characters.");
        return;
      }
    }
    setIsSavingProfile(true);
    try {
      const endpoint = editingProfile.role === 'STUDENT' 
        ? `/api/admin/students/${editingProfile.userId}` 
        : editingProfile.role === 'TEACHER'
        ? `/api/admin/teachers/${editingProfile.userId}`
        : `/api/admin/admins/${editingProfile.userId}`;

      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProfile)
      });
      if (res.ok) {
        setShowProfileModal(false);
        // Sync selectedUserDetail in real-time so details view updates instantly
        if (selectedUserDetail && selectedUserDetail.id === editingProfile.userId) {
          setSelectedUserDetail({
            ...selectedUserDetail,
            name: editingProfile.name,
            isActive: editingProfile.isActive,
            studentProfile: editingProfile.role === 'STUDENT' ? {
              ...selectedUserDetail.studentProfile,
              ...editingProfile
            } : selectedUserDetail.studentProfile,
            teacherProfile: (editingProfile.role === 'TEACHER' || editingProfile.role === 'ADMIN') ? {
              ...selectedUserDetail.teacherProfile,
              ...editingProfile
            } : selectedUserDetail.teacherProfile
          });
        }
        setEditingProfile(null);
        handleSearchDirectory(); // Refresh directory
        fetchAllStudents();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to save profile');
      }
    } catch (e) { console.error(e); }
    finally { setIsSavingProfile(false); }
  };

  const handleDeleteUser = async () => {
    if (!editingProfile) return;
    
    requestSecurityVerification(
      `Delete User Profile: ${editingProfile.name}`,
      `You are deleting the account and all associated profile details of student/teacher/admin "${editingProfile.name}". Enter your admin password to authorize this action.`,
      async () => {
        setIsSavingProfile(true);
        try {
          const endpoint = editingProfile.role === 'STUDENT' 
            ? `/api/admin/students/${editingProfile.userId}` 
            : editingProfile.role === 'TEACHER'
            ? `/api/admin/teachers/${editingProfile.userId}`
            : `/api/admin/admins/${editingProfile.userId}`;
            
          const res = await fetch(endpoint, { method: 'DELETE' });
          if (res.ok) {
            setShowProfileModal(false);
            setEditingProfile(null);
            handleSearchDirectory();
            fetchAllStudents();
          } else {
            const data = await res.json();
            alert(data.error || 'Failed to delete user');
          }
        } catch (e) { console.error(e); }
        finally { setIsSavingProfile(false); }
      }
    );
  };

  const handleGenerateOTP = async () => {
    if (!editingProfile || !editingProfile.userId) return;
    if (!confirm("Are you sure you want to generate a one-time temporary password? The student's current password will be replaced, and they will be forced to change it at next login.")) return;
    setOtpGenerating(true);
    try {
      const res = await fetch(`/api/admin/users/${editingProfile.userId}/one-time-password`, {
        method: 'POST'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOtpValue(data.oneTimePassword);
      } else {
        alert(data.error || "Failed to generate temporary password.");
      }
    } catch (e) {
      alert("Network error occurred.");
    } finally {
      setOtpGenerating(false);
    }
  };

  const openDelModal = (id: string) => {
    setDelTargetId(id);
    setShowDelModal(true);
  };

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      <style>{`
        .user-details-modal-grid-2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }

        @media (max-width: 768px) {
          .modal-overlay-container {
            padding: 0 !important;
          }
          .user-details-modal-card {
            padding: 1.25rem 1rem !important;
            border-radius: 0px !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: 100vh !important;
            max-width: 100% !important;
          }
          .user-details-modal-grid-2col {
            grid-template-columns: 1fr !important;
            gap: 0.75rem !important;
          }
        }

        .search-panel-overflow {
          overflow: visible !important;
          z-index: 100 !important;
        }

        .finances-layout-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 350px;
        }

        .courses-layout-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }

        .batch-control-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 3rem;
        }

        .batch-modal-card {
          width: 1000px;
          max-width: 98%;
          max-height: 95vh;
          overflow-y: auto;
          padding: 3rem;
          position: relative;
          border: 1px solid var(--primary);
        }

        @media (max-width: 1024px) {
          .batch-control-grid {
            grid-template-columns: 1fr !important;
            gap: 2rem !important;
          }

          .batch-modal-card {
            padding: 1.5rem !important;
          }
        }

        @media (max-width: 1280px) {
          .finances-layout-grid {
            grid-template-columns: 1fr !important;
          }

          .courses-layout-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media print {
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
            overflow: visible !important;
          }
          header, footer, nav, button, .bg-glow, .no-print {
            display: none !important;
          }
          .animate-fade-in > *:not(.receipt-modal-backdrop) {
            display: none !important;
          }
          .receipt-modal-backdrop {
            position: absolute !important;
            inset: 0 !important;
            display: flex !important;
            align-items: flex-start !important;
            justify-content: center !important;
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            z-index: 99999 !important;
            width: 100% !important;
            backdrop-filter: none !important;
          }
          .receipt-print-area {
            display: block !important;
            border: none !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 1.5rem !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
          .receipt-print-area * {
            color: #000000 !important;
            background: transparent !important;
          }
        }
      `}</style>
      <div className="bg-glow" style={{ top: '-10%', right: '-10%', opacity: 0.5 }}></div>
      {activeTab === 'overview' && (
        <header className="dashboard-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', fontWeight: 800 }}>
              जय सियाराम 🙏 <span style={{ color: '#ef4444' }}>{session?.user?.name || 'Admin'}</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Manage your Institute here.</p>
          </div>
          <LiveClock />
        </header>
      )}



      {/* Tabs */}
      <div className="dashboard-tab-bar no-scrollbar no-print">
        {['overview', 'users', 'verifications', 'finances', 'salary', 'academics', 'store-manager', 'guru-ai', 'messages', 'notifications', 'profile', 'settings'].map(tab => (
          <button 
            key={tab}
            onClick={() => {
              handleTabChange(tab);
              if (tab === 'academics') setAcademicSubTab('menu');
            }}
            className={`dashboard-tab-button ${activeTab === tab ? 'active' : ''}`}
            style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}
          >
            {tab === 'verifications' && pendingVerifications.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', marginRight: '6px' }}>{pendingVerifications.length}</span>
            )}
            {tab === 'messages' && unreadMessages > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', marginRight: '6px', fontWeight: 800 }}>{unreadMessages}</span>
            )}
            {tab === 'notifications' && unreadNotifications > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', marginRight: '6px', fontWeight: 800 }}>{unreadNotifications}</span>
            )}
            {tab === 'overview' ? 'Dashboard' :
             tab === 'users' ? 'Users Directory' :
             tab === 'verifications' ? 'Approvals & Queries' :
             tab === 'finances' ? 'Finances & Fees' :
             tab === 'salary' ? 'Staff Salaries' :
             tab === 'academics' ? 'Academic Services' :
             tab === 'store-manager' ? 'Store Manager' :
             tab === 'guru-ai' ? 'ST Guru ji' :
             tab === 'messages' ? 'My Chats' :
             tab === 'notifications' ? 'Notifications' :
             tab === 'profile' ? 'My Profile' :
             tab === 'settings' ? 'System Settings' :
             tab}
          </button>
        ))}
      </div>

      {/* Academic Sub-tab Back Navigation Header */}
      {activeTab === 'academics' && academicSubTab !== 'menu' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.5rem' }} className="no-print">
          <button 
            onClick={() => {
              if (academicSubTab === 'lectures' && lectureSubTab !== 'DASHBOARD') {
                setLectureSubTab('DASHBOARD');
              } else {
                setAcademicSubTab('menu');
              }
            }}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '0.45rem 0.9rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.75rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}
            className="academic-back-btn"
          >
            ⬅ Back
          </button>
        </div>
      )}

      {/* Academic Services Menu Dashboard */}
      {activeTab === 'academics' && academicSubTab === 'menu' && (
        <div className="glass-card animate-fade-in" style={{ padding: '2.5rem', border: '1px solid var(--border)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text)' }}>🎓 Academic Services</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              { id: 'courses', title: '🏫 Courses & Batches', desc: 'Configure courses, manage batches, fee pricing plans, and assigned faculties.', color: 'rgba(239, 68, 68, 0.05)', border: '#ef4444', textColor: '#ef4444' },
              { id: 'attendance', title: '✏️ Student Attendance', desc: 'Track daily attendance logs, view student check-in history, and download reports.', color: 'rgba(16, 185, 129, 0.05)', border: '#10b981', textColor: '#10b981' },
              { id: 'materials', title: '📚 Study Materials & Content', desc: 'Upload and organize syllabus books, worksheets, PDFs, notes, and lectures.', color: 'rgba(59, 130, 246, 0.05)', border: '#3b82f6', textColor: '#3b82f6' },
              { id: 'tests', title: '📝 Tests & Assessments', desc: 'Schedule periodic tests, configure grading criteria, and record student marks.', color: 'rgba(245, 158, 11, 0.05)', border: '#f59e0b', textColor: '#f59e0b' },
              { id: 'analytics', title: '📈 Performance Analytics', desc: 'Get graphical insights on class progress, marks distribution, and attendance trends.', color: 'rgba(236, 72, 153, 0.05)', border: '#ec4899', textColor: '#ec4899' },
              { id: 'lectures', title: '📺 Lectures/Classes', desc: 'Set up live interactive Zoom/Meet streams, timetables, and lecture video links.', color: 'rgba(139, 92, 246, 0.05)', border: '#8b5cf6', textColor: '#8b5cf6' },
              { id: 'admissions', title: 'Student Admission Enquiries', desc: '', color: 'rgba(239, 68, 68, 0.05)', border: '#ef4444', textColor: '#ef4444' },
            ].map(svc => (
              <div 
                key={svc.id}
                onClick={() => setAcademicSubTab(svc.id as any)}
                className="academic-service-card animate-scale-up"
                style={{
                  padding: '1.75rem',
                  borderRadius: '20px',
                  background: svc.color,
                  border: `1px solid ${svc.border}22`,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}
              >
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: svc.textColor, margin: 0 }}>{svc.title}</h3>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: svc.textColor, marginTop: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Open Service ➔
                </span>
              </div>
            ))}
          </div>
          <style jsx>{`
            .academic-service-card:hover {
              transform: translateY(-5px);
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
              border-color: #ef4444 !important;
            }
          `}</style>
        </div>
      )}

      {activeTab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <QuickServicesWidget role="ADMIN" setActiveTab={handleQuickServiceClick} />
          
          {/* Key Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            {[
              { label: 'Total Students', value: overviewStats ? overviewStats.totalStudents : 0, icon: '👥', color: '#ef4444' },
              { label: 'Active Teachers', value: overviewStats ? overviewStats.totalTeachers : 0, icon: '👨‍🏫', color: '#10b981' },
              { label: 'Revenue This Month', value: overviewStats ? `₹${overviewStats.revenueThisMonth.toLocaleString()}` : '₹0', icon: '💰', color: '#3b82f6' },
              { label: 'Pending Dues', value: overviewStats ? `₹${overviewStats.pendingDues.toLocaleString()}` : '₹0', icon: '⚠️', color: '#ef4444' }
            ].map((stat, i) => (
              <div key={i} className="glass-card animate-scale-up" style={{ padding: '1.25rem 1.5rem', borderLeft: `4px solid ${stat.color}`, background: 'var(--card-bg)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '0.85rem', right: '0.85rem', fontSize: '1.6rem', opacity: 0.12 }}>{stat.icon}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.35rem', fontWeight: 700 }}>{stat.label}</div>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {stat.value}
                  {isLoadingOverview && <span style={{ width: '14px', height: '14px', border: '2px solid var(--border)', borderTopColor: stat.color, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />}
                </div>
              </div>
            ))}
          </div>

          {/* Premium Widgets Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            {/* Class & Batch Analytics */}
            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📊 Class & Batch Analytics
                </h3>
                <span className="role-badge" style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>REAL-TIME</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Batches</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0', color: 'var(--text)' }}>{overviewStats.totalBatches}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Courses</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0', color: 'var(--text)' }}>{overviewStats.totalCourses}</div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Student Class Distribution</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {overviewStats?.classStats && overviewStats.classStats.length > 0 ? (
                    overviewStats.classStats.map((item, idx) => {
                      const total = overviewStats.totalStudents || 1;
                      const percentage = Math.round((item.count / total) * 100);
                      
                      // Harmonious, premium HSL gradients for progress bars
                      const hslGradients = [
                        'linear-gradient(135deg, hsl(263, 85%, 65%), hsl(263, 85%, 45%))',
                        'linear-gradient(135deg, hsl(330, 85%, 65%), hsl(330, 85%, 45%))',
                        'linear-gradient(135deg, hsl(142, 75%, 50%), hsl(142, 75%, 35%))',
                        'linear-gradient(135deg, hsl(217, 95%, 60%), hsl(217, 95%, 40%))',
                        'linear-gradient(135deg, hsl(35, 95%, 55%), hsl(35, 95%, 40%))'
                      ];
                      const gradient = hslGradients[idx % hslGradients.length];

                      return (
                        <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700 }}>
                            <span style={{ color: 'var(--text)' }}>{item.className}</span>
                            <span style={{ color: 'var(--text-muted)' }}>{item.count} student{item.count !== 1 ? 's' : ''} ({percentage}%)</span>
                          </div>
                          <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.02)' }}>
                            <div style={{ width: `${percentage}%`, height: '100%', background: gradient, borderRadius: '4px', transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)' }}></div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No class-wise data available.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'verifications' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Collapsible Section Toggles */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }} className="no-print">
            <button 
              onClick={() => setShowPendingVerificationsList(!showPendingVerificationsList)}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: showPendingVerificationsList ? 'var(--primary)' : 'var(--card-bg-alt)',
                color: showPendingVerificationsList ? '#fff' : 'var(--text)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              👥 Pending Profile & Fee Verifications {pendingVerifications.length > 0 && (
                <span style={{ 
                  background: showPendingVerificationsList ? '#fff' : '#ef4444', 
                  color: showPendingVerificationsList ? '#ef4444' : '#fff', 
                  fontSize: '0.75rem', 
                  padding: '2px 8px', 
                  borderRadius: '10px',
                  fontWeight: 800
                }}>
                  {pendingVerifications.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => setShowAdmissionsInquiriesList(!showAdmissionsInquiriesList)}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: showAdmissionsInquiriesList ? 'var(--primary)' : 'var(--card-bg-alt)',
                color: showAdmissionsInquiriesList ? '#fff' : 'var(--text)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              🏫 Student Admission Inquiries
            </button>
            <button 
              onClick={() => {
                setShowBugReportsList(!showBugReportsList);
                if (!showBugReportsList) fetchBugReports();
              }}
              style={{
                padding: '0.75rem 1.25rem',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                background: showBugReportsList ? 'var(--primary)' : 'var(--card-bg-alt)',
                color: showBugReportsList ? '#fff' : 'var(--text)',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                transition: 'all 0.2s',
                fontSize: '0.9rem'
              }}
            >
              🐛 Bug & User Reports {bugReports.length > 0 && (
                <span style={{ 
                  background: showBugReportsList ? '#fff' : '#ef4444', 
                  color: showBugReportsList ? '#ef4444' : '#fff', 
                  fontSize: '0.75rem', 
                  padding: '2px 8px', 
                  borderRadius: '10px',
                  fontWeight: 800
                }}>
                  {bugReports.length}
                </span>
              )}
            </button>

          </div>

          {showPendingVerificationsList && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Pending Profile & Fee Verifications</h2>
              {pendingVerifications.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No profiles are currently awaiting verification.</p>
              ) : (
                <div style={{ display: 'grid', gap: '1rem' }}>
                  {pendingVerifications.map(u => (
                    <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                          <span 
                            onClick={() => setActiveProfileUserId(u.id)}
                            style={{ fontWeight: 700, fontSize: '1.1rem', cursor: 'pointer' }}
                            className="clickable-name"
                          >
                            {u.name || 'Anonymous'}
                          </span>
                          <span className="role-badge" style={{ fontSize: '0.65rem' }}>{u.role}</span>
                        </div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Username: <strong>{u.username}</strong> • Joined {((() => { const d = new Date(u.createdAt); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}
                        </div>
                        {u.studentProfile && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                            📞 {u.studentProfile.phone} • ✉️ {u.studentProfile.email}
                          </div>
                        )}
                      </div>
                      <button 
                        className="btn-primary" 
                        disabled={isVerifying === u.id}
                        onClick={() => handleVerifyUser(u.id)}
                        style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', background: '#10b981' }}
                      >
                        {isVerifying === u.id ? 'Verifying...' : 'Approve & Verify'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {showBugReportsList && (
            <div className="glass-card animate-scale-up" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🐛 Bug & User Reports
              </h2>
              {isLoadingBugReports ? (
                <div style={{ textAlign: 'center', padding: '2rem' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem', width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Loading reports...
                </div>
              ) : bugReports.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No bug or user reports registered in the database.</p>
              ) : (
                <div style={{ display: 'grid', gap: '1.25rem' }}>
                  {bugReports.map(report => {
                    const { cleanMessage, screenshot, email } = parseNotificationMessage(report.message);
                    return (
                      <div key={report.id} style={{ padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '16px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                          <div>
                            <span style={{ 
                              padding: '3px 8px', 
                              borderRadius: '6px', 
                              fontSize: '0.7rem', 
                              fontWeight: 800, 
                              background: report.title.includes('Bug') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)', 
                              color: report.title.includes('Bug') ? '#ef4444' : '#f59e0b',
                              border: `1px solid ${report.title.includes('Bug') ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)'}`,
                              marginRight: '0.5rem'
                            }}>
                              {report.title.includes('Bug') ? 'BUG REPORT' : 'USER REPORT'}
                            </span>
                            <h4 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)' }}>
                              {report.title}
                            </h4>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Logged: {new Date(report.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {screenshot && (
                              <button
                                onClick={() => setLightboxUrl(screenshot)}
                                style={{
                                  background: 'rgba(99, 102, 241, 0.12)',
                                  border: '1px solid rgba(99, 102, 241, 0.2)',
                                  color: '#818cf8',
                                  padding: '6px 14px',
                                  borderRadius: '8px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer'
                                }}
                              >
                                👁️ View Attachment
                              </button>
                            )}
                            <button 
                              onClick={() => handleDeleteBugReport(report.id)}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: 'none',
                                color: '#ef4444',
                                padding: '6px 14px',
                                borderRadius: '8px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                            >
                              Dismiss / Delete
                            </button>
                          </div>
                        </div>
                        <div style={{ 
                          background: 'rgba(0,0,0,0.15)', 
                          padding: '1rem', 
                          borderRadius: '10px', 
                          border: '1px solid var(--border)',
                          whiteSpace: 'pre-wrap', 
                          fontSize: '0.88rem', 
                          color: 'var(--text)',
                          fontFamily: 'monospace',
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word'
                        }}>
                          {cleanMessage}
                        </div>
                        {email && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            ✉️ Reporter Email: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{email}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}


        </div>
      )}



      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Sub-Tab Navigation Header */}
          <div className="subtab-nav no-scrollbar" style={{ gap: '0.4rem', padding: '0.2rem' }}>
            <button 
              onClick={() => setUserSubTab('DIRECTORY')}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                background: userSubTab === 'DIRECTORY' ? 'var(--primary)' : 'transparent',
                color: userSubTab === 'DIRECTORY' ? '#fff' : 'var(--text-muted)',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap'
              }}
            >
              👥 Members
            </button>
            <button 
              onClick={() => setUserSubTab('CREATE')}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                background: userSubTab === 'CREATE' ? 'var(--primary)' : 'transparent',
                color: userSubTab === 'CREATE' ? '#fff' : 'var(--text-muted)',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                whiteSpace: 'nowrap'
              }}
            >
              ➕ Add new user
            </button>
          </div>

          {userSubTab === 'DIRECTORY' && (
            <div className="glass-card" style={{ 
              padding: '1.5rem',
              transition: 'all 0.3s ease',
              border: `1px solid ${
                directoryFilter === 'STUDENT' ? 'rgba(59, 130, 246, 0.3)' : 
                directoryFilter === 'TEACHER' ? 'rgba(16, 185, 129, 0.3)' : 
                directoryFilter === 'ADMIN' ? 'rgba(239, 68, 68, 0.3)' : 
                'var(--border)'
              }`,
              boxShadow: directoryFilter === 'STUDENT' ? '0 8px 32px rgba(59, 130, 246, 0.08)' :
                         directoryFilter === 'TEACHER' ? '0 8px 32px rgba(16, 185, 129, 0.08)' :
                         directoryFilter === 'ADMIN' ? '0 8px 32px rgba(239, 68, 68, 0.08)' :
                         'none'
            }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
                <div style={{ 
                  display: 'flex', 
                  gap: '0.25rem', 
                  background: 'rgba(255, 255, 255, 0.05)', 
                  padding: '3px', 
                  borderRadius: '10px', 
                  width: '100%', 
                  justifyContent: 'center', 
                  maxWidth: '360px',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <button 
                    onClick={() => setDirectoryFilter('ALL')} 
                    style={{ 
                      flex: 1,
                      padding: '0.3rem 0.5rem', 
                      background: directoryFilter === 'ALL' ? '#2563eb' : 'transparent', 
                      color: directoryFilter === 'ALL' ? '#fff' : 'var(--text-muted)', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer', 
                      fontWeight: 700, 
                      fontSize: '0.75rem', 
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    ALL
                  </button>
                  <button 
                    onClick={() => setDirectoryFilter('STUDENT')} 
                    style={{ 
                      flex: 1,
                      padding: '0.3rem 0.5rem', 
                      background: directoryFilter === 'STUDENT' ? '#2563eb' : 'transparent', 
                      color: directoryFilter === 'STUDENT' ? '#fff' : 'var(--text-muted)', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer', 
                      fontWeight: 700, 
                      fontSize: '0.75rem', 
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Students
                  </button>
                  <button 
                    onClick={() => setDirectoryFilter('TEACHER')} 
                    style={{ 
                      flex: 1,
                      padding: '0.3rem 0.5rem', 
                      background: directoryFilter === 'TEACHER' ? '#10b981' : 'transparent', 
                      color: directoryFilter === 'TEACHER' ? '#fff' : 'var(--text-muted)', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer', 
                      fontWeight: 700, 
                      fontSize: '0.75rem', 
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Teachers
                  </button>
                  <button 
                    onClick={() => setDirectoryFilter('ADMIN')} 
                    style={{ 
                      flex: 1,
                      padding: '0.3rem 0.5rem', 
                      background: directoryFilter === 'ADMIN' ? '#ef4444' : 'transparent', 
                      color: directoryFilter === 'ADMIN' ? '#fff' : 'var(--text-muted)', 
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer', 
                      fontWeight: 700, 
                      fontSize: '0.75rem', 
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Admins
                  </button>
                </div>
              </div>

              <div style={{ position: 'relative', width: '100%', maxWidth: '850px', marginBottom: '2rem' }}>
                <input 
                  type="text" 
                  placeholder="Search by Name or ID..." 
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    setShowDirSuggestions(true);
                  }}
                  onFocus={() => setShowDirSuggestions(true)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchDirectory()}
                  style={{ 
                    width: '100%',
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    background: 'var(--input-bg)', 
                    border: `1px solid ${
                      directoryFilter === 'STUDENT' ? 'rgba(59, 130, 246, 0.4)' : 
                      directoryFilter === 'TEACHER' ? 'rgba(16, 185, 129, 0.4)' : 
                      directoryFilter === 'ADMIN' ? 'rgba(239, 68, 68, 0.4)' : 
                      'var(--border)'
                    }`, 
                    color: 'var(--text)',
                    transition: 'all 0.3s ease'
                  }}
                />
                {showDirSuggestions && searchQuery.trim() && (
                  <>
                    <div 
                      onClick={() => setShowDirSuggestions(false)} 
                      style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }} 
                    />
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      marginTop: '0.5rem',
                      maxHeight: '250px',
                      overflowY: 'auto',
                      zIndex: 9999,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                      padding: '0.5rem'
                    }}>
                      {(() => {
                        const matches = directoryUsers
                          .filter(u => directoryFilter === 'ALL' || u.role === directoryFilter)
                          .filter(u => 
                            u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.username?.toLowerCase().includes(searchQuery.toLowerCase())
                          );
                        if (matches.length === 0) {
                          return (
                            <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                              No users found
                            </div>
                          );
                        }
                        return matches.map(s => (
                          <div 
                            key={s.id}
                            onClick={() => {
                              setSearchQuery(s.name || '');
                              setShowDirSuggestions(false);
                              setSelectedUserDetail(s);
                            }}
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.85rem',
                              color: 'var(--text)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              borderBottom: '1px solid rgba(255,255,255,0.01)'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <span>{s.name} <small style={{ color: 'var(--text-muted)', marginLeft: '0.25rem' }}>({s.role})</small></span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{s.username}</span>
                          </div>
                        ));
                      })()}
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '1.25rem' }}>
                {isSearching ? (
                  <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem 0', gap: '0.5rem' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 600 }}>Searching directory...</p>
                  </div>
                ) : filteredDirectoryUsers.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '3rem 0' }}>No users found.</p>
                ) : (
                  filteredDirectoryUsers.map(u => (
                    <div key={u.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          borderRadius: '50%', 
                          overflow: 'hidden', 
                          background: 'rgba(255,255,255,0.05)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: '1rem', 
                          fontWeight: 'bold', 
                          border: `2px solid ${
                            u.role === 'ADMIN' ? '#ef4444' : 
                            u.role === 'TEACHER' ? '#10b981' : 
                            '#2563eb'
                          }`, 
                          flexShrink: 0 
                        }}>
                          {u.photoUrl ? (
                            <img src={u.photoUrl} alt={u.name} onClick={() => setLightboxUrl(u.photoUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
                          ) : (
                            (u.name || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <span 
                              onClick={() => setActiveProfileUserId(u.id)}
                              style={{ fontWeight: 'bold', fontSize: '0.92rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                              className="clickable-name"
                            >
                              {u.name || 'Unnamed'}
                            </span>
                            <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '20px', background: u.role === 'ADMIN' ? 'rgba(239,68,68,0.2)' : u.role === 'TEACHER' ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)', color: u.role === 'ADMIN' ? '#f87171' : u.role === 'TEACHER' ? '#34d399' : '#60a5fa', flexShrink: 0 }}>
                              {u.role}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{u.username}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Joined: {((() => { const d = new Date(u.createdAt); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button 
                          onClick={() => setSelectedUserDetail(u)}
                          style={{ 
                            flex: 1, 
                            padding: '0.4rem 0.5rem', 
                            background: 
                              u.role === 'ADMIN' ? '#ef4444' : 
                              u.role === 'TEACHER' ? '#10b981' : 
                              '#2563eb', 
                            border: 'none', 
                            borderRadius: '8px', 
                            color: 'white', 
                            cursor: 'pointer', 
                            fontSize: '0.72rem', 
                            fontWeight: 700, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            gap: '3px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          🔍 Details
                        </button>
                        <button 
                          type="button" disabled={isFetchingProfile === u.id} onClick={(e) => { e.preventDefault(); fetchProfile(u.id, u.role); }}
                          style={{ flex: 1, padding: '0.4rem 0.5rem', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
                        >
                          ✎ Edit
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {userSubTab === 'CREATE' && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '2.25rem' }}>Create New Users</h2>
              
              {createdUser && (
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                  <h3 style={{ color: '#34d399', marginBottom: '1rem' }}>✅ Successfully created {createdUser.role}!</h3>
                  <p style={{ marginBottom: '0.5rem' }}>Please share these credentials securely with the user:</p>
                  <p><strong>Username / ID:</strong> <span style={{ background: '#000', padding: '2px 8px', borderRadius: '4px' }}>{createdUser.username}</span></p>
                  <p><strong>Password:</strong> <span style={{ background: '#000', padding: '2px 8px', borderRadius: '4px' }}>{createdUser.password}</span></p>
                  <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>*User will be prompted to change their password on first login.</p>
                </div>
              )}

              {errorMsg && (
                <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '1.5rem' }}>
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
                <div className="input-group">
                  <label>Role</label>
                  <select 
                    value={newUserRole} 
                    onChange={e => setNewUserRole(e.target.value as any)}
                    style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    <option value="STUDENT">Student</option>
                    <option value="TEACHER">Teacher</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                
                <div className="input-group">
                  <label>Full Name</label>
                  <input type="text" placeholder="e.g. Rahul Kumar" value={newUserName} maxLength={150} onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                      setNewUserName(val);
                    }
                  }} />
                </div>

                {newUserRole === 'STUDENT' && (
                  <>
                    <div className="input-group">
                      <label>Class</label>
                      <select 
                        value={newStudentClass} 
                        onChange={e => {
                          setNewStudentClass(e.target.value);
                          if (e.target.value === '__CUSTOM__') {
                            setIsCustomClass(true);
                          } else {
                            setIsCustomClass(false);
                          }
                        }} 
                        required 
                        style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      >
                        <option value="">Select Class</option>
                        {/* Standard Classes */}
                        {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map(cls => (
                          <option key={cls} value={cls}>{cls}</option>
                        ))}
                        {/* Saved Custom Classes */}
                        {Object.keys(classFees)
                          .filter(cls => !cls.match(/^Class \d+$/))
                          .map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                          ))
                        }
                        <option value="__CUSTOM__">✨ Other (Type custom class...)</option>
                      </select>

                      {newStudentClass === '__CUSTOM__' && (
                        <div style={{ marginTop: '0.75rem' }}>
                          <input 
                            type="text" 
                            placeholder="Type custom class name..." 
                            value={customClassName} 
                            onChange={e => setCustomClassName(e.target.value)} 
                            required 
                            style={{ padding: '0.75rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', width: '100%' }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="input-group">
                      <label>Board</label>
                      <select 
                        value={newStudentBoard} 
                        onChange={e => setNewStudentBoard(e.target.value)} 
                        required 
                        style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      >
                        <option value="">Select Board</option>
                        <option value="CBSE">CBSE</option>
                        <option value="ICSE">ICSE</option>
                        <option value="State Board">State Board</option>
                        <option value="IB">IB</option>
                        <option value="IGCSE">IGCSE</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="input-group">
                      <label>Scholarship Amount (Optional, ₹)</label>
                      <input type="number" placeholder="e.g. 1000" value={newStudentScholarship} onChange={e => setNewStudentScholarship(e.target.value)} />
                    </div>
                    <div className="input-group">
                      <label>Father's Name</label>
                      <input type="text" placeholder="e.g. Ramesh Kumar" value={newStudentFatherName} maxLength={150} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                          setNewStudentFatherName(val);
                        }
                      }} style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="input-group">
                      <label>Contact Phone</label>
                      <input type="text" placeholder="e.g. 9876543210" maxLength={10} value={newStudentPhone} onChange={e => setNewStudentPhone(e.target.value.replace(/\D/g, ''))} style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="input-group">
                      <label>Email Address</label>
                      <input type="email" placeholder="e.g. student@gmail.com" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="input-group">
                      <label>Residential Address</label>
                      <input type="text" placeholder="e.g. 123 Street, City" value={newStudentAddress} maxLength={150} onChange={e => setNewStudentAddress(e.target.value)} style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="input-group">
                      <label>Date of Birth</label>
                      <input type="date" value={newStudentDob} onChange={e => setNewStudentDob(e.target.value)} style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    </div>
                  </>
                )}

                {newUserRole === 'TEACHER' && (
                  <div className="input-group">
                    <label>Subject Specialist</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Mathematics, Physics" 
                      value={newTeacherSubject} 
                      onChange={e => setNewTeacherSubject(e.target.value)} 
                      required 
                      style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    />
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={isCreating} style={{ padding: '0.9rem', marginBottom: '1.25rem' }}>
                  {isCreating ? "Creating..." : "Generate ID & Save"}
                </button>
              </form>
            </div>
          )}

        </div>
      )}

{activeTab === 'finances' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Sub-Tab Navigation Header */}
          <div className="subtab-nav no-scrollbar" style={{ gap: '0.35rem', padding: '0.2rem' }}>
            {[
              { id: 'OVERVIEW', label: 'Finance Hub', desc: 'Overview & Stats' },
              { id: 'LEDGER', label: 'Fee Ledger', desc: 'Accounts & Dues' },
              { id: 'ASSIGN', label: 'Assign Fee', desc: 'Assign Custom/Batch' },
              { id: 'EXPENSES', label: 'Expense Tracker', desc: 'Outflows & Claims' },
              { id: 'STATEMENT', label: 'Monthly Statement', desc: 'Monthly Transactions' },
              { id: 'BILLING_ENGINE', label: 'Billing Engine', desc: 'Auto monthly run' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setFinanceSubTab(tab.id as any)}
                style={{
                  padding: '0.35rem 0.65rem',
                  border: 'none',
                  background: financeSubTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: financeSubTab === tab.id ? '#fff' : 'var(--text-muted)',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '0.02rem'
                }}
              >
                <span style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{tab.label}</span>
                <span style={{ fontSize: '0.58rem', fontWeight: 500, opacity: financeSubTab === tab.id ? 0.85 : 0.5 }}>{tab.desc}</span>
              </button>
            ))}
          </div>

          {financeSubTab === 'OVERVIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

              {/* ── Top Level Stats Grid ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                 {[
                   { label: 'Collected Revenue', value: `₹${(finSummary?.totalRevenue || 0).toLocaleString()}`, color: 'var(--secondary)', desc: 'Received student dues (All Time)' },
                   { label: 'Current Month Pending', value: `₹${currentMonthPending.toLocaleString()}`, color: 'var(--primary)', desc: 'Pending dues this month' },
                   { label: 'Current Month Collected', value: `₹${currentMonthCollected.toLocaleString()}`, color: 'var(--secondary)', desc: 'Collected fees this month' },
                   { label: 'Pending Receivables', value: `₹${(finSummary?.totalPending || 0).toLocaleString()}`, color: 'var(--primary)', desc: 'Outstanding invoices (All Time)' }
                 ].map((s, i) => (
                   <div key={i} className="glass-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${s.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ width: '100%' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {s.value}
                          {isLoadingFinSummary && <span style={{ width: '14px', height: '14px', border: '2px solid var(--border)', borderTopColor: s.color, borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.desc}</div>
                      </div>
                   </div>
                 ))}
              </div>

              {/* Two Column Grid under Overview */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                
                {/* Billing Summary Box / Chart */}
                <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700 }}>Billing Overview</h3>
                  </div>

                  {/* Visual Progress Bar */}
                  <div style={{ margin: '1.5rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                      <span>Collection Efficiency</span>
                      {(() => {
                        const total = (finSummary?.totalRevenue || 0) + (finSummary?.totalPending || 0);
                        const percent = total > 0 ? ((finSummary?.totalRevenue || 0) / total) * 100 : 0;
                        return <span style={{ color: 'var(--secondary)' }}>{percent.toFixed(1)}%</span>;
                      })()}
                    </div>
                    <div style={{ width: '100%', height: '12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                      {(() => {
                        const total = (finSummary?.totalRevenue || 0) + (finSummary?.totalPending || 0);
                        const revPercent = total > 0 ? ((finSummary?.totalRevenue || 0) / total) * 100 : 0;
                        const pendPercent = total > 0 ? ((finSummary?.totalPending || 0) / total) * 100 : 0;
                        return (
                          <>
                            <div style={{ width: `${revPercent}%`, background: 'var(--secondary)', height: '100%' }} />
                            <div style={{ width: `${pendPercent}%`, background: 'var(--primary)', height: '100%' }} />
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ padding: '0.75rem', background: 'rgba(59,130,246,0.05)', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--secondary)', fontWeight: 600 }}>Collected</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>₹{(finSummary?.totalRevenue || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600 }}>Uncollected Dues</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800 }}>₹{(finSummary?.totalPending || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {financeSubTab === 'LEDGER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              


              {/* Full-Width Ledger Collection Table */}
              <div className="glass-card" style={{ padding: '1.25rem 1.5rem', position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Fee Ledger & Collections</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Track and verify all student payments</p>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setLedgerViewMode('ALL')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: ledgerViewMode === 'ALL' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          color: ledgerViewMode === 'ALL' ? 'white' : 'var(--text)',
                          border: ledgerViewMode === 'ALL' ? 'none' : '1px solid var(--border)',
                          transition: 'all 0.2s'
                        }}
                      >
                        All Records
                      </button>
                      <button
                        onClick={() => setLedgerViewMode('FIRST_10')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: ledgerViewMode === 'FIRST_10' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          color: ledgerViewMode === 'FIRST_10' ? 'white' : 'var(--text)',
                          border: ledgerViewMode === 'FIRST_10' ? 'none' : '1px solid var(--border)',
                          transition: 'all 0.2s'
                        }}
                      >
                        First 10 Transactions
                      </button>
                      <button
                        onClick={() => setLedgerViewMode('ASSIGNED_FEES')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: ledgerViewMode === 'ASSIGNED_FEES' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          color: ledgerViewMode === 'ASSIGNED_FEES' ? 'white' : 'var(--text)',
                          border: ledgerViewMode === 'ASSIGNED_FEES' ? 'none' : '1px solid var(--border)',
                          transition: 'all 0.2s'
                        }}
                      >
                        Assigned Fees
                      </button>
                      <button
                        onClick={() => setLedgerViewMode('PENDING_FEES')}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: ledgerViewMode === 'PENDING_FEES' ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                          color: ledgerViewMode === 'PENDING_FEES' ? 'white' : 'var(--text)',
                          border: ledgerViewMode === 'PENDING_FEES' ? 'none' : '1px solid var(--border)',
                          transition: 'all 0.2s'
                        }}
                      >
                        Pending Fees
                      </button>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    {(ledgerViewMode === 'ALL' || ledgerViewMode === 'PENDING_FEES') && (
                      <div style={{ position: 'relative', display: 'flex', gap: '1rem' }}>
                        <input 
                          type="text" 
                          placeholder="Search Name or ID..." 
                          value={feeSearchQuery}
                          onChange={e => {
                            setFeeSearchQuery(e.target.value);
                            setShowLedgerSuggestions(true);
                          }}
                          onFocus={() => setShowLedgerSuggestions(true)}
                          style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', width: '200px' }}
                        />
                        {showLedgerSuggestions && (
                          <>
                            <div 
                              onClick={() => setShowLedgerSuggestions(false)} 
                              style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }} 
                            />
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '12px',
                              marginTop: '0.5rem',
                              maxHeight: '250px',
                              overflowY: 'auto',
                              zIndex: 9999,
                              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                              padding: '0.5rem'
                            }}>
                              {(() => {
                                const matches = allStudents
                                  .filter(u => 
                                    u.name?.toLowerCase().includes(feeSearchQuery.toLowerCase()) ||
                                    u.username?.toLowerCase().includes(feeSearchQuery.toLowerCase())
                                  );
                                if (matches.length === 0) {
                                  return (
                                    <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                                      No students found
                                    </div>
                                  );
                                }
                                return matches.map(s => (
                                  <div 
                                    key={s.id}
                                    onClick={() => {
                                      setFeeSearchQuery(s.name || '');
                                      setShowLedgerSuggestions(false);
                                    }}
                                    style={{
                                      padding: '0.5rem 0.75rem',
                                      borderRadius: '6px',
                                      cursor: 'pointer',
                                      fontSize: '0.85rem',
                                      color: 'var(--text)',
                                      display: 'flex',
                                      justifyContent: 'space-between',
                                      borderBottom: '1px solid rgba(255,255,255,0.01)'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  >
                                    <span style={{ fontWeight: 600 }}>{s.name}</span>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.username}</span>
                                  </div>
                                ));
                              })()}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <select
                      value={ledgerFilterYear}
                      onChange={e => setLedgerFilterYear(e.target.value)}
                      style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      <option value="ALL">All Years</option>
                      {(uniqueLedgerYears as string[]).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>

                    <select
                      value={ledgerFilterMonth}
                      onChange={e => setLedgerFilterMonth(e.target.value)}
                      style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      <option value="ALL">All Months</option>
                      {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>

                    <button
                      onClick={() => setIsLedgerListOpen(!isLedgerListOpen)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '10px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: isLedgerListOpen ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isLedgerListOpen ? '#ef4444' : '#10b981',
                        border: `1px solid ${isLedgerListOpen ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      {isLedgerListOpen ? '↩️ Collapse Table' : '📂 Expand Table'}
                    </button>
                  </div>
                </div>

                {!isLedgerListOpen ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    padding: '1rem 1.5rem', 
                    border: '1px dashed var(--border)', 
                    borderRadius: '12px', 
                    background: 'rgba(255,255,255,0.01)', 
                    gap: '1rem',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>📁</span>
                      <div style={{ textAlign: 'left' }}>
                        <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Ledger Records Table</h4>
                        <p style={{ margin: '0.1rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Click to load and view the full interactive ledger.
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsLedgerListOpen(true)}
                      className="btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '8px' }}
                    >
                      📂 Open Ledger Table
                    </button>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', maxHeight: '550px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(0,0,0,0.1)', padding: '0.25rem', width: '100%' }}>
                    {/* View Mode 1: ALL RECORDS OR PENDING FEES */}
                    {(ledgerViewMode === 'ALL' || ledgerViewMode === 'PENDING_FEES') && (
                      <table style={{ width: '100%', minWidth: '750px', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <th style={{ padding: '0.5rem 0' }}>Student / ID</th>
                            <th>Billing Details</th>
                            <th>Status</th>
                            <th>Amount Breakup</th>
                            <th>Total Due</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {isLoadingFees ? (
                            Array.from({ length: 5 }).map((_, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <td colSpan={6} style={{ padding: '1rem' }}>
                                  <div style={{ height: '14px', width: '100%', borderRadius: '6px', background: 'linear-gradient(90deg, var(--border) 25%, rgba(255,255,255,0.08) 50%, var(--border) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                                </td>
                              </tr>
                            ))
                          ) : (() => {
                            const filteredStudents = allStudents.filter(s => {
                              const matchesSearch = !feeSearchQuery.trim() || 
                                                    s.name?.toLowerCase().includes(feeSearchQuery.toLowerCase()) || 
                                                    s.username?.toLowerCase().includes(feeSearchQuery.toLowerCase());
                              if (!matchesSearch) return false;

                              if (ledgerViewMode === 'PENDING_FEES') {
                                const hasPending = fees.some(f => 
                                  f.studentId === s.id && 
                                  f.status === 'PENDING' &&
                                  (
                                    (ledgerFilterMonth === 'ALL' && ledgerFilterYear === 'ALL') ||
                                    (ledgerFilterMonth === 'ALL' && f.billingMonth?.endsWith(ledgerFilterYear)) ||
                                    (ledgerFilterYear === 'ALL' && f.billingMonth?.startsWith(ledgerFilterMonth)) ||
                                    (f.billingMonth === `${ledgerFilterMonth} ${ledgerFilterYear}`)
                                  )
                                );
                                return hasPending;
                              }
                              return true;
                            });

                            if (filteredStudents.length === 0) return <tr><td colSpan={6} style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No matching student records found.</td></tr>;

                            return filteredStudents.map(s => {
                              const studentInvoices = fees.filter(f => 
                                f.studentId === s.id &&
                                (
                                  (ledgerFilterMonth === 'ALL' && ledgerFilterYear === 'ALL') ||
                                  (ledgerFilterMonth === 'ALL' && f.billingMonth?.endsWith(ledgerFilterYear)) ||
                                  (ledgerFilterYear === 'ALL' && f.billingMonth?.startsWith(ledgerFilterMonth)) ||
                                  (f.billingMonth === `${ledgerFilterMonth} ${ledgerFilterYear}`)
                                )
                              );

                              const hasInvoices = studentInvoices.length > 0;

                              if (!hasInvoices) {
                                const baseFee = s.studentProfile?.baseFee || 0;
                                const scholarship = s.studentProfile?.scholarship || 0;
                                const finalBase = Math.max(0, baseFee - scholarship);
                                return (
                                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', opacity: 0.75 }}>
                                    <td style={{ padding: '0.6rem 0' }}>
                                      <div 
                                        onClick={() => setActiveProfileUserId(s.id)} 
                                        style={{ fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'underline decoration-dotted' }}
                                        className="clickable-name"
                                      >
                                        {s.name}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{s.username}</div>
                                    </td>
                                    <td>
                                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {ledgerFilterMonth !== 'ALL' || ledgerFilterYear !== 'ALL' 
                                          ? `${ledgerFilterMonth} ${ledgerFilterYear}` 
                                          : 'No invoices assigned'}
                                      </div>
                                    </td>
                                    <td>
                                      <span style={{
                                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                                        background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', border: '1px solid var(--border)'
                                      }}>
                                        UNASSIGNED
                                      </span>
                                    </td>
                                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                      <div>Base: ₹{finalBase}</div>
                                      {scholarship > 0 && <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Scholarship: -₹{scholarship}</div>}
                                    </td>
                                    <td style={{ fontWeight: 700, color: 'var(--text-muted)' }}>-</td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button 
                                          onClick={() => {
                                            setAddFeeMode('INDIVIDUAL');
                                            setFeeStudentId(s.username);
                                            setFeeStudentSearch(`${s.name} (${s.username})`);
                                            setFeeAmount(String(baseFee));
                                            setFeeDiscount(String(scholarship));
                                            setFinanceSubTab('ASSIGN');
                                          }}
                                          style={{ padding: '6px 10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}
                                        >
                                          ➕ Assign Fee
                                        </button>
                                        <button 
                                          onClick={() => setSelectedUserDetail(s)} 
                                          style={{ padding: '6px 10px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}
                                        >
                                          Statement
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              if (studentInvoices.length === 1) {
                                const fee = studentInvoices[0];
                                const isOverdue = fee.status === 'PENDING' && fee.currentLateFine > 0;
                                return (
                                  <tr key={fee.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isOverdue ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                                    <td style={{ padding: '0.6rem 0' }}>
                                      <div 
                                        onClick={() => setActiveProfileUserId(s.id)} 
                                        style={{ fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'underline decoration-dotted' }}
                                        className="clickable-name"
                                      >
                                        {s.name}
                                      </div>
                                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{s.username}</div>
                                    </td>
                                    <td>
                                      <div style={{ fontSize: '0.9rem' }}>{fee.billingMonth}</div>
                                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{fee.title}</div>
                                    </td>
                                    <td>
                                      <span style={{
                                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                                        background: fee.status === 'PAID' ? 'rgba(52,211,153,0.1)' : fee.status === 'VERIFIED' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                                        color: fee.status === 'PAID' ? '#10b981' : fee.status === 'VERIFIED' ? '#3b82f6' : '#ef4444',
                                        border: `1px solid ${fee.status === 'PAID' ? '#10b981' : fee.status === 'VERIFIED' ? '#3b82f6' : '#ef4444'}`
                                      }}>
                                        {fee.status}
                                      </span>
                                      {fee.collectedBy && (
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                          👤 By: <strong>{fee.collectedBy}</strong>
                                        </div>
                                      )}
                                      {isOverdue && <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700, marginTop: '4px' }}>⚠ {fee.daysLate} DAYS LATE</div>}
                                    </td>
                                    <td style={{ fontSize: '0.8rem' }}>
                                       <div>Base: ₹{fee.amount - fee.discount}</div>
                                       {fee.currentLateFine > 0 && <div style={{ color: '#ef4444' }}>Fine: +₹{fee.currentLateFine}</div>}
                                       {fee.discount > 0 && <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Scholarship: ₹{fee.discount} (deducted)</div>}
                                    </td>
                                    <td style={{ fontWeight: 700 }}>₹{fee.totalDue.toFixed(0)}</td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {(fee.status === 'PENDING' || fee.totalDue > 0.01) && (
                                          <button onClick={() => { setPayingFee(fee); setShowPaymentModal(true); setPaymentDetails({ paymentMethod: 'CASH', transactionId: '', discount: fee.discount, remarks: '', paidAmount: (fee.amount + fee.currentLateFine - fee.discount - (fee.paidAmount || 0)).toString(), paidAt: new Date().toISOString().split('T')[0] }); }} style={{ padding: '6px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>Collect</button>
                                        )}
                                        {(fee.status === 'PAID' || fee.status === 'PAID_ONLINE') && (
                                          <button onClick={() => updateFeeStatus(fee.id, 'VERIFIED')} style={{ padding: '6px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>Verify</button>
                                        )}
                                        {(fee.status !== 'PENDING') && (
                                          <button onClick={() => handleViewReceipt(fee.id)} style={{ padding: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>🧾 Receipt</button>
                                        )}
                                        <button 
                                          onClick={() => setSelectedUserDetail(s)} 
                                          style={{ padding: '6px 10px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}
                                        >
                                          Statement
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              const pendingInvoices = studentInvoices.filter(f => f.status === 'PENDING');
                              const pendingCount = pendingInvoices.length;
                              const totalBase = studentInvoices.reduce((acc, f) => acc + f.amount, 0);
                              const totalDiscount = studentInvoices.reduce((acc, f) => acc + f.discount, 0);
                              const totalFine = studentInvoices.reduce((acc, f) => acc + Math.max(f.lateFine || 0, f.currentLateFine || 0), 0);
                              const totalPaid = studentInvoices.filter(f => ['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status) || (f.status === 'PENDING' && f.paidAmount > 0)).reduce((acc, f) => acc + (f.paidAmount || 0), 0);
                              const outstanding = studentInvoices.filter(f => f.status === 'PENDING').reduce((acc, f) => {
                                const fine = Math.max(f.lateFine || 0, f.currentLateFine || 0);
                                return acc + Math.max(0, f.amount + fine - f.discount - (f.paidAmount || 0));
                              }, 0);

                              const isOverdue = pendingInvoices.some(f => (f.lateFine || 0) > 0 || (f.currentLateFine || 0) > 0);

                              return (
                                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isOverdue ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                                  <td style={{ padding: '0.6rem 0' }}>
                                    <div 
                                      onClick={() => setActiveProfileUserId(s.id)} 
                                      style={{ fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'underline decoration-dotted' }}
                                      className="clickable-name"
                                    >
                                      {s.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{s.username}</div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Multiple Invoices</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{studentInvoices.length} billing cycles</div>
                                  </td>
                                  <td>
                                    {(pendingCount > 0 || outstanding > 0.01) ? (
                                      <span style={{
                                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                                        background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid #ef4444'
                                      }}>
                                        {pendingCount > 0 ? `${pendingCount} PENDING` : 'PARTIAL DUE'}
                                      </span>
                                    ) : (
                                      <span style={{
                                        padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                                        background: 'rgba(52,211,153,0.1)', color: '#10b981', border: '1px solid #10b981'
                                      }}>
                                        ALL PAID
                                      </span>
                                    )}
                                  </td>
                                  <td style={{ fontSize: '0.8rem' }}>
                                     <div>Base: ₹{totalBase - totalDiscount}</div>
                                     {totalFine > 0 && <div style={{ color: '#ef4444' }}>Fine: +₹{totalFine}</div>}
                                     {totalDiscount > 0 && <div style={{ fontSize: '0.7rem', color: '#10b981' }}>Scholarship: ₹{totalDiscount} (deducted)</div>}
                                     {totalPaid > 0 && <div style={{ color: 'var(--primary)' }}>Paid: -₹{totalPaid}</div>}
                                  </td>
                                  <td style={{ fontWeight: 700 }}>₹{outstanding.toFixed(0)}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      {(pendingCount > 0 || outstanding > 0.01) && (() => {
                                        const invoicesWithDues = studentInvoices.filter(f => f.status === 'PENDING' || f.totalDue > 0.01);
                                        const oldestPending = [...invoicesWithDues].sort((a,b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];
                                        if (!oldestPending) return null;
                                        return (
                                          <button 
                                            onClick={() => { setPayingFee(oldestPending); setShowPaymentModal(true); setPaymentDetails({ paymentMethod: 'CASH', transactionId: '', discount: oldestPending.discount, remarks: '', paidAmount: (oldestPending.amount + oldestPending.currentLateFine - oldestPending.discount - (oldestPending.paidAmount || 0)).toString(), paidAt: new Date().toISOString().split('T')[0] }); }} 
                                            style={{ padding: '6px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}
                                          >
                                            Collect Oldest
                                          </button>
                                        );
                                      })()}
                                      <button 
                                        onClick={() => setSelectedUserDetail(s)} 
                                        style={{ padding: '6px 10px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}
                                      >
                                        Statement
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setAddFeeMode('INDIVIDUAL');
                                          setFeeStudentId(s.username);
                                          setFeeStudentSearch(`${s.name} (${s.username})`);
                                          const base = s.studentProfile?.baseFee || 0;
                                          const scholarship = s.studentProfile?.scholarship || 0;
                                          const finalBase = Math.max(0, base - scholarship);
                                          setFeeAmount(String(base));
                                          setFeeDiscount(String(scholarship));
                                          setFinanceSubTab('ASSIGN');
                                        }}
                                        style={{ padding: '6px 10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}
                                      >
                                        ➕ Assign
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    )}

                    {/* View Mode 2: FIRST 10 TRANSACTIONS */}
                    {ledgerViewMode === 'FIRST_10' && (
                      <table style={{ width: '100%', minWidth: '750px', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <th style={{ padding: '0.75rem 0' }}>Receipt No. / Date</th>
                            <th>Student</th>
                            <th>Category</th>
                            <th>Method</th>
                            <th>Amount Paid</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const paidFees = [...fees]
                              .filter(f => ['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status))
                              .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime())
                              .slice(0, 10);

                            if (paidFees.length === 0) return <tr><td colSpan={6} style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No completed transactions recorded yet.</td></tr>;

                            return paidFees.map(fee => {
                              const dateObj = new Date(fee.paidAt || fee.updatedAt || fee.createdAt);
                              const formattedDate = formatDateDisplay(dateObj) + ', ' + dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                              return (
                                <tr key={fee.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <td style={{ padding: '0.6rem 0' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{fee.receiptNo || `REC-${fee.id.slice(-6).toUpperCase()}`}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formattedDate}</div>
                                  </td>
                                  <td>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{fee.student?.name}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{fee.student?.username}</div>
                                  </td>
                                  <td>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{fee.billingMonth}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fee.title}</div>
                                  </td>
                                  <td>
                                    <span style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', fontWeight: 600 }}>
                                      {fee.paymentMethod || 'ONLINE'}
                                    </span>
                                  </td>
                                  <td style={{ fontWeight: 800, color: '#10b981' }}>₹{fee.totalDue.toFixed(0)}</td>
                                  <td>
                                    <button onClick={() => handleViewReceipt(fee.id)} style={{ padding: '6px 12px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>🧾 View Receipt</button>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    )}

                    {/* View Mode 3: ASSIGNED FEES */}
                    {ledgerViewMode === 'ASSIGNED_FEES' && (
                      <table style={{ width: '100%', minWidth: '750px', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <th style={{ padding: '0.75rem 0' }}>Student Details</th>
                            <th>Assigned Base Fee</th>
                            <th>Total Paid Fees</th>
                            <th>Outstanding Balance</th>
                            <th>Invoices Status</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const students = allStudents;

                            if (students.length === 0) return <tr><td colSpan={6} style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No registered students found in directory.</td></tr>;

                            return students.map(s => {
                              const studentInvoices = fees.filter(f => f.studentId === s.id);
                              const totalPaid = studentInvoices
                                .filter(f => ['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status) || (f.status === 'PENDING' && f.paidAmount > 0))
                                .reduce((acc, f) => acc + (f.paidAmount || 0), 0);

                              const excessPaid = studentInvoices
                                .filter(f => ['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status))
                                .reduce((acc, f) => {
                                  const netDue = f.amount + (f.lateFine || 0) - f.discount;
                                  return acc + Math.max(0, (f.paidAmount || 0) - netDue);
                                }, 0);
                              
                              const pendingDues = studentInvoices
                                .filter(f => f.status === 'PENDING')
                                .reduce((acc, f) => {
                                  const fine = Math.max(f.lateFine || 0, f.currentLateFine || 0);
                                  return acc + Math.max(0, f.amount + fine - f.discount - (f.paidAmount || 0));
                                }, 0);
                              
                              const outstanding = Math.max(0, pendingDues - excessPaid);
                              const creditBalance = Math.max(0, excessPaid - pendingDues);
                              const baseFee = s.studentProfile?.baseFee || 0;
                              const scholarship = s.studentProfile?.scholarship || 0;
                              const finalBase = Math.max(0, baseFee - scholarship);
                              const pendingCount = studentInvoices.filter(f => f.status === 'PENDING').length;

                              return (
                                <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <td style={{ padding: '0.6rem 0' }}>
                                    <div 
                                      onClick={() => setActiveProfileUserId(s.id)} 
                                      style={{ fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'underline decoration-dotted' }}
                                      className="clickable-name"
                                    >
                                      {s.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{s.username}</div>
                                  </td>
                                  <td style={{ fontWeight: 700, color: 'var(--text)' }}>
                                    ₹{finalBase.toLocaleString()}
                                    {scholarship > 0 && <div style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: 600 }}>Discounted</div>}
                                  </td>
                                  <td style={{ fontWeight: 700, color: '#10b981' }}>
                                    ₹{totalPaid.toLocaleString()}
                                  </td>
                                  <td style={{ fontWeight: 700 }}>
                                    {outstanding > 0 ? (
                                      <span style={{ color: '#ef4444' }}>₹{outstanding.toLocaleString()}</span>
                                    ) : creditBalance > 0 ? (
                                      <span style={{ color: '#10b981' }}>+ ₹{creditBalance.toLocaleString()} Credit</span>
                                    ) : (
                                      <span style={{ color: 'var(--text-muted)' }}>₹0</span>
                                    )}
                                  </td>
                                  <td>
                                    {pendingCount > 0 ? (
                                      <span style={{ fontSize: '0.7rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>
                                        {pendingCount} PENDING BILLS
                                      </span>
                                    ) : (
                                      <span style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '3px 8px', borderRadius: '4px', fontWeight: 800 }}>
                                        ALL PAID
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      <button 
                                        onClick={() => {
                                          setSelectedUserDetail(s);
                                        }}
                                        style={{ padding: '6px 10px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                                      >
                                        📋 View Fee Statement
                                      </button>
                                      <button 
                                        onClick={() => {
                                          setAddFeeMode('INDIVIDUAL');
                                          setFeeStudentId(s.username);
                                          setFeeStudentSearch(`${s.name} (${s.username})`);
                                            setFeeAmount(String(baseFee));
                                            setFeeDiscount(String(scholarship));
                                          setFinanceSubTab('ASSIGN');
                                        }}
                                        style={{ padding: '6px 10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                                      >
                                        ➕ Assign Fee
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {financeSubTab === 'ASSIGN' && (
            <div className="glass-card" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 800 }}>Assign New Fee</h3>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px' }}>
                <button 
                  type="button"
                  onClick={() => setAddFeeMode('INDIVIDUAL')}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: addFeeMode === 'INDIVIDUAL' ? 'var(--primary)' : 'transparent', color: 'white' }}
                >
                  Student Charge
                </button>
                <button 
                  type="button"
                  onClick={() => setAddFeeMode('BATCH')}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: addFeeMode === 'BATCH' ? 'var(--primary)' : 'transparent', color: 'white' }}
                >
                  Batch Allocation
                </button>
              </div>

              <form onSubmit={handleAddFee} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {addFeeMode === 'INDIVIDUAL' ? (
                  <div className="input-group">
                    <label>Select Student</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        list="student-list"
                        required
                        placeholder="Type name or ID to search..."
                        value={feeStudentSearch}
                        onChange={e => {
                          setFeeStudentSearch(e.target.value);
                          const students = allStudents;
                          const matched = students.find(
                            s => s.username === e.target.value ||
                                 `${s.name} (${s.username})` === e.target.value
                          );
                          if (matched) {
                            setFeeStudentId(matched.username);
                            const base = matched.studentProfile?.baseFee || 0;
                            const scholarship = matched.studentProfile?.scholarship || 0;
                            const finalBase = Math.max(0, base - scholarship);
                            if (base > 0) {
                              setFeeAmount(String(base));
                              setFeeDiscount(String(scholarship));
                            }
                          } else {
                            setFeeStudentId('');
                          }
                        }}
                        style={{
                          width: '100%', padding: '0.85rem 1.25rem',
                          borderRadius: '12px',
                          background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem'
                        }}
                      />
                      <datalist id="student-list">
                        {allStudents.map(s => (
                          <option key={s.id} value={`${s.name} (${s.username})`} />
                        ))}
                      </datalist>
                    </div>
                  </div>
                ) : (
                  <div className="input-group">
                    <label>Select Allocation Batch Target</label>
                    <select
                      required
                      value={feeStudentId}
                      onChange={e => {
                        setFeeStudentId(e.target.value);
                        const matchedBatch = batches.find(b => b.id === e.target.value);
                        if (matchedBatch?.defaultFee > 0) {
                          setFeeAmount(String(matchedBatch.defaultFee));
                        } else {
                          setFeeAmount('');
                        }
                      }}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      <option value="">-- Choose Target Batch --</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.className || 'No Class'})</option>
                      ))}
                    </select>
                  </div>
                )}

                {addFeeMode === 'INDIVIDUAL' ? (
                  <>
                    <div className="input-group">
                      <label>Base Fee (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="Enter base fee"
                        value={feeAmount}
                        onChange={e => setFeeAmount(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label>Discount (₹)</label>
                      <input
                        type="number"
                        required
                        placeholder="Enter discount amount"
                        value={feeDiscount}
                        onChange={e => setFeeDiscount(e.target.value)}
                      />
                    </div>
                  </>
                ) : (
                  <div className="input-group">
                    <label>Amount (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="Enter amount"
                      value={feeAmount}
                      onChange={e => setFeeAmount(e.target.value)}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="input-group">
                    <label>Billing Month</label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select
                        value={feeBillingMonth.split(' ')[0] || 'January'}
                        onChange={e => {
                          const yearPart = feeBillingMonth.split(' ')[1] || String(new Date().getFullYear());
                          setFeeBillingMonth(`${e.target.value} ${yearPart}`);
                        }}
                        style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      >
                        {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={feeBillingMonth.split(' ')[1] || String(new Date().getFullYear())}
                        onChange={e => {
                          const monthPart = feeBillingMonth.split(' ')[0] || 'January';
                          setFeeBillingMonth(`${monthPart} ${e.target.value}`);
                        }}
                        style={{ width: '110px', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                      >
                        {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i)).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="input-group">
                    <label>Category</label>
                    <select 
                      value={feeTitle} 
                      onChange={e => setFeeTitle(e.target.value)}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      <option value="Monthly Fee">Monthly</option>
                      <option value="Registration">Registration</option>
                      <option value="Exam Fee">Exam Fee</option>
                      <option value="Books/Materials">Materials</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1rem' }}>
                  <div className="input-group">
                    <label>Issue Date (Optional)</label>
                    <input type="date" value={feeCreatedAt} onChange={e => setFeeCreatedAt(e.target.value)} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  </div>
                  <div className="input-group">
                    <label>Due Date (Optional)</label>
                    <input type="date" value={feeDueDate} onChange={e => setFeeDueDate(e.target.value)} style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                  </div>
                </div>

                <button type="submit" disabled={isAddingFee} className="btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}>
                  {isAddingFee ? 'Assigning...' : 'Assign Fee / Charge'}
                </button>
              </form>
            </div>
          )}

          {financeSubTab === 'EXPENSES' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                   <div>
                     <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>Expense Tracker</h3>
                     <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Log and manage institute operational outflows and expenses</p>
                   </div>
                   <button onClick={() => setShowExpenseModal(true)} className="btn-primary" style={{ padding: '0.6rem 1.2rem', borderRadius: '10px' }}>
                     ➕ Add New Expense
                   </button>
                </div>

                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px' }}>
                  <table style={{ width: '100%', minWidth: '700px', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <th style={{ padding: '0.75rem 0' }}>Expense Reference</th>
                        <th>Category</th>
                        <th>Remarks / Details</th>
                        <th>Outflow Date</th>
                        <th>Amount</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                       {isLoadingExpenses && expenses.length === 0 ? (
                         Array.from({ length: 4 }).map((_, idx) => (
                           <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                             {[120, 80, 180, 80, 80, 60].map((w, ci) => (
                               <td key={ci} style={{ padding: '1rem 0' }}>
                                 <div style={{ height: '14px', width: `${w}px`, maxWidth: '100%', borderRadius: '6px', background: 'linear-gradient(90deg, var(--border) 25%, rgba(255,255,255,0.08) 50%, var(--border) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
                               </td>
                             ))}
                           </tr>
                         ))
                       ) : expenses.map(exp => (
                        <tr key={exp.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '1rem 0', fontWeight: 700 }}>
                            EXP-{exp.id.slice(-6).toUpperCase()}
                          </td>
                          <td>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                              {exp.category}
                            </span>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{exp.title}</div>
                            {exp.remarks && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{exp.remarks}</div>}
                          </td>
                          <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            {((() => { const d = new Date(exp.date); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}
                          </td>
                          <td style={{ fontWeight: 800, color: '#ef4444' }}>
                            -₹{exp.amount.toLocaleString()}
                          </td>
                          <td>
                            <button 
                              onClick={() => deleteExpense(exp.id)} 
                              style={{ 
                                background: 'rgba(239, 68, 68, 0.1)', 
                                border: 'none', 
                                color: '#ef4444', 
                                padding: '6px 12px', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem', 
                                cursor: 'pointer',
                                fontWeight: 700
                              }}
                            >
                              🗑 Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                      {expenses.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ padding: '4rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                            No expenses recorded. Click "+ Add New Expense" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {financeSubTab === 'BILLING_ENGINE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--primary)', borderRadius: '20px', background: 'var(--card-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
                      ⚙️ Automated Monthly Billing Control Engine
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Generate monthly student bills automatically based on individual profile base fees
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select
                        value={autoBillingMonth.split(' ')[0] || "January"}
                        onChange={e => {
                          const yearPart = autoBillingMonth.split(' ')[1] || String(new Date().getFullYear());
                          const newMonth = `${e.target.value} ${yearPart}`;
                          setAutoBillingMonth(newMonth);
                          fetchAutoBillingPreview(newMonth);
                        }}
                        style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select
                        value={autoBillingMonth.split(' ')[1] || String(new Date().getFullYear())}
                        onChange={e => {
                          const monthPart = autoBillingMonth.split(' ')[0] || "January";
                          const newMonth = `${monthPart} ${e.target.value}`;
                          setAutoBillingMonth(newMonth);
                          fetchAutoBillingPreview(newMonth);
                        }}
                        style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                    </div>
                    
                    <button 
                      onClick={() => fetchAutoBillingPreview()} 
                      disabled={loadingAutoBillingPreview}
                      className="btn-secondary" 
                      style={{ padding: '0.75rem 1.25rem', fontWeight: 700 }}
                    >
                      {loadingAutoBillingPreview ? 'Calculating...' : '🔍 Preview Billing'}
                    </button>

                    <button 
                      onClick={runAutoBillingEngine}
                      disabled={runningAutoBilling}
                      className="btn-primary" 
                      style={{ padding: '0.55rem 1rem', fontWeight: 800 }}
                    >
                      {runningAutoBilling ? 'Generating Invoices...' : '🚀 Run Auto-Billing'}
                    </button>
                  </div>
                </div>

                {loadingAutoBillingPreview && (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div className="spinner" style={{ margin: '0 auto 1rem', width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Simulating billing preview and calculating base fees...
                  </div>
                )}

                {!loadingAutoBillingPreview && autoBillingPreview && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255,255,255,0.01)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)', animation: 'fadeIn 0.3s ease-out' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
                      <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Students</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem', color: 'var(--text)' }}>{autoBillingPreview.totalActiveStudents}</div>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '12px', border: '1px solid rgba(16,185,129,0.2)', textAlign: 'center', color: '#10b981' }}>
                        <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>Already Billed</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>{autoBillingPreview.alreadyBilledCount}</div>
                      </div>
                      <div style={{ padding: '1rem', background: 'rgba(245, 158, 11, 0.05)', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.2)', textAlign: 'center', color: '#f59e0b' }}>
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>Pending Assignment</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '0.25rem' }}>{autoBillingPreview.pendingBillingCount}</div>
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div style={{ maxHeight: '350px', overflowY: 'auto', overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
                      <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                        <thead style={{ background: 'var(--card-bg-alt)', position: 'sticky', top: 0, zIndex: 10 }}>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                            <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                            <th>User ID</th>
                            <th>Class</th>
                            <th>Calculated Base Fee</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {autoBillingPreview.preview?.map((p: any) => (
                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--text)' }}>{p.name}</td>
                              <td style={{ color: 'var(--text)' }}>{p.username}</td>
                              <td style={{ color: 'var(--text)' }}>{p.class}</td>
                              <td style={{ fontWeight: 700, color: '#10b981' }}>₹{p.baseFee}</td>
                              <td>
                                <span style={{ 
                                  padding: '2px 8px', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 800,
                                  background: p.alreadyBilled ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                                  color: p.alreadyBilled ? '#10b981' : '#f59e0b'
                                }}>
                                  {p.alreadyBilled ? 'BILLED ✓' : 'READY'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}



          {financeSubTab === 'STATEMENT' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Premium Monthly Statement Controls */}
              <div className="glass-card" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)', border: '1px solid var(--border)' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
                    📊 Monthly Financial Transaction Statement
                  </h3>
                </div>

                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <select
                      value={statementMonth}
                      onChange={e => setStatementMonth(e.target.value)}
                      style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                    <select
                      value={statementYear}
                      onChange={e => setStatementYear(e.target.value)}
                      style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                        <option key={y} value={String(y)}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    onClick={() => downloadStatementPDF(false)}
                    className="btn-secondary" 
                    style={{ padding: '0.55rem 1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '12px' }}
                  >
                    📥 Download PDF
                  </button>
                </div>
              </div>

              {/* Summary Cards */}
              {(() => {
                const inflow = fees.filter(f => {
                  if (!['PAID', 'VERIFIED', 'PAID_ONLINE'].includes(f.status)) return false;
                  const date = f.paidAt ? new Date(f.paidAt) : new Date(f.createdAt);
                  return date.toLocaleString('en-US', { month: 'long' }) === statementMonth && String(date.getFullYear()) === statementYear;
                });
                
                const outExpenses = expenses.filter(e => {
                  const date = new Date(e.date || e.createdAt);
                  return date.toLocaleString('en-US', { month: 'long' }) === statementMonth && String(date.getFullYear()) === statementYear;
                });
                
                const outSalaries = adminSalaries.filter(s => {
                  if (s.status !== 'PAID') return false;
                  const date = s.paidAt ? new Date(s.paidAt) : new Date(s.createdAt);
                  return date.toLocaleString('en-US', { month: 'long' }) === statementMonth && String(date.getFullYear()) === statementYear;
                });
                
                const totalIn = inflow.reduce((sum, f) => sum + (f.paidAmount || (f.amount + f.lateFine - f.discount)), 0);
                const totalExp = outExpenses.reduce((sum, e) => sum + e.amount, 0);
                const totalSal = outSalaries.reduce((sum, s) => sum + s.netPaid, 0);
                const net = totalIn - (totalExp + totalSal);

                const ledgerData = [
                  ...inflow.map(f => ({
                    date: f.paidAt ? new Date(f.paidAt) : new Date(f.createdAt),
                    ref: f.receiptNo || `REC-${f.id.slice(-6).toUpperCase()}`,
                    desc: `Fee Collected - ${f.student?.name} (${f.student?.username}) - ${f.billingMonth} [${f.title}]`,
                    type: 'FEE_INFLOW',
                    inflow: f.paidAmount || (f.amount + f.lateFine - f.discount),
                    outflow: 0
                  })),
                  ...outExpenses.map(e => ({
                    date: new Date(e.date || e.createdAt),
                    ref: `EXP-${e.id.slice(-6).toUpperCase()}`,
                    desc: `Administrative Expense - ${e.title} (${e.category})${e.remarks ? ' - ' + e.remarks : ''}`,
                    type: 'EXPENSE_OUTFLOW',
                    inflow: 0,
                    outflow: e.amount
                  })),
                  ...outSalaries.map(s => ({
                    date: s.paidAt ? new Date(s.paidAt) : s.createdAt ? new Date(s.createdAt) : new Date(),
                    ref: `SAL-${s.id.slice(-6).toUpperCase()}`,
                    desc: `Salary Disbursed - ${s.teacher?.name || 'Faculty Member'} - ${s.month}`,
                    type: 'SALARY_OUTFLOW',
                    inflow: 0,
                    outflow: s.netPaid
                  }))
                ].sort((a,b) => a.date.getTime() - b.date.getTime());

                return (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                      <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--secondary)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Collected Revenue (Cr)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--secondary)' }}>₹{totalIn.toLocaleString()}</div>
                      </div>
                      <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Expenses paid (Dr)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--primary)' }}>₹{totalExp.toLocaleString()}</div>
                      </div>
                      <div className="glass-card" style={{ padding: '1.5rem', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Salaries Disbursed (Dr)</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--primary)' }}>₹{totalSal.toLocaleString()}</div>
                      </div>
                      <div className="glass-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${net >= 0 ? 'var(--secondary)' : 'var(--primary)'}` }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Net cash balance</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: net >= 0 ? 'var(--secondary)' : 'var(--primary)' }}>₹{net.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Chronological ledger table */}
                    <div className="glass-card" style={{ padding: '2rem' }}>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', color: 'var(--text)' }}>Chronological Transaction Postings</h4>
                      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', border: '1px solid var(--border)', borderRadius: '14px', background: 'rgba(0,0,0,0.1)', width: '100%', maxWidth: '100%' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800 }}>
                              <th style={{ padding: '1.1rem 1.5rem' }}>Date</th>
                              <th style={{ padding: '1.1rem 1rem' }}>Receipt/Ref No.</th>
                              <th style={{ padding: '1.1rem 1rem' }}>Transaction Description</th>
                              <th style={{ padding: '1.1rem 1rem' }}>Type</th>
                              <th style={{ padding: '1.1rem 1rem', textAlign: 'right' }}>Credit (Cr)</th>
                              <th style={{ padding: '1.1rem 1.5rem', textAlign: 'right' }}>Debit (Dr)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledgerData.map((t, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.88rem' }}>
                                <td style={{ padding: '1.1rem 1.5rem', color: 'var(--text)' }}>{((d) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`)(t.date)}</td>
                                <td style={{ padding: '1.1rem 1rem', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-muted)' }}>{t.ref}</td>
                                <td style={{ padding: '1.1rem 1rem', color: 'var(--text)', fontWeight: 600, wordBreak: 'break-word', whiteSpace: 'normal', minWidth: '250px' }}>{t.desc}</td>
                                <td style={{ padding: '1.1rem 1rem' }}>
                                  <span style={{ 
                                    padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, 
                                    background: t.type === 'FEE_INFLOW' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)', 
                                    color: t.type === 'FEE_INFLOW' ? 'var(--secondary)' : 'var(--primary)' 
                                  }}>{t.type}</span>
                                </td>
                                <td style={{ padding: '1.1rem 1rem', textAlign: 'right', color: 'var(--secondary)', fontWeight: 700 }}>{t.inflow > 0 ? `₹${t.inflow.toLocaleString()}` : '–'}</td>
                                <td style={{ padding: '1.1rem 1.5rem', textAlign: 'right', color: 'var(--primary)', fontWeight: 700 }}>{t.outflow > 0 ? `₹${t.outflow.toLocaleString()}` : '–'}</td>
                              </tr>
                            ))}
                            {ledgerData.length === 0 && (
                              <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>No transactions recorded for {statementMonth} {statementYear}.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}
      {(activeTab === 'courses' || (activeTab === 'academics' && academicSubTab === 'courses')) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Sub-Tab Navigation Header */}
          <div className="subtab-nav no-scrollbar" style={{ gap: '0.35rem', padding: '0.2rem' }}>
            <button 
              onClick={() => setCourseSubTab('COURSES')}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                background: courseSubTab === 'COURSES' ? 'var(--primary)' : 'transparent',
                color: courseSubTab === 'COURSES' ? '#fff' : 'var(--text-muted)',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              📚 Courses Manager
            </button>
            <button 
              onClick={() => setCourseSubTab('BATCHES')}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                background: courseSubTab === 'BATCHES' ? 'var(--primary)' : 'transparent',
                color: courseSubTab === 'BATCHES' ? '#fff' : 'var(--text-muted)',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              👥 Batch Manager
            </button>
            <button 
              onClick={() => setCourseSubTab('TIMETABLE')}
              style={{
                padding: '0.35rem 0.75rem',
                border: 'none',
                background: courseSubTab === 'TIMETABLE' ? 'var(--primary)' : 'transparent',
                color: courseSubTab === 'TIMETABLE' ? '#fff' : 'var(--text-muted)',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              📅 Timetable & Timings
            </button>
          </div>

          {courseSubTab === 'COURSES' && (
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', fontWeight: 800 }}>Course Directory</h2>
              <form onSubmit={handleCreateCourse} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <input type="text" required placeholder="Course Name" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', flex: '1 1 200px', minWidth: 0 }} />
                <button type="submit" className="btn-primary" disabled={isAddingCourse} style={{ padding: '0.75rem 1.5rem', borderRadius: '8px', fontSize: '0.9rem', flex: '1 1 auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{isAddingCourse ? '...' : 'Add Course'}</button>
              </form>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {courses.map(course => (
                  <div key={course.id} style={{ display: 'flex', flexDirection: 'column', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)', gap: '0.5rem' }}>
                    {editingCourseId === course.id ? (
                      <form onSubmit={handleSaveCourse} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div className="input-group">
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Course Name</label>
                          <input 
                            type="text" 
                            required 
                            value={editingCourseName} 
                            onChange={e => setEditingCourseName(e.target.value)} 
                            style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', width: '100%' }} 
                          />
                        </div>
                        <div className="input-group">
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Description</label>
                          <input 
                            type="text" 
                            placeholder="Description (optional)" 
                            value={editingCourseDesc} 
                            onChange={e => setEditingCourseDesc(e.target.value)} 
                            style={{ padding: '0.6rem', borderRadius: '6px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', width: '100%' }} 
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button type="button" onClick={() => setEditingCourseId(null)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem' }}>Cancel</button>
                          <button type="submit" className="btn-primary" disabled={isSavingCourse} style={{ padding: '6px 12px', fontSize: '0.75rem' }}>
                            {isSavingCourse ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 'bold', display: 'block', fontSize: '1.05rem' }}>{course.name}</span>
                          {course.description && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>{course.description}</span>}
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.4rem', fontWeight: 600 }}>Batches: {course._count?.batches || 0}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button 
                            onClick={() => {
                              setEditingCourseId(course.id);
                              setEditingCourseName(course.name);
                              setEditingCourseDesc(course.description || '');
                            }} 
                            style={{ padding: '6px 10px', background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            ✎ Edit
                          </button>
                          <button 
                            onClick={() => handleDeleteCourse(course.id, course.name)} 
                            style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          {courseSubTab === 'BATCHES' && (
            <>
              {/* Batches Header with Toggle Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>Active Course Batches</h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>Configure batch structures, assign faculty, and verify class schedules</p>
                </div>
                <button 
                  onClick={() => setShowCreateBatchForm(!showCreateBatchForm)}
                  className="btn-primary"
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '12px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: showCreateBatchForm ? 'var(--primary)' : 'var(--secondary)'
                  }}
                >
                  {showCreateBatchForm ? '✕ Close Form' : '➕ Create New Batch'}
                </button>
              </div>

              {showCreateBatchForm && (
                <div className="glass-card animate-scale-up" style={{ padding: '2rem' }}>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Create New Batch</h2>
                  <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div className="input-group">
                        <label>Batch Name</label>
                        <input type="text" required placeholder="e.g. Morning 2026" value={newBatchName} onChange={e => setNewBatchName(e.target.value)} />
                      </div>
                      <div className="input-group">
                        <label>Course / Program</label>
                        <select required value={newBatchCourseId} onChange={e => setNewBatchCourseId(e.target.value)}>
                          <option value="">Select Course...</option>
                          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div className="input-group">
                        <label>Class / Grade</label>
                        <select value={newBatchClassName} onChange={e => setNewBatchClassName(e.target.value)}>
                          <option value="">Select Class...</option>
                          {["6th", "7th", "8th", "9th", "10th", "11th Sci", "11th Com", "12th Sci", "12th Com"].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                      <div className="input-group">
                        <label>Subjects (Select all that apply)</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          {["Physics", "Chemistry", "Mathematics", "Biology", "English", "Hindi", "Social Studies", "Accountancy", "Business Studies", "Economics"].map(s => (
                            <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer' }}>
                              <input 
                                type="checkbox" 
                                checked={newBatchSubjects.split(',').includes(s)}
                                onChange={e => {
                                  const arr = newBatchSubjects ? newBatchSubjects.split(',').filter(Boolean) : [];
                                  if (e.target.checked) setNewBatchSubjects([...arr, s].join(','));
                                  else setNewBatchSubjects(arr.filter(x => x !== s).join(','));
                                }}
                              />
                              {s}
                            </label>
                          ))}
                          <input 
                            type="text" 
                            placeholder="+ Other" 
                            style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', background: 'transparent', border: '1px dashed var(--border)' }}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const val = (e.target as any).value.trim();
                                if (val) {
                                  setNewBatchSubjects(prev => prev ? `${prev},${val}` : val);
                                  (e.target as any).value = '';
                                }
                              }
                            }}
                          />
                        </div>
                      </div>
                      <div className="input-group">
                        <label>Monthly Fee (₹)</label>
                        <input type="number" placeholder="e.g. 1500" value={newBatchDefaultFee} onChange={e => setNewBatchDefaultFee(e.target.value)} />
                      </div>
                    </div>
                    
                    <div className="input-group">
                      <label>Assign Teachers (Search & Select)</label>
                      <input 
                        type="text" 
                        placeholder="🔍 Search teacher name..." 
                        style={{ marginBottom: '0.5rem', padding: '0.6rem', fontSize: '0.85rem' }} 
                        onChange={e => {
                          const q = e.target.value.toLowerCase();
                          const els = document.querySelectorAll('.teacher-item');
                          els.forEach((el: any) => {
                            el.style.display = el.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
                          });
                        }}
                      />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)', maxHeight: '150px', overflowY: 'auto' }}>
                        {allTeachers.map(t => (
                          <label key={t.id} className="teacher-item" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              value={t.username} 
                              checked={newBatchTeacherUsername.includes(t.username)}
                              onChange={e => {
                                const val = e.target.value;
                                setNewBatchTeacherUsername(prev => {
                                  const arr = prev ? prev.split(',') : [];
                                  if (arr.includes(val)) return arr.filter(x => x !== val).join(',');
                                  return [...arr, val].join(',');
                                });
                              }}
                            />
                            {t.name}
                          </label>
                        ))}
                      </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={isAddingBatch}>
                      {isAddingBatch ? 'Creating...' : 'Create Batch & Finalize'}
                    </button>
                  </form>
                </div>
              )}

              <div className="glass-card" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Active Batches</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {batches.map(batch => (
                    <div key={batch.id} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '18px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{batch.name}</span>
                          <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: 'var(--primary)', borderRadius: '6px', fontWeight: 700 }}>{batch.className || 'NO CLASS'}</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{batch.course?.name}</span> • {batch.subjects || 'All Subjects'}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          <span title="Enrolled Students">👥 <strong>{batch._count?.students || 0}</strong> Students</span>
                          <span title="Assigned Teachers">👨‍🏫 <strong>{batch.teachers?.length || 0}</strong> Teachers</span>
                          <span title="Weekly Schedule">🗓️ <strong>{batch.schedules?.length || 0}</strong> Slots/Week</span>
                          <span title="Default Batch Fee">💰 <strong>₹{batch.defaultFee || 0}</strong>/mo</span>
                        </div>
                        {batch.teachers && batch.teachers.length > 0 && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem', wordBreak: 'break-word' }}>
                            Assigned Instructors: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{batch.teachers.map((t: any) => t.name).join(', ')}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button 
                          onClick={() => setBatchMsgTarget({ id: batch.id, name: batch.name })}
                          className="btn-primary"
                          style={{ padding: '0.55rem 1rem', borderRadius: '12px', background: 'linear-gradient(135deg, var(--secondary), var(--accent))', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                        >
                          💬 Message Batch
                        </button>
                        <button 
                          onClick={() => { setEditingBatch(batch); setShowBatchEditModal(true); }}
                          className="btn-secondary"
                          style={{ padding: '0.55rem 1rem', borderRadius: '12px' }}
                        >
                          Manage & Timings
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {courseSubTab === 'TIMETABLE' && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 800, color: 'var(--text)' }}>📅 Master Timetable & Timings</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>Real-time weekly timetable view across all classes and subjects.</p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day, dayIdx) => {
                  const dayNum = dayIdx + 1;
                  const slots = batches.flatMap(b => (b.schedules || []).map((s: any) => ({ ...s, batchName: b.name, courseName: b.course?.name }))).filter(s => parseInt(s.dayOfWeek) === dayNum);
                  
                  return (
                    <div key={day} style={{ display: 'grid', gridTemplateColumns: '150px 1fr', gap: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>{day}</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                        {slots.length === 0 ? (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic', display: 'flex', alignItems: 'center' }}>No lecture slots scheduled.</span>
                        ) : (
                          slots.map(slot => (
                            <div key={slot.id} style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderRadius: '14px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '0.4rem', minWidth: '180px' }}>
                              <span style={{ fontWeight: 800, color: '#fff', fontSize: '0.9rem' }}>⏱️ {slot.startTime} - {slot.endTime}</span>
                              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>{slot.batchName}</span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>📚 {slot.subject || 'All Subjects'}</span>
                              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📍 Room: {slot.room || 'TBA'}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      )}

      {(activeTab === 'analytics' || (activeTab === 'academics' && academicSubTab === 'analytics')) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '1.5rem' }}>
            
            {/* Revenue Trend Chart (Responsive CSS Bar Chart) */}
            <div className="glass-card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
               <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 📈 Revenue Trends (6 Months)
               </h3>
               {isReportsLoading ? <div className="spinner"></div> : (
                 <div style={{ overflowX: 'auto', width: '100%', paddingBottom: '0.5rem' }}>
                   <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '180px', minWidth: '260px', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                      {reportData?.revenueTrend.map((d, i) => {
                        const max = Math.max(...reportData.revenueTrend.map(x => x.amount), 1);
                        const height = Math.max(10, (d.amount / max) * 100);
                        return (
                          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '36px', gap: '0.4rem', flexShrink: 0 }}>
                             <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700 }}>₹{d.amount > 1000 ? (d.amount/1000).toFixed(1)+'k' : d.amount}</div>
                             <div style={{ width: '100%', height: `${height}%`, background: 'linear-gradient(to top, #ef4444, #3b82f6)', borderRadius: '4px 4px 0 0', transition: 'height 1s ease-out' }}></div>
                             <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)' }}>{d.name}</div>
                          </div>
                        );
                      })}
                   </div>
                 </div>
               )}
            </div>

            {/* Enrollment by Course */}
            <div className="glass-card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
               <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                 🎓 Enrolled Students by Course
               </h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', overflowX: 'auto' }}>
                  {reportData?.enrollmentData.map((d, i) => (
                    <div key={i} style={{ minWidth: '220px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 700 }}>{d.name}</span>
                        <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{d.students} Enrolled</span>
                      </div>
                      <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min((d.students / 50) * 100, 100)}%`, background: 'linear-gradient(90deg, #10b981, #3b82f6)', borderRadius: '4px' }}></div>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Attendance Rate Dial */}
            <div className="glass-card" style={{ padding: '1.5rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
               <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>⏱️ Global Attendance Rate</h3>
               <div style={{ position: 'relative', width: '130px', height: '130px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray="264" strokeDashoffset={264 - (264 * (reportData?.attendanceRate || 0)) / 100} style={{ transition: 'stroke-dashoffset 2s ease-out' }} />
                  </svg>
                  <div style={{ position: 'absolute', fontSize: '1.5rem', fontWeight: 800 }}>{(reportData?.attendanceRate || 0).toFixed(1)}%</div>
               </div>
               <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.75rem 0 0 0' }}>Average presence across all active batches.</p>
            </div>

          </div>

          {/* 💡 Smart Academic Insights & Benchmark Analytics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: '1.5rem' }}>
            
            {/* Subject Mastery & Strengths */}
            <div className="glass-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🧪 Subject Performance & Difficulty Matrix
                </h3>
                <span style={{ fontSize: '0.7rem', padding: '4px 8px', borderRadius: '6px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 700 }}>AI Benchmark</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                Subject-wise average test score efficiency based on recent examination logs:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[
                  { subject: 'Mathematics', avgScore: 82, tag: '⚡ Strong', color: '#10b981' },
                  { subject: 'Physics', avgScore: 74, tag: '🎯 Focus Needed', color: '#f59e0b' },
                  { subject: 'Chemistry', avgScore: 68, tag: '🎯 Focus Needed', color: '#ef4444' },
                  { subject: 'Biology / Science', avgScore: 88, tag: '🌟 Outstanding', color: '#8b5cf6' }
                ].map((s, idx) => (
                  <div key={idx}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.35rem' }}>
                      <span style={{ fontWeight: 700 }}>{s.subject}</span>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: s.color }}>{s.tag}</span>
                        <strong style={{ color: 'var(--text)' }}>{s.avgScore}%</strong>
                      </div>
                    </div>
                    <div style={{ height: '7px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${s.avgScore}%`, background: s.color, borderRadius: '4px' }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Student Percentile & Test Completion Index */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  🎯 Student Score Distribution & Submission Index
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                  Comparative breakdown of student performance percentiles:
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: '#10b981' }}>Top Achievers (90%+ Score)</span>
                      <strong>28% of Students</strong>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '28%', background: '#10b981' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: '#3b82f6' }}>Satisfactory (75% - 89% Score)</span>
                      <strong>52% of Students</strong>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '52%', background: '#3b82f6' }}></div>
                    </div>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 600, color: '#ef4444' }}>Academic Support Needed (&lt; 75%)</span>
                      <strong>20% of Students</strong>
                    </div>
                    <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '20%', background: '#ef4444' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Test Submission Promptness</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>94.2% On-Time</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Avg Mock Test Score</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>78.5 / 100</div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {(activeTab === 'attendance' || (activeTab === 'academics' && academicSubTab === 'attendance')) && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }} className="animate-scale-up">
            <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
               <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 700, color: '#ef4444' }}>✏️ Attendance Control</h3>
               
               <div className="input-group">
                 <label style={{ fontWeight: 600 }}>Select Batch</label>
                 <select 
                   value={attBatchId} 
                   onChange={e => {
                     setAttBatchId(e.target.value);
                     fetchAttendance(e.target.value, attDate);
                   }} 
                   style={{ padding: '0.85rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%' }}
                 >
                   <option value="">Select Batch...</option>
                   {batches.map(b => <option key={b.id} value={b.id}>{b.name} ({b.course?.name})</option>)}
                 </select>
               </div>

               <div className="input-group" style={{ marginTop: '1rem' }}>
                 <label style={{ fontWeight: 600 }}>Select Date</label>
                 <input 
                   type="date" 
                   value={attDate} 
                   onChange={e => {
                     setAttDate(e.target.value);
                     fetchAttendance(attBatchId, e.target.value);
                   }} 
                   style={{ padding: '0.85rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%' }} 
                 />
               </div>

               <button 
                 className="btn-primary" 
                 onClick={handleSaveAttendance} 
                 disabled={isSavingAtt || !attBatchId || attStudents.length === 0}
                 style={{ width: '100%', background: '#10b981', marginTop: '1.5rem', border: 'none' }}
               >
                 {isSavingAtt ? 'Saving...' : '💾 Save Attendance'}
               </button>
            </div>

            <div className="glass-card" style={{ padding: '2rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                 <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700 }}>Student Roll Call</h3>
                 <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button onClick={() => markAll('PRESENT')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>Mark All Present</button>
                    <button onClick={() => markAll('ABSENT')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '6px 12px', color: '#ef4444', borderColor: '#ef4444' }}>Mark All Absent</button>
                 </div>
               </div>

               {!attBatchId ? (
                 <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Please select a batch from the sidebar control panel.
                 </div>
               ) : attStudents.length === 0 ? (
                 <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No students currently enrolled in this batch.
                 </div>
               ) : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {attStudents.map(s => {
                      const status = attRecords[s.id] || 'PRESENT';
                      return (
                        <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '1rem' }}>
                           <div>
                              <div style={{ fontWeight: 600 }}>{s.name}</div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.username}</div>
                           </div>
                           
                           <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {['PRESENT', 'ABSENT', 'LATE'].map(st => (
                                <button 
                                  key={st}
                                  onClick={() => setAttRecords(prev => ({ ...prev, [s.id]: st }))}
                                  style={{ 
                                    padding: '6px 12px', 
                                    fontSize: '0.75rem', 
                                    borderRadius: '6px', 
                                    border: '1px solid',
                                    cursor: 'pointer',
                                    background: status === st ? (st === 'PRESENT' ? '#10b981' : st === 'ABSENT' ? '#ef4444' : '#f59e0b') : 'transparent',
                                    borderColor: status === st ? (st === 'PRESENT' ? '#10b981' : st === 'ABSENT' ? '#ef4444' : '#f59e0b') : 'var(--border)',
                                    color: status === st ? '#fff' : 'var(--text-muted)',
                                    fontWeight: 700
                                  }}
                                >
                                  {st}
                                </button>
                              ))}
                           </div>
                        </div>
                      );
                    })}
                 </div>
               )}
            </div>
        </div>
      )}

      {(activeTab === 'materials' || (activeTab === 'academics' && academicSubTab === 'materials')) && (
        <div className="animate-scale-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Study Materials Control Header */}
          <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <button 
              onClick={() => { setShowPublishMaterialForm(!showPublishMaterialForm); setShowUploadedMaterials(false); }}
              className="btn-primary"
              style={{
                padding: '0.85rem 1.5rem',
                borderRadius: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: showPublishMaterialForm ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                border: showPublishMaterialForm ? 'none' : '1px solid var(--border)',
                color: showPublishMaterialForm ? 'white' : 'var(--text)'
              }}
            >
              ➕ Publish Study Material
            </button>
            <button 
              onClick={() => { setShowUploadedMaterials(!showUploadedMaterials); setShowPublishMaterialForm(false); }}
              className="btn-primary"
              style={{
                padding: '0.85rem 1.5rem',
                borderRadius: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: showUploadedMaterials ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                border: showUploadedMaterials ? 'none' : '1px solid var(--border)',
                color: showUploadedMaterials ? 'white' : 'var(--text)'
              }}
            >
              📚 View Uploaded Materials
            </button>
          </div>

          {showUploadedMaterials && (
            <div className="glass-card animate-scale-up" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 700 }}>📚 Uploaded Materials</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {materials.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No study materials published yet.</p>
                ) : (
                  materials.map(mat => (
                    <div key={mat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.65rem', 
                            padding: '2px 6px', 
                            borderRadius: '4px', 
                            fontWeight: 800, 
                            color: '#fff',
                            background: mat.type === 'PDF' ? '#ef4444' : 
                                        mat.type === 'VIDEO' ? '#8b5cf6' : 
                                        mat.type === 'WORD' ? '#3b82f6' : 
                                        mat.type === 'IMAGE' ? '#10b981' : '#3b82f6'
                          }}>
                            {mat.type === 'PDF' ? '📄 PDF' : 
                             mat.type === 'VIDEO' ? '🎥 VIDEO' : 
                             mat.type === 'WORD' ? '📝 WORD' : 
                             mat.type === 'IMAGE' ? '🖼️ IMAGE' : '🔗 LINK'}
                          </span>
                          {mat.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Course: {mat.course?.name} • Published by: {mat.teacher?.name || 'Admin'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => handleOpenMaterial(mat)} style={{ padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Open File</button>
                        <button onClick={() => handleDeleteMaterial(mat.id)} style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {showPublishMaterialForm && (
            <div className="glass-card animate-scale-up" style={{ padding: '2rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 700, color: '#ef4444' }}>Publish Study Material</h3>
              <form onSubmit={handleUploadMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>Title / Description</label>
                  <input type="text" required placeholder="e.g. Physics Chapter 1 Notes" value={matTitle} onChange={e => setMatTitle(e.target.value)} />
                </div>

                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>Material Type</label>
                  <select value={matType} onChange={e => setMatType(e.target.value)} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <option value="PDF">PDF Document</option>
                    <option value="VIDEO">Video File / Clip</option>
                    <option value="WORD">Word Document (DOCX)</option>
                    <option value="IMAGE">Reference Image / Diagram</option>
                    <option value="LINK">External Web Link</option>
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>Course Category</label>
                  <select required value={matCourseId} onChange={e => setMatCourseId(e.target.value)} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <option value="">Select a Course...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', background: 'var(--input-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setUploadMode('FILE')}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                      background: uploadMode === 'FILE' ? '#ef4444' : 'transparent',
                      color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: '0.2s'
                    }}
                  >
                    📂 Local File
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadMode('URL')}
                    style={{
                      flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                      background: uploadMode === 'URL' ? '#ef4444' : 'transparent',
                      color: 'white', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: '0.2s'
                    }}
                  >
                    🔗 Paste URL
                  </button>
                </div>

                {uploadMode === 'FILE' ? (
                  <div style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    background: 'rgba(255,255,255,0.01)',
                    transition: '0.2s',
                  }}>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov,.avi"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>📤</div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>
                      {selectedFileName ? 'Change Selected File' : 'Drag & Drop or Click to Select'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      PDF, DOC, DOCX, PNG, JPG, MP4, etc.
                    </div>
                    {selectedFileName && (
                      <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(239,68,68,0.08)', border: '1px solid #ef4444', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedFileName}
                        </span>
                        <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                          Size: {selectedFileSize}
                        </span>
                        {filePreview && (
                          <img src={filePreview} alt="Preview" style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '8px', margin: '4px auto 0', border: '1px solid var(--border)' }} />
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="input-group">
                    <label style={{ fontWeight: 600 }}>File URL / External Link</label>
                    <input type="text" required placeholder="https://..." value={matUrl} onChange={e => setMatUrl(e.target.value)} />
                  </div>
                )}

                <button type="submit" className="btn-primary" disabled={isUploading} style={{ background: '#10b981', border: 'none', marginTop: '0.5rem' }}>
                  {isUploading ? 'Publishing...' : '🚀 Publish Material'}
                </button>
              </form>
            </div>
          )}

          {!showUploadedMaterials && !showPublishMaterialForm && (
            <div className="glass-card animate-fade-in" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1.25rem' }}>📚</div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>Study Materials Manager</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', maxWidth: '500px', margin: '0.5rem auto 0', lineHeight: 1.5 }}>
                Select an option above to browse the active syllabus library, view uploaded documents, or publish new learning sheets for courses.
              </p>
            </div>
          )}
        </div>
      )}

      {(activeTab === 'tests' || (activeTab === 'academics' && academicSubTab === 'tests')) && (
        <div className="animate-scale-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Button bar to toggle between Scheduled Tests and Schedule New Test */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <button 
              onClick={() => setShowCreateTestForm(false)}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: !showCreateTestForm ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: !showCreateTestForm ? '#fff' : 'var(--text-muted)',
                border: !showCreateTestForm ? 'none' : '1px solid var(--border)',
                transition: 'all 0.2s'
              }}
            >
              📋 Scheduled Tests
            </button>
            <button 
              onClick={() => setShowCreateTestForm(true)}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '10px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: showCreateTestForm ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                color: showCreateTestForm ? '#fff' : 'var(--text-muted)',
                border: showCreateTestForm ? 'none' : '1px solid var(--border)',
                transition: 'all 0.2s'
              }}
            >
              ➕ Schedule New Test
            </button>
          </div>

          {!showCreateTestForm ? (
            /* Tests List */
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>📝 Scheduled Tests & Marks</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>View, record, or update student test scores.</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {tests.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No tests scheduled yet.</p>
                ) : (
                  tests.map(test => (
                    <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{test.title}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Course: <strong>{test.course?.name}</strong>{test.subject && <> • Subject: <strong>{test.subject}</strong></>} • Date: {formatDateDisplay(test.date)}
                        </div>
                        {(test.time || test.syllabus) && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            {test.time && <span>🕒 Time: <strong>{test.time}</strong></span>}
                            {test.syllabus && <span>📖 Syllabus: <strong>{test.syllabus}</strong></span>}
                          </div>
                        )}
                        <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '6px' }}>
                           Marks recorded: {test.results?.length || 0} students
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {test.isPublished ? (
                          <span style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', fontWeight: 600 }}>✅ Published</span>
                        ) : (
                          <button onClick={() => handlePublishResult(test.id)} style={{ padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Publish Result</button>
                        )}
                        <button onClick={() => handleEditTest(test)} className="btn-secondary" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                           Edit
                        </button>
                        <button onClick={() => handleEnterMarks(test)} className="btn-secondary" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                           Enter Marks →
                        </button>
                        <button onClick={() => handleDeleteTest(test.id)} style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Schedule New Test Form */
            <div className="glass-card animate-scale-up" style={{ padding: '2rem', height: 'fit-content', maxWidth: '600px' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>Schedule New Test</h3>
              <form onSubmit={handleCreateTest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>Test Title</label>
                  <input type="text" required placeholder="e.g. Unit 1 Exam" value={newTest.title} onChange={e => setNewTest({ ...newTest, title: e.target.value })} />
                </div>
                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>Subject</label>
                  <input type="text" required placeholder="e.g. Chemistry" value={newTest.subject} onChange={e => setNewTest({ ...newTest, subject: e.target.value })} />
                </div>
                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>Course Category</label>
                  <select required value={newTest.courseId} onChange={e => setNewTest({ ...newTest, courseId: e.target.value })} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                    <option value="">Select a Course...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>Test Date</label>
                  <input type="date" required value={newTest.date} onChange={e => setNewTest({ ...newTest, date: e.target.value })} />
                </div>
                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>Test Time / Duration (Optional)</label>
                  <input type="text" placeholder="e.g. 10:00 AM - 12:00 PM" value={newTest.time} onChange={e => setNewTest({ ...newTest, time: e.target.value })} />
                </div>
                <div className="input-group">
                  <label style={{ fontWeight: 600 }}>Syllabus (Optional)</label>
                  <textarea placeholder="e.g. Chapters 1 to 4, Laws of Motion" value={newTest.syllabus} onChange={e => setNewTest({ ...newTest, syllabus: e.target.value })} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px', minHeight: '60px', resize: 'vertical' }} />
                </div>
                <button type="submit" className="btn-primary" disabled={isCreatingTest} style={{ background: 'var(--primary)', border: 'none' }}>
                  {isCreatingTest ? 'Scheduling...' : '📝 Schedule Test'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {editingTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '600px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--primary)' }}>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>Edit Test Details</h3>
            <form onSubmit={handleUpdateTest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label style={{ fontWeight: 600 }}>Test Title</label>
                <input type="text" required value={editingTest.title} onChange={e => setEditingTest({ ...editingTest, title: e.target.value })} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }} />
              </div>
              <div className="input-group">
                <label style={{ fontWeight: 600 }}>Subject</label>
                <input type="text" required value={editingTest.subject} onChange={e => setEditingTest({ ...editingTest, subject: e.target.value })} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }} />
              </div>
              <div className="input-group">
                <label style={{ fontWeight: 600 }}>Course Category</label>
                <select required value={editingTest.courseId} onChange={e => setEditingTest({ ...editingTest, courseId: e.target.value })} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <option value="">Select a Course...</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label style={{ fontWeight: 600 }}>Test Date</label>
                <input type="date" required value={editingTest.date} onChange={e => setEditingTest({ ...editingTest, date: e.target.value })} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }} />
              </div>
              <div className="input-group">
                <label style={{ fontWeight: 600 }}>Test Time / Duration (Optional)</label>
                <input type="text" placeholder="e.g. 10:00 AM - 12:00 PM" value={editingTest.time} onChange={e => setEditingTest({ ...editingTest, time: e.target.value })} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }} />
              </div>
              <div className="input-group">
                <label style={{ fontWeight: 600 }}>Syllabus (Optional)</label>
                <textarea placeholder="e.g. Chapters 1 to 4" value={editingTest.syllabus} onChange={e => setEditingTest({ ...editingTest, syllabus: e.target.value })} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px', minHeight: '60px', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <input type="checkbox" id="editTestIsPublished" checked={editingTest.isPublished} onChange={e => setEditingTest({ ...editingTest, isPublished: e.target.checked })} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="editTestIsPublished" style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Publish Results (Visible to Students)</label>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setEditingTest(null)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ flex: 1, background: 'var(--primary)', border: 'none' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '850px', padding: '2rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column', border: '1px solid var(--primary)', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800 }}>Enter Student Marks: {selectedTest.title}</h2>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.8rem' }}>Course: {selectedTest.course?.name}</p>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const updated: any = { ...testMarks };
                    testStudents.forEach(s => {
                      const cur = updated[s.id] || { marks: '', totalMarks: '100', remarks: '' };
                      updated[s.id] = { ...cur, marks: cur.totalMarks || '100', remarks: 'Full Marks' };
                    });
                    setTestMarks(updated);
                  }}
                  style={{ padding: '6px 12px', background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '8px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  ⚡ Set All Full Marks
                </button>
              </div>
            </div>

            {/* Compact Student Marks Table with Sticky Header & Auto Scroll */}
            <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px', border: '1px solid var(--border)', borderRadius: '12px', marginBottom: '1.25rem', background: 'rgba(0,0,0,0.1)' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                <thead style={{ position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 10, borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 700 }}>Student Name</th>
                    <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 700, width: '130px' }}>Marks Obtained</th>
                    <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 700, width: '130px' }}>Total Marks</th>
                    <th style={{ padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 700 }}>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {testStudents.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No students found in this course.</td></tr>
                  ) : (
                    testStudents.map(s => {
                      const data = testMarks[s.id] || { marks: '', totalMarks: '100', remarks: '' };
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 14px', fontWeight: 600 }}>
                            <div 
                              onClick={() => setActiveProfileUserId(s.id)} 
                              style={{ color: 'var(--text)', cursor: 'pointer', textDecoration: 'underline decoration-dotted' }}
                              className="clickable-name"
                            >
                              {s.name}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.username}</div>
                          </td>
                          <td style={{ padding: '6px 14px' }}>
                            <input
                              type="number"
                              placeholder="Marks"
                              value={data.marks}
                              onChange={e => setTestMarks({ ...testMarks, [s.id]: { ...data, marks: e.target.value } })}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontWeight: 700 }}
                            />
                          </td>
                          <td style={{ padding: '6px 14px' }}>
                            <input
                              type="number"
                              placeholder="Total"
                              value={data.totalMarks}
                              onChange={e => setTestMarks({ ...testMarks, [s.id]: { ...data, totalMarks: e.target.value } })}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontWeight: 600 }}
                            />
                          </td>
                          <td style={{ padding: '6px 14px' }}>
                            <input
                              type="text"
                              placeholder="Remarks"
                              value={data.remarks}
                              onChange={e => setTestMarks({ ...testMarks, [s.id]: { ...data, remarks: e.target.value } })}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }}
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedTest(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: '#10b981', border: 'none' }} onClick={handleSaveMarks} disabled={isSavingMarks || testStudents.length === 0}>
                {isSavingMarks ? 'Saving...' : '💾 Save Marks'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'store-manager' && (
        <div className="fade-in">
          <AdminStoreManager />
        </div>
      )}

      {activeTab === 'guru-ai' && (
        <div 
          className="animate-scale-up" 
          style={{ 
            padding: '0', 
            display: 'flex', 
            flexDirection: 'column', 
            height: 'calc(100vh - 170px)', 
            minHeight: '480px', 
            background: 'var(--glass-bg)', 
            border: '1px solid var(--glass-border)', 
            borderRadius: '24px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: 'var(--shadow)',
            marginBottom: '2rem', 
            overflow: 'hidden' 
          }}
        >
          {/* Academic Assistant Header with Tab Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0.4rem 1rem', background: 'var(--surface-light)' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8px rgba(239, 68, 68, 0.4)', animation: 'pulse 2s infinite' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </div>
              <div className="mobile-hide">
                <h2 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#ef4444', margin: 0, whiteSpace: 'nowrap' }}>ST Guru ji</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.6rem', margin: '1px 0 0 0' }}>Digital Sahayak • Online</p>
              </div>
            </div>

            {/* Mode Switcher */}
            <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--input-bg)', padding: '3px', borderRadius: '20px', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => setAiMode('GURU')}
                style={{
                  padding: '5px 14px',
                  borderRadius: '16px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: aiMode === 'GURU' ? '#ef4444' : 'transparent',
                  color: aiMode === 'GURU' ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                💬 Solver
              </button>
              <button 
                onClick={() => setAiMode('PREPARE')}
                style={{
                  padding: '5px 14px',
                  borderRadius: '16px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: aiMode === 'PREPARE' ? '#ef4444' : 'transparent',
                  color: aiMode === 'PREPARE' ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                📚 Notes/PPT
              </button>
            </div>

            {aiMode === 'GURU' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <button 
                  onClick={() => {
                    fetchAdminGuruHistory();
                    setShowGuruHistoryPanel(prev => !prev);
                  }}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  📜 History
                </button>
                <button 
                  onClick={() => setAdminGuruHistory([])}
                  style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  🧹 Clear
                </button>
              </div>
            ) : (
              <div style={{ width: '40px' }} />
            )}
          </div>

          <style>{`
            @keyframes pulse {
              0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
              70% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(239, 68, 68, 0); }
              100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
            .chat-bubble {
              border-radius: 16px;
              padding: 0.6rem 0.85rem;
              max-width: 80%;
              line-height: 1.45;
              font-size: 0.88rem;
            }
            .chat-bubble pre {
              background: var(--surface-light);
              padding: 0.75rem;
              border-radius: 8px;
              overflow-x: auto;
              margin: 0.5rem 0;
              border: 1px solid var(--border);
              font-size: 0.82rem;
            }
            .chat-bubble code {
              font-family: monospace;
              background: var(--surface-light);
              padding: 2px 6px;
              border-radius: 4px;
              color: #ef4444;
              font-weight: 600;
            }
            .guru-card-text {
              font-size: 0.88rem;
              line-height: 1.45;
              color: var(--text);
            }
            .slide-btn {
              padding: 0.5rem 1rem;
              border-radius: 8px;
              border: 1px solid var(--border);
              background: var(--surface-light);
              color: var(--text);
              font-size: 0.8rem;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.2s;
              display: flex;
              alignItems: center;
              gap: 6px;
            }
            .slide-btn:hover {
              background: var(--input-bg);
              border-color: #ef4444;
            }
            .slide-tab-btn {
              padding: 6px 16px;
              border-radius: 20px;
              border: none;
              font-size: 0.8rem;
              font-weight: 700;
              cursor: pointer;
              transition: all 0.2s;
            }
            .slide-indicator-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: var(--border);
              transition: all 0.2s;
              cursor: pointer;
            }
            .slide-indicator-dot.active {
              background: #ef4444;
              transform: scale(1.3);
            }
            .diff-card-input {
              display: none;
            }
            .diff-card-label {
              flex: 1;
              padding: 0.85rem;
              border-radius: 12px;
              border: 1px solid var(--border);
              background: var(--surface-light);
              text-align: center;
              cursor: pointer;
              transition: all 0.2s;
              font-weight: 600;
              font-size: 0.85rem;
              color: var(--text-muted);
            }
            .diff-card-input:checked + .diff-card-label {
              border-color: #ef4444;
              background: rgba(239, 68, 68, 0.05);
              color: #ef4444;
              box-shadow: 0 0 10px rgba(239,68,68,0.1);
            }
            .slide-workspace-container {
              flex: 1;
              display: flex;
              padding: 1.5rem;
              gap: 1.5rem;
              overflow: hidden;
              position: relative;
            }
            .slide-main-canvas {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: 1rem;
              overflow: hidden;
            }
            .slide-aspect-ratio-box {
              flex: 1;
              background: linear-gradient(135deg, #1e1e24 0%, #121214 100%);
              border: 1px solid rgba(255,255,255,0.05);
              border-radius: 16px;
              padding: 2.5rem;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              box-shadow: inset 0 0 20px rgba(0,0,0,0.8);
              overflow-y: auto;
              position: relative;
            }
            .notes-container {
              flex: 1;
              overflow-y: auto;
              padding: 2rem;
              background: #f8f9fa;
            }
            .notes-paper {
              max-width: 800px;
              margin: 0 auto;
              background: #fff;
              border-radius: 16px;
              box-shadow: 0 4px 25px rgba(0,0,0,0.05);
              border: 1px solid #e2e8f0;
              padding: 3rem;
              color: #1e293b;
            }
            @media (max-width: 768px) {
              .slide-workspace-container {
                flex-direction: column;
                padding: 0.75rem;
                gap: 0.75rem;
                overflow-y: auto;
              }
              .slide-aspect-ratio-box {
                padding: 1.25rem;
                min-height: 320px;
              }
              .mobile-hide {
                display: none !important;
              }
              .slide-toolbar {
                flex-wrap: wrap;
                gap: 0.5rem;
                justify-content: center !important;
              }
              .notes-container {
                padding: 0.5rem;
              }
              .notes-paper {
                padding: 1.25rem;
                border-radius: 12px;
              }
              .chat-bubble {
                max-width: 95% !important;
                padding: 0.45rem 0.65rem !important;
                font-size: 0.82rem !important;
                line-height: 1.4 !important;
              }
              #admin-guru-chat-feed {
                padding: 0.5rem !important;
                gap: 0.5rem !important;
              }
              .guru-response-card {
                padding: 0.35rem 0.55rem !important;
                border-radius: 10px !important;
              }
              .guru-response-card h4 {
                font-size: 0.8rem !important;
                margin-bottom: 0.15rem !important;
              }
              .guru-card-text {
                font-size: 0.82rem !important;
                line-height: 1.4 !important;
              }
              .guru-input-bar {
                padding: 0.5rem 0.5rem !important;
              }
              .guru-input-container {
                gap: 0.35rem !important;
                padding: 0.25rem 0.35rem 0.25rem 0.6rem !important;
              }
              .guru-input-field {
                font-size: 0.82rem !important;
              }
              .guru-btn-circle {
                width: 28px !important;
                height: 28px !important;
                margin-right: 2px !important;
              }
              .guru-send-btn {
                width: 30px !important;
                height: 30px !important;
              }
              .guru-history-sidebar {
                width: 280px;
                border-left: 1px solid var(--border);
                background: var(--surface-light);
                display: flex;
                flex-direction: column;
                overflow: hidden;
                flex-shrink: 0;
              }
              .guru-history-sidebar {
                position: absolute !important;
                right: 0;
                top: 48px;
                bottom: 0;
                z-index: 10;
                width: 80% !important;
                border-left: 1px solid var(--border);
                box-shadow: var(--shadow-xl);
              }
            }
          `}</style>

          {/* 1. SOLVER MODE */}
          {aiMode === 'GURU' && (
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', flexDirection: 'row' }}>
              
              {/* Left Panel: Chat Feed & Input */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Message Feed */}
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} id="admin-guru-chat-feed">
                  {adminGuruHistory.length === 0 ? (
                    <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.6 }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem' }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Ask me your doubts</span>
                    </div>
                  ) : (
                    adminGuruHistory.map((msg, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.75rem', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                        {msg.role !== 'user' && (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.8rem' }}>🤖</span>
                          </div>
                        )}
                        <div 
                          className={msg.role === 'user' ? 'chat-bubble' : ''}
                          style={msg.role === 'user' ? { 
                            background: 'linear-gradient(135deg, #ef4444, #f59e0b)', 
                            border: 'none',
                            color: '#fff',
                            borderTopLeftRadius: '16px',
                            borderTopRightRadius: '4px',
                            boxShadow: 'var(--shadow-sm)',
                            borderRadius: '16px',
                            padding: '0.6rem 0.85rem',
                            maxWidth: '80%',
                            lineHeight: '1.45',
                            fontSize: '0.88rem'
                          } : {
                            background: 'none',
                            border: 'none',
                            color: 'var(--text)',
                            boxShadow: 'none',
                            padding: '0',
                            maxWidth: '85%',
                            width: '100%',
                            fontSize: '0.88rem'
                          }}
                        >
                          <div>
                            {msg.role === 'guru' ? (
                              formatAdminGuruResponse(msg.content, msg.revealedSteps || 1, i, (msg as any).isNew)
                            ) : (
                              <div>
                                {msg.file && (
                                  msg.file.startsWith('data:application/pdf') ? (
                                    <div style={{ 
                                      display: 'flex', alignItems: 'center', gap: '0.5rem', 
                                      background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', 
                                      padding: '0.65rem 0.85rem', borderRadius: '12px', marginBottom: '0.5rem',
                                      color: '#fff', fontSize: '0.85rem', fontWeight: 600
                                    }}>
                                      <span style={{ fontSize: '1.25rem' }}>📄</span>
                                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                                        {msg.fileName || 'Document.pdf'}
                                      </span>
                                    </div>
                                  ) : (
                                    <img 
                                      src={msg.file} 
                                      alt="Uploaded Doubt" 
                                      style={{ 
                                        maxWidth: '100%', 
                                        maxHeight: '200px', 
                                        borderRadius: '12px', 
                                        marginBottom: '0.5rem', 
                                        display: 'block',
                                        border: '1px solid rgba(255,255,255,0.2)' 
                                      }} 
                                    />
                                  )
                                )}
                                <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>
                              </div>
                            )}
                          </div>
                        </div>
                        {msg.role === 'user' && (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                            A
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  
                  {adminGuruLoading && (
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start', alignItems: 'center' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.8rem' }}>🤖</span>
                      </div>
                      <div className="chat-bubble" style={{ background: 'var(--surface-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid #f3f3f3', borderTop: '2px solid #ef4444', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Chat Input Bar */}
                <div className="guru-input-bar" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface-light)' }}>
                  <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
                    {adminGuruFile && (
                      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem', marginLeft: '0.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                        {adminGuruFile.startsWith('data:application/pdf') ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 2rem 0.75rem 1rem', borderRadius: '12px', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                            <span style={{ fontSize: '1.25rem' }}>📄</span>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                              {adminGuruFileName || 'Document.pdf'}
                            </span>
                          </div>
                        ) : (
                          <img src={adminGuruFile} alt="Doubt Preview" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                        )}
                        <button 
                          onClick={() => {
                            setAdminGuruFile(null);
                            setAdminGuruFileName('');
                          }}
                          style={{ 
                            position: 'absolute', top: '4px', right: '4px', 
                            background: 'rgba(239, 68, 68, 0.85)', color: '#fff', 
                            border: 'none', width: '20px', height: '20px', borderRadius: '50%', 
                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                            cursor: 'pointer', fontSize: '10px', fontWeight: 'bold', zIndex: 10
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    )}
                    <div className="guru-input-container" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '28px', padding: '0.65rem 0.8rem 0.65rem 1.1rem' }}>
                      
                      {/* Attachment Picker */}
                      <label 
                        className="attachment-btn guru-btn-circle"
                        style={{ 
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          width: '36px', height: '36px', borderRadius: '50%', 
                          background: 'var(--surface-light)', border: '1px solid var(--border)', 
                          transition: 'all 0.2s', marginRight: '4px'
                        }}
                        title="Upload Doubt Image or PDF"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                        </svg>
                        <input 
                          type="file" 
                          accept="image/*,application/pdf" 
                          onChange={handleAdminGuruFileChange} 
                          style={{ display: 'none' }} 
                        />
                      </label>

                      {/* Voice Record Button */}
                      <button 
                        onClick={adminIsRecording ? stopAdminVoiceRecording : startAdminVoiceRecording}
                        disabled={adminGuruLoading || adminIsTranscribing}
                        className="attachment-btn guru-btn-circle"
                        style={{ 
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          width: '36px', height: '36px', borderRadius: '50%', 
                          background: adminIsRecording ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-light)', 
                          border: adminIsRecording ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)', 
                          transition: 'all 0.2s', marginRight: '4px',
                          color: adminIsRecording ? '#ef4444' : 'var(--text-muted)',
                          animation: adminIsRecording ? 'pulse 1.5s infinite' : 'none'
                        }}
                        title={adminIsRecording ? "Stop Recording" : "Voice Doubt Query"}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                          <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                          <line x1="12" y1="19" x2="12" y2="22"/>
                        </svg>
                      </button>

                      <input 
                        type="text"
                        className="guru-input-field"
                        placeholder={adminIsTranscribing ? "🎙️ Transcribing voice query..." : adminIsRecording ? "🎙️ Recording... click Mic to stop" : "Ask ST Guru ji a question, upload a PDF/Photo..."} 
                        value={adminGuruQuestion}
                        onChange={(e) => setAdminGuruQuestion(e.target.value)}
                        disabled={adminIsTranscribing || adminIsRecording}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !adminGuruLoading && (adminGuruQuestion.trim() || adminGuruFile)) {
                            askAdminGuru();
                          }
                        }}
                        style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', color: adminIsRecording ? '#ef4444' : 'var(--text)', fontSize: '0.96rem', padding: '0.55rem 0', fontStyle: adminIsRecording || adminIsTranscribing ? 'italic' : 'normal' }}
                      />
                      <button 
                        onClick={askAdminGuru}
                        disabled={adminGuruLoading || (!adminGuruQuestion.trim() && !adminGuruFile) || adminIsRecording || adminIsTranscribing}
                        className="guru-send-btn"
                        style={{ 
                          width: '40px', height: '40px', borderRadius: '50%', 
                          background: (adminGuruQuestion.trim() || adminGuruFile) ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'var(--border)', 
                          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          cursor: adminGuruLoading || (!adminGuruQuestion.trim() && !adminGuruFile) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: (adminGuruQuestion.trim() || adminGuruFile) ? '0 2px 8px rgba(239,68,68,0.3)' : 'none'
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"></line>
                          <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* History Panel Sidebar */}
              {showGuruHistoryPanel && (
                <div className="guru-history-sidebar animate-fade-in">
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.05)' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)' }}>📜 Doubt History</span>
                    <button 
                      onClick={() => setShowGuruHistoryPanel(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
                    {dbHistoryList.length === 0 ? (
                      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        No solved doubts in history yet.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {dbHistoryList.map((doubt: any) => (
                          <div 
                            key={doubt.id}
                            style={{ 
                              padding: '0.6rem', 
                              borderRadius: '10px', 
                              background: 'var(--input-bg)', 
                              border: '1px solid var(--border)', 
                              cursor: 'pointer', 
                              position: 'relative',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '0.25rem'
                            }}
                            onClick={() => {
                              setAdminGuruHistory([
                                { role: 'user', content: doubt.question, subject: doubt.subject || undefined, image: doubt.imageUrl || undefined },
                                { role: 'guru', content: doubt.answer }
                              ]);
                              if (window.innerWidth <= 768) {
                                setShowGuruHistoryPanel(false);
                              }
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#ef4444'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.65rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>
                                {doubt.subject || 'General'}
                              </span>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this doubt from history?')) {
                                    try {
                                      const res = await fetch(`/api/student/guru-ji/history?id=${doubt.id}`, { method: 'DELETE' });
                                      if (res.ok) {
                                        fetchAdminGuruHistory();
                                      } else {
                                        alert('Failed to delete history item.');
                                      }
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }
                                }}
                                style={{ 
                                  background: 'none', border: 'none', color: 'var(--text-muted)', 
                                  cursor: 'pointer', padding: '2px', fontSize: '0.75rem', 
                                  borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' 
                                }}
                                onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                                title="Delete history item"
                              >
                                🗑️
                              </button>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3 }}>
                              {doubt.question}
                            </p>
                            <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>
                              {new Date(doubt.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 2. PREPARE / PPT MODE */}
          {aiMode === 'PREPARE' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--surface-dark)' }}>
              
              {/* Not Generated Form */}
              {!generatedPpt && !pptGenerating && (
                <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '2.5rem' }}>📚</span>
                    <h3 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>Lesson Notes & Slides Generator</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Create highly structured, professional slide presentations and exam worksheets in seconds.</p>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'var(--surface-light)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>LECTURE TOPIC</label>
                      <input 
                        type="text"
                        placeholder="e.g. Laws of Motion, Quadratic Equations, Photosynthesis..."
                        value={pptTopic}
                        onChange={(e) => setPptTopic(e.target.value)}
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: '0.9rem', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>TARGET GRADE</label>
                        <select 
                          value={pptGrade}
                          onChange={(e) => setPptGrade(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: '0.88rem' }}
                        >
                          <option value="Class 6">Class 6</option>
                          <option value="Class 7">Class 7</option>
                          <option value="Class 8">Class 8</option>
                          <option value="Class 9">Class 9</option>
                          <option value="Class 10">Class 10</option>
                          <option value="Class 11">Class 11</option>
                          <option value="Class 12">Class 12</option>
                          <option value="JEE / NEET Prep">JEE / NEET Prep</option>
                        </select>
                      </div>

                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>LECTURE DURATION</label>
                        <select 
                          value={pptDuration}
                          onChange={(e) => setPptDuration(e.target.value)}
                          style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: '0.88rem' }}
                        >
                          <option value="30">30 Minutes (Short revision)</option>
                          <option value="45">45 Minutes (Standard class)</option>
                          <option value="60">60 Minutes (Deep study)</option>
                          <option value="90">90 Minutes (Marathon/Worksheet)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>DIFFICULTY LEVEL</label>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, display: 'flex' }}>
                          <input 
                            type="radio" 
                            id="diff-easy" 
                            name="difficulty" 
                            value="Beginner" 
                            className="diff-card-input" 
                            checked={pptDifficulty === 'Beginner'}
                            onChange={() => setPptDifficulty('Beginner')}
                          />
                          <label htmlFor="diff-easy" className="diff-card-label">Beginner</label>
                        </div>
                        <div style={{ flex: 1, display: 'flex' }}>
                          <input 
                            type="radio" 
                            id="diff-med" 
                            name="difficulty" 
                            value="Intermediate" 
                            className="diff-card-input"
                            checked={pptDifficulty === 'Intermediate'}
                            onChange={() => setPptDifficulty('Intermediate')}
                          />
                          <label htmlFor="diff-med" className="diff-card-label">Intermediate</label>
                        </div>
                        <div style={{ flex: 1, display: 'flex' }}>
                          <input 
                            type="radio" 
                            id="diff-hard" 
                            name="difficulty" 
                            value="Advanced" 
                            className="diff-card-input"
                            checked={pptDifficulty === 'Advanced'}
                            onChange={() => setPptDifficulty('Advanced')}
                          />
                          <label htmlFor="diff-hard" className="diff-card-label">Advanced</label>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text)' }}>ADDITIONAL SLIDES FOCUS & STRUCTURE</label>
                      <textarea 
                        rows={3}
                        value={pptFocus}
                        onChange={(e) => setPptFocus(e.target.value)}
                        placeholder="Specify special requirements, equations, derivations, or target exams..."
                        style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', outline: 'none', fontSize: '0.88rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                      />
                    </div>

                    <button 
                      onClick={generateLessonPPT}
                      disabled={!pptTopic.trim()}
                      style={{
                        padding: '0.9rem',
                        borderRadius: '12px',
                        border: 'none',
                        background: pptTopic.trim() ? 'linear-gradient(135deg, #ef4444, #f59e0b)' : 'var(--border)',
                        color: '#fff',
                        fontWeight: '800',
                        fontSize: '0.95rem',
                        cursor: pptTopic.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        boxShadow: pptTopic.trim() ? '0 4px 15px rgba(239, 68, 68, 0.3)' : 'none',
                        marginTop: '0.5rem'
                      }}
                    >
                      ✨ Generate Premium Lesson PPT & Notes
                    </button>
                  </div>
                </div>
              )}

              {/* Generating Loading State */}
              {pptGenerating && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', color: '#fff', padding: '2rem' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                    <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '4px solid rgba(239,68,68,0.1)', borderTopColor: '#ef4444', animation: 'spin 1s linear infinite' }} />
                    <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '1.5rem' }}>🧙‍♂️</span>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 800 }}>Generating Presentation Slides...</h4>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.8rem', maxWidth: '300px', lineHeight: 1.5 }}>
                      ST Guru ji is parsing topic curriculum and structuring premium slide layouts. Please wait.
                    </p>
                  </div>
                </div>
              )}

              {/* Generated PPT Workspace */}
              {generatedPpt && !pptGenerating && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  
                  {/* Toolbar */}
                  <div className="slide-toolbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-light)' }}>
                    {/* View Selector */}
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--input-bg)', padding: '2px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                      <button 
                        onClick={() => { setPptViewMode('SLIDES'); setIsEditingSlide(false); }}
                        className="slide-tab-btn"
                        style={{
                          background: pptViewMode === 'SLIDES' ? '#ef4444' : 'transparent',
                          color: pptViewMode === 'SLIDES' ? '#fff' : 'var(--text-muted)'
                        }}
                      >
                        👁️ Slide Deck
                      </button>
                      <button 
                        onClick={() => { setPptViewMode('NOTES'); setIsEditingSlide(false); }}
                        className="slide-tab-btn"
                        style={{
                          background: pptViewMode === 'NOTES' ? '#ef4444' : 'transparent',
                          color: pptViewMode === 'NOTES' ? '#fff' : 'var(--text-muted)'
                        }}
                      >
                        📝 Study Notes
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {pptViewMode === 'SLIDES' && (
                        <button 
                          onClick={() => {
                            if (isEditingSlide) {
                              // Save edits
                              const updatedSlides = [...generatedPpt.slides];
                              updatedSlides[activeSlideIndex] = {
                                ...updatedSlides[activeSlideIndex],
                                title: editedSlideTitle,
                                subtitle: editedSlideSubtitle,
                                content: editedSlideContent
                              };
                              setGeneratedPpt({ ...generatedPpt, slides: updatedSlides });
                              setIsEditingSlide(false);
                            } else {
                              // Open editor
                              const s = generatedPpt.slides[activeSlideIndex];
                              setEditedSlideTitle(s.title || '');
                              setEditedSlideSubtitle(s.subtitle || '');
                              setEditedSlideContent(s.content || '');
                              setIsEditingSlide(true);
                            }
                          }}
                          className="slide-btn"
                          style={{ borderColor: isEditingSlide ? '#10b981' : 'var(--border)' }}
                        >
                          {isEditingSlide ? '💾 Save Slide' : '✏️ Edit Slide'}
                        </button>
                      )}
                      
                      <button onClick={downloadAdminPptAsPdf} className="slide-btn">
                        🖨️ Print / PDF
                      </button>
                      
                      <button 
                        onClick={() => { setGeneratedPpt(null); setPptTopic(''); }}
                        className="slide-btn"
                        style={{ color: '#ef4444' }}
                      >
                        🔄 Start Over
                      </button>
                    </div>
                  </div>

                  {/* Slides Presentation Mode */}
                  {pptViewMode === 'SLIDES' && (
                    <div className="slide-workspace-container">
                      
                      {/* Left Sidebar Slide Deck Thumbnails (Desktop-only) */}
                      <div className="mobile-hide" style={{ width: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', borderRight: '1px solid var(--border)', paddingRight: '1rem', flexShrink: 0 }}>
                        {generatedPpt.slides.map((slide: any, idx: number) => (
                          <div 
                            key={idx}
                            onClick={() => { setActiveSlideIndex(idx); setIsEditingSlide(false); }}
                            style={{ 
                              padding: '0.5rem 0.75rem', 
                              borderRadius: '8px', 
                              border: activeSlideIndex === idx ? '2px solid #ef4444' : '1px solid var(--border)',
                              background: activeSlideIndex === idx ? 'rgba(239, 68, 68, 0.05)' : 'var(--surface-light)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                          >
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#ef4444' }}>SLIDE {idx + 1}</span>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text)' }}>
                              {slide.title || 'Untitled'}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Main Slide Canvas */}
                      <div className="slide-main-canvas">
                        
                        {/* Slide Display aspect ratio box */}
                        <div className="slide-aspect-ratio-box">
                          {isEditingSlide ? (
                            /* Slide Editor View */
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', boxSizing: 'border-box' }}>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', marginBottom: '4px' }}>SLIDE TITLE</label>
                                <input 
                                  type="text" 
                                  value={editedSlideTitle}
                                  onChange={(e) => setEditedSlideTitle(e.target.value)}
                                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: '#252529', color: '#fff', outline: 'none' }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', marginBottom: '4px' }}>SLIDE SUBTITLE / META</label>
                                <input 
                                  type="text" 
                                  value={editedSlideSubtitle}
                                  onChange={(e) => setEditedSlideSubtitle(e.target.value)}
                                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: '#252529', color: '#fff', outline: 'none' }}
                                />
                              </div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#ef4444', marginBottom: '4px' }}>SLIDE BODY CONTENT</label>
                                <textarea 
                                  value={editedSlideContent}
                                  onChange={(e) => setEditedSlideContent(e.target.value)}
                                  style={{ flex: 1, width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: '#252529', color: '#fff', outline: 'none', fontFamily: 'monospace', fontSize: '0.85rem', resize: 'none' }}
                                />
                              </div>
                            </div>
                          ) : (
                            /* Render Active Slide */
                            (() => {
                              const s = generatedPpt.slides[activeSlideIndex];
                              if (!s) return null;

                              return (
                                <>
                                  <div>
                                    {/* Top Metadata Header */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.85rem', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <img src="/logo.png" alt="Sudhir Tutorials" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }} />
                                        <div>
                                          <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#fff', letterSpacing: '-0.3px' }}>{s.title}</h4>
                                          <span style={{ fontSize: '0.75rem', color: '#a0a0a5', marginTop: '2px', display: 'block' }}>{s.subtitle || ''}</span>
                                        </div>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ background: '#ef4444', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                                          {s.badge || 'SUDHIR TUTORIALS'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Slide Main Content */}
                                    <div style={{ fontSize: '0.9rem', lineHeight: '1.65', color: '#dcdce2', paddingBottom: '1.5rem', whiteSpace: 'pre-line' }}>
                                      {renderAdminSlideContent(s.content, activeSlideIndex + '_slide')}
                                    </div>
                                  </div>

                                  {/* Slide Footer */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.85rem', fontSize: '0.7rem', color: '#707075', fontWeight: 700, flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#ef4444' }}>
                                      <img src="/logo.png" alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                                      SUDHIR TUTORIALS
                                    </span>
                                    <span>SLIDE {activeSlideIndex + 1} OF {generatedPpt.slides.length}</span>
                                  </div>
                                </>
                              );
                            })()
                          )}
                        </div>

                        {/* Slide Pagination Toolbar */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 0.5rem' }}>
                          <button 
                            onClick={() => { setActiveSlideIndex(prev => Math.max(0, prev - 1)); setIsEditingSlide(false); }}
                            disabled={activeSlideIndex === 0}
                            style={{ 
                              padding: '0.5rem 1rem', 
                              borderRadius: '20px', 
                              border: '1px solid var(--border)', 
                              background: 'var(--surface-light)', 
                              color: activeSlideIndex === 0 ? 'var(--text-muted)' : 'var(--text)', 
                              cursor: activeSlideIndex === 0 ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '0.75rem'
                            }}
                          >
                            ◀ Previous
                          </button>

                          {/* Pagination Indicator Dots */}
                          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                            {generatedPpt.slides.map((_: any, idx: number) => (
                              <div 
                                key={idx} 
                                onClick={() => { setActiveSlideIndex(idx); setIsEditingSlide(false); }}
                                className={`slide-indicator-dot ${activeSlideIndex === idx ? 'active' : ''}`} 
                              />
                            ))}
                          </div>

                          <button 
                            onClick={() => { setActiveSlideIndex(prev => Math.min(generatedPpt.slides.length - 1, prev + 1)); setIsEditingSlide(false); }}
                            disabled={activeSlideIndex === generatedPpt.slides.length - 1}
                            style={{ 
                              padding: '0.5rem 1rem', 
                              borderRadius: '20px', 
                              border: '1px solid var(--border)', 
                              background: 'var(--surface-light)', 
                              color: activeSlideIndex === generatedPpt.slides.length - 1 ? 'var(--text-muted)' : 'var(--text)', 
                              cursor: activeSlideIndex === generatedPpt.slides.length - 1 ? 'not-allowed' : 'pointer',
                              fontWeight: 700,
                              fontSize: '0.75rem'
                            }}
                          >
                            Next ▶
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* Study Notes/Handout Mode */}
                  {pptViewMode === 'NOTES' && (
                    <div className="notes-container">
                      <div className="notes-paper">
                        
                        {/* Title Header */}
                        <div style={{ borderBottom: '3px solid #ef4444', paddingBottom: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
                          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: 900, color: '#ef4444', letterSpacing: '-0.5px' }}>
                            {generatedPpt.topic.toUpperCase()}
                          </h1>
                          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.8rem', color: '#64748b', fontWeight: 700 }}>
                            <span>CURRICULUM: {generatedPpt.grade}</span>
                            <span>•</span>
                            <span>CLASS DURATION: {pptDuration} MINUTES</span>
                            <span>•</span>
                            <span>DIFFICULTY: {pptDifficulty}</span>
                          </div>
                        </div>

                        {/* Slide items printed as notes */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                          {generatedPpt.slides.map((slide: any, idx: number) => (
                            <div key={idx} style={{ borderBottom: idx === generatedPpt.slides.length - 1 ? 'none' : '1px solid #e2e8f0', paddingBottom: '2.5rem' }}>
                              
                              {/* Section Title */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <span style={{ color: '#ef4444', fontStyle: 'italic', fontSize: '0.9rem' }}>#{idx + 1}</span> 
                                  <img src="/logo.png" alt="" style={{ width: '20px', height: '20px', objectFit: 'contain', borderRadius: '4px' }} />
                                  {slide.title}
                                </h3>
                                <span style={{ background: '#f1f5f9', color: '#64748b', padding: '3px 10px', borderRadius: '12px', fontSize: '0.65rem', fontWeight: 800 }}>
                                  {slide.badge || 'SUDHIR TUTORIALS'}
                                </span>
                              </div>

                              <span style={{ display: 'block', fontSize: '0.8rem', fontStyle: 'italic', color: '#64748b', marginBottom: '1rem', marginTop: '-0.5rem' }}>
                                {slide.subtitle || ''}
                              </span>

                              {/* Content */}
                              <div style={{ fontSize: '0.92rem', lineHeight: '1.65', color: '#334155', whiteSpace: 'pre-line' }}>
                                {renderAdminSlideContent(slide.content, idx + '_note')}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer */}
                        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700 }}>
                          <span>SUDHIR TUTORIALS • PREMIUM NOTES SUITE</span>
                          <span>© {new Date().getFullYear()} ALL RIGHTS RESERVED</span>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>
          )}

        </div>
      )}

      {(activeTab === 'lectures' || (activeTab === 'academics' && academicSubTab === 'lectures')) && (
        <LecturesSection subTab={lectureSubTab} setSubTab={setLectureSubTab} />
      )}

      {(activeTab === 'admissions' || (activeTab === 'verifications' && showAdmissionsInquiriesList) || (activeTab === 'academics' && academicSubTab === 'admissions')) && (
        <div style={{ marginTop: activeTab === 'verifications' ? '2rem' : '0' }}>
          <AdmissionsSection
            setActiveTab={setActiveTab}
            setUserSubTab={setUserSubTab}
            setNewUserRole={setNewUserRole}
            setNewUserName={setNewUserName}
            setNewStudentClass={setNewStudentClass}
            setNewStudentBoard={setNewStudentBoard}
            setNewStudentFatherName={setNewStudentFatherName}
            setNewStudentPhone={setNewStudentPhone}
            setNewStudentEmail={setNewStudentEmail}
            setNewStudentAddress={setNewStudentAddress}
            setNewStudentDob={setNewStudentDob}
          />
        </div>
      )}

      {activeTab === 'messages' && session?.user && (
        <ChatWindow currentUserId={(session.user as any).id} onMessagesRead={fetchUnreadCounts} initialSelectedUserId={chatSelectedUserId} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsPanel onUnreadChange={setUnreadNotifications} />
      )}
      {showDelModal && typeof window !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100010 }}>
          <div className="glass-card" style={{ width: '400px', padding: '2rem', textAlign: 'center', borderRadius: '20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.35rem', marginBottom: '0.75rem', fontWeight: 800 }}>Delete Fee Record?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem', lineHeight: 1.5 }}>This action cannot be undone. The student's fee record will be permanently removed.</p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <button 
                type="button"
                onClick={() => setShowDelModal(false)} 
                className="btn-secondary"
                style={{ padding: '0.55rem 1.25rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button 
                onClick={deleteFee} 
                disabled={isDeleting}
                style={{ padding: '0.55rem 1.25rem', borderRadius: '10px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer', fontSize: '0.9rem' }}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showProfileModal && editingProfile && typeof window !== 'undefined' && createPortal(
        <div className="modal-overlay-container" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem', overflowY: 'auto' }}>
          <div className="glass-card user-details-modal-card" style={{ width: '95%', maxWidth: '850px', maxHeight: '92vh', overflowY: 'auto', padding: '2rem', border: '1px solid var(--primary)', margin: 'auto', borderRadius: '24px', background: 'var(--card-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <div>
                 <h2 style={{ fontSize: '1.8rem', margin: 0 }}>{editingProfile.role === 'STUDENT' ? 'Student' : editingProfile.role === 'TEACHER' ? 'Teacher' : 'Admin'} Profile Editor</h2>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ID: {editingProfile.username}</p>
               </div>
               <button onClick={() => { setShowProfileModal(false); setOtpValue(""); }} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={saveProfile} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: '1.5rem' }}>

               <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                 <label>Profile Picture</label>
                 <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                   {editingProfile.photoUrl ? (
                     <img src={editingProfile.photoUrl} alt="Profile" style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} />
                   ) : (
                     <div style={{ width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '1.5rem', border: '1px dashed var(--border)' }}>👤</div>
                   )}
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                     <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Upload from device (Auto-compresses to small size):</span>
                     <input 
                       type="file" 
                       accept="image/*"
                       onChange={e => {
                         const file = e.target.files?.[0];
                         if (file) {
                           if (file.size > 3 * 1024 * 1024) {
                             alert('⚠️ Image size exceeds the 3 MB limit.');
                             e.target.value = '';
                             return;
                           }
                           const reader = new FileReader();
                           reader.onload = (event) => {
                             const img = new Image();
                             img.onload = () => {
                               const canvas = document.createElement('canvas');
                               const ctx = canvas.getContext('2d');
                               if (!ctx) return;
                               
                               const MAX_SIZE = 400;
                               let width = img.width;
                               let height = img.height;

                               if (width > height) {
                                 if (width > MAX_SIZE) {
                                   height *= MAX_SIZE / width;
                                   width = MAX_SIZE;
                                 }
                               } else {
                                 if (height > MAX_SIZE) {
                                   width *= MAX_SIZE / height;
                                   height = MAX_SIZE;
                                 }
                               }
                               
                               canvas.width = width;
                               canvas.height = height;
                               ctx.drawImage(img, 0, 0, width, height);
                               const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                               setEditingProfile({ ...editingProfile, photoUrl: compressedDataUrl });
                             };
                             img.src = event.target?.result as string;
                           };
                           reader.readAsDataURL(file);
                         }
                       }}
                       style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '8px', border: '1px dashed var(--border)', cursor: 'pointer' }}
                     />
                   </div>
                 </div>
               </div>

               <div className="input-group">
                 <label>Full Name</label>
                 <input type="text" value={editingProfile.name || ''} maxLength={150} onChange={e => {
                    const val = e.target.value;
                    if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                      setEditingProfile({...editingProfile, name: val});
                    }
                  }} placeholder="Full Name" required />
               </div>

               <div className="input-group">
                 <label>Date of Birth</label>
                 <input type="date" value={editingProfile.dob ? new Date(editingProfile.dob).toISOString().split('T')[0] : ''} onChange={e => setEditingProfile({...editingProfile, dob: e.target.value})} />
               </div>

               <div className="input-group">
                  <label>Phone Number</label>
                  <input type="text" value={editingProfile.phone || ''} maxLength={10} onChange={e => setEditingProfile({...editingProfile, phone: e.target.value.replace(/\D/g, '')})} placeholder="e.g. 9876543210" />
                </div>

               <div className="input-group">
                 <label>Email Address</label>
                 <input type="email" value={editingProfile.email || ''} onChange={e => setEditingProfile({...editingProfile, email: e.target.value})} placeholder="mail@example.com" />
               </div>

               <div className="input-group">
                 <label>Join Date (System Record)</label>
                 <input type="date" value={editingProfile.createdAt ? new Date(editingProfile.createdAt).toISOString().split('T')[0] : ''} onChange={e => setEditingProfile({...editingProfile, createdAt: e.target.value})} />
               </div>

               {editingProfile.role === 'STUDENT' ? (
                 <>
                   <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', gridColumn: '1 / -1' }}>
                     <label style={{ margin: 0 }}>Student Account Status:</label>
                     <select 
                       value={editingProfile.isActive === false ? 'false' : 'true'}
                       onChange={e => setEditingProfile({...editingProfile, isActive: e.target.value === 'true'})}
                       style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontWeight: 600 }}
                     >
                       <option value="true">Active</option>
                       <option value="false">Inactive</option>
                     </select>
                   </div>
                   <div className="input-group">
                     <label>Gender</label>
                     <select 
                       value={editingProfile.gender || ''}
                       onChange={e => setEditingProfile({...editingProfile, gender: e.target.value})}
                       style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                     >
                       <option value="">Select Gender...</option>
                       <option value="Male">Male</option>
                       <option value="Female">Female</option>
                       <option value="Other">Other</option>
                     </select>
                   </div>
                   <div className="input-group">
                     <label>Father's Name</label>
                     <input type="text" value={editingProfile.fatherName || ''} maxLength={150} onChange={e => {
                        const val = e.target.value;
                        if (val === '' || /^[a-zA-Z\s]*$/.test(val)) {
                          setEditingProfile({...editingProfile, fatherName: val});
                        }
                      }} placeholder="Full Name" />
                   </div>
                   <div className="input-group">
                     <label>Class / Grade</label>
                     <select 
                       value={editingProfile.className || ''} 
                       onChange={e => {
                          const cls = e.target.value;
                          const defaultFee = classFees[cls] !== undefined ? classFees[cls] : editingProfile.baseFee;
                          setEditingProfile({
                            ...editingProfile,
                            className: cls,
                            baseFee: defaultFee
                          });
                        }}
                       style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                     >
                       <option value="">Select Class...</option>
                       {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th (Sci)", "11th (Com)", "12th (Sci)", "12th (Com)"].map(c => (
                         <option key={c} value={c}>{c}</option>
                       ))}
                     </select>
                   </div>
                   <div className="input-group">
                     <label>Board</label>
                     <input type="text" value={editingProfile.board || ''} onChange={e => setEditingProfile({...editingProfile, board: e.target.value})} placeholder="e.g. CBSE / ICSE" />
                   </div>
                   <div className="input-group">
                     <label>Monthly Fee (Base ₹)</label>
                     <input type="number" value={editingProfile.baseFee || ''} onChange={e => setEditingProfile({...editingProfile, baseFee: parseFloat(e.target.value)})} placeholder="e.g. 2500" />
                   </div>
                   <div className="input-group">
                     <label>Scholarship Amount (₹)</label>
                     <input type="number" value={editingProfile.scholarship || ''} onChange={e => setEditingProfile({...editingProfile, scholarship: parseFloat(e.target.value)})} placeholder="e.g. 500" />
                   </div>
                   <div className="input-group">
                     <label>Aadhaar Number</label>
                     <input type="text" value={editingProfile.aadhaarNumber || ''} onChange={e => setEditingProfile({...editingProfile, aadhaarNumber: e.target.value})} placeholder="12-digit Aadhaar" />
                   </div>
                   <div className="input-group">
                     <label>Parent Contact</label>
                     <input type="text" value={editingProfile.parentContact || ''} maxLength={10} onChange={e => setEditingProfile({...editingProfile, parentContact: e.target.value.replace(/\D/g, '')})} placeholder="e.g. 9876543210" />
                   </div>
                   <div className="input-group">
                   </div>
                   <div className="input-group">
                     <label>Batch Name</label>
                     <select 
                       value={editingProfile.batch || ''} 
                       onChange={e => setEditingProfile({...editingProfile, batch: e.target.value})}
                       style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                     >
                       <option value="">Select Batch...</option>
                       {batches.map(b => (
                         <option key={b.id} value={b.name}>{b.name}</option>
                       ))}
                     </select>
                   </div>
                   <div className="input-group">
                     <label>Religion</label>
                     <select 
                       value={editingProfile.religion || ''}
                       onChange={e => setEditingProfile({...editingProfile, religion: e.target.value})}
                       style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                     >
                       <option value="">Select Religion...</option>
                       <option value="Hinduism">Hinduism</option>
                       <option value="Islam">Islam</option>
                       <option value="Christianity">Christianity</option>
                       <option value="Sikhism">Sikhism</option>
                       <option value="Buddhism">Buddhism</option>
                       <option value="Jainism">Jainism</option>
                       <option value="Other">Other</option>
                     </select>
                   </div>
                   <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                     <label>School Name</label>
                     <input type="text" value={editingProfile.school || ''} onChange={e => setEditingProfile({...editingProfile, school: e.target.value})} placeholder="e.g. KV School" />
                   </div>


                   <div className="input-group" style={{ gridColumn: '1 / -1', marginTop: '0.75rem', background: 'rgba(245,158,11,0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px dashed rgba(245,158,11,0.3)' }}>
                     <label style={{ color: '#f59e0b', fontWeight: 'bold', marginBottom: '0.25rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                       🔑 Security: One-Time Temporary Password
                     </label>
                     <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                       If a student forgets their password, you can generate a one-time temporary password. They will be forced to set a new password upon logging in.
                     </p>
                     
                     {otpValue ? (
                       <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: 'var(--input-bg)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)' }}>
                         <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Generated Pass:</span>
                         <code style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '2px', background: 'rgba(245,158,11,0.1)', padding: '4px 10px', borderRadius: '6px', color: '#f59e0b' }}>
                           {otpValue}
                         </code>
                         <button 
                           type="button"
                           onClick={() => {
                             navigator.clipboard.writeText(otpValue);
                             alert("One-Time Password copied to clipboard!");
                           }}
                           style={{ padding: '6px 12px', background: '#f59e0b', border: 'none', color: '#fff', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: 'opacity 0.2s' }}
                           onMouseOver={e => e.currentTarget.style.opacity = '0.9'}
                           onMouseOut={e => e.currentTarget.style.opacity = '1'}
                         >
                           Copy Password
                         </button>
                       </div>
                     ) : (
                       <button
                         type="button"
                         onClick={handleGenerateOTP}
                         disabled={otpGenerating}
                         style={{
                           padding: '0.75rem 1.25rem',
                           borderRadius: '8px',
                           background: 'rgba(245,158,11,0.1)',
                           border: '1px solid #f59e0b',
                           color: '#f59e0b',
                           fontWeight: 700,
                           cursor: 'pointer',
                           fontSize: '0.85rem',
                           display: 'flex',
                           alignItems: 'center',
                           gap: '0.5rem',
                           transition: 'all 0.2s'
                         }}
                         onMouseOver={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.2)'; }}
                         onMouseOut={e => { e.currentTarget.style.background = 'rgba(245,158,11,0.05)'; }}
                       >
                         {otpGenerating ? 'Generating Temporary Pass...' : '🔑 Generate One-Time Password'}
                       </button>
                     )}
                   </div>
                 </>
               ) : editingProfile.role === 'TEACHER' || editingProfile.role === 'ADMIN' ? (
                 <>
                   {editingProfile.role === 'TEACHER' && (
                     <>
                       <div className="input-group">
                         <label>Subject</label>
                         <input type="text" value={editingProfile.subject || ''} onChange={e => setEditingProfile({...editingProfile, subject: e.target.value})} placeholder="e.g. Mathematics" />
                       </div>
                       <div className="input-group">
                         <label>Assigned Batch</label>
                         <select 
                           value={editingProfile.batch || ''} 
                           onChange={e => setEditingProfile({...editingProfile, batch: e.target.value})}
                           style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                         >
                           <option value="">Select Batch...</option>
                           {batches.map(b => (
                             <option key={b.id} value={b.name}>{b.name}</option>
                           ))}
                         </select>
                       </div>
                       <div className="input-group">
                         <label>Salary (₹)</label>
                         <input type="number" value={editingProfile.salary || ''} onChange={e => setEditingProfile({...editingProfile, salary: parseFloat(e.target.value)})} placeholder="e.g. 25000" />
                       </div>
                       <div className="input-group">
                         <label>Qualification</label>
                         <input type="text" value={editingProfile.qualification || ''} onChange={e => setEditingProfile({...editingProfile, qualification: e.target.value})} placeholder="e.g. M.Sc. B.Ed." />
                       </div>
                       <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                         <label>Experience</label>
                         <input type="text" value={editingProfile.experience || ''} onChange={e => setEditingProfile({...editingProfile, experience: e.target.value})} placeholder="e.g. 5 Years" />
                       </div>
                     </>
                   )}
                   <div className="input-group">
                     <label>Gender</label>
                     <select 
                       value={editingProfile.gender || ''}
                       onChange={e => setEditingProfile({...editingProfile, gender: e.target.value})}
                       style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                     >
                       <option value="">Select Gender...</option>
                       <option value="Male">Male</option>
                       <option value="Female">Female</option>
                       <option value="Other">Other</option>
                     </select>
                   </div>
                   <div className="input-group">
                      <label>Religion</label>
                      <select 
                        value={editingProfile.religion || ''}
                        onChange={e => setEditingProfile({...editingProfile, religion: e.target.value})}
                        style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem' }}
                      >
                        <option value="">Select Religion...</option>
                        <option value="Hinduism">Hinduism</option>
                        <option value="Islam">Islam</option>
                        <option value="Christianity">Christianity</option>
                        <option value="Sikhism">Sikhism</option>
                        <option value="Buddhism">Buddhism</option>
                        <option value="Jainism">Jainism</option>
                        <option value="Other">Other</option>
                     </select>
                    </div>
                 </>
               ) : null}

               <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                 <label>Residential Address</label>
                 <textarea 
                   maxLength={150} value={editingProfile.address || ''} 
                   onChange={e => setEditingProfile({...editingProfile, address: e.target.value})} 
                   placeholder="Street, City, Pin"
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', minHeight: '80px' }}
                 />
               </div>
               


               <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  <button 
                    type="button" 
                    onClick={handleDeleteUser} 
                    style={{ padding: '0.6rem 1.1rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#ef4444', cursor: 'pointer', fontWeight: 700, fontSize: '0.82rem', transition: 'all 0.2s' }}
                  >
                    🗑️ Delete Account
                  </button>
                  <button 
                    type="button" 
                    onClick={() => { setShowProfileModal(false); setOtpValue(""); }} 
                    style={{ padding: '0.6rem 1.1rem', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem', transition: 'all 0.2s' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={isSavingProfile} 
                    style={{ padding: '0.6rem 1.4rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: 800 }}
                  >
                    {isSavingProfile ? 'Saving...' : '💾 Save Changes'}
                  </button>
                </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {showBatchEditModal && editingBatch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '1rem' }}>
          <div className="glass-card batch-modal-card" style={{ width: '100%', maxWidth: '1000px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button onClick={() => setShowBatchEditModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>

            <div style={{ marginBottom: '1.5rem' }}>
               <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Batch Control Center</h2>
               <p style={{ color: 'var(--text-muted)' }}>Configuring <strong>{editingBatch.name}</strong> • {editingBatch.course?.name}</p>
            </div>

            {/* Sub-Tabs inside Modal */}
            <div className="subtab-nav no-scrollbar" style={{ marginBottom: '2rem', background: 'rgba(0,0,0,0.2)' }}>
              <button 
                onClick={() => setBatchModalTab('CONFIG')}
                style={{
                  padding: '0.5rem 1.25rem',
                  border: 'none',
                  background: batchModalTab === 'CONFIG' ? 'var(--primary)' : 'transparent',
                  color: 'white',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                ⚙️ Configurations & Timings
              </button>
              <button 
                onClick={() => setBatchModalTab('STUDENTS')}
                style={{
                  padding: '0.5rem 1.25rem',
                  border: 'none',
                  background: batchModalTab === 'STUDENTS' ? 'var(--primary)' : 'transparent',
                  color: 'white',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.3s'
                }}
              >
                🎓 Manage Students ({editingBatch.students?.length || 0})
              </button>
            </div>

            {batchModalTab === 'CONFIG' && (
              <div className="batch-control-grid">
                
                {/* ── LEFT COLUMN: INFO & TEACHERS ───────────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                  
                  <section>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚙️ General Configuration</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      <div className="input-group">
                        <label>Batch Name</label>
                        <input type="text" value={editingBatch.name} onChange={e => setEditingBatch({...editingBatch, name: e.target.value})} style={{ width: '100%' }} />
                      </div>
                      <div className="input-group">
                        <label>Class</label>
                        <select value={editingBatch.className || ''} onChange={e => setEditingBatch({...editingBatch, className: e.target.value})} style={{ width: '100%' }}>
                          {["6th", "7th", "8th", "9th", "10th", "11th Sci", "11th Com", "12th Sci", "12th Com"].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
                      <div className="input-group">
                        <label>Subjects</label>
                        <input type="text" value={editingBatch.subjects || ''} onChange={e => setEditingBatch({...editingBatch, subjects: e.target.value})} style={{ width: '100%' }} />
                      </div>
                      <div className="input-group">
                        <label>Default Fee (₹)</label>
                        <input type="number" value={editingBatch.defaultFee || 0} onChange={e => setEditingBatch({...editingBatch, defaultFee: parseFloat(e.target.value)})} style={{ width: '100%' }} />
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👨‍🏫 Teaching Staff</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      {/* Currently Assigned */}
                      <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
                        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          👨‍🏫 Assigned Instructors ({editingBatch.teachers?.length || 0})
                        </h4>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {(!editingBatch.teachers || editingBatch.teachers.length === 0) ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                              No teachers assigned yet.
                            </div>
                          ) : (
                            editingBatch.teachers.map((t: any) => (
                              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{t.name}</span>
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.username}</span>
                                </div>
                                <button 
                                  type="button"
                                  onClick={() => {
                                    const newTeachers = editingBatch.teachers.filter((te: any) => te.id !== t.id);
                                    setEditingBatch({ ...editingBatch, teachers: newTeachers });
                                  }}
                                  style={{ padding: '2px 8px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}
                                >
                                  ✕ Remove
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Add Teachers */}
                      <div className="glass-card" style={{ padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
                        <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          ➕ Available Teachers
                        </h4>
                        <div style={{ maxHeight: '150px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {allTeachers.filter(t => !editingBatch.teachers?.some((te: any) => te.id === t.id)).length === 0 ? (
                            <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>
                              All teachers assigned.
                            </div>
                          ) : (
                            allTeachers
                              .filter(t => !editingBatch.teachers?.some((te: any) => te.id === t.id))
                              .map((t: any) => (
                                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t.name}</span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.username}</span>
                                  </div>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      const newTeachers = [...(editingBatch.teachers || []), t];
                                      setEditingBatch({ ...editingBatch, teachers: newTeachers });
                                    }}
                                    style={{ padding: '4px 10px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}
                                  >
                                    + Assign
                                  </button>
                                </div>
                              ))
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* ── RIGHT COLUMN: SCHEDULES & BILLING ────────── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                  
                  <section>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⏰ Weekly Timings</h3>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <select value={newSchedule.dayOfWeek} onChange={e => setNewSchedule({...newSchedule, dayOfWeek: e.target.value})} style={{ width: '100%' }}>
                          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => <option key={i} value={i+1}>{d}</option>)}
                        </select>
                        <input type="text" placeholder="Room (e.g. Hall A)" value={newSchedule.room} onChange={e => setNewSchedule({...newSchedule, room: e.target.value})} style={{ width: '100%' }} />
                        <input type="text" placeholder="Subject (e.g. Physics)" value={newSchedule.subject || ''} onChange={e => setNewSchedule({...newSchedule, subject: e.target.value})} style={{ gridColumn: '1 / -1', width: '100%' }} />
                        <input type="time" value={newSchedule.startTime} onChange={e => setNewSchedule({...newSchedule, startTime: e.target.value})} style={{ width: '100%' }} />
                        <input type="time" value={newSchedule.endTime} onChange={e => setNewSchedule({...newSchedule, endTime: e.target.value})} style={{ width: '100%' }} />
                      </div>
                      <button 
                        onClick={async () => {
                          const res = await fetch(`/api/admin/batches/${editingBatch.id}/schedules`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(newSchedule)
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setEditingBatch({...editingBatch, schedules: [...(editingBatch.schedules || []), data.schedule]});
                            setNewSchedule({ dayOfWeek: '1', startTime: '16:00', endTime: '17:00', room: '', subject: '' });
                            fetchBatches();
                          }
                        }}
                        className="btn-secondary" 
                        style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem' }}
                      >
                        + Add Time Slot
                      </button>

                      <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Current Schedule</div>
                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
                          {editingBatch.schedules && editingBatch.schedules.length > 0 ? (
                            [...editingBatch.schedules].sort((a:any, b:any) => parseInt(a.dayOfWeek) - parseInt(b.dayOfWeek)).map((s:any) => (
                              <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.05)', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0, flex: 1 }}>
                                  <div style={{ width: '45px', textAlign: 'center', fontWeight: 800, color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '4px', borderRadius: '6px', flexShrink: 0 }}>
                                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][s.dayOfWeek-1]}
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
                                    <span style={{ fontWeight: 700, wordBreak: 'break-word', whiteSpace: 'normal' }}>
                                      {s.startTime} - {s.endTime} {s.subject && <span style={{ color: 'var(--primary)', fontSize: '0.8rem', display: 'block', marginTop: '2px' }}>📚 {s.subject}</span>}
                                    </span>
                                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Room: {s.room || 'TBA'}</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={async () => {
                                    const res = await fetch(`/api/admin/batches/${editingBatch.id}/schedules?id=${s.id}`, { method: 'DELETE' });
                                    if (res.ok) {
                                      setEditingBatch({...editingBatch, schedules: editingBatch.schedules.filter((x:any) => x.id !== s.id)});
                                      fetchBatches();
                                    }
                                  }}
                                  style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', flexShrink: 0 }}
                                >
                                  🗑
                                </button>
                              </div>
                            ))
                          ) : (
                            <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border)' }}>
                              No timings added yet. Use the form above to add slots.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>💸 Batch Billing</h3>
                    <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', wordBreak: 'break-word', lineHeight: 1.4 }}>
                        One-click assign a fee of <strong>₹{editingBatch.defaultFee || 0}</strong> to all <strong>{editingBatch.students?.length || 0}</strong> students in this batch.
                      </p>
                      <button 
                        onClick={async () => {
                          if (!confirm(`Assign custom fees to all students in this batch (billing is based on each student's profile fee, falling back to batch default ₹${editingBatch.defaultFee})?`)) return;
                          const billingMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
                          const dueDate = new Date();
                          dueDate.setDate(12); // standard 12th due date

                          for (const student of editingBatch.students) {
                            const finalFee = student.studentProfile?.baseFee || editingBatch.defaultFee || 2500;
                            await fetch('/api/admin/finances', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                studentUsername: student.username,
                                amount: finalFee,
                                title: `${editingBatch.name} - Monthly Fee`,
                                billingMonth,
                                dueDate: dueDate.toISOString().split('T')[0]
                              })
                            });
                          }
                          alert('Batch billing completed successfully based on student profile rates!');
                          fetchFinances();

                        }}
                        className="btn-primary" 
                        style={{ width: '100%', background: 'var(--secondary)', border: 'none', padding: '0.75rem 1.25rem', fontSize: '0.9rem', borderRadius: '12px' }}
                      >
                        🚀 Assign Monthly Fee to All
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {batchModalTab === 'STUDENTS' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  {/* Currently Enrolled */}
                  <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      🎓 Currently Enrolled Students ({editingBatch.students?.length || 0})
                    </h3>
                    <input 
                      type="text" 
                      placeholder="🔍 Filter enrolled students..." 
                      style={{ width: '100%', marginBottom: '1rem', padding: '0.6rem', fontSize: '0.85rem' }}
                      onChange={e => {
                        const q = e.target.value.toLowerCase();
                        const els = document.querySelectorAll('.enrolled-student-item');
                        els.forEach((el: any) => {
                          el.style.display = el.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
                        });
                      }}
                    />
                    <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {(!editingBatch.students || editingBatch.students.length === 0) ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                          No students enrolled in this batch.
                        </div>
                      ) : (
                        editingBatch.students.map((s: any) => (
                          <div key={s.id} className="enrolled-student-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                              <span 
                                onClick={() => setActiveProfileUserId(s.id)} 
                                style={{ fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline decoration-dotted' }}
                                className="clickable-name"
                              >
                                {s.name}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.username}</span>
                            </div>
                            <button 
                              onClick={() => {
                                const newStudents = editingBatch.students.filter((st: any) => st.id !== s.id);
                                setEditingBatch({ ...editingBatch, students: newStudents });
                              }}
                              style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                            >
                              ✕ Remove
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Add Students */}
                  <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '1.15rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      ➕ Add Students to Batch
                    </h3>
                    <input 
                      type="text" 
                      placeholder="🔍 Search directory by name..." 
                      style={{ width: '100%', marginBottom: '1rem', padding: '0.6rem', fontSize: '0.85rem' }}
                      onChange={e => {
                        const q = e.target.value.toLowerCase();
                        const els = document.querySelectorAll('.available-student-item');
                        els.forEach((el: any) => {
                          el.style.display = el.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
                        });
                      }}
                    />
                    <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {allStudents.filter(u => !editingBatch.students?.some((st: any) => st.id === u.id)).length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                          All students in directory are already enrolled.
                        </div>
                      ) : (
                        allStudents
                          .filter(u => !editingBatch.students?.some((st: any) => st.id === u.id))
                          .map((s: any) => (
                            <div key={s.id} className="available-student-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.name}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.username}</span>
                              </div>
                              <button 
                                onClick={() => {
                                  const newStudents = [...(editingBatch.students || []), s];
                                  setEditingBatch({ ...editingBatch, students: newStudents });
                                }}
                                style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}
                              >
                                + Enroll
                              </button>
                            </div>
                          ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '2rem', display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <button 
                onClick={async () => {
                  setIsUpdatingBatch(true);
                  try {
                    const res = await fetch('/api/admin/batches', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        id: editingBatch.id,
                        name: editingBatch.name,
                        courseId: editingBatch.courseId,
                        className: editingBatch.className,
                        subjects: editingBatch.subjects,
                        defaultFee: editingBatch.defaultFee,
                        teacherUsernames: editingBatch.teachers.map((t:any) => t.username),
                        studentUsernames: editingBatch.students.map((s:any) => s.username)
                      })
                    });
                    if (res.ok) {
                      setShowBatchEditModal(false);
                      fetchBatches();
                    }
                  } catch (e) {} finally { setIsUpdatingBatch(false); }
                }}
                className="btn-primary"
                disabled={isUpdatingBatch}
                style={{ flex: 1, padding: '0.75rem 1.25rem', fontSize: '0.95rem', borderRadius: '12px' }}
              >
                {isUpdatingBatch ? 'Updating Batch Center...' : 'Save All Configurations'}
              </button>
              
              <button 
                onClick={() => {
                  requestSecurityVerification(
                    `Delete Batch: ${editingBatch.name}`,
                    `You are deleting the batch "${editingBatch.name}" and all of its schedules. Enter your admin password to authorize this action.`,
                    async () => {
                      const res = await fetch(`/api/admin/batches?id=${editingBatch.id}`, { method: 'DELETE' });
                      if (res.ok) {
                        setShowBatchEditModal(false);
                        fetchBatches();
                      }
                    }
                  );
                }}
                className="btn-secondary"
                style={{ padding: '0.75rem 1.5rem', color: '#ef4444', border: '1px solid #ef4444', borderRadius: '12px', fontSize: '0.95rem' }}
              >
                Delete Batch
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Receipt Modal ───────────────────────────── */}
      {activeReceipt && typeof window !== 'undefined' && createPortal(
        <div className="receipt-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100010, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card receipt-print-area" style={{ 
            width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden', margin: '2rem auto', 
            background: '#fff', color: '#1a1a1a', borderRadius: '12px', 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative' 
          }}>
            {/* PAID Stamp Overlay */}
            {(activeReceipt.status === 'PAID' || activeReceipt.status === 'VERIFIED' || activeReceipt.status === 'PAID_ONLINE') && (
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)',
                border: '6px solid rgba(16, 185, 129, 0.04)', color: 'rgba(16, 185, 129, 0.04)',
                fontSize: '6rem', fontWeight: 900, padding: '1rem 2rem', borderRadius: '1rem',
                pointerEvents: 'none', zIndex: 0, textTransform: 'uppercase', letterSpacing: '10px'
              }}>
                PAID
              </div>
            )}

            <div className="receipt-inner-container" style={{ position: 'relative', zIndex: 2, padding: '2.5rem 1.5rem 1.5rem' }}>
              <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                <img src="/logo.png" alt="Sudhir Tutorials Logo" style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '12px', margin: '0 auto 0.4rem', display: 'block' }} />
                <h1 style={{ color: '#1a1a1a', fontSize: '1.2rem', margin: 0, letterSpacing: '1px', fontWeight: 800 }}><span style={{ color: '#ef4444' }}>SUDHIR</span> <span style={{ color: '#2563eb' }}>TUTORIALS</span></h1>
                <p style={{ fontSize: '0.65rem', color: '#6b7280', margin: '2px 0' }}>Empowering Minds, Shaping Futures</p>
                <div style={{ height: '1px', background: '#e5e7eb', width: '30px', margin: '0.5rem auto' }}></div>
                <h2 style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#374151', margin: '0.25rem 0', whiteSpace: 'nowrap' }}>FEE PAYMENT RECEIPT</h2>
              </div>

              <div style={{ marginBottom: '1rem', fontSize: '0.8rem', borderBottom: '1px dashed #e5e7eb', paddingBottom: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#1a1a1a' }}>
                  <div><strong>Receipt No.:</strong> <span style={{ fontWeight: 700 }}>{activeReceipt.receiptNo || `REC-${activeReceipt.id.slice(-6).toUpperCase()}`}</span></div>
                  <div><strong>Date:</strong> <span style={{ fontWeight: 700 }}>{activeReceipt.paidAt ? formatDateDisplay(activeReceipt.paidAt) : formatDateDisplay(new Date())}</span></div>
                </div>
                <div style={{ color: '#1a1a1a' }}>
                  <strong>Student Name:</strong> <span style={{ fontWeight: 700 }}>{activeReceipt.student?.name}</span>
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  <strong>Student ID:</strong> <span style={{ fontWeight: 650 }}>{activeReceipt.student?.username}</span>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #f3f4f6', borderBottom: '2px solid #f3f4f6', padding: '0.85rem 0', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#374151' }}>
                  <span>{activeReceipt.title} ({activeReceipt.billingMonth})</span>
                  <span style={{ fontWeight: 700, color: '#1a1a1a' }}>₹{activeReceipt.amount.toFixed(2)}</span>
                </div>
                {activeReceipt.lateFine > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ef4444' }}>
                    <span>Late Fine</span>
                    <span style={{ fontWeight: 700 }}>+₹{activeReceipt.lateFine.toFixed(2)}</span>
                  </div>
                )}
                {activeReceipt.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: 'var(--secondary, #1d4ed8)' }}>
                    <span>Discount Applied</span>
                    <span style={{ fontWeight: 700 }}>-₹{activeReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #e5e7eb', color: '#1a1a1a' }}>
                  <span style={{ fontWeight: 800 }}>TOTAL PAID</span>
                  <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>₹{(activeReceipt.paidAmount || (activeReceipt.amount + (activeReceipt.lateFine || 0) - (activeReceipt.discount || 0))).toFixed(2)}</span>
                </div>
                {(() => {
                  const netDue = activeReceipt.amount + (activeReceipt.lateFine || 0) - (activeReceipt.discount || 0);
                  const paid = activeReceipt.paidAmount || 0;
                  const remaining = Math.max(0, netDue - paid);
                  return remaining > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.4rem', color: '#ef4444' }}>
                      <span style={{ fontWeight: 800 }}>REMAINING DUE</span>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>₹{remaining.toFixed(2)}</span>
                    </div>
                  );
                })()}
              </div>

              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1.25rem' }}>
                <div style={{ marginBottom: '0.2rem' }}><strong>Method:</strong> {activeReceipt.paymentMethod || 'CASH'}</div>
                {activeReceipt.transactionId && <div style={{ marginBottom: '0.2rem' }}><strong>TXN ID:</strong> {activeReceipt.transactionId}</div>}
                {activeReceipt.collectedBy && <div><strong>Collected/Verified By:</strong> {activeReceipt.collectedBy}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.65rem', color: '#9ca3af', fontStyle: 'italic' }}>
                  * This is a computer-generated receipt. No signature is required.
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#4b5563', letterSpacing: '0.5px' }}><span style={{ color: '#ef4444' }}>SUDHIR</span> <span style={{ color: '#2563eb' }}>TUTORIALS</span></div>
                  <div style={{ fontSize: '0.5rem', color: '#9ca3af', textTransform: 'uppercase', marginTop: '2px' }}>Online Fee Desk</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }} className="no-print">
                <button 
                  onClick={() => setActiveReceipt(null)}
                  style={{ 
                    flex: 1, minWidth: '80px', padding: '0.8rem 1rem', borderRadius: '12px', 
                    background: '#374151', color: '#fff', border: 'none', 
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#4b5563'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#374151'}
                >
                  ❌ Close
                </button>
                <button 
                  onClick={() => Capacitor.isNativePlatform() ? downloadReceiptPDF(activeReceipt.id, true) : window.print()}
                  style={{ 
                    flex: 1.5, minWidth: '120px', padding: '0.8rem 1rem', borderRadius: '12px', 
                    background: 'transparent', border: '2px solid var(--primary)', color: 'var(--primary)',
                    fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)'; }}
                >
                  🖨 Print
                </button>
                <button 
                  onClick={() => downloadReceiptPDF(activeReceipt.id, false)}
                  disabled={downloadingPDF}
                  style={{ 
                    flex: 2, minWidth: '150px', padding: '0.8rem 1.25rem', borderRadius: '12px', 
                    background: 'linear-gradient(135deg, var(--secondary), hsl(217,91%,45%))', color: '#fff', border: 'none', 
                    fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem',
                    boxShadow: '0 4px 15px rgba(59,130,246,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                >
                  {downloadingPDF ? 'Generating...' : '📥 Download PDF'}
                </button>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Add Expense Modal ───────────────────────── */}
      {showExpenseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '450px', padding: '2rem', margin: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Record New Expense</h2>
            <form onSubmit={handleAddExpense} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group">
                <label>Title</label>
                <input type="text" required placeholder="e.g. Electricity Bill" value={newExpense.title} onChange={e => setNewExpense({...newExpense, title: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Category</label>
                  <select value={newExpense.category} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                    <option value="SALARY">Salary</option>
                    <option value="RENT">Rent</option>
                    <option value="BILLS">Bills</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Amount (₹)</label>
                  <input type="number" required placeholder="5000" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: e.target.value})} />
                </div>
              </div>
              <div className="input-group">
                <label>Remarks</label>
                <textarea rows={2} value={newExpense.remarks} onChange={e => setNewExpense({...newExpense, remarks: e.target.value})} placeholder="Optional notes..."></textarea>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button type="button" onClick={() => setShowExpenseModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                <button type="submit" disabled={isAddingExpense} className="btn-primary" style={{ flex: 1 }}>{isAddingExpense ? 'Saving...' : 'Save Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Collect Payment Modal ───────────────────── */}
      {showPaymentModal && payingFee && typeof window !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100010, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '450px', padding: '2rem', margin: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Collect Payment</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Student: <strong>{payingFee.student?.name}</strong> • {payingFee.billingMonth}</p>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Base Fee:</span>
                  <span>₹{payingFee.amount}</span>
               </div>
               {(() => {
                 const liveFine = calculateLiveLateFine(payingFee.dueDate, paymentDetails.paidAt, payingFee.billingMonth);
                 return liveFine > 0 && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ef4444' }}>
                      <span>Late Fine:</span>
                      <span>+₹{liveFine}</span>
                   </div>
                 );
               })()}
               {payingFee.paidAmount > 0 && (
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#3b82f6' }}>
                      <span>Previously Paid:</span>
                       <span>-₹{payingFee.paidAmount}</span>
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#10b981', alignItems: 'center' }}>
                   <span>Discount:</span>
                   <input 
                     type="number" 
                     required
                     value={paymentDetails.discount} 
                     onChange={e => {
                       const newDiscount = parseFloat(e.target.value || '0');
                       const currentFine = calculateLiveLateFine(payingFee.dueDate, paymentDetails.paidAt, payingFee.billingMonth);
                       const newTotal = Math.max(0, payingFee.amount + currentFine - newDiscount - (payingFee.paidAmount || 0));
                       setPaymentDetails({
                         ...paymentDetails,
                         discount: newDiscount,
                         paidAmount: newTotal.toString()
                       });
                     }}
                     style={{ width: '80px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: '#10b981', textAlign: 'right' }}
                   />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontWeight: 800, fontSize: '1.2rem' }}>
                  <span>Total Payable:</span>
                  <span>₹{Math.max(0, payingFee.amount + calculateLiveLateFine(payingFee.dueDate, paymentDetails.paidAt, payingFee.billingMonth) - paymentDetails.discount - (payingFee.paidAmount || 0))}</span>
               </div>
            </div>

             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                 <div className="input-group">
                   <label>Amount Paid (₹)</label>
                   <input type="number" required value={paymentDetails.paidAmount} onChange={e => setPaymentDetails({...paymentDetails, paidAmount: e.target.value})} style={{ width: '100%' }} />
                 </div>
                 <div className="input-group">
                   <label>Date of Payment</label>
                   <input type="date" required value={paymentDetails.paidAt} onChange={e => setPaymentDetails({...paymentDetails, paidAt: e.target.value})} style={{ width: '100%' }} />
                 </div>
               </div>
               <div className="input-group">
                 <label>Payment Method</label>
                 <select value={paymentDetails.paymentMethod} onChange={e => setPaymentDetails({...paymentDetails, paymentMethod: e.target.value})}>
                   <option value="CASH">Cash</option>
                   <option value="UPI">UPI / QR Code</option>
                   <option value="BANK">Bank Transfer</option>
                   <option value="OTHER">Other</option>
                 </select>
               </div>
               {paymentDetails.paymentMethod !== 'CASH' && (
                 <div className="input-group">
                   <label>Transaction ID / Ref #</label>
                   <input type="text" placeholder="Optional" value={paymentDetails.transactionId} onChange={e => setPaymentDetails({...paymentDetails, transactionId: e.target.value})} />
                 </div>
               )}
               <div className="input-group">
                 <label>Remarks</label>
                 <input type="text" placeholder="e.g. Paid by father" value={paymentDetails.remarks} onChange={e => setPaymentDetails({...paymentDetails, remarks: e.target.value})} />
               </div>
               <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                 <button type="button" onClick={() => setShowPaymentModal(false)} style={{ padding: '0.55rem 1.25rem', borderRadius: '10px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}>Cancel</button>
                 <button onClick={() => updateFeeStatus(payingFee.id, 'PAID', { ...paymentDetails, paidAmount: parseFloat(paymentDetails.paidAmount || '0') })} className="btn-primary" style={{ padding: '0.55rem 1.25rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }}>Confirm Payment</button>
               </div>
             </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Edit Fee Record Modal (Admin corrective editing) ───────────────── */}
      {showEditFeeModal && editingFeeRecord && typeof window !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 100010, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', margin: 'auto', border: '1px solid var(--primary)', borderRadius: '24px', background: 'var(--card-bg)' }}>
            <h2 style={{ fontSize: '1.6rem', margin: '0 0 0.5rem', fontWeight: 800, color: 'var(--text)' }}>✎ Edit Fee Record</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.9rem' }}>
              Student: <strong>{editingFeeRecord.student?.name}</strong> ({editingFeeRecord.student?.username})
            </p>

            <form onSubmit={saveFeeRecordEdits} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="input-group">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Billing Month</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    value={(editingFeeRecord.billingMonth || '').split(' ')[0] || 'January'}
                    onChange={e => {
                      const yearPart = (editingFeeRecord.billingMonth || '').split(' ')[1] || String(new Date().getFullYear());
                      setEditingFeeRecord({...editingFeeRecord, billingMonth: `${e.target.value} ${yearPart}`});
                    }}
                    required
                    style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    {['January','February','March','April','May','June','July','August','September','October','November','December'].map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={(editingFeeRecord.billingMonth || '').split(' ')[1] || String(new Date().getFullYear())}
                    onChange={e => {
                      const monthPart = (editingFeeRecord.billingMonth || '').split(' ')[0] || 'January';
                      setEditingFeeRecord({...editingFeeRecord, billingMonth: `${monthPart} ${e.target.value}`});
                    }}
                    style={{ width: '110px', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    {Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - 1 + i)).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Invoice Title / Description</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Monthly Tuition Fee"
                  value={editingFeeRecord.title || ''} 
                  onChange={e => setEditingFeeRecord({...editingFeeRecord, title: e.target.value})} 
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Base Amount (₹)</label>
                  <input 
                    type="number" 
                    required 
                    value={editingFeeRecord.amount ?? 0} 
                    onChange={e => setEditingFeeRecord({...editingFeeRecord, amount: parseFloat(e.target.value || '0')})} 
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div className="input-group">
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Discount Applied (₹)</label>
                  <input 
                    type="number" 
                    required 
                    value={editingFeeRecord.discount ?? 0} 
                    onChange={e => setEditingFeeRecord({...editingFeeRecord, discount: parseFloat(e.target.value || '0')})} 
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Late Fine Charged (₹)</label>
                  <input 
                    type="number" 
                    required 
                    value={editingFeeRecord.lateFine ?? 0} 
                    onChange={e => setEditingFeeRecord({...editingFeeRecord, lateFine: parseFloat(e.target.value || '0')})} 
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div className="input-group">
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Paid Amount (₹)</label>
                  <input 
                    type="number" 
                    required 
                    value={editingFeeRecord.paidAmount ?? 0} 
                    onChange={e => setEditingFeeRecord({...editingFeeRecord, paidAmount: parseFloat(e.target.value || '0')})} 
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Due Date</label>
                  <input 
                    type="date" 
                    required 
                    value={editingFeeRecord.dueDate ? new Date(editingFeeRecord.dueDate).toISOString().split('T')[0] : ''} 
                    onChange={e => setEditingFeeRecord({...editingFeeRecord, dueDate: e.target.value})} 
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
                <div className="input-group">
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Payment Status</label>
                  <select 
                    value={editingFeeRecord.status || 'PENDING'} 
                    onChange={e => setEditingFeeRecord({...editingFeeRecord, status: e.target.value})}
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="PAID">Paid (Offline)</option>
                    <option value="PAID_ONLINE">Paid (Online)</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="FAILED">Failed</option>
                  </select>
                </div>
              </div>

              <div className="input-group">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Administrative Remarks</label>
                <input 
                  type="text" 
                  placeholder="e.g. Corrected manual calculation error"
                  value={editingFeeRecord.remarks || ''} 
                  onChange={e => setEditingFeeRecord({...editingFeeRecord, remarks: e.target.value})} 
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowEditFeeModal(false); setEditingFeeRecord(null); }} 
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '10px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingFeeRecord}
                  className="btn-primary" 
                  style={{ padding: '0.55rem 1.25rem', borderRadius: '10px', fontSize: '0.9rem', fontWeight: 700 }}
                >
                  {isSavingFeeRecord ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {activeTab === 'profile' && (
        <ProfileEditor role="ADMIN" />
      )}

      {activeTab === 'settings' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>

          {/* Collapsible Accordion 1: Late Fee Penalty Policy */}
          <div className="glass-card" style={{ padding: '0', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <button 
              type="button"
              onClick={() => setShowSettingsLateFee(prev => !prev)}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                background: showSettingsLateFee ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                color: 'var(--text)'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#ef4444' }}>
                  Late Fee Penalty Policy
                </h3>
              </div>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', transition: 'transform 0.3s', transform: showSettingsLateFee ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>

            {showSettingsLateFee && (
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px', width: '100%' }}>
                    {isLoadingSettings ? (
                      <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem' }}>
                        <div style={{ width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      </div>
                    ) : (
                      <>
                        <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: 0 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Daily Penalty Rate (₹)</label>
                          <input 
                            type="number" 
                            min="0"
                            required 
                            value={perDayFine} 
                            onChange={e => setPerDayFine(parseFloat(e.target.value) || 0)} 
                            style={{ padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', outline: 'none', fontSize: '0.9rem' }}
                          />
                        </div>

                        <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: 0 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Flat Fine After 10 Days delay (₹)</label>
                          <input 
                            type="number" 
                            min="0"
                            required 
                            value={flatFineAfter10Days} 
                            onChange={e => setFlatFineAfter10Days(parseFloat(e.target.value) || 0)} 
                            style={{ padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', outline: 'none', fontSize: '0.9rem' }}
                          />
                        </div>

                        <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: 0 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Last Day of Fee Payment in Month (to avoid fine)</label>
                          <input 
                            type="number" 
                            min="1"
                            max="31"
                            required 
                            value={feeDueDay} 
                            onChange={e => setFeeDueDay(parseInt(e.target.value, 10) || 12)} 
                            style={{ padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', outline: 'none', fontSize: '0.9rem' }}
                          />
                        </div>

                        <button 
                          type="submit" 
                          disabled={isSavingSettings}
                          className="btn-primary"
                          style={{ 
                            padding: '0.65rem 1.25rem', 
                            background: 'var(--primary)', 
                            color: 'white', 
                            border: 'none', 
                            borderRadius: '10px', 
                            fontWeight: 700, 
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            marginTop: '0.75rem',
                            alignSelf: 'flex-start',
                            fontSize: '0.875rem'
                          }}
                        >
                          {isSavingSettings ? 'Saving Settings...' : 'Apply Penalty Rules'}
                        </button>
                      </>
                    )}
                  </form>
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Accordion 2: Class-wise Default Monthly Fees */}
          <div className="glass-card" style={{ padding: '0', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <button 
              type="button"
              onClick={() => setShowSettingsClassFees(prev => !prev)}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                background: showSettingsClassFees ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                color: 'var(--text)'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#10b981' }}>
                  Class-wise Default Monthly Fees
                </h3>
              </div>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', transition: 'transform 0.3s', transform: showSettingsClassFees ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>

            {showSettingsClassFees && (
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                {isLoadingSettings ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem' }}>
                    <div style={{ width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                      {Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`).map(cls => (
                        <div key={cls} className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: 0 }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>{cls} Fee (₹)</label>
                          <input 
                            type="number" 
                            min="0"
                            placeholder="0"
                            value={classFees[cls] !== undefined ? classFees[cls] : ""} 
                            onChange={e => {
                              const val = parseFloat(e.target.value);
                              setClassFees(prev => ({
                                ...prev,
                                [cls]: isNaN(val) ? 0 : val
                              }));
                            }}
                            style={{ padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', outline: 'none', fontSize: '0.9rem' }}
                          />
                        </div>
                      ))}
                    </div>

                    {/* Custom Classes Section */}
                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--text)' }}>
                        Custom Classes & Default Fees
                      </h4>
                      
                      {/* List of existing custom classes */}
                      {Object.keys(classFees).filter(cls => !cls.match(/^Class \d+$/)).length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                          {Object.keys(classFees).filter(cls => !cls.match(/^Class \d+$/)).map(cls => (
                            <div key={cls} className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: 0, position: 'relative' }}>
                              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>{cls} Fee (₹)</span>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    const updated = { ...classFees };
                                    delete updated[cls];
                                    setClassFees(updated);
                                  }}
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.8rem', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                                  title="Delete custom class"
                                >
                                  Delete
                                </button>
                              </label>
                              <input 
                                type="number" 
                                min="0"
                                placeholder="0"
                                value={classFees[cls] !== undefined ? classFees[cls] : ""} 
                                onChange={e => {
                                  const val = parseFloat(e.target.value);
                                  setClassFees(prev => ({
                                    ...prev,
                                    [cls]: isNaN(val) ? 0 : val
                                  }));
                                }}
                                style={{ padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', outline: 'none', fontSize: '0.9rem' }}
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Form to add a new custom class inline */}
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', background: 'rgba(0,0,0,0.15)', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ flex: '2 1 180px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Class Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 11th Sci" 
                            value={newFeeClassName} 
                            onChange={e => setNewFeeClassName(e.target.value)} 
                            style={{ padding: '0.5rem 0.75rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', outline: 'none', fontSize: '0.85rem' }} 
                          />
                        </div>
                        <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Default Fee (₹)</label>
                          <input 
                            type="number" 
                            min="0"
                            placeholder="e.g. 4500" 
                            value={newFeeClassAmount} 
                            onChange={e => setNewFeeClassAmount(e.target.value)} 
                            style={{ padding: '0.5rem 0.75rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', outline: 'none', fontSize: '0.85rem' }} 
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => {
                            if(!newFeeClassName.trim() || !newFeeClassAmount) return;
                            setClassFees(prev => ({ ...prev, [newFeeClassName.trim()]: parseFloat(newFeeClassAmount) || 0 }));
                            setNewFeeClassName('');
                            setNewFeeClassAmount('');
                          }} 
                          className="btn-primary" 
                          style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '8px', height: '36px', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                        >
                          Add Custom Class
                        </button>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="btn-primary"
                      style={{ 
                        padding: '0.65rem 1.5rem', 
                        background: '#10b981', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '10px', 
                        fontWeight: 700, 
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        alignSelf: 'flex-start',
                        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                        marginTop: '0.75rem'
                      }}
                    >
                      {isSavingSettings ? 'Saving Class Fees...' : 'Save All Class Fees'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Collapsible Accordion 3: Job Applications */}
          <div className="glass-card" style={{ padding: '0', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <button 
              type="button"
              onClick={() => setShowSettingsCareers(prev => !prev)}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                background: showSettingsCareers ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                color: 'var(--text)'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#3b82f6' }}>
                  Job Applications
                </h3>
              </div>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', transition: 'transform 0.3s', transform: showSettingsCareers ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>

            {showSettingsCareers && (
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                      Job Applications
                    </h4>
                    {jobApplications.length > 0 && (
                      <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '2px 10px', borderRadius: '10px', fontWeight: 800 }}>
                        {jobApplications.length}
                      </span>
                    )}
                  </div>
                  {isLoadingJobApplications ? (
                    <div style={{ textAlign: 'center', padding: '2rem' }}>
                      <div className="spinner" style={{ margin: '0 auto 1rem', width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                      Loading job applications...
                    </div>
                  ) : jobApplications.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                      <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>No job applications yet</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '1.25rem' }}>
                      {jobApplications.map(app => (
                        <div key={app.id} style={{ padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, background: 'rgba(56, 189, 248, 0.12)', color: 'var(--secondary)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                                  {app.position.toUpperCase()}
                                </span>
                                <span style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, background: app.status === 'PENDING' ? 'rgba(245, 158, 11, 0.12)' : app.status === 'SHORTLISTED' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)', color: app.status === 'PENDING' ? '#f59e0b' : app.status === 'SHORTLISTED' ? '#10b981' : '#ef4444', border: `1px solid ${app.status === 'PENDING' ? 'rgba(245,158,11,0.2)' : app.status === 'SHORTLISTED' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                                  {app.status}
                                </span>
                              </div>
                              <h5 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 900, color: 'var(--text)' }}>
                                {app.name}
                              </h5>
                              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                <span>Phone: {app.phone}</span>
                                <span>Email: {app.email}</span>
                                <span>Experience: {app.experience}</span>
                                <span>Submitted: {new Date(app.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                              {app.resumeUrl && (
                                <a href={app.resumeUrl} target="_blank" rel="noopener noreferrer" style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  View Resume
                                </a>
                              )}
                              <select value={app.status} onChange={(e) => handleUpdateJobStatus(app.id, e.target.value)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', padding: '5px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                                <option value="PENDING">Pending</option>
                                <option value="SHORTLISTED">Shortlist</option>
                                <option value="REJECTED">Reject</option>
                              </select>
                              <button onClick={() => handleDeleteJobApplication(app.id)} style={{ background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                                Delete
                              </button>
                            </div>
                          </div>
                          {app.coverLetter && (
                            <div style={{ background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border)', whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5', fontStyle: 'italic' }}>
                              "{app.coverLetter}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Accordion 4: Promote Student Classes */}
          <div className="glass-card" style={{ padding: '0', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <button 
              type="button"
              onClick={() => setShowSettingsPromote(prev => !prev)}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                background: showSettingsPromote ? 'rgba(245, 158, 11, 0.05)' : 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                color: 'var(--text)'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#f59e0b' }}>
                  Promote Student Classes
                </h3>
              </div>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', transition: 'transform 0.3s', transform: showSettingsPromote ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>

            {showSettingsPromote && (
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                <button
                  type="button"
                  onClick={handlePromoteAllStudents}
                  disabled={isPromotingStudents}
                  className="btn-primary"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)',
                  }}
                >
                  {isPromotingStudents ? 'Promoting Students...' : 'Promote All Students Now'}
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Accordion 5: App Version & Updates */}
          <div className="glass-card" style={{ padding: '0', border: '1px solid var(--border)', borderRadius: '16px', overflow: 'hidden' }}>
            <button 
              type="button"
              onClick={() => setShowSettingsAppVersion(prev => !prev)}
              style={{
                width: '100%',
                padding: '0.85rem 1.25rem',
                background: showSettingsAppVersion ? 'rgba(99, 102, 241, 0.05)' : 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                transition: 'all 0.3s ease',
                color: 'var(--text)'
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--primary)' }}>
                  App Version & Updates
                </h3>
              </div>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', transition: 'transform 0.3s', transform: showSettingsAppVersion ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>

            {showSettingsAppVersion && (
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '500px', width: '100%' }}>
                  {isLoadingSettings ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '2.5rem' }}>
                      <div style={{ width: '28px', height: '28px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                    </div>
                  ) : (
                    <>
                      <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', margin: 0 }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Minimum Required App Version</label>
                        <input 
                          type="text" 
                          required 
                          placeholder="e.g. 1.0.0"
                          value={minAppVersion} 
                          onChange={e => setMinAppVersion(e.target.value)} 
                          style={{ padding: '0.65rem 0.85rem', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text)', outline: 'none', fontSize: '0.9rem' }}
                        />
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>
                          If a native mobile app version is older than this, users will be prompted to update.
                        </p>
                      </div>

                      <button 
                        type="submit" 
                        disabled={isSavingSettings}
                        className="btn-primary"
                        style={{ 
                          padding: '0.65rem 1.25rem', 
                          background: 'var(--primary)', 
                          color: 'white', 
                          border: 'none', 
                          borderRadius: '10px', 
                          fontWeight: 700, 
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          marginTop: '0.75rem',
                          alignSelf: 'flex-start',
                          fontSize: '0.875rem'
                        }}
                      >
                        {isSavingSettings ? 'Saving Settings...' : 'Save App Version'}
                      </button>
                    </>
                  )}
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>💵 Staff Salary Ledger & Payroll</h2>
            </div>
            <button 
              onClick={() => setShowAssignSalaryForm(!showAssignSalaryForm)}
              className="btn-primary"
              style={{
                padding: '0.65rem 1.25rem',
                borderRadius: '12px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: showAssignSalaryForm ? 'var(--primary)' : 'var(--secondary)'
              }}
            >
              {showAssignSalaryForm ? '✕ Close Form' : '➕ Assign New Salary'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            
            {/* Generate Salary Form Card */}
            {showAssignSalaryForm && (
              <div className="glass-card animate-scale-up" style={{ padding: '2rem', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text)', borderBottom: '1px dashed var(--border)', paddingBottom: '1rem' }}>
                  📝 Assign New Salary Slip
                </h3>
                
                <form onSubmit={handleGenerateSalary} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Select Teacher *</label>
                    <select
                      required
                      value={salaryTeacherId}
                      onChange={e => handleTeacherChange(e.target.value)}
                      style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
                    >
                      <option value="" style={{ background: 'var(--card-bg)' }}>Choose Faculty member</option>
                      {allTeachers.filter(t => t.role === 'TEACHER').map(t => (
                        <option key={t.id} value={t.id} style={{ background: 'var(--card-bg)' }}>
                          {t.name} ({t.username})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Salary Month *</label>
                    <select
                      required
                      value={salaryMonth}
                      onChange={e => setSalaryMonth(e.target.value)}
                      style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
                    >
                      {(() => {
                        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                        const now = new Date();
                        const result = [];
                        for (let i = -6; i <= 6; i++) {
                          const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                          result.push(`${months[d.getMonth()]} ${d.getFullYear()}`);
                        }
                        return result.map(m => (
                          <option key={m} value={m} style={{ background: 'var(--card-bg)' }}>{m}</option>
                        ));
                      })()}
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Base Salary *</label>
                    <input
                      type="number"
                      min="0"
                      required
                      placeholder="Enter base salary"
                      value={salaryBaseSalary}
                      onChange={e => setSalaryBaseSalary(e.target.value)}
                      style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Bonus (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Bonus amount"
                      value={salaryBonus}
                      onChange={e => setSalaryBonus(e.target.value)}
                      style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Deductions (₹)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="Deductions"
                      value={salaryDeductions}
                      onChange={e => setSalaryDeductions(e.target.value)}
                      style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>Remarks</label>
                    <input
                      type="text"
                      placeholder="e.g. Festival advance, performance award"
                      value={salaryRemarks}
                      onChange={e => setSalaryRemarks(e.target.value)}
                      style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none' }}
                    />
                  </div>

                  <div style={{ gridColumn: 'span 1', display: 'flex' }}>
                    <button
                      type="submit"
                      disabled={isGeneratingSalary}
                      style={{
                        width: '100%',
                        padding: '0.85rem',
                        background: 'var(--secondary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {isGeneratingSalary ? 'Assigning...' : '✨ Assign Salary Slip'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Salary Ledger Card */}
            <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.5rem', color: 'var(--text)', borderBottom: '1px dashed var(--border)', paddingBottom: '1rem' }}>
                📋 Payroll Ledger & Salary Disbursements
              </h3>

              {isFetchingSalaries ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                  <div style={{ width: '35px', height: '35px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px' }}>
                  <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse', fontSize: '0.9rem', color: 'var(--text)' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', color: 'var(--text-muted)', fontWeight: 700, textAlign: 'left' }}>
                        <th style={{ padding: '1rem 0.5rem' }}>Faculty</th>
                        <th style={{ padding: '1rem 0.5rem' }}>Billing Month</th>
                        <th style={{ padding: '1rem 0.5rem' }}>Base Salary</th>
                        <th style={{ padding: '1rem 0.5rem' }}>Bonus / Deductions</th>
                        <th style={{ padding: '1rem 0.5rem' }}>Net Payout</th>
                        <th style={{ padding: '1rem 0.5rem' }}>Status</th>
                        <th style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminSalaries.length > 0 ? adminSalaries.map((s) => (
                        <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            <div style={{ fontWeight: 700 }}>{s.teacher?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{s.teacher?.username}</div>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>{s.month}</td>
                          <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>₹{s.baseSalary.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '1rem 0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            <span style={{ color: s.bonus > 0 ? '#10b981' : 'inherit' }}>+{s.bonus}</span> / <span style={{ color: s.deductions > 0 ? '#ef4444' : 'inherit' }}>-{s.deductions}</span>
                          </td>
                          <td style={{ padding: '1rem 0.5rem', fontWeight: 800, color: 'var(--primary)' }}>₹{s.netPaid.toLocaleString('en-IN')}</td>
                          <td style={{ padding: '1rem 0.5rem' }}>
                            {s.status === 'PAID' ? (
                              <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', alignSelf: 'flex-start' }}>PAID</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>Txn: {s.transactionId}</span>
                              </div>
                            ) : (
                              <span style={{ padding: '3px 10px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 800, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>PENDING</span>
                            )}
                          </td>
                          <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'flex-end' }}>
                              {s.status === 'PENDING' ? (
                                <button
                                  onClick={() => {
                                    setPayoutSalaryRecord(s);
                                    setPayoutTransactionId(`TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
                                    setShowPayoutModal(true);
                                  }}
                                  style={{
                                    padding: '0.4rem 0.8rem',
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  💸 Pay
                                </button>
                              ) : (
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  {s.paidAt ? formatDateDisplay(s.paidAt) : 'Completed'}
                                </div>
                              )}
                              <button
                                onClick={() => {
                                  setEditingSalaryRecord(s);
                                  setEditSalaryMonth(s.month);
                                  setEditSalaryBase(String(s.baseSalary));
                                  setEditSalaryBonus(String(s.bonus));
                                  setEditSalaryDeductions(String(s.deductions));
                                  setEditSalaryRemarks(s.remarks || '');
                                  setEditSalaryStatus(s.status);
                                  setEditSalaryTxnId(s.transactionId || '');
                                  setShowEditSalaryModal(true);
                                }}
                                title="Edit"
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text)',
                                  borderRadius: '8px',
                                  padding: '0.4rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.8rem',
                                  transition: 'all 0.2s'
                                }}
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteSalary(s.id)}
                                title="Delete"
                                style={{
                                  background: 'rgba(239, 68, 68, 0.1)',
                                  border: '1px solid rgba(239, 68, 68, 0.2)',
                                  color: '#ef4444',
                                  borderRadius: '8px',
                                  padding: '0.4rem',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.8rem',
                                  transition: 'all 0.2s'
                                }}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            No salary sheets generated yet. Assign salary slips using the form above.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Salary Payout Disbursement Modal ─────────────────── */}
      {showPayoutModal && payoutSalaryRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', position: 'relative', border: '1px solid var(--secondary)', borderRadius: '24px', background: 'var(--card-bg)' }}>
            <button 
              onClick={() => {
                setShowPayoutModal(false);
                setPayoutSalaryRecord(null);
              }} 
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ×
            </button>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#10b981' }}>💸 Disburse Teacher Salary</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Enter transaction details below to verify payout and auto-sync ledger expenses.</p>

            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: '16px', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.9rem' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Faculty Name</span>
                  <strong style={{ fontSize: '1.05rem' }}>{payoutSalaryRecord.teacher?.name}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Salary Month</span>
                  <strong style={{ fontSize: '1.05rem' }}>{payoutSalaryRecord.month}</strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Base Salary</span>
                  <span style={{ fontWeight: 600 }}>₹{payoutSalaryRecord.baseSalary}</span>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>Net Payout Amount</span>
                  <strong style={{ fontSize: '1.15rem', color: 'var(--primary)' }}>₹{payoutSalaryRecord.netPaid}</strong>
                </div>
              </div>
            </div>

            <form onSubmit={handlePayoutSalary} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Transaction ID *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Bank Transfer ID, UPI Ref ID"
                  value={payoutTransactionId} 
                  onChange={e => setPayoutTransactionId(e.target.value)} 
                  style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none' }}
                />
              </div>

              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Payout Remarks</label>
                <input 
                  type="text" 
                  placeholder="Add any specific comments or method info"
                  value={payoutRemarks} 
                  onChange={e => setPayoutRemarks(e.target.value)} 
                  style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={isProcessingPayout}
                className="btn-primary"
                style={{ 
                  padding: '1rem', 
                  background: '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginTop: '0.5rem'
                }}
              >
                {isProcessingPayout ? 'Processing disbursement...' : '✅ Complete Disbursement'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Salary Edit Modal ─────────────────── */}
      {showEditSalaryModal && editingSalaryRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000, padding: '1rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '500px', padding: '2.5rem', position: 'relative', border: '1px solid var(--border)', borderRadius: '24px', background: 'var(--card-bg)' }}>
            <button 
              onClick={() => {
                setShowEditSalaryModal(false);
                setEditingSalaryRecord(null);
              }} 
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ×
            </button>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--primary)' }}>✏️ Edit Salary Record</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Update details for {editingSalaryRecord.teacher?.name}.</p>

            <form onSubmit={handleEditSalary} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Billing Month *</label>
                  <input 
                    type="text" 
                    required 
                    value={editSalaryMonth} 
                    onChange={e => setEditSalaryMonth(e.target.value)} 
                    style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Status *</label>
                  <select 
                    value={editSalaryStatus} 
                    onChange={e => setEditSalaryStatus(e.target.value)} 
                    style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
                  >
                    <option value="PENDING" style={{ background: 'var(--card-bg)' }}>PENDING</option>
                    <option value="PAID" style={{ background: 'var(--card-bg)' }}>PAID</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Base Salary (₹) *</label>
                  <input 
                    type="number" 
                    required 
                    min="0"
                    value={editSalaryBase} 
                    onChange={e => setEditSalaryBase(e.target.value)} 
                    style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Bonus (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={editSalaryBonus} 
                    onChange={e => setEditSalaryBonus(e.target.value)} 
                    style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Deductions (₹)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={editSalaryDeductions} 
                    onChange={e => setEditSalaryDeductions(e.target.value)} 
                    style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none' }}
                  />
                </div>
                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Transaction ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. UPI Ref (for PAID)"
                    value={editSalaryTxnId} 
                    onChange={e => setEditSalaryTxnId(e.target.value)} 
                    disabled={editSalaryStatus !== 'PAID'}
                    style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none', opacity: editSalaryStatus !== 'PAID' ? 0.5 : 1 }}
                  />
                </div>
              </div>

              <div className="input-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>Remarks</label>
                <input 
                  type="text" 
                  value={editSalaryRemarks} 
                  onChange={e => setEditSalaryRemarks(e.target.value)} 
                  style={{ padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', outline: 'none' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={isSavingSalaryEdit}
                className="btn-primary"
                style={{ 
                  padding: '1rem', 
                  background: 'var(--primary)', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  fontWeight: 700, 
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  marginTop: '0.5rem'
                }}
              >
                {isSavingSalaryEdit ? 'Saving changes...' : '💾 Save Changes'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── View User Details Modal ─────────────────── */}
      {lightboxUrl && typeof window !== 'undefined' && createPortal(<div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setLightboxUrl(null)}><button onClick={() => setLightboxUrl(null)} style={{ position: 'absolute', top: '20px', right: '30px', background: 'none', border: 'none', color: 'white', fontSize: '2.5rem', cursor: 'pointer' }}>&times;</button><img src={lightboxUrl} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }} onClick={(e) => e.stopPropagation()} /></div>, document.body)}

      {selectedUserDetail && typeof window !== 'undefined' && createPortal(
        <div className="modal-overlay-container" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 99999, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card user-details-modal-card" style={{ width: '95%', maxWidth: selectedUserDetail.role === 'STUDENT' ? '1100px' : '650px', padding: '2.5rem', margin: '2rem auto', position: 'relative', border: '1px solid var(--primary)', borderRadius: '24px', background: 'var(--card-bg)' }}>
            <button 
              onClick={() => setSelectedUserDetail(null)} 
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ×
            </button>

            {/* Profile Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ width: '90px', height: '90px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold', border: '3px solid var(--primary)', marginBottom: '1rem', boxShadow: '0 8px 25px rgba(99,102,241,0.2)' }}>
                {selectedUserDetail.photoUrl ? (
                  <img src={selectedUserDetail.photoUrl} alt={selectedUserDetail.name} onClick={() => setLightboxUrl(selectedUserDetail.photoUrl)} style={{ width: '100%', height: '100%', objectFit: 'cover', cursor: 'zoom-in' }} />
                ) : (
                  (selectedUserDetail.name || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 800, color: 'var(--text)' }}>{selectedUserDetail.name || 'Unnamed User'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedUserDetail.username}</span>
                <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '100px', fontWeight: 800, background: selectedUserDetail.role === 'ADMIN' ? 'rgba(239,68,68,0.15)' : selectedUserDetail.role === 'TEACHER' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)', color: selectedUserDetail.role === 'ADMIN' ? '#f87171' : selectedUserDetail.role === 'TEACHER' ? '#34d399' : '#60a5fa' }}>
                  {selectedUserDetail.role}
                </span>
                {selectedUserDetail.role === 'STUDENT' && (
                  <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '100px', fontWeight: 800, background: selectedUserDetail.isActive !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: selectedUserDetail.isActive !== false ? '#10b981' : '#ef4444' }}>
                    {selectedUserDetail.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                )}
              </div>
            </div>

            {/* Summary Metric Cards for Student */}
            {selectedUserDetail.role === 'STUDENT' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pending Fee</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#ef4444', marginTop: '4px' }}>
                    ₹{(
                      fees.filter(f => f.studentId === selectedUserDetail.id && f.status === 'PENDING')
                        .reduce((sum, f) => sum + (f.amount + (f.lateFine || 0) - (f.discount || 0) - (f.paidAmount || 0)), 0) ||
                      selectedUserDetail.studentProfile?.baseFee || 0
                    ).toLocaleString('en-IN')}
                  </div>
                </div>

                <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Attendance</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#10b981', marginTop: '4px' }}>
                    {selectedUserDetail.studentAttendance && selectedUserDetail.studentAttendance.length > 0
                      ? Math.round((selectedUserDetail.studentAttendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length / selectedUserDetail.studentAttendance.length) * 100) + '%'
                      : (selectedUserDetail.studentProfile?.attendancePercent != null ? selectedUserDetail.studentProfile.attendancePercent + '%' : '100%')}
                  </div>
                </div>

                <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Avg Marks</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, color: '#3b82f6', marginTop: '4px' }}>
                    {selectedUserDetail.studentTestResults && selectedUserDetail.studentTestResults.length > 0
                      ? Math.round(selectedUserDetail.studentTestResults.reduce((acc: number, r: any) => acc + ((r.marks / (r.totalMarks || 100)) * 100), 0) / selectedUserDetail.studentTestResults.length) + '%'
                      : (selectedUserDetail.studentProfile?.marksObtained != null && selectedUserDetail.studentProfile?.marksTotal
                          ? Math.round((selectedUserDetail.studentProfile.marksObtained / selectedUserDetail.studentProfile.marksTotal) * 100) + '%'
                          : 'N/A')}
                  </div>
                </div>
              </div>
            )}

            {/* Profile Info Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: 'var(--text)' }}>
              
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                📇 Contact & Registration Details
              </div>

              {selectedUserDetail.role === 'STUDENT' && selectedUserDetail.studentProfile && (
                <>
                  <div className="user-details-modal-grid-2col">
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Registration No</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.registrationNo || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Grade/Class</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.className || selectedUserDetail.studentProfile.grade || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="user-details-modal-grid-2col">
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>School</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.school || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Board</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.board || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="user-details-modal-grid-2col">
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Base Fee (Monthly)</div>
                      <div style={{ fontWeight: 800, color: '#10b981' }}>₹{selectedUserDetail.studentProfile.baseFee || 0}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Date of Birth</div>
                      <div style={{ fontWeight: 600 }}>{formatDobDisplay(selectedUserDetail.studentProfile.dob)}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Board</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.board || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Scholarship Amount</div>
                      <div style={{ fontWeight: 800, color: '#f59e0b' }}>₹{selectedUserDetail.studentProfile.scholarship || 0}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Personal Email</div>
                    <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.email || 'N/A'}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Student Phone</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.phone || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Parent Contact</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.parentContact || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Gender</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.gender || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Religion</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.religion || 'N/A'}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Father Name</div>
                    <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.fatherName || 'N/A'}</div>
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Aadhaar Number</div>
                    <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.aadhaarNumber || 'N/A'}</div>
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Address</div>
                    <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.address || 'N/A'}</div>
                  </div>
                </>
              )}

              {selectedUserDetail.role === 'TEACHER' && selectedUserDetail.teacherProfile && (
                <>
                  <div className="user-details-modal-grid-2col">
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Subject Expertise</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.subject || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Qualification</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.qualification || 'N/A'}</div>
                    </div>
                  </div>

                  <div className="user-details-modal-grid-2col">
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Experience</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.experience || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Monthly Salary</div>
                      <div style={{ fontWeight: 800, color: '#ef4444' }}>₹{selectedUserDetail.teacherProfile.salary || 0}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Email</div>
                    <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.email || 'N/A'}</div>
                  </div>

                  <div className="user-details-modal-grid-2col">
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Phone</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.phone || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Date of Birth</div>
                      <div style={{ fontWeight: 600 }}>{formatDobDisplay(selectedUserDetail.teacherProfile.dob)}</div>
                    </div>
                  </div>

                  <div className="user-details-modal-grid-2col">
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Gender</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.gender || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Religion</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.religion || 'N/A'}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Address</div>
                    <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.address || 'N/A'}</div>
                  </div>
                </>
              )}

              {selectedUserDetail.role === 'ADMIN' && (
                <>
                  {selectedUserDetail.teacherProfile ? (
                    <>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Email</div>
                        <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.email || 'N/A'}</div>
                      </div>

                      <div className="user-details-modal-grid-2col">
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Phone</div>
                          <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.phone || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Date of Birth</div>
                          <div style={{ fontWeight: 600 }}>{formatDobDisplay(selectedUserDetail.teacherProfile.dob)}</div>
                        </div>
                      </div>

                      <div className="user-details-modal-grid-2col">
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Gender</div>
                          <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.gender || 'N/A'}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Religion</div>
                          <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.religion || 'N/A'}</div>
                        </div>
                      </div>

                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Address</div>
                        <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.address || 'N/A'}</div>
                      </div>
                    </>
                  ) : (
                    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      💼 Admin profiles have full system-wide permissions and do not maintain restricted student or teacher records.
                    </div>
                  )}
                </>
              )}
                  
              {selectedUserDetail.role === 'STUDENT' && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📝 Student Test & Exam Performance</h3>
                  {selectedUserDetail.studentTestResults && selectedUserDetail.studentTestResults.length > 0 ? (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px', background: 'rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 12px' }}>Test Title</th>
                              <th style={{ padding: '8px 12px' }}>Subject</th>
                              <th style={{ padding: '8px 12px' }}>Date</th>
                              <th style={{ padding: '8px 12px' }}>Score</th>
                              <th style={{ padding: '8px 12px' }}>Percentage</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedUserDetail.studentTestResults.map((tr: any) => {
                              const pct = Math.round((tr.marks / (tr.totalMarks || 100)) * 100);
                              return (
                                <tr key={tr.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                  <td style={{ padding: '8px 12px', fontWeight: 600 }}>{tr.test?.title || 'Class Assessment'}</td>
                                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{tr.test?.subject || 'General'}</td>
                                  <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{tr.test?.date ? new Date(tr.test.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</td>
                                  <td style={{ padding: '8px 12px', fontWeight: 700 }}>{tr.marks} / {tr.totalMarks}</td>
                                  <td style={{ padding: '8px 12px' }}>
                                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, background: pct >= 75 ? 'rgba(16, 185, 129, 0.15)' : pct >= 50 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: pct >= 75 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444' }}>
                                      {pct}%
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No test/exam marks recorded for this student yet.
                    </div>
                  )}
                </div>
              )}

              {selectedUserDetail.role === 'STUDENT' && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>📅 Student Attendance Record</h3>
                  {selectedUserDetail.studentAttendance && selectedUserDetail.studentAttendance.length > 0 ? (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#10b981' }}>
                            {selectedUserDetail.studentAttendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length} / {selectedUserDetail.studentAttendance.length}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Present Days</div>
                        </div>
                        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#ef4444' }}>
                            {selectedUserDetail.studentAttendance.filter((a: any) => a.status === 'ABSENT').length}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Absent Days</div>
                        </div>
                        <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#3b82f6' }}>
                            {Math.round((selectedUserDetail.studentAttendance.filter((a: any) => a.status === 'PRESENT' || a.status === 'LATE').length / selectedUserDetail.studentAttendance.length) * 100)}%
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>Attendance %</div>
                        </div>
                      </div>

                      <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '10px', background: 'rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                              <th style={{ padding: '8px 12px' }}>Date</th>
                              <th style={{ padding: '8px 12px' }}>Batch</th>
                              <th style={{ padding: '8px 12px' }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedUserDetail.studentAttendance.slice(0, 15).map((att: any) => (
                              <tr key={att.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{new Date(att.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{att.batch?.name || 'Standard Batch'}</td>
                                <td style={{ padding: '8px 12px' }}>
                                  <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 800, background: att.status === 'PRESENT' ? 'rgba(16, 185, 129, 0.15)' : att.status === 'ABSENT' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: att.status === 'PRESENT' ? '#10b981' : att.status === 'ABSENT' ? '#ef4444' : '#f59e0b' }}>
                                    {att.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                      No attendance logs recorded for this student yet.
                    </div>
                  )}
                </div>
              )}

              {selectedUserDetail.role === 'STUDENT' && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🏦 Fee Details</h3>
                  <div className="scrollable-ledger-container">
                    <StudentLedger 
                      studentId={selectedUserDetail.id}
                      isAdmin={true}
                      refreshTrigger={ledgerRefreshTrigger}
                      onCollect={(fee) => {
                        setPayingFee(fee);
                        setShowPaymentModal(true);
                        setPaymentDetails({
                          paymentMethod: 'CASH',
                          transactionId: '',
                          discount: fee.discount,
                          remarks: '',
                          paidAmount: (fee.amount + (Math.max(fee.lateFine || 0, fee.currentLateFine || 0)) - fee.discount - (fee.paidAmount || 0)).toString(),
                          paidAt: new Date().toISOString().split('T')[0]
                        });
                      }}
                      onEdit={(fee) => {
                        setEditingFeeRecord(fee);
                        setShowEditFeeModal(true);
                      }}
                      onDelete={(feeId) => {
                        openDelModal(feeId);
                      }}
                      onViewReceipt={async (feeId) => {
                        try {
                          const res = await fetch(`/api/student/fees/receipt/${feeId}`);
                          if (res.ok) {
                            const data = await res.json();
                            setActiveReceipt(data.fee);
                          } else {
                            const d = await res.json();
                            alert(d.error || 'Failed to open receipt.');
                          }
                        } catch (e) {
                          console.error(e);
                          alert('Network error. Failed to load receipt.');
                        }
                      }}
                      onVerify={async (feeId) => {
                        await updateFeeStatus(feeId, 'VERIFIED');
                      }}
                    />
                  </div>
                </div>
              )}

              <div style={{ height: '1px', background: 'var(--border)', margin: '1rem 0' }}></div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  onClick={() => {
                    const u = selectedUserDetail;
                    setSelectedUserDetail(null);
                    fetchProfile(u.id, u.role);
                  }}
                  className="btn-primary" 
                  style={{ flex: 1, padding: '0.85rem' }}
                >
                  ✎ Edit
                </button>
                <button 
                  onClick={() => setSelectedUserDetail(null)} 
                  style={{ flex: 1, padding: '0.85rem', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Security / Password Verification Backdrop Modal ─────────────────── */}
      {securityConfirm.isOpen && typeof window !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100200, padding: '1rem' }} className="no-print">
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', border: '2px solid #ef4444', background: 'var(--card-bg)', borderRadius: '24px', boxShadow: '0 10px 40px rgba(239, 68, 68, 0.2)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                🔒
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171', margin: 0 }}>{securityConfirm.title || 'Security Authorization'}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px', lineHeight: '1.4' }}>{securityConfirm.description || 'To continue with this sensitive operation, please verify your login password.'}</p>
            </div>

            <form onSubmit={handleSecurityVerification} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label style={{ color: '#f87171', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Enter Admin Password</label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••••" 
                  value={securityPassword} 
                  onChange={e => setSecurityPassword(e.target.value)} 
                  style={{ width: '100%', padding: '1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1.1rem', textAlign: 'center' }} 
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setSecurityConfirm(prev => ({ ...prev, isOpen: false }))} 
                  className="btn-secondary"
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={securityConfirm.isProcessing || !securityPassword} 
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {securityConfirm.isProcessing ? 'Authorizing...' : 'Authorize ✔'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {activeProfileUserId && (
        <UserProfileModal 
          userId={activeProfileUserId} 
          onClose={() => setActiveProfileUserId(null)} 
          onStartChat={(user) => {
            setChatSelectedUserId(user.id);
            handleTabChange('messages');
          }}
        />
      )}

      {/* ── Batch Messaging Broadcast Modal ─────────────────── */}
      {batchMsgTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100000, padding: '1rem' }} className="no-print">
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '500px', padding: '2rem', border: '1px solid var(--border)', background: 'var(--card-bg)', borderRadius: '24px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--primary)', margin: 0, marginBottom: '0.5rem' }}>💬 Message Students in {batchMsgTarget.name}</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.4 }}>This message will be broadcast directly as a separate chat message to every student enrolled in this batch.</p>
            
            <form onSubmit={handleSendBatchMessage} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="input-group" style={{ margin: 0 }}>
                <label style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--text-muted)' }}>Write Message</label>
                <textarea 
                  required
                  rows={4}
                  placeholder="Type announcement or message for students..."
                  value={batchMsgContent}
                  onChange={e => setBatchMsgContent(e.target.value)}
                  style={{ width: '100%', padding: '1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '0.95rem', resize: 'vertical' }}
                  autoFocus
                />
              </div>
              
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => { setBatchMsgTarget(null); setBatchMsgContent(''); }}
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSendingBatchMsg || !batchMsgContent.trim()}
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700 }}
                >
                  {isSendingBatchMsg ? 'Sending...' : 'Send Message ➔'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">Loading Dashboard...</div>}>
      <AdminDashboardContent />
    </Suspense>
  );
}
