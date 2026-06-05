"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
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
  const [ledgerViewMode, setLedgerViewMode] = useState<'ALL' | 'FIRST_10' | 'ASSIGNED_FEES'>('ALL');
  const [statementMonth, setStatementMonth] = useState(new Date().toLocaleString('en-US', { month: 'long' }));
  const [statementYear, setStatementYear] = useState(String(new Date().getFullYear()));
  const [isLedgerListOpen, setIsLedgerListOpen] = useState(false);
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
    const interval = setInterval(fetchUnreadCounts, 6000);
    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    if (!session?.user) return;
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
    if (tab === 'courses') {
      fetchCourses();
      fetchBatches();
      fetchTeachers();
      // Fetch all students automatically for batch enrollment
      fetch('/api/admin/directory?q=').then(res => res.json()).then(data => setDirectoryUsers(data.users || []));
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
    classStats?: Array<{ className: string; count: number }>;
  } | null>(null);
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
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [classFees, setClassFees] = useState<Record<string, number>>({});
  const [newFeeClassName, setNewFeeClassName] = useState('');
  const [newFeeClassAmount, setNewFeeClassAmount] = useState('');
  const [showSettingsLateFee, setShowSettingsLateFee] = useState(false);
  const [showSettingsClassFees, setShowSettingsClassFees] = useState(false);

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
  const [adminGuruHistory, setAdminGuruHistory] = useState<Array<{ role: 'user' | 'guru', content: string, subject?: string }>>([
    { role: 'guru', content: `Hello, Admin! 👋 I am Digital Sahayak, your premium administrative and planning assistant. Let's make scheduling and learning management incredibly streamlined today!` }
  ]);
  const [adminGuruLoading, setAdminGuruLoading] = useState(false);

  // Lesson PPT/Notes Generator States
  const [pptTopic, setPptTopic] = useState('');
  const [pptGrade, setPptGrade] = useState('Class 10');
  const [pptFocus, setPptFocus] = useState('Comprehensive explanations, formulas, derivations, and 5 MCQs');
  const [pptSlideCount, setPptSlideCount] = useState(5);
  const [pptGenerating, setPptGenerating] = useState(false);
  const [generatedPpt, setGeneratedPpt] = useState<any>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

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

  const printAdminPpt = () => {
    if (!generatedPpt) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Sudhir Tutorials - Premium Lesson Slides: ${generatedPpt.topic}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .slide-page { page-break-after: always; border: 2px solid #ef4444; border-radius: 12px; padding: 30px; margin-bottom: 40px; background: #fff; min-height: 500px; display: flex; flexDirection: column; justify-content: space-between; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { margin: 0; font-size: 20px; color: #ef4444; font-weight: 800; }
            .badge { background: #ef4444; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
            .meta { font-size: 13px; color: #6b7280; margin-top: 5px; }
            .content { font-size: 16px; line-height: 1.6; color: #374151; flex: 1; whiteSpace: pre-line; }
            .footer { border-top: 1px dashed #d1d5db; padding-top: 15px; margin-top: 20px; display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; font-weight: bold; }
            .logo-text { font-size: 16px; font-weight: 900; color: #ef4444; letter-spacing: 0.5px; }
          </style>
        </head>
        <body>
          ${generatedPpt.slides.map((s: any, idx: number) => `
            <div class="slide-page">
              <div>
                <div class="header">
                  <div>
                    <h1>${s.title}</h1>
                    <div class="meta">${s.subtitle || ''}</div>
                  </div>
                  <div class="badge">${s.badge}</div>
                </div>
                <div style="font-size:12px; color:#6b7280; margin-bottom: 15px; font-weight: bold;">${s.meta}</div>
                <div class="content">${s.content.replace(/\n/g, '<br/>')}</div>
              </div>
              <div class="footer">
                <span class="logo-text">SUDHIR TUTORIALS</span>
                <span>Slide ${idx + 1} of ${generatedPpt.slides.length}</span>
              </div>
            </div>
          `).join('')}
          <script>
            window.onload = function() { window.print(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const askAdminGuru = async () => {
    if (!adminGuruQuestion.trim()) return;
    const q = adminGuruQuestion;
    const subj = adminGuruSubject;
    setAdminGuruQuestion('');
    setAdminGuruHistory(prev => [...prev, { role: 'user', content: q, subject: subj }]);
    setAdminGuruLoading(true);

    try {
      const res = await fetch('/api/student/guru-ji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, subject: subj, language: adminGuruLanguage })
      });
      if (res.ok) {
        const data = await res.json();
        setAdminGuruHistory(prev => [...prev, { role: 'guru', content: data.solution }]);
      } else {
        setAdminGuruHistory(prev => [...prev, { role: 'guru', content: 'Sorry, I encountered a connection issue. Please try seeking my guidance again.' }]);
      }
    } catch (e) {
      setAdminGuruHistory(prev => [...prev, { role: 'guru', content: 'Network connection error occurred.' }]);
    } finally {
      setAdminGuruLoading(false);
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
  const [newTest, setNewTest] = useState({ title: '', subject: '', courseId: '', date: new Date().toISOString().split('T')[0], time: '', syllabus: '' });
  const [testStudents, setTestStudents] = useState<any[]>([]);

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
  const [isSearching, setIsSearching] = useState(false);
  const [directoryFilter, setDirectoryFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER' | 'ADMIN'>('ALL');

  // Finance State
  const [financeStudentSearchQuery, setFinanceStudentSearchQuery] = useState('');
  const [showFinanceSuggestions, setShowFinanceSuggestions] = useState(false);
  const [fees, setFees] = useState<any[]>([]);
  const [feeSearchQuery, setFeeSearchQuery] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [addFeeMode, setAddFeeMode] = useState<'INDIVIDUAL' | 'BATCH'>('INDIVIDUAL');
  const [feeStudentId, setFeeStudentId] = useState('');
  const [feeStudentSearch, setFeeStudentSearch] = useState(''); // for combobox display text
  const [feeAmount, setFeeAmount] = useState('');
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

  const calculateLiveLateFine = (dueDateStr: string, paidAtStr: string) => {
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
    const monthsLate = Math.floor((daysLate - 1) / 30) + 1;
    return monthsLate * flatFineAfter10Days;
  };

  // Extract unique months from fees array
  const uniqueBillingMonths = Array.from(new Set(fees.map(f => f.billingMonth).filter(Boolean))).sort((a, b) => b.localeCompare(a));
  const uniqueLedgerYears = Array.from(new Set(uniqueBillingMonths.map((m: string) => m.split(' ').pop()).filter(Boolean))).sort((a: any, b: any) => b.localeCompare(a));

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
  const [finSummary, setFinSummary] = useState<{ totalRevenue: number, totalExpenses: number, totalPending: number, netProfit: number, monthlyData: any[] } | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: '', category: 'OTHER', amount: '', remarks: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingFee, setPayingFee] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState({ paymentMethod: 'CASH', transactionId: '', discount: 0, remarks: '', paidAmount: '', paidAt: '' });

  // Courses & Batches State
  const [courses, setCourses] = useState<any[]>([]);
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

  const fetchFinances = async () => {
    try {
      const res = await fetch(`/api/admin/finances?t=${Date.now()}`);
      const data = await res.json();
      if (res.ok) {
        setFees(data.fees || []);
        setFinanceRefreshTrigger(prev => prev + 1);
      }
    } catch (err) {
      console.error(err);
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
    try {
      const res = await fetch('/api/admin/finances/summary');
      if (res.ok) setFinSummary(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/admin/finances/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
      }
    } catch (err) { console.error(err); }
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

  const downloadReceiptPDF = async (receiptId: string) => {
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
        margin: [10, 10, 10, 10],
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

      await (window as any).html2pdf().from(original).set(opt).save();
      
      // Restore the buttons
      if (buttons) buttons.style.display = 'flex';
    } catch (err) {
      console.error(err);
      alert('Failed to generate PDF. Please use the Print option.');
    } finally {
      setDownloadingPDF(false);
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
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setOverviewStats(data);
        if (data.activityLogs) setActivityLogs(data.activityLogs);
      }
    } catch (err) { console.error(err); }
  };

  const fetchSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const res = await fetch('/api/admin/settings');
      if (res.ok) {
        const data = await res.json();
        setPerDayFine(data.perDayFine ?? 10);
        setFlatFineAfter10Days(data.flatFineAfter10Days ?? 100);
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
        body: JSON.stringify({ perDayFine, flatFineAfter10Days, classFees })
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

  useEffect(() => {
    if (!session?.user) return;
    fetchUnreadCounts();
    if (activeTab === 'overview') {
      fetchOverviewStats();
      // Auto-refresh revenue every 30 s while on overview tab
      const overviewInterval = setInterval(fetchOverviewStats, 30000);
      return () => clearInterval(overviewInterval);
    }
    if (activeTab === 'users') handleSearchDirectory(); // always load all users on tab switch
    if (activeTab === 'finances') {
      fetchFinances();
      fetchExpenses();
      fetchFinSummary();
      handleSearchDirectory(); // populate student dropdown
      fetchBatches();          // populate batch dropdown
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const now = new Date();
      const currentMonth = `${months[now.getMonth()]} ${now.getFullYear()}`;
      setAutoBillingMonth(currentMonth);
      fetchAutoBillingPreview(currentMonth);
    }
    if (activeTab === 'verifications') fetchPendingVerifications();
    if (activeTab === 'courses' || (activeTab === 'academics' && academicSubTab === 'courses')) {
      fetchCourses();
      fetchBatches();
      fetchTeachers();
      fetch('/api/admin/directory?q=').then(res => res.json()).then(data => setDirectoryUsers(data.users || []));
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
    }
    if (activeTab === 'salary') {
      fetchTeachers();
      fetchAdminSalaries();
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
        alert(`Billing generated successfully!\nProcessed: ${data.totalProcessed}\nCreated: ${data.createdCount}\nSkipped: ${data.skippedCount}`);
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
          ...(profileData || {}),
          dob: formattedDob,
          ...(role === 'TEACHER' && userData.teacherBatches?.length > 0 && { batch: userData.teacherBatches[0].name })
        });
        setShowProfileModal(true);
      }
    } catch (e) { console.error(e); }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
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
      <header className="dashboard-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            जय सियाराम 🙏 <span style={{ color: '#ef4444' }}>{session?.user?.name || 'Admin'}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Welcome back, Admin. Manage your institute's members here.</p>
        </div>
        <LiveClock />
      </header>



      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem', overflowX: 'auto' }} className="no-print">
        {['overview', 'users', 'verifications', 'finances', 'salary', 'academics', 'guru-ai', 'messages', 'notifications', 'profile', 'settings'].map(tab => (
          <button 
            key={tab}
            onClick={() => {
              handleTabChange(tab);
              if (tab === 'academics') setAcademicSubTab('menu');
            }}
            style={{ 
              padding: '0.75rem 1rem', 
              background: 'transparent', 
              border: 'none', 
              color: activeTab === tab ? '#ef4444' : 'var(--text-muted)', 
              borderBottom: activeTab === tab ? '2px solid #ef4444' : '2px solid transparent', 
              fontWeight: 600, 
              textTransform: 'capitalize',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
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
             tab === 'guru-ai' ? 'Academic Assistant' :
             tab === 'messages' ? 'Messages' :
             tab === 'notifications' ? 'Notifications' :
             tab === 'profile' ? 'My Profile' :
             tab === 'settings' ? 'System Settings' :
             tab}
          </button>
        ))}
      </div>

      {/* Academic Sub-tab Back Navigation Header */}
      {activeTab === 'academics' && academicSubTab !== 'menu' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '2rem' }} className="no-print">
          <button 
            onClick={() => setAcademicSubTab('menu')}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              padding: '0.6rem 1.25rem',
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
            className="academic-back-btn"
          >
            ⬅ Back to Academic Services Menu
          </button>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Academic Service / {academicSubTab === 'courses' ? 'Courses & Batches' : academicSubTab === 'attendance' ? 'Attendance Logs' : academicSubTab === 'materials' ? 'Study Materials' : academicSubTab === 'tests' ? 'Tests & Exams' : academicSubTab === 'analytics' ? 'Performance Analytics' : academicSubTab === 'lectures' ? 'Live Classes' : academicSubTab === 'admissions' ? 'Admissions Inquiries' : academicSubTab}
          </span>
        </div>
      )}

      {/* Academic Services Menu Dashboard */}
      {activeTab === 'academics' && academicSubTab === 'menu' && (
        <div className="glass-card animate-fade-in" style={{ padding: '2.5rem', border: '1px solid var(--border)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem', color: '#ef4444' }}>🎓 Academic Services</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', fontSize: '0.95rem' }}>Streamline your academy's classes, syllabus uploads, schedules, exams, and performance metrics.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              { id: 'courses', title: '🏫 Courses & Batches', desc: 'Configure courses, manage batches, fee pricing plans, and assigned faculties.', color: 'rgba(239, 68, 68, 0.05)', border: '#ef4444', textColor: '#ef4444' },
              { id: 'attendance', title: '✏️ Student Attendance', desc: 'Track daily attendance logs, view student check-in history, and download reports.', color: 'rgba(16, 185, 129, 0.05)', border: '#10b981', textColor: '#10b981' },
              { id: 'materials', title: '📚 Study Materials & Content', desc: 'Upload and organize syllabus books, worksheets, PDFs, notes, and lectures.', color: 'rgba(59, 130, 246, 0.05)', border: '#3b82f6', textColor: '#3b82f6' },
              { id: 'tests', title: '📝 Tests & Assessments', desc: 'Schedule periodic tests, configure grading criteria, and record student marks.', color: 'rgba(245, 158, 11, 0.05)', border: '#f59e0b', textColor: '#f59e0b' },
              { id: 'analytics', title: '📈 Performance Analytics', desc: 'Get graphical insights on class progress, marks distribution, and attendance trends.', color: 'rgba(236, 72, 153, 0.05)', border: '#ec4899', textColor: '#ec4899' },
              { id: 'lectures', title: '📺 Live Online Lectures', desc: 'Set up live interactive Zoom/Meet streams, timetables, and lecture video links.', color: 'rgba(139, 92, 246, 0.05)', border: '#8b5cf6', textColor: '#8b5cf6' },
              { id: 'admissions', title: '🏫 Admissions Inquiries', desc: 'Review, approve, or reject student enrollment inquiries, and register them as students.', color: 'rgba(239, 68, 68, 0.05)', border: '#ef4444', textColor: '#ef4444' },
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
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{svc.desc}</p>
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
          {/* Key Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
            {[
              {label: 'Total Students', value: overviewStats?.totalStudents ?? 0, icon: '👥', color: '#ef4444' },
              { label: 'Active Teachers', value: overviewStats?.totalTeachers ?? 0, icon: '👨‍🏫', color: '#10b981' },
              { label: 'Revenue This Month', value: `₹${(overviewStats?.revenueThisMonth ?? 0).toLocaleString()}`, icon: '💰', color: '#3b82f6' },
              { label: 'Pending Dues', value: `₹${(overviewStats?.pendingDues ?? 0).toLocaleString()}`, icon: '⚠️', color: '#ef4444' }
            ].map((stat, i) => (
              <div key={i} className="glass-card animate-scale-up" style={{ padding: '1.75rem', borderLeft: `4px solid ${stat.color}`, background: 'var(--card-bg)', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', fontSize: '2rem', opacity: 0.12 }}>{stat.icon}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 700 }}>{stat.label}</div>
                <div style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text)' }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Premium Widgets Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
            {/* Class & Batch Analytics */}
            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '1rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  📊 Class & Batch Analytics
                </h3>
                <span className="role-badge" style={{ fontSize: '0.65rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', border: '1px solid rgba(99, 102, 241, 0.3)' }}>REAL-TIME</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Batches</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0', color: 'var(--text)' }}>{overviewStats?.totalBatches ?? 0}</div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Courses</div>
                  <div style={{ fontSize: '1.8rem', fontWeight: 800, margin: '4px 0', color: 'var(--text)' }}>{overviewStats?.totalCourses ?? 0}</div>
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

            {/* Live Operations Activity Logger */}
            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.25rem', fontWeight: 800, color: '#ef4444', borderBottom: '1px dashed var(--border)', paddingBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📋 Recent Operations Log
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
                {(showAllActivities ? activityLogs : activityLogs.slice(0, 5)).length > 0 ? (showAllActivities ? activityLogs : activityLogs.slice(0, 5)).map((log, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.75rem', padding: '0.5rem', background: 'rgba(255,255,255,0.01)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                    <div style={{ width: '4px', background: '#3b82f6', borderRadius: '4px', flexShrink: 0 }}></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.action}</span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                          {new Date(log.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {log.details || 'No details'} (by <span 
                          onClick={() => { if (log.userId) setActiveProfileUserId(log.userId); }}
                          style={{ cursor: 'pointer', textDecoration: 'underline decoration-dotted', fontWeight: 600 }}
                          className="clickable-name"
                        >
                          {log.user?.name || 'System'}
                        </span>)
                      </div>
                    </div>
                  </div>
                )) : (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No recent operations found.
                  </div>
                )}
              </div>
              {activityLogs.length > 5 && (
                <button
                  onClick={() => setShowAllActivities(!showAllActivities)}
                  style={{
                    marginTop: '1.25rem',
                    padding: '0.75rem 1.25rem',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    borderRadius: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    fontSize: '0.85rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                >
                  {showAllActivities ? '📂 Collapse Operations Log' : `📂 View More Operations (${activityLogs.length - 5} more)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'verifications' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Pending Profile & Fee Verifications</h2>
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

      {activeTab === 'users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Sub-Tab Navigation Header */}
          <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '16px', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
            <button 
              onClick={() => setUserSubTab('DIRECTORY')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: userSubTab === 'DIRECTORY' ? 'var(--primary)' : 'transparent',
                color: userSubTab === 'DIRECTORY' ? '#fff' : 'var(--text-muted)',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              👥 Members Directory
            </button>
            <button 
              onClick={() => setUserSubTab('CREATE')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: userSubTab === 'CREATE' ? 'var(--primary)' : 'transparent',
                color: userSubTab === 'CREATE' ? '#fff' : 'var(--text-muted)',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              ➕ Add new Student/Teacher/Admin
            </button>
          </div>

          {userSubTab === 'DIRECTORY' && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>User Directory</h2>
                <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px' }}>
                  <button onClick={() => setDirectoryFilter('ALL')} style={{ padding: '0.5rem 1rem', background: directoryFilter === 'ALL' ? 'var(--primary)' : 'transparent', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>All</button>
                  <button onClick={() => setDirectoryFilter('STUDENT')} style={{ padding: '0.5rem 1rem', background: directoryFilter === 'STUDENT' ? 'var(--primary)' : 'transparent', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Students</button>
                  <button onClick={() => setDirectoryFilter('TEACHER')} style={{ padding: '0.5rem 1rem', background: directoryFilter === 'TEACHER' ? '#10b981' : 'transparent', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Teachers</button>
                  <button onClick={() => setDirectoryFilter('ADMIN')} style={{ padding: '0.5rem 1rem', background: directoryFilter === 'ADMIN' ? '#f59e0b' : 'transparent', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>Admins</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <input 
                  type="text" 
                  placeholder="Search by Name or ID (e.g. STU12345)" 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchDirectory()}
                  style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
                <button onClick={handleSearchDirectory} className="btn-primary" disabled={isSearching} style={{ padding: '0 2rem' }}>
                  {isSearching ? "Searching..." : "Search"}
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {directoryUsers.filter(u => directoryFilter === 'ALL' || u.role === directoryFilter).length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', gridColumn: '1/-1', textAlign: 'center', padding: '3rem 0' }}>No users found.</p>
                ) : (
                  directoryUsers.filter(u => directoryFilter === 'ALL' || u.role === directoryFilter).map(u => (
                    <div key={u.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                        <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 'bold', border: '2px solid var(--primary)', flexShrink: 0 }}>
                          {u.photoUrl ? (
                            <img src={u.photoUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            (u.name || 'U').charAt(0).toUpperCase()
                          )}
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <span 
                              onClick={() => setActiveProfileUserId(u.id)}
                              style={{ fontWeight: 'bold', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', cursor: 'pointer' }}
                              className="clickable-name"
                            >
                              {u.name || 'Unnamed'}
                            </span>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '20px', background: u.role === 'TEACHER' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)', color: u.role === 'TEACHER' ? '#34d399' : '#818cf8', flexShrink: 0 }}>
                              {u.role}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{u.username}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Joined: {((() => { const d = new Date(u.createdAt); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <button 
                          onClick={() => setSelectedUserDetail(u)}
                          style={{ flex: 1, padding: '0.5rem', background: 'var(--primary)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
                        >
                          🔍 Details
                        </button>
                        <button 
                          onClick={() => fetchProfile(u.id, u.role)}
                          style={{ flex: 1, padding: '0.5rem', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}
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
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Create New Users</h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Generate auto-IDs (FAC* / STU*) for new teachers and students. The system will automatically generate an initial secure password.</p>
              
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
                  <input type="text" placeholder="e.g. Rahul Kumar" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
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
                      <input type="text" placeholder="e.g. Ramesh Kumar" value={newStudentFatherName} onChange={e => setNewStudentFatherName(e.target.value)} style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="input-group">
                      <label>Contact Phone</label>
                      <input type="text" placeholder="e.g. 9876543210" value={newStudentPhone} onChange={e => setNewStudentPhone(e.target.value)} style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="input-group">
                      <label>Email Address</label>
                      <input type="email" placeholder="e.g. student@gmail.com" value={newStudentEmail} onChange={e => setNewStudentEmail(e.target.value)} style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
                    </div>
                    <div className="input-group">
                      <label>Residential Address</label>
                      <input type="text" placeholder="e.g. 123 Street, City" value={newStudentAddress} onChange={e => setNewStudentAddress(e.target.value)} style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} />
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
          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '16px', border: '1px solid var(--border)', alignSelf: 'flex-start', flexWrap: 'wrap' }}>
            {[
              { id: 'OVERVIEW', label: 'Finance Hub', desc: 'Overview & Stats' },
              { id: 'LEDGER', label: 'Fee Ledger', desc: 'Transactions & Dues' },
              { id: 'ASSIGN', label: 'Assign Fee', desc: 'Assign Custom/Batch' },
              { id: 'EXPENSES', label: 'Expense Tracker', desc: 'Outflows & Claims' },
              { id: 'STATEMENT', label: 'Monthly Statement', desc: 'Monthly Transactions' },
              { id: 'BILLING_ENGINE', label: 'Billing Engine', desc: 'Auto monthly run' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setFinanceSubTab(tab.id as any)}
                style={{
                  padding: '0.55rem 0.9rem',
                  border: 'none',
                  background: financeSubTab === tab.id ? 'var(--primary)' : 'transparent',
                  color: financeSubTab === tab.id ? '#fff' : 'var(--text-muted)',
                  borderRadius: '10px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '0.05rem',
                  minWidth: '100px'
                }}
              >
                <span style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>{tab.label}</span>
                <span style={{ fontSize: '0.6rem', fontWeight: 500, opacity: financeSubTab === tab.id ? 0.85 : 0.5 }}>{tab.desc}</span>
              </button>
            ))}
          </div>

          {financeSubTab === 'OVERVIEW' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {/* Premium Welcome Banner */}
              <div className="glass-card" style={{ padding: '2rem', background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(59,130,246,0.05) 100%)', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.6rem', margin: 0, fontWeight: 800 }}>Smart Financial Command Center</h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.4rem', maxWidth: '700px' }}>
                  Monitor institute collections, record administrative expenses, and automate student invoice generation seamlessly in one unified interface.
                </p>
              </div>

              {/* ── Top Level Stats Grid ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                 {[
                   { label: 'Collected Revenue', value: `₹${(finSummary?.totalRevenue || 0).toLocaleString()}`, color: 'var(--secondary)', desc: 'Received student dues' },
                   { label: 'Total Expenses', value: `₹${(finSummary?.totalExpenses || 0).toLocaleString()}`, color: 'var(--primary)', desc: 'Outflow & administrative costs' },
                   { label: 'Net Profit', value: `₹${(finSummary?.netProfit || 0).toLocaleString()}`, color: 'var(--secondary)', desc: 'Net cash balance' },
                   { label: 'Pending Receivables', value: `₹${(finSummary?.totalPending || 0).toLocaleString()}`, color: 'var(--primary)', desc: 'Outstanding invoices' }
                 ].map((s, i) => (
                   <div key={i} className="glass-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${s.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--text)' }}>{s.value}</div>
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
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Breakdown of outstanding student collections. Manage fee assignments or run the automated monthly billing engine.
                    </p>
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
              
              {/* Premium Student Fee Statement Search Panel */}
              <div className="glass-card search-panel-overflow" style={{ position: 'relative', zIndex: 20, overflow: 'visible', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)', border: '1px solid var(--border)' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    Search Student Fee Statement & Ledger
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                    Type the name or registration ID of a student to instantly view their complete chronological fee ledger, outstanding balances, paid history, and receipts.
                  </p>
                </div>
                
                <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.25rem 0.5rem' }}>
                    <span style={{ fontSize: '1.2rem', padding: '0 0.5rem', opacity: 0.7 }}>🔍</span>
                    <input 
                      type="text"
                      placeholder="Search student name or ID (e.g. Rahul, STU02837)..."
                      value={financeStudentSearchQuery}
                      onChange={e => {
                        setFinanceStudentSearchQuery(e.target.value);
                        setShowFinanceSuggestions(true);
                      }}
                      onFocus={() => setShowFinanceSuggestions(true)}
                      style={{
                        flex: 1,
                        padding: '0.75rem 0.5rem',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text)',
                        fontSize: '0.95rem',
                        outline: 'none'
                      }}
                    />
                    {financeStudentSearchQuery && (
                      <button 
                        onClick={() => { setFinanceStudentSearchQuery(''); setShowFinanceSuggestions(false); }}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                      >
                        ×
                      </button>
                    )}
                  </div>

                      {showFinanceSuggestions && financeStudentSearchQuery.trim().length > 0 && (
                    <>
                      <div 
                        onClick={() => setShowFinanceSuggestions(false)} 
                        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }} 
                      />
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        marginTop: '0.5rem',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 9999,
                        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(20px)',
                        padding: '0.5rem'
                      }}>
                        {(() => {
                          const matches = directoryUsers
                            .filter(u => u.role === 'STUDENT' && (
                              u.name?.toLowerCase().includes(financeStudentSearchQuery.toLowerCase()) ||
                              u.username?.toLowerCase().includes(financeStudentSearchQuery.toLowerCase())
                            ));
                          if (matches.length === 0) {
                            return (
                              <div style={{ padding: '2rem 1rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                                <span>📂</span> No registered students found matching "{financeStudentSearchQuery}"
                              </div>
                            );
                          }
                          return matches.map(s => (
                            <div 
                              key={s.id}
                              onClick={() => {
                                setFinanceStudentSearchQuery('');
                                setShowFinanceSuggestions(false);
                                setSelectedUserDetail(s);
                              }}
                              style={{
                                padding: '0.85rem 1.25rem',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '1rem',
                                borderBottom: '1px solid rgba(255,255,255,0.02)'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                                e.currentTarget.style.transform = 'translateX(5px)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.transform = 'translateX(0)';
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', border: '1px solid var(--primary)', fontSize: '0.9rem', flexShrink: 0 }}>
                                  {(s.name || 'U').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{s.name}</div>
                                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                    <span>ID: <strong>{s.username}</strong></span>
                                    {s.studentProfile?.className && (
                                      <>
                                        <span style={{ opacity: 0.5 }}>•</span>
                                        <span>Class: {s.studentProfile.className}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <button 
                                className="btn-primary"
                                style={{
                                  padding: '6px 14px',
                                  fontSize: '0.75rem',
                                  borderRadius: '8px',
                                  fontWeight: 800,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}
                              >
                                📋 View Statement
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                    </>
                  )}
                </div>
              </div>

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
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    {ledgerViewMode === 'ALL' && (
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        <input 
                          type="text" 
                          placeholder="Search Name or ID..." 
                          value={feeSearchQuery}
                          onChange={e => setFeeSearchQuery(e.target.value)}
                          list="ledger-student-search-list"
                          style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.85rem', width: '200px' }}
                        />
                        <datalist id="ledger-student-search-list">
                          {directoryUsers
                            .filter(u => u.role === 'STUDENT')
                            .map(s => (
                              <option key={s.id} value={s.name} label={s.username} />
                            ))}
                        </datalist>
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
                        padding: '0.6rem 1.25rem',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
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
                  <div style={{ overflowX: 'auto', maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(0,0,0,0.1)', padding: '0.25rem' }}>
                    {/* View Mode 1: ALL RECORDS */}
                    {ledgerViewMode === 'ALL' && (
                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
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
                          {(() => {
                            const filteredFees = fees.filter(f => {
                              const matchesSearch = f.student?.name?.toLowerCase().includes(feeSearchQuery.toLowerCase()) || 
                                                    f.student?.username?.toLowerCase().includes(feeSearchQuery.toLowerCase());
                              const matchesMonth = (ledgerFilterMonth === 'ALL' && ledgerFilterYear === 'ALL') ||
                                (ledgerFilterMonth === 'ALL' && f.billingMonth?.endsWith(ledgerFilterYear)) ||
                                (ledgerFilterYear === 'ALL' && f.billingMonth?.startsWith(ledgerFilterMonth)) ||
                                (f.billingMonth === `${ledgerFilterMonth} ${ledgerFilterYear}`);
                              return matchesSearch && matchesMonth;
                            });

                            if (filteredFees.length === 0) return <tr><td colSpan={6} style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No matching fee records found.</td></tr>;

                            return filteredFees.map(fee => {
                              const isOverdue = fee.status === 'PENDING' && fee.currentLateFine > 0;
                              return (
                                <tr key={fee.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isOverdue ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                                  <td style={{ padding: '0.6rem 0' }}>
                                    <div 
                                      onClick={() => setActiveProfileUserId(fee.student?.id)} 
                                      style={{ fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', textDecoration: 'underline decoration-dotted' }}
                                      className="clickable-name"
                                    >
                                      {fee.student?.name}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{fee.student?.username}</div>
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
                                     <div>Base: ₹{fee.amount}</div>
                                     {fee.currentLateFine > 0 && <div style={{ color: '#ef4444' }}>Fine: +₹{fee.currentLateFine}</div>}
                                     {fee.discount > 0 && <div style={{ color: '#10b981' }}>Disc: -₹{fee.discount}</div>}
                                  </td>
                                  <td style={{ fontWeight: 700 }}>₹{fee.totalDue.toFixed(0)}</td>
                                  <td>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      {fee.status === 'PENDING' && (
                                        <button onClick={() => { setPayingFee(fee); setShowPaymentModal(true); setPaymentDetails({ paymentMethod: 'CASH', transactionId: '', discount: fee.discount, remarks: '', paidAmount: (fee.amount + fee.currentLateFine - fee.discount - (fee.paidAmount || 0)).toString(), paidAt: new Date().toISOString().split('T')[0] }); }} style={{ padding: '6px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>Collect</button>
                                      )}
                                      {(fee.status === 'PAID' || fee.status === 'PAID_ONLINE') && (
                                        <button onClick={() => updateFeeStatus(fee.id, 'VERIFIED')} style={{ padding: '6px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>Verify</button>
                                      )}
                                      {(fee.status !== 'PENDING') && (
                                        <button onClick={() => handleViewReceipt(fee.id)} style={{ padding: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>🧾 Receipt</button>
                                      )}
                                      <button onClick={() => { setEditingFeeRecord(fee); setShowEditFeeModal(true); }} style={{ padding: '6px', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }} title="Edit Fee Record">✎</button>
                                      <button onClick={() => openDelModal(fee.id)} style={{ padding: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>🗑</button>
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
                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            <th style={{ padding: '0.75rem 0' }}>Transaction Ref / Date</th>
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
                              const dateObj = new Date(fee.updatedAt || fee.createdAt);
                              const formattedDate = dateObj.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                              return (
                                <tr key={fee.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <td style={{ padding: '0.6rem 0' }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>REC-{fee.id.slice(-6).toUpperCase()}</div>
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
                      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
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
                            const students = directoryUsers.filter(u => u.role === 'STUDENT');

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
                                    ₹{baseFee.toLocaleString()}
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
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 800 }}>Assign New Fee</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Create a custom charge item for an individual student or assign a recurring fee structure to an entire batch.</p>

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
                          const students = directoryUsers.filter(u => u.role === 'STUDENT');
                          const matched = students.find(
                            s => s.username === e.target.value ||
                                 `${s.name} (${s.username})` === e.target.value
                          );
                          if (matched) {
                            setFeeStudentId(matched.username);
                            const base = matched.studentProfile?.baseFee;
                            if (base && base > 0) setFeeAmount(String(base));
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
                        {directoryUsers.filter(u => u.role === 'STUDENT').map(s => (
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

                <div className="input-group">
                  <label>
                    Amount (₹)
                    {feeStudentId && directoryUsers.find(u => u.username === feeStudentId)?.studentProfile?.baseFee > 0 && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
                        Base: ₹{directoryUsers.find(u => u.username === feeStudentId)?.studentProfile?.baseFee} (auto-filled)
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Enter amount or auto-filled from base fee"
                    value={feeAmount}
                    onChange={e => setFeeAmount(e.target.value)}
                  />
                </div>

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

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
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
                      {expenses.map(exp => (
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
                      style={{ padding: '0.75rem 1.5rem', fontWeight: 800 }}
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
                      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
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
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Check completed transaction statements, fee inflows, outflows, and paid salary ledgers by month and year.
                  </p>
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
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) return;
                      
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

                      const formatD = (dStr: any) => {
                        const d = new Date(dStr);
                        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                      };

                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Sudhir Tutorials - Financial Statement: ${statementMonth} ${statementYear}</title>
                            <style>
                              body { font-family: sans-serif; padding: 40px; color: #1f2937; }
                              .header { border-bottom: 3px solid #ef4444; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; }
                              .title { font-size: 24px; font-weight: bold; color: #ef4444; }
                              .meta { font-size: 14px; color: #4b5563; }
                              .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
                              .card { padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
                              .card-title { font-size: 11px; text-transform: uppercase; color: #6b7280; font-weight: bold; }
                              .card-value { font-size: 18px; font-weight: bold; margin-top: 5px; }
                              table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                              th { background: #f3f4f6; padding: 10px; text-align: left; font-size: 12px; font-weight: bold; border-bottom: 2px solid #d1d5db; }
                              td { padding: 10px; font-size: 13px; border-bottom: 1px solid #e5e7eb; }
                              .inflow { color: #059669; font-weight: bold; }
                              .outflow { color: #dc2626; font-weight: bold; }
                            </style>
                          </head>
                          <body>
                            <div class="header">
                              <div>
                                <div class="title">SUDHIR TUTORIALS</div>
                                <div class="meta">Institute Financial Statement</div>
                              </div>
                              <div style="text-align: right">
                                <div style="font-weight: bold">${statementMonth.toUpperCase()} ${statementYear}</div>
                                <div class="meta">Generated: ${new Date().toLocaleDateString('en-GB')}</div>
                              </div>
                            </div>

                            <div class="grid">
                              <div class="card">
                                <div class="card-title">Fee Inflows</div>
                                <div class="card-value" style="color: #059669">₹${totalIn.toLocaleString()}</div>
                              </div>
                              <div class="card">
                                <div class="card-title">Admin Expenses</div>
                                <div class="card-value" style="color: #dc2626">₹${totalExp.toLocaleString()}</div>
                              </div>
                              <div class="card">
                                <div class="card-title">Salaries Paid</div>
                                <div class="card-value" style="color: #dc2626">₹${totalSal.toLocaleString()}</div>
                              </div>
                              <div class="card" style="border-left: 4px solid ${net >= 0 ? '#059669' : '#dc2626'}">
                                <div class="card-title">Net Cash Flow</div>
                                <div class="card-value" style="color: ${net >= 0 ? '#059669' : '#dc2626'}">₹${net.toLocaleString()}</div>
                              </div>
                            </div>

                            <table>
                              <thead>
                                <tr>
                                  <th>Date</th>
                                  <th>Reference No.</th>
                                  <th>Transaction Description</th>
                                  <th>Type</th>
                                  <th style="text-align: right">Inflow (Cr)</th>
                                  <th style="text-align: right">Outflow (Dr)</th>
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
                                    <td>${formatD(t.date)}</td>
                                    <td style="font-family: monospace">${t.ref}</td>
                                    <td>${t.desc}</td>
                                    <td>${t.type}</td>
                                    <td class="inflow" style="text-align: right">${t.inflow > 0 ? '₹' + t.inflow.toLocaleString() : '-'}</td>
                                    <td class="outflow" style="text-align: right">${t.outflow > 0 ? '₹' + t.outflow.toLocaleString() : '-'}</td>
                                  </tr>
                                `).join('')}
                              </tbody>
                            </table>
                            <script>window.onload = function() { window.print(); }</script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                    className="btn-secondary" 
                    style={{ padding: '0.75rem 1.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.4rem', borderRadius: '12px' }}
                  >
                    🖨️ Print Statement
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
                    date: s.paidAt ? new Date(s.paidAt) : new Date(s.createdAt),
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
                      <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px', background: 'rgba(0,0,0,0.1)' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 800 }}>
                              <th style={{ padding: '1.1rem 1.5rem' }}>Date</th>
                              <th>Ref No.</th>
                              <th>Transaction Description</th>
                              <th>Type</th>
                              <th style={{ textAlign: 'right' }}>Credit (Cr)</th>
                              <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Debit (Dr)</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ledgerData.map((t, idx) => (
                              <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: '0.88rem' }}>
                                <td style={{ padding: '1.1rem 1.5rem', color: 'var(--text)' }}>{t.date.toLocaleDateString('en-GB')}</td>
                                <td style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-muted)' }}>{t.ref}</td>
                                <td style={{ color: 'var(--text)', fontWeight: 600 }}>{t.desc}</td>
                                <td>
                                  <span style={{ 
                                    padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, 
                                    background: t.type === 'FEE_INFLOW' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)', 
                                    color: t.type === 'FEE_INFLOW' ? 'var(--secondary)' : 'var(--primary)' 
                                  }}>{t.type}</span>
                                </td>
                                <td style={{ textAlign: 'right', color: 'var(--secondary)', fontWeight: 700 }}>{t.inflow > 0 ? `₹${t.inflow.toLocaleString()}` : '–'}</td>
                                <td style={{ textAlign: 'right', paddingRight: '1.5rem', color: 'var(--primary)', fontWeight: 700 }}>{t.outflow > 0 ? `₹${t.outflow.toLocaleString()}` : '–'}</td>
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
          <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '16px', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
            <button 
              onClick={() => setCourseSubTab('COURSES')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: courseSubTab === 'COURSES' ? 'var(--primary)' : 'transparent',
                color: courseSubTab === 'COURSES' ? '#fff' : 'var(--text-muted)',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📚 Courses Manager
            </button>
            <button 
              onClick={() => setCourseSubTab('BATCHES')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: courseSubTab === 'BATCHES' ? 'var(--primary)' : 'transparent',
                color: courseSubTab === 'BATCHES' ? '#fff' : 'var(--text-muted)',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              👥 Batch Manager
            </button>
            <button 
              onClick={() => setCourseSubTab('TIMETABLE')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: courseSubTab === 'TIMETABLE' ? 'var(--primary)' : 'transparent',
                color: courseSubTab === 'TIMETABLE' ? '#fff' : 'var(--text-muted)',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              📅 Timetable & Timings
            </button>
          </div>

          {courseSubTab === 'COURSES' && (
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Course Directory</h2>
              <form onSubmit={handleCreateCourse} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input type="text" required placeholder="Course Name" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', flex: 1 }} />
                <button type="submit" className="btn-primary" disabled={isAddingCourse}>{isAddingCourse ? '...' : 'Add Course'}</button>
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
            <div className="courses-layout-grid" style={{ gap: '2rem' }}>
              <div className="glass-card" style={{ padding: '2rem' }}>
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

              <div className="glass-card" style={{ padding: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Active Batches</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {batches.map(batch => (
                    <div key={batch.id} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '18px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{batch.name}</span>
                          <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: 'var(--primary)', borderRadius: '6px', fontWeight: 700 }}>{batch.className || 'NO CLASS'}</span>
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{batch.course?.name}</span> • {batch.subjects || 'All Subjects'}
                        </div>
                        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          <span title="Enrolled Students">👥 <strong>{batch._count?.students || 0}</strong> Students</span>
                          <span title="Assigned Teachers">👨‍🏫 <strong>{batch.teachers?.length || 0}</strong> Teachers</span>
                          <span title="Weekly Schedule">🗓️ <strong>{batch.schedules?.length || 0}</strong> Slots/Week</span>
                          <span title="Default Batch Fee">💰 <strong>₹{batch.defaultFee || 0}</strong>/mo</span>
                        </div>
                        {batch.teachers && batch.teachers.length > 0 && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.65rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                            Assigned Instructors: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{batch.teachers.map((t: any) => t.name).join(', ')}</span>
                          </div>
                        )}
                      </div>
                      <button 
                        onClick={() => { setEditingBatch(batch); setShowBatchEditModal(true); }}
                        className="btn-secondary"
                        style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
                      >
                        Manage & Timings
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          
          {/* Revenue Trend Chart (CSS Bar Chart) */}
          <div className="glass-card" style={{ padding: '2rem' }}>
             <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Revenue Trends (6 Months)</h3>
             {isReportsLoading ? <div className="spinner"></div> : (
               <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
                  {reportData?.revenueTrend.map((d, i) => {
                    const max = Math.max(...reportData.revenueTrend.map(x => x.amount), 1);
                    const height = (d.amount / max) * 100;
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px', gap: '0.5rem' }}>
                         <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>₹{d.amount > 1000 ? (d.amount/1000).toFixed(1)+'k' : d.amount}</div>
                         <div style={{ width: '100%', height: `${height}%`, background: 'linear-gradient(to top, #ef4444, #3b82f6)', borderRadius: '4px 4px 0 0', transition: 'height 1s ease-out' }}></div>
                         <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{d.name}</div>
                      </div>
                    );
                  })}
               </div>
             )}
          </div>

          {/* Enrollment by Course */}
          <div className="glass-card" style={{ padding: '2rem' }}>
             <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Enrollment by Course</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {reportData?.enrollmentData.map((d, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>{d.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{d.students} Students</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((d.students / 50) * 100, 100)}%`, background: '#10b981' }}></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Attendance Rate Dial */}
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
             <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Global Attendance Rate</h3>
             <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray="283" strokeDashoffset={283 - (283 * (reportData?.attendanceRate || 0)) / 100} style={{ transition: 'stroke-dashoffset 2s ease-out' }} />
                </svg>
                <div style={{ position: 'absolute', fontSize: '1.75rem', fontWeight: 800 }}>{(reportData?.attendanceRate || 0).toFixed(1)}%</div>
             </div>
             <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Average presence across all active batches.</p>
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
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }} className="animate-scale-up materials-grid">
          <style>{`
            @media (max-width: 900px) {
              .materials-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
          {/* Uploaded Materials List */}
          <div className="glass-card" style={{ padding: '2rem' }}>
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
                      <a href={mat.url} target="_blank" rel="noreferrer" style={{ padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600 }}>Open File</a>
                      <button onClick={() => handleDeleteMaterial(mat.id)} style={{ padding: '0.5rem 1rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* New Material Form */}
          <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 700, color: '#ef4444' }}>Publish Study Material</h3>
            <form onSubmit={handleUploadMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="input-group">
                <label style={{ fontWeight: 600 }}>Title / Description</label>
                <input type="text" required placeholder="e.g. Physics Chapter 1 Notes" value={matTitle} onChange={e => setMatTitle(e.target.value)} />
              </div>

              <div className="input-group">
                <label style={{ fontWeight: 600 }}>Material Type</label>
                <select value={matType} onChange={e => setMatType(e.target.value)} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <option value="PDF">📄 PDF Document</option>
                  <option value="VIDEO">🎥 Video File / Clip</option>
                  <option value="WORD">📝 Word Document (DOCX)</option>
                  <option value="IMAGE">🖼️ Reference Image / Diagram</option>
                  <option value="LINK">🔗 External Web Link</option>
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
        </div>
      )}

      {(activeTab === 'tests' || (activeTab === 'academics' && academicSubTab === 'tests')) && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }} className="animate-scale-up tests-grid">
          <style>{`
            @media (max-width: 900px) {
              .tests-grid {
                grid-template-columns: 1fr !important;
              }
            }
          `}</style>
          {/* Tests List */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem', fontWeight: 700 }}>📝 Scheduled Tests & Marks</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tests.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No tests scheduled yet.</p>
              ) : (
                tests.map(test => (
                  <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)', flexWrap: 'wrap', gap: '1rem' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{test.title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Course: <strong>{test.course?.name}</strong>{test.subject && <> • Subject: <strong>{test.subject}</strong></>} • Date: {((() => { const d = new Date(test.date); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}
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
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
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

          {/* Schedule New Test Form */}
          <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 700, color: '#ef4444' }}>Schedule New Test</h3>
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
              <button type="submit" className="btn-primary" disabled={isCreatingTest} style={{ background: '#10b981', border: 'none' }}>
                {isCreatingTest ? 'Scheduling...' : '📝 Schedule Test'}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '750px', padding: '2.5rem', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--primary)' }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem', fontWeight: 800 }}>Enter Student Marks: {selectedTest.title}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Course: {selectedTest.course?.name}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {testStudents.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No students found in this course.</div>
              ) : (
                testStudents.map(s => {
                  const data = testMarks[s.id] || { marks: '', totalMarks: '100', remarks: '' };
                  return (
                    <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: '1rem', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <div>
                        <div 
                          onClick={() => setActiveProfileUserId(s.id)} 
                          style={{ fontWeight: 600, cursor: 'pointer', textDecoration: 'underline decoration-dotted' }}
                          className="clickable-name"
                        >
                          {s.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.username}</div>
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <input 
                          type="number" 
                          placeholder="Marks" 
                          value={data.marks} 
                          onChange={e => setTestMarks({
                            ...testMarks,
                            [s.id]: { ...data, marks: e.target.value }
                          })}
                          style={{ padding: '8px 12px' }}
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <input 
                          type="number" 
                          placeholder="Total" 
                          value={data.totalMarks} 
                          onChange={e => setTestMarks({
                            ...testMarks,
                            [s.id]: { ...data, totalMarks: e.target.value }
                          })}
                          style={{ padding: '8px 12px' }}
                        />
                      </div>
                      <div className="input-group" style={{ margin: 0 }}>
                        <input 
                          type="text" 
                          placeholder="Remarks" 
                          value={data.remarks} 
                          onChange={e => setTestMarks({
                            ...testMarks,
                            [s.id]: { ...data, remarks: e.target.value }
                          })}
                          style={{ padding: '8px 12px' }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
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

      {activeTab === 'guru-ai' && (
        <div className="glass-card animate-scale-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', minHeight: '650px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: '2rem' }}>
          {/* Academic Assistant Header */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #ef4444, #dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)', animation: 'pulse 2s infinite' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" fill="#fff" />
                <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" fill="#fff" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#ef4444', margin: 0 }}>✨ Academic Assistant Workspace</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '4px 0 0 0' }}>Supercharge lessons & curricula. Seek immediate academic insights or generate high-fidelity presentations dynamically.</p>
            </div>
          </div>

          {/* Sleek, Premium Compact Mode Selector */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.25rem' }}>
            <div style={{ 
              display: 'flex', 
              background: 'var(--card-bg-alt)', 
              padding: '3px', 
              borderRadius: '30px', 
              border: '1px solid var(--border)',
              gap: '2px',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)'
            }}>
              <button
                onClick={() => setAiMode('GURU')}
                style={{
                  padding: '0.4rem 1.1rem',
                  borderRadius: '25px',
                  border: 'none',
                  cursor: 'pointer',
                  background: aiMode === 'GURU' ? '#ef4444' : 'transparent',
                  color: aiMode === 'GURU' ? 'white' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  transition: 'all 0.2s ease',
                  boxShadow: aiMode === 'GURU' ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '0.95rem' }}>🤖</span> Academic Assistant Tutor
              </button>
              <button
                onClick={() => setAiMode('PREPARE')}
                style={{
                  padding: '0.4rem 1.1rem',
                  borderRadius: '25px',
                  border: 'none',
                  cursor: 'pointer',
                  background: aiMode === 'PREPARE' ? '#ef4444' : 'transparent',
                  color: aiMode === 'PREPARE' ? 'white' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  transition: 'all 0.2s ease',
                  boxShadow: aiMode === 'PREPARE' ? '0 2px 8px rgba(239, 68, 68, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '0.95rem' }}>📝</span> Slide Generator & Planner
              </button>
            </div>
          </div>

          {/* ──────────────── MODE A: DIGITAL GURU ──────────────── */}
          {aiMode === 'GURU' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: '2rem', flex: 1 }} className="guru-grid">
              <style>{`
                .guru-grid { display: grid; }
                @media (max-width: 900px) { .guru-grid { grid-template-columns: 1fr !important; } }
                .chat-bubble { border-radius: 16px; padding: 1.25rem; max-width: 85%; line-height: 1.6; font-size: 0.95rem; }
                .chat-bubble pre { background: var(--surface-light); padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; border: 1px solid var(--border); }
                .chat-bubble code { font-family: monospace; background: var(--surface-light); padding: 2px 6px; border-radius: 4px; color: var(--primary); font-weight: 600; }
              `}</style>

              {/* Left Form */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="input-group">
                  <label style={{ color: '#ef4444', fontWeight: 700 }}>Academic Subject</label>
                  <select
                    value={adminGuruSubject}
                    onChange={(e) => setAdminGuruSubject(e.target.value)}
                    style={{ width: '100%', padding: '1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem' }}
                  >
                    {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'General Academics'].map(subj => (
                      <option key={subj} value={subj} style={{ background: 'var(--surface)', color: 'var(--text)' }}>{subj}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ color: '#ef4444', fontWeight: 700 }}>Explanatory Mode</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                    {(['ENGLISH', 'HINDI', 'HINGLISH'] as const).map(lang => (
                      <button
                        key={lang}
                        onClick={() => setAdminGuruLanguage(lang)}
                        style={{
                          flex: 1,
                          padding: '0.8rem 0.5rem',
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor: adminGuruLanguage === lang ? '#ef4444' : 'var(--border)',
                          background: adminGuruLanguage === lang ? 'rgba(239, 68, 68, 0.15)' : 'var(--input-bg)',
                          color: adminGuruLanguage === lang ? '#ef4444' : 'var(--text)',
                          fontWeight: 700,
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          transition: 'all 0.2s',
                          textAlign: 'center'
                        }}
                      >
                        {lang === 'HINGLISH' ? '💬 Hinglish' : lang === 'HINDI' ? '🇮🇳 Hindi' : '🇬🇧 English'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="input-group" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <label style={{ color: '#ef4444', fontWeight: 700 }}>Enter doubt, question, or lesson query</label>
                  <textarea
                    placeholder="Verify standard definitions, solve analytical equations or plan outlines..."
                    value={adminGuruQuestion}
                    onChange={(e) => setAdminGuruQuestion(e.target.value)}
                    style={{ width: '100%', flex: 1, minHeight: '120px', padding: '1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem', resize: 'none', lineHeight: 1.5 }}
                  />
                </div>

                <button
                  onClick={askAdminGuru}
                  disabled={adminGuruLoading || !adminGuruQuestion.trim()}
                  style={{
                    width: '100%', padding: '1rem', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)', color: '#fff', border: 'none',
                    fontWeight: 800, cursor: adminGuruLoading || !adminGuruQuestion.trim() ? 'not-allowed' : 'pointer', fontSize: '1rem',
                    boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
                  }}
                >
                  {adminGuruLoading ? 'Processing...' : '✨ Ask Academic Assistant'}
                </button>
              </div>

              {/* Right Message Desk */}
              <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--card-bg-alt)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', height: '550px' }}>
                <div style={{ background: 'var(--surface-light)', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#ef4444', fontSize: '0.9rem' }}>📖 ACADEMIC ASSISTANT WORKSPACE</span>
                  <button
                    onClick={() => setAdminGuruHistory([{ role: 'guru', content: `Hello, Admin! 👋 I am Academic Assistant. How can I assist you in verifying details or planning today?` }])}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    🧹 Clear Feed
                  </button>
                </div>

                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {adminGuruHistory.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div
                        className="chat-bubble"
                        style={{
                          background: msg.role === 'user' ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface)',
                          border: msg.role === 'user' ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)',
                          color: 'var(--text)',
                          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        {msg.subject && (
                          <span style={{ display: 'inline-block', fontSize: '0.65rem', background: '#ef4444', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                            {msg.subject}
                          </span>
                        )}
                        <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>
                      </div>
                    </div>
                  ))}

                  {adminGuruLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div className="chat-bubble" style={{ background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="spinner" style={{ width: '15px', height: '15px', border: '2px solid #f3f3f3', borderTop: '2px solid #ef4444', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Academic Assistant is preparing key solutions...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ──────────────── MODE B: PREPARE LESSON PPT ──────────────── */}
          {aiMode === 'PREPARE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem', color: '#ef4444' }}>⚡ AI Premium Lesson slide Deck Generator</h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
                  <div className="input-group">
                    <label style={{ fontWeight: 700 }}>Topic / Theme Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Laws of Thermodynamics, Chemical Bonding..."
                      value={pptTopic}
                      onChange={(e) => setPptTopic(e.target.value)}
                      style={{ padding: '0.85rem', borderRadius: '12px' }}
                    />
                  </div>

                  <div className="input-group">
                    <label style={{ fontWeight: 700 }}>Target Grade / Class</label>
                    <select
                      value={pptGrade}
                      onChange={(e) => setPptGrade(e.target.value)}
                      style={{ padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    >
                      {['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-JEE / NEET Spec'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label style={{ fontWeight: 700 }}>Difficulty Level</label>
                    <select
                      value={pptDifficulty}
                      onChange={(e) => setPptDifficulty(e.target.value)}
                      style={{ padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    >
                      <option value="Basic (Concepts & Foundations)">Basic (Foundational Concepts)</option>
                      <option value="Intermediate (Board Syllabus Spec)">Intermediate (Syllabus standard)</option>
                      <option value="Advanced (JEE / NEET / Olympiad)">Advanced (JEE / NEET / Olympiad)</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label style={{ fontWeight: 700 }}>Lecture Duration</label>
                    <select
                      value={pptDuration}
                      onChange={(e) => setPptDuration(e.target.value)}
                      style={{ padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    >
                      <option value="30">30 Minutes (Revision session)</option>
                      <option value="45">45 Minutes (Standard Lecture)</option>
                      <option value="60">60 Minutes (Comprehensive lecture)</option>
                      <option value="90">90 Minutes (Comprehensive Masterclass)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={generateLessonPPT}
                  disabled={pptGenerating || !pptTopic.trim()}
                  className="btn-primary"
                  style={{ width: '100%', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  {pptGenerating ? '⚡ Generating Premium Slides...' : '⚡ Generate Premium Lesson Slides & Study Notes'}
                </button>
              </div>

              {/* RENDER DYNAMIC SLIDE PRESENTATION CAROUSEL */}
              {generatedPpt && (
                <div className="glass-card animate-scale-up" style={{ padding: '2.5rem', border: '1px solid var(--primary)', borderRadius: '24px', background: 'var(--card-bg-alt)' }}>
                  {/* Slider Control Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>📂 Generated Lecture Deck: {generatedPpt.topic}</h4>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Target: {generatedPpt.grade} | Design Version 1.0 (Dynamic AI Model)</p>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={printAdminPpt}
                        className="btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.8rem', fontWeight: 700, borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                      >
                        🖨️ Export PDF / Print
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Slide Viewer */}
                  <div style={{
                    border: '2px solid var(--border)',
                    borderRadius: '16px',
                    padding: '2.5rem',
                    background: 'var(--surface-light)',
                    minHeight: '380px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    position: 'relative',
                    transition: 'all 0.3s'
                  }}>
                    {/* Header bar on slide */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <h4 style={{ color: 'var(--primary)', margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>{generatedPpt.slides[activeSlideIndex].title}</h4>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{generatedPpt.slides[activeSlideIndex].subtitle}</span>
                      </div>
                      <span style={{ background: 'var(--primary)', color: 'white', padding: '4px 12px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 800 }}>
                        {generatedPpt.slides[activeSlideIndex].badge}
                      </span>
                    </div>

                    {/* Metadata bar */}
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      📍 {generatedPpt.slides[activeSlideIndex].meta}
                    </div>

                    {/* Content text block */}
                    <div style={{ fontSize: '1.05rem', lineHeight: 1.7, color: 'var(--text)', whiteSpace: 'pre-line', flex: 1, marginBottom: '2rem' }}>
                      {generatedPpt.slides[activeSlideIndex].content}
                    </div>

                    {/* Footing with logo */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border)', paddingTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <span style={{ fontWeight: 900, color: 'var(--primary)', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <img src="/logo.png" alt="Logo" style={{ width: '18px', height: '18px', objectFit: 'contain', borderRadius: '4px' }} />
                        <span style={{ color: 'var(--primary)', fontWeight: 900 }}>SUDHIR</span> <span style={{ color: 'var(--secondary)', fontWeight: 900 }}>TUTORIALS</span>
                      </span>
                      <span style={{ fontWeight: 700 }}>Slide {activeSlideIndex + 1} of {generatedPpt.slides.length}</span>
                    </div>
                  </div>

                  {/* Carousel navigation buttons */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                    <button
                      disabled={activeSlideIndex === 0}
                      onClick={() => setActiveSlideIndex(prev => prev - 1)}
                      style={{
                        padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)',
                        background: activeSlideIndex === 0 ? 'rgba(0,0,0,0.1)' : 'var(--input-bg)',
                        color: activeSlideIndex === 0 ? 'var(--text-muted)' : 'var(--text)',
                        cursor: activeSlideIndex === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, transition: 'all 0.2s'
                      }}
                    >
                      ← Previous Slide
                    </button>

                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {generatedPpt.slides.map((_: any, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setActiveSlideIndex(idx)}
                          style={{
                            width: '10px', height: '10px', borderRadius: '50%', border: 'none',
                            background: activeSlideIndex === idx ? 'var(--primary)' : 'var(--border)',
                            cursor: 'pointer'
                          }}
                        />
                      ))}
                    </div>

                    <button
                      disabled={activeSlideIndex === generatedPpt.slides.length - 1}
                      onClick={() => setActiveSlideIndex(prev => prev + 1)}
                      style={{
                        padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border)',
                        background: activeSlideIndex === generatedPpt.slides.length - 1 ? 'rgba(0,0,0,0.1)' : 'var(--input-bg)',
                        color: activeSlideIndex === generatedPpt.slides.length - 1 ? 'var(--text-muted)' : 'var(--text)',
                        cursor: activeSlideIndex === generatedPpt.slides.length - 1 ? 'not-allowed' : 'pointer', fontWeight: 700, transition: 'all 0.2s'
                      }}
                    >
                      Next Slide →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {(activeTab === 'lectures' || (activeTab === 'academics' && academicSubTab === 'lectures')) && (
        <LecturesSection />
      )}

      {(activeTab === 'admissions' || activeTab === 'verifications' || (activeTab === 'academics' && academicSubTab === 'admissions')) && (
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
      {showDelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 4000 }}>
          <div className="glass-card" style={{ width: '400px', padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Delete Fee Record?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>This action cannot be undone. The student's fee record will be permanently removed.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowDelModal(false)} 
                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={deleteFee} 
                disabled={isDeleting}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer' }}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showProfileModal && editingProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '2rem' }}>
          <div className="glass-card" style={{ width: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem', border: '1px solid var(--primary)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <div>
                 <h2 style={{ fontSize: '1.8rem', margin: 0 }}>{editingProfile.role === 'STUDENT' ? 'Student' : editingProfile.role === 'TEACHER' ? 'Teacher' : 'Admin'} Profile Editor</h2>
                 <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>ID: {editingProfile.username}</p>
               </div>
               <button onClick={() => { setShowProfileModal(false); setOtpValue(""); }} style={{ background: 'none', border: 'none', color: 'var(--text)', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={saveProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

               <div className="input-group" style={{ gridColumn: 'span 2' }}>
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
                 <input type="text" value={editingProfile.name || ''} onChange={e => setEditingProfile({...editingProfile, name: e.target.value})} placeholder="Full Name" required />
               </div>

               <div className="input-group">
                 <label>Date of Birth</label>
                 <input type="date" value={editingProfile.dob || ''} onChange={e => setEditingProfile({...editingProfile, dob: e.target.value})} />
               </div>

               <div className="input-group">
                 <label>Phone Number</label>
                 <input type="text" value={editingProfile.phone || ''} onChange={e => setEditingProfile({...editingProfile, phone: e.target.value})} placeholder="+91 ..." />
               </div>

               <div className="input-group">
                 <label>Email Address</label>
                 <input type="email" value={editingProfile.email || ''} onChange={e => setEditingProfile({...editingProfile, email: e.target.value})} placeholder="mail@example.com" />
               </div>

               {editingProfile.role === 'STUDENT' ? (
                 <>
                   <div className="input-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', gridColumn: '1 / -1' }}>
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
                     <label>Father's Name</label>
                     <input type="text" value={editingProfile.fatherName || ''} onChange={e => setEditingProfile({...editingProfile, fatherName: e.target.value})} placeholder="Full Name" />
                   </div>
                   <div className="input-group">
                     <label>Parent Contact</label>
                     <input type="text" value={editingProfile.parentContact || ''} onChange={e => setEditingProfile({...editingProfile, parentContact: e.target.value})} placeholder="+91 ..." />
                   </div>
                   <div className="input-group">
                     <label>Student ID / Roll No</label>
                     <input type="text" value={editingProfile.rollNumber || ''} onChange={e => setEditingProfile({...editingProfile, rollNumber: e.target.value})} placeholder="STU-001" />
                   </div>
                   <div className="input-group">
                     <label>Monthly Fee (Base ₹)</label>
                     <input type="number" value={editingProfile.baseFee || ''} onChange={e => setEditingProfile({...editingProfile, baseFee: parseFloat(e.target.value)})} placeholder="e.g. 2500" />
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
                     <label>Scholarship Amount (₹)</label>
                     <input type="number" value={editingProfile.scholarship !== undefined && editingProfile.scholarship !== null ? editingProfile.scholarship : ''} onChange={e => setEditingProfile({...editingProfile, scholarship: parseFloat(e.target.value) || 0})} placeholder="e.g. 1000" />
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
                   <div className="input-group" style={{ gridColumn: 'span 2' }}>
                     <label>School Name</label>
                     <input type="text" value={editingProfile.school || ''} onChange={e => setEditingProfile({...editingProfile, school: e.target.value})} placeholder="e.g. KV School" />
                   </div>

                   <div className="input-group" style={{ gridColumn: 'span 2', marginTop: '0.75rem', background: 'rgba(245,158,11,0.05)', padding: '1.25rem', borderRadius: '12px', border: '1px dashed rgba(245,158,11,0.3)' }}>
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
               ) : editingProfile.role === 'TEACHER' ? (
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
                   <div className="input-group" style={{ gridColumn: 'span 2' }}>
                     <label>Experience</label>
                     <input type="text" value={editingProfile.experience || ''} onChange={e => setEditingProfile({...editingProfile, experience: e.target.value})} placeholder="e.g. 5 Years" />
                   </div>
                 </>
               ) : null}

               <div className="input-group" style={{ gridColumn: 'span 2' }}>
                 <label>Residential Address</label>
                 <textarea 
                   value={editingProfile.address || ''} 
                   onChange={e => setEditingProfile({...editingProfile, address: e.target.value})} 
                   placeholder="Street, City, Pin"
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', minHeight: '80px' }}
                 />
               </div>
               


               <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                 <button type="button" onClick={handleDeleteUser} style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', cursor: 'pointer', fontWeight: 700 }}>Delete Account</button>
                 <button type="button" onClick={() => { setShowProfileModal(false); setOtpValue(""); }} style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer' }}>Cancel</button>
                 <button type="submit" className="btn-primary" disabled={isSavingProfile} style={{ flex: 2, padding: '1rem' }}>
                    {isSavingProfile ? 'Saving Changes...' : 'Save Profile'}
                 </button>
               </div>
            </form>
          </div>
        </div>
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
            <div style={{ display: 'flex', gap: '0.75rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px', marginBottom: '2rem', width: 'fit-content' }}>
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
                        <input type="text" placeholder="Subject (e.g. Physics)" value={newSchedule.subject || ''} onChange={e => setNewSchedule({...newSchedule, subject: e.target.value})} style={{ gridColumn: 'span 2', width: '100%' }} />
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
                        style={{ width: '100%', background: 'var(--secondary)', border: 'none' }}
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
                      {directoryUsers.filter(u => u.role === 'STUDENT' && !editingBatch.students?.some((st: any) => st.id === u.id)).length === 0 ? (
                        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                          All students in directory are already enrolled.
                        </div>
                      ) : (
                        directoryUsers
                          .filter(u => u.role === 'STUDENT' && !editingBatch.students?.some((st: any) => st.id === u.id))
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

            <div style={{ marginTop: '4rem', display: 'flex', gap: '1.5rem' }}>
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
                style={{ flex: 1, padding: '1.25rem', fontSize: '1.1rem' }}
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
                style={{ padding: '0 2rem', color: '#ef4444', border: '1px solid #ef4444' }}
              >
                Delete Batch
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Receipt Modal ───────────────────────────── */}
      {activeReceipt && typeof window !== 'undefined' && createPortal(
        <div className="receipt-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 99999, overflowY: 'auto', padding: '2rem 1rem' }}>
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

            <div className="receipt-inner-container" style={{ position: 'relative', zIndex: 2 }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <img src="/logo.png" alt="Sudhir Tutorials Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', borderRadius: '12px', margin: '0 auto 0.75rem', display: 'block' }} />
                <h1 style={{ color: '#1a1a1a', fontSize: '1.5rem', margin: 0, letterSpacing: '1px', fontWeight: 800 }}><span style={{ color: '#ef4444' }}>SUDHIR</span> <span style={{ color: '#2563eb' }}>TUTORIALS</span></h1>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0' }}>Professional Coaching for Academic Excellence</p>
                <div style={{ height: '1px', background: '#e5e7eb', width: '60px', margin: '1rem auto' }}></div>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#374151' }}>Payment Receipt</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800 }}>Student Name</div>
                  <div style={{ fontWeight: 700, color: '#1a1a1a' }}>{activeReceipt.student?.name}</div>
                  <div style={{ color: '#6b7280' }}>ID: {activeReceipt.student?.username}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800 }}>Receipt #</div>
                  <div style={{ fontWeight: 700, color: '#1a1a1a' }}>{activeReceipt.receiptNo || `REC-${activeReceipt.id.slice(-6).toUpperCase()}`}</div>
                  <div style={{ color: '#6b7280' }}>
                    {activeReceipt.paidAt 
                      ? `${((() => { const d = new Date(activeReceipt.paidAt); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}, ${new Date(activeReceipt.paidAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` 
                      : ((() => { const d = new Date(); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #f3f4f6', borderBottom: '2px solid #f3f4f6', padding: '1.5rem 0', marginBottom: '2rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#374151' }}>
                  <span>{activeReceipt.title} ({activeReceipt.billingMonth})</span>
                  <span style={{ fontWeight: 700, color: '#1a1a1a' }}>₹{activeReceipt.amount.toFixed(2)}</span>
                </div>
                {activeReceipt.lateFine > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#ef4444' }}>
                    <span>Late Fine</span>
                    <span style={{ fontWeight: 700 }}>+₹{activeReceipt.lateFine.toFixed(2)}</span>
                  </div>
                )}
                {activeReceipt.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: 'var(--secondary, #1d4ed8)' }}>
                    <span>Discount Applied</span>
                    <span style={{ fontWeight: 700 }}>-₹{activeReceipt.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #e5e7eb', color: '#1a1a1a' }}>
                  <span style={{ fontWeight: 800 }}>TOTAL PAID</span>
                  <span style={{ fontWeight: 800, fontSize: '1.25rem' }}>₹{(activeReceipt.paidAmount || (activeReceipt.amount + (activeReceipt.lateFine || 0) - (activeReceipt.discount || 0))).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '2rem' }}>
                <div style={{ marginBottom: '0.25rem' }}><strong>Method:</strong> {activeReceipt.paymentMethod || 'CASH'}</div>
                {activeReceipt.transactionId && <div style={{ marginBottom: '0.25rem' }}><strong>TXN ID:</strong> {activeReceipt.transactionId}</div>}
                {activeReceipt.collectedBy && <div><strong>Collected/Verified By:</strong> {activeReceipt.collectedBy}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3rem', borderTop: '1px solid #f3f4f6', paddingTop: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontStyle: 'italic' }}>
                  * This is a computer-generated receipt. No signature is required.
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4b5563', letterSpacing: '0.5px' }}><span style={{ color: '#ef4444' }}>SUDHIR</span> <span style={{ color: '#2563eb' }}>TUTORIALS</span></div>
                  <div style={{ fontSize: '0.55rem', color: '#9ca3af', textTransform: 'uppercase', marginTop: '2px' }}>Online Fee Desk</div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '2.5rem', flexWrap: 'wrap' }} className="no-print">
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
                  onClick={() => window.print()}
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
                  onClick={() => downloadReceiptPDF(activeReceipt.id)}
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
      {showPaymentModal && payingFee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '450px', padding: '2rem', margin: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Collect Payment</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Student: <strong>{payingFee.student?.name}</strong> • {payingFee.billingMonth}</p>
            
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span>Base Fee:</span>
                  <span>₹{payingFee.amount}</span>
               </div>
               {(() => {
                 const liveFine = calculateLiveLateFine(payingFee.dueDate, paymentDetails.paidAt);
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
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#10b981' }}>
                  <span>Discount:</span>
                  <input 
                    type="number" 
                    value={paymentDetails.discount} 
                    onChange={e => {
                      const newDiscount = parseFloat(e.target.value || '0');
                      const currentFine = calculateLiveLateFine(payingFee.dueDate, paymentDetails.paidAt);
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
                  <span>₹{Math.max(0, payingFee.amount + calculateLiveLateFine(payingFee.dueDate, paymentDetails.paidAt) - paymentDetails.discount - (payingFee.paidAmount || 0))}</span>
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
               <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                 <button type="button" onClick={() => setShowPaymentModal(false)} style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                 <button onClick={() => updateFeeStatus(payingFee.id, 'PAID', { ...paymentDetails, paidAmount: parseFloat(paymentDetails.paidAmount || '0') })} className="btn-primary" style={{ flex: 1 }}>Confirm Payment</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Fee Record Modal (Admin corrective editing) ───────────────── */}
      {showEditFeeModal && editingFeeRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, overflowY: 'auto', padding: '2rem 1rem' }}>
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
                  <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Due Date</label>
                  <input 
                    type="date" 
                    required 
                    value={editingFeeRecord.dueDate ? new Date(editingFeeRecord.dueDate).toISOString().split('T')[0] : ''} 
                    onChange={e => setEditingFeeRecord({...editingFeeRecord, dueDate: e.target.value})} 
                    style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  />
                </div>
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

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => { setShowEditFeeModal(false); setEditingFeeRecord(null); }} 
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingFeeRecord}
                  className="btn-primary" 
                  style={{ flex: 1, padding: '0.85rem' }}
                >
                  {isSavingFeeRecord ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'profile' && (
        <ProfileEditor role="ADMIN" />
      )}

      {activeTab === 'settings' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
          {/* Welcome/Overview Header Banner */}
          <div className="glass-card" style={{ padding: '1.5rem 2rem', background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(99,102,241,0.05) 100%)', border: '1px solid var(--border)', borderRadius: '16px' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ⚙️ System Settings & Control Panel
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem', maxWidth: '700px', lineHeight: '1.5' }}>
              Fine-tune automated operations, penalty matrices, and payment deadlines. These adjustments take effect immediately across all student fee accounts.
            </p>
          </div>

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
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444' }}>
                  <span>💰</span> Late Fee Penalty Policy
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.15rem 0 0 0', fontWeight: 500 }}>
                  Manage daily fine rates and flat surcharges for overdue invoices.
                </p>
              </div>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', transition: 'transform 0.3s', transform: showSettingsLateFee ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>

            {showSettingsLateFee && (
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                  {/* Penalty Configuration Form */}
                  <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                          <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>Fines accumulated per day for unpaid fees past the specified due date.</small>
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
                          <small style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>One-time surcharge automatically tacked onto invoice when payment is overdue by more than 10 days.</small>
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
                          {isSavingSettings ? 'Saving Settings...' : '💾 Apply Penalty Rules'}
                        </button>
                      </>
                    )}
                  </form>

                  {/* Mechanics Card */}
                  <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 1rem 0', color: 'var(--text)' }}>
                        ℹ️ Penalty Calculation Mechanics
                      </h4>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', lineHeight: '1.5' }}>
                        <p style={{ margin: 0 }}>
                          <strong>Calculation Trigger:</strong> Late fines are generated only when the invoice status remains <code>PENDING</code> beyond its formal due date.
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Daily Accumulation:</strong> Outstanding invoices increment by the specified <code>Daily Rate</code> each consecutive morning the fee remains unpaid.
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>10-Day Flat Threshold:</strong> Once an invoice is 11 or more days overdue, a secondary flat charge is added on top of the daily incremental fine to prompt urgent settlement.
                        </p>
                      </div>
                    </div>
                  </div>
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
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981' }}>
                  <span>🏫</span> Class-wise Default Monthly Fees
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.15rem 0 0 0', fontWeight: 500 }}>
                  Configure default tuition fee packets for Class 1 to Class 12 & Custom Classes.
                </p>
              </div>
              <span style={{ fontSize: '1rem', color: 'var(--text-muted)', transition: 'transform 0.3s', transform: showSettingsClassFees ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                ▼
              </span>
            </button>

            {showSettingsClassFees && (
              <div style={{ padding: '1.25rem 1.5rem', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 1.25rem 0', lineHeight: '1.5' }}>
                  Enter the default monthly tuition fee for each grade from Class 1 to Class 12 or define custom classes. When creating a new student account, their base monthly fee is automatically populated using these settings.
                </p>

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
                    <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '1.25rem', marginTop: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span>✨</span> Custom Classes & Default Fees
                      </h4>
                      
                      {/* List of existing custom classes */}
                      {Object.keys(classFees).filter(cls => !cls.match(/^Class \d+$/)).length > 0 ? (
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
                                  style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.85rem', padding: '0 4px', display: 'flex', alignItems: 'center' }}
                                  title="Delete custom class"
                                >
                                  🗑️
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
                      ) : (
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 1rem 0' }}>No custom classes added yet. Use the form below to add custom options (e.g. '11th Sci').</p>
                      )}

                      {/* Form to add a new custom class inline */}
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end', background: 'rgba(0,0,0,0.15)', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                        <div style={{ flex: '2 1 180px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>Class Name</label>
                          <input 
                            type="text" 
                            placeholder="e.g. 11th Sci, Crash Course" 
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
                          ➕ Add Custom Class
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
                      {isSavingSettings ? 'Saving Class Fees...' : '💾 Save All Class Fees'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Safety Warning */}
          <div style={{ padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.04)', border: '1px solid rgba(239, 68, 68, 0.08)', borderRadius: '10px', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>⚠️ Safety Warning</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.4', display: 'block' }}>Changing these settings does not retroactively rewrite already completed checkout invoices, but applies to future daily late fee calculation rounds.</span>
          </div>
        </div>
      )}

      {activeTab === 'salary' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Welcome Banner */}
          <div className="glass-card" style={{ padding: '2.5rem', background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(99,102,241,0.05) 100%)', border: '1px solid var(--border)' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0, color: '#10b981' }}>💵 Staff Salary & Payroll Management</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '750px' }}>
              Assign monthly salary packets, track outstanding payroll obligations, and disburse teacher payments with automated expense ledger updates.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            
            {/* Generate Salary Form Card */}
            <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--border)' }}>
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
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', color: 'var(--text)' }}>
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
                            {s.status === 'PENDING' ? (
                              <button
                                onClick={() => {
                                  setPayoutSalaryRecord(s);
                                  setPayoutTransactionId(`TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`);
                                  setShowPayoutModal(true);
                                }}
                                style={{
                                  padding: '0.45rem 1rem',
                                  background: '#10b981',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: '8px',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'none'}
                              >
                                💸 Pay Salary
                              </button>
                            ) : (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {s.paidAt ? new Date(s.paidAt).toLocaleDateString('en-IN') : 'Completed'}
                              </div>
                            )}
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

      {/* ── View User Details Modal ─────────────────── */}
      {selectedUserDetail && typeof window !== 'undefined' && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 99999, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: selectedUserDetail.role === 'STUDENT' ? '850px' : '550px', padding: '2.5rem', margin: '2rem auto', position: 'relative', border: '1px solid var(--primary)', borderRadius: '24px', background: 'var(--card-bg)' }}>
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
                  <img src={selectedUserDetail.photoUrl} alt={selectedUserDetail.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (selectedUserDetail.name || 'U').charAt(0).toUpperCase()
                )}
              </div>
              <h2 style={{ fontSize: '1.8rem', margin: 0, fontWeight: 800, color: 'var(--text)' }}>{selectedUserDetail.name || 'Unnamed User'}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{selectedUserDetail.username}</span>
                <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '100px', fontWeight: 800, background: selectedUserDetail.role === 'ADMIN' ? 'rgba(239,68,68,0.15)' : selectedUserDetail.role === 'TEACHER' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', color: selectedUserDetail.role === 'ADMIN' ? '#f87171' : selectedUserDetail.role === 'TEACHER' ? '#34d399' : '#818cf8' }}>
                  {selectedUserDetail.role}
                </span>
                {selectedUserDetail.role === 'STUDENT' && (
                  <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '100px', fontWeight: 800, background: selectedUserDetail.isActive !== false ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: selectedUserDetail.isActive !== false ? '#10b981' : '#ef4444' }}>
                    {selectedUserDetail.isActive !== false ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                )}
              </div>
            </div>

            {/* Profile Info Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', color: 'var(--text)' }}>
              
              <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', marginBottom: '0.25rem' }}>
                📇 Contact & Registration Details
              </div>

              {selectedUserDetail.role === 'STUDENT' && selectedUserDetail.studentProfile && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Roll Number</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.rollNumber || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Registration No</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.registrationNo || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Grade/Class</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.className || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>School</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.school || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Base Fee (Monthly)</div>
                      <div style={{ fontWeight: 800, color: '#10b981' }}>₹{selectedUserDetail.studentProfile.baseFee || 0}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Date of Birth</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.dob || 'N/A'}</div>
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Subject Expertise</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.subject || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Qualification</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.qualification || 'N/A'}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Phone</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.phone || 'N/A'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Date of Birth</div>
                      <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.dob || 'N/A'}</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Address</div>
                    <div style={{ fontWeight: 600 }}>{selectedUserDetail.teacherProfile.address || 'N/A'}</div>
                  </div>
                </>
              )}

              {selectedUserDetail.role === 'ADMIN' && (
                <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed var(--border)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  💼 Admin profiles have full system-wide permissions and do not maintain restricted student or teacher records.
                </div>
              )}
                  
              {selectedUserDetail.role === 'STUDENT' && (
                <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🏦 Complete Fee Statement Ledger</h3>
                  <div className="scrollable-ledger-container">
                    <StudentLedger 
                      studentId={selectedUserDetail.id}
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
                  ✎ Edit User Profile
                </button>
                <button 
                  onClick={() => setSelectedUserDetail(null)} 
                  style={{ flex: 1, padding: '0.85rem', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '12px', cursor: 'pointer', fontWeight: 600 }}
                >
                  Close Details
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Security / Password Verification Backdrop Modal ─────────────────── */}
      {securityConfirm.isOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(16px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, padding: '1rem' }} className="no-print">
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem', border: '2px solid #ef4444', background: '#111', borderRadius: '24px', boxShadow: '0 10px 40px rgba(239, 68, 68, 0.2)' }}>
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
                  style={{ width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px', color: '#fff', fontSize: '1.1rem', textAlign: 'center' }} 
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setSecurityConfirm(prev => ({ ...prev, isOpen: false }))} 
                  style={{ flex: 1, padding: '0.85rem', borderRadius: '12px', background: '#222', border: '1px solid var(--border)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}
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
        </div>
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
