"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { ProfileEditor } from '@/components/ProfileEditor';
import { useSession } from 'next-auth/react';
import { LiveClock } from '@/components/LiveClock';
import { Sidebar } from '@/components/Sidebar';
import { StudentLedger } from '@/components/StudentLedger';

function AdminDashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [userSubTab, setUserSubTab] = useState<'DIRECTORY' | 'CREATE'>('DIRECTORY');
  const [financeSubTab, setFinanceSubTab] = useState<'LEDGER' | 'ASSIGN'>('LEDGER');
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
    if (tab === 'courses') {
      fetchCourses();
      fetchBatches();
      fetchTeachers();
      // Fetch all students automatically for batch enrollment
      fetch('/api/admin/directory?q=').then(res => res.json()).then(data => setDirectoryUsers(data.users || []));
    }
  }, [searchParams]);

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/admin/directory?role=TEACHER_OR_ADMIN');
      const data = await res.json();
      setAllTeachers(data.users || []);
    } catch (e) {}
  };
  
  // User Creation State
  const [overviewStats, setOverviewStats] = useState<{ totalStudents: number, totalTeachers: number, revenueThisMonth: number, pendingDues: number } | null>(null);
  const [newUserRole, setNewUserRole] = useState<'STUDENT' | 'TEACHER' | 'ADMIN'>('STUDENT');
  const [newUserName, setNewUserName] = useState('');
  const [createdUser, setCreatedUser] = useState<{username: string, password: string, role: string} | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Analytics State
  const [reportData, setReportData] = useState<{ enrollmentData: any[], revenueTrend: any[], attendanceRate: number } | null>(null);
  const [isReportsLoading, setIsReportsLoading] = useState(false);

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
  const [newTest, setNewTest] = useState({ title: '', courseId: '', date: new Date().toISOString().split('T')[0] });
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
        setNewTest({ title: '', courseId: '', date: new Date().toISOString().split('T')[0] });
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
  const [fees, setFees] = useState<any[]>([]);
  const [feeSearchQuery, setFeeSearchQuery] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [addFeeMode, setAddFeeMode] = useState<'INDIVIDUAL' | 'BATCH'>('INDIVIDUAL');
  const [feeStudentId, setFeeStudentId] = useState('');
  const [feeStudentSearch, setFeeStudentSearch] = useState(''); // for combobox display text
  const [feeAmount, setFeeAmount] = useState('');
  const [feeBillingMonth, setFeeBillingMonth] = useState('April 2026');
  const [feeTitle, setFeeTitle] = useState('Monthly Fee');
  const [isAddingFee, setIsAddingFee] = useState(false);
  const [finSummary, setFinSummary] = useState<{ totalRevenue: number, totalExpenses: number, totalPending: number, netProfit: number, monthlyData: any[] } | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isAddingExpense, setIsAddingExpense] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({ title: '', category: 'OTHER', amount: '', remarks: '' });
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingFee, setPayingFee] = useState<any>(null);
  const [paymentDetails, setPaymentDetails] = useState({ paymentMethod: 'CASH', transactionId: '', discount: 0, remarks: '' });

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
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newUserRole, name: newUserName })
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedUser(data.user);
        setNewUserName('');
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
      const res = await fetch(`/api/admin/directory?q=${encodeURIComponent(searchQuery)}`);
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
      const res = await fetch('/api/admin/finances');
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
        filename: `Receipt_REC_${receiptId.slice(-6).toUpperCase()}.pdf`,
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
      }
    } catch (err) { console.error(err); }
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
    if (activeTab === 'overview') fetchOverviewStats();
    if (activeTab === 'users') handleSearchDirectory();
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
    if (activeTab === 'courses') {
      fetchCourses();
      fetchBatches();
      fetchTeachers();
      fetch('/api/admin/directory?q=').then(res => res.json()).then(data => setDirectoryUsers(data.users || []));
    }
    if (activeTab === 'attendance') {
      fetchBatches();
    }
    if (activeTab === 'materials') {
      fetchMaterials();
      fetchCourses();
    }
    if (activeTab === 'tests') {
      fetchTests();
      fetchCourses();
    }
    if (activeTab === 'analytics') {
      fetchReports();
      fetchFinSummary();
    }
  }, [activeTab]);

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
      const res = await fetch(endpoint);
      const data = await res.json();
      if (res.ok) {
        const userData = role === 'STUDENT' ? data.student : role === 'TEACHER' ? data.teacher : data.admin;
        const profileData = role === 'STUDENT' ? userData.studentProfile : role === 'TEACHER' ? userData.teacherProfile : {};
        
        setEditingProfile({ 
          userId: userData.id, 
          role,
          name: userData.name || '',
          username: userData.username,
          ...(profileData || {}),
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
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
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
        {['overview', 'users', 'verifications', 'finances', 'courses', 'attendance', 'materials', 'tests', 'analytics', 'messages', 'notifications'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
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
            {tab === 'attendance' ? '✏️ Attendance' : 
             tab === 'materials' ? '📚 Study Materials' : 
             tab === 'tests' ? '📝 Tests & Marks' : 
             tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            {[
              { label: 'Total Students', value: overviewStats?.totalStudents ?? 0, trend: '', color: '#6366f1' },
              { label: 'Active Teachers', value: overviewStats?.totalTeachers ?? 0, trend: '', color: '#10b981' },
              { label: 'Revenue This Month', value: `₹${(overviewStats?.revenueThisMonth ?? 0).toLocaleString()}`, trend: '', color: '#3b82f6' },
              { label: 'Pending Dues', value: `₹${(overviewStats?.pendingDues ?? 0).toLocaleString()}`, trend: '', color: '#ef4444' }
            ].map((stat, i) => (
              <div key={i} className="glass-card" style={{ padding: '1.5rem', borderTop: `3px solid ${stat.color}` }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 600 }}>{stat.label}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stat.value}</div>
                  {stat.trend && <div style={{ color: stat.trend.startsWith('+') ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '1rem', marginBottom: '5px' }}>{stat.trend}</div>}
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Create New Users</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Generate auto-IDs (FAC* / STU*) for new teachers and students. The system will automatically generate an initial secure password.</p>
            
            {createdUser && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                <h3 style={{ color: '#34d399', marginBottom: '1rem' }}>✅ Successfully created {createdUser.role}!</h3>
                <p style={{ marginBottom: '0.5rem' }}>Please securely share these credentials with the user:</p>
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

              <button type="submit" className="btn-primary" disabled={isCreating} style={{ padding: '0.9rem', marginBottom: '1.25rem' }}>
                {isCreating ? "Creating..." : "Generate ID & Save"}
              </button>
            </form>
          </div>
        </>
      )}

      {activeTab === 'verifications' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Pending Profile Verifications</h2>
          {pendingVerifications.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No profiles are currently awaiting verification.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {pendingVerifications.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{u.name || 'Anonymous'}</span>
                      <span className="role-badge" style={{ fontSize: '0.65rem' }}>{u.role}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Username: <strong>{u.username}</strong> • Joined {new Date(u.createdAt).toLocaleDateString()}
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
              ➕ Add New Member
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
                            <span style={{ fontWeight: 'bold', fontSize: '1.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || 'Unnamed'}</span>
                            <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '20px', background: u.role === 'TEACHER' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)', color: u.role === 'TEACHER' ? '#34d399' : '#818cf8', flexShrink: 0 }}>
                              {u.role}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>@{u.username}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Joined: {new Date(u.createdAt).toLocaleDateString()}</div>
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
          <div style={{ display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.15)', padding: '0.5rem', borderRadius: '16px', border: '1px solid var(--border)', alignSelf: 'flex-start' }}>
            <button 
              onClick={() => setFinanceSubTab('LEDGER')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: financeSubTab === 'LEDGER' ? 'var(--primary)' : 'transparent',
                color: financeSubTab === 'LEDGER' ? '#fff' : 'var(--text-muted)',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              💳 Fee Ledger & Collections
            </button>
            <button 
              onClick={() => setFinanceSubTab('ASSIGN')}
              style={{
                padding: '0.75rem 1.5rem',
                border: 'none',
                background: financeSubTab === 'ASSIGN' ? 'var(--primary)' : 'transparent',
                color: financeSubTab === 'ASSIGN' ? '#fff' : 'var(--text-muted)',
                borderRadius: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              ➕ Assign Fee
            </button>
          </div>

          {financeSubTab === 'LEDGER' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* ── Top Level Stats: Smart Finance Overview ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                 {[
                   { label: 'Collected Revenue', value: `₹${(finSummary?.totalRevenue || 0).toLocaleString()}`, color: '#10b981' },
                   { label: 'Total Expenses', value: `₹${(finSummary?.totalExpenses || 0).toLocaleString()}`, color: '#f59e0b' },
                   { label: 'Net Profit', value: `₹${(finSummary?.netProfit || 0).toLocaleString()}`, color: '#3b82f6' },
                   { label: 'Pending Receivables', value: `₹${(finSummary?.totalPending || 0).toLocaleString()}`, color: '#ef4444' }
                 ].map((s, i) => (
                   <div key={i} className="glass-card" style={{ padding: '1.5rem', borderLeft: `4px solid ${s.color}` }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{s.label}</div>
                      <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.5rem' }}>{s.value}</div>
                   </div>
                 ))}
              </div>

              {/* Full-Width Ledger Collection Table */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Fee Ledger & Collections</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Track and verify all student payments</p>
                  </div>
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
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <th style={{ padding: '0.75rem 0' }}>Student / ID</th>
                        <th>Billing Details</th>
                        <th>Status</th>
                        <th>Amount Breakup</th>
                        <th>Total Due</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filteredFees = fees.filter(f => 
                          f.student?.name?.toLowerCase().includes(feeSearchQuery.toLowerCase()) || 
                          f.student?.username?.toLowerCase().includes(feeSearchQuery.toLowerCase())
                        );

                        if (filteredFees.length === 0) return <tr><td colSpan={6} style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No matching fee records found.</td></tr>;

                        return filteredFees.map(fee => {
                          const isOverdue = fee.status === 'PENDING' && fee.currentLateFine > 0;
                          return (
                            <tr key={fee.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isOverdue ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                              <td style={{ padding: '1rem 0' }}>
                                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{fee.student?.name}</div>
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
                                    <button onClick={() => { setPayingFee(fee); setShowPaymentModal(true); setPaymentDetails({...paymentDetails, discount: fee.discount}); }} style={{ padding: '6px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>Collect</button>
                                  )}
                                  {(fee.status === 'PAID' || fee.status === 'PAID_ONLINE') && (
                                    <button onClick={() => updateFeeStatus(fee.id, 'VERIFIED')} style={{ padding: '6px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>Verify</button>
                                  )}
                                  {(fee.status !== 'PENDING') && (
                                    <button onClick={() => setActiveReceipt(fee)} style={{ padding: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>🧾 Receipt</button>
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
                </div>
              </div>

              {/* 2-Column: Recent Expenses and Auto-Billing Controls Side-by-Side */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                
                {/* Expenses Card */}
                <div className="glass-card" style={{ padding: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                     <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Recent Expenses</h3>
                     <button onClick={() => setShowExpenseModal(true)} style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer' }}>+ Add</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                     {expenses.slice(0, 5).map(exp => (
                       <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid var(--border)' }}>
                          <div>
                             <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{exp.title}</div>
                             <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{exp.category} • {new Date(exp.date).toLocaleDateString()}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                             <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ef4444' }}>-₹{exp.amount}</div>
                             <button onClick={() => deleteExpense(exp.id)} style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.7rem', cursor: 'pointer' }}>Delete</button>
                          </div>
                       </div>
                     ))}
                     {expenses.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No expenses recorded.</p>}
                  </div>
                </div>

                {/* Billing Summary Box */}
                <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Billing Overview</h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>View outstanding student dues and verify billing status. Generate monthly bills automatically via the controller engine below.</p>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div style={{ padding: '1rem', background: 'rgba(99,102,241,0.05)', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.2)' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Collected</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹{(finSummary?.totalRevenue || 0).toLocaleString()}</div>
                    </div>
                    <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.05)', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 600 }}>Uncollected</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800 }}>₹{(finSummary?.totalPending || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ── Bottom Section: Automated Monthly Billing Control Engine ── */}
              <div className="glass-card" style={{ padding: '2rem', border: '1px solid var(--primary)', borderRadius: '20px', background: 'var(--card-bg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}>
                      ⚙️ Automated Monthly Billing Control Engine
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Generate monthly student bills automatically based on individual profile base fees</p>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input 
                      type="text" 
                      placeholder="e.g. May 2026" 
                      value={autoBillingMonth}
                      onChange={e => {
                        setAutoBillingMonth(e.target.value);
                        if (e.target.value.length >= 6) fetchAutoBillingPreview(e.target.value);
                      }}
                      style={{ padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', width: '180px', fontWeight: 600 }}
                    />
                    
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'rgba(255,255,255,0.01)', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
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
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: '12px' }}>
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
                          background: 'var(--input-bg)',
                          border: `1px solid ${feeStudentId ? '#10b981' : 'var(--border)'}`,
                          color: 'var(--text)', fontSize: '0.95rem'
                        }}
                      />
                      <datalist id="student-list">
                        {directoryUsers
                          .filter(u => u.role === 'STUDENT')
                          .map(s => (
                            <option key={s.id} value={`${s.name} (${s.username})`} />
                          ))}
                      </datalist>
                      {feeStudentId && (
                        <span style={{
                          position: 'absolute', right: '1rem', top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#10b981', fontSize: '1rem'
                        }}>✓</span>
                      )}
                    </div>
                    {!feeStudentId && feeStudentSearch && (
                      <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '4px' }}>
                        No match found. Pick from the list.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="input-group">
                    <label>Select Batch</label>
                    <select 
                      required 
                      value={feeStudentId} 
                      onChange={e => setFeeStudentId(e.target.value)}
                      style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                    >
                      <option value="">Choose...</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.className})</option>
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
                    <input type="text" value={feeBillingMonth} onChange={e => setFeeBillingMonth(e.target.value)} />
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

                <button type="submit" disabled={isAddingFee} className="btn-primary" style={{ width: '100%', marginTop: '1rem', padding: '1rem' }}>
                  {isAddingFee ? 'Assigning...' : 'Assign Fee / Charge'}
                </button>
              </form>
            </div>
          )}

        </div>
      )}

      {activeTab === 'courses' && (
        <div className="courses-layout-grid" style={{ gap: '2rem' }}>
          
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Courses</h2>
            <form onSubmit={handleCreateCourse} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input type="text" required placeholder="Course Name" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', flex: 1 }} />
              <button type="submit" className="btn-primary" disabled={isAddingCourse}>{isAddingCourse ? '...' : 'Add'}</button>
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

              <div className="input-group">
                <label>Enroll Students (Search & Select)</label>
                <input 
                  type="text" 
                  placeholder="🔍 Search student name or ID..." 
                  style={{ marginBottom: '0.5rem', padding: '0.6rem', fontSize: '0.85rem' }} 
                  onChange={e => {
                    const q = e.target.value.toLowerCase();
                    const els = document.querySelectorAll('.student-item');
                    els.forEach((el: any) => {
                      el.style.display = el.textContent.toLowerCase().includes(q) ? 'flex' : 'none';
                    });
                  }}
                />
                <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  {directoryUsers.filter(u => u.role === 'STUDENT').length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No students found. Go to Directory to add students first.</p>
                  ) : (
                    directoryUsers.filter(u => u.role === 'STUDENT').map(s => (
                      <label key={s.id} className="student-item" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <input 
                          type="checkbox" 
                          value={s.username}
                          checked={newBatchStudentUsernames.split(',').includes(s.username)}
                          onChange={e => {
                            const val = e.target.value;
                            setNewBatchStudentUsernames(prev => {
                              const arr = prev ? prev.split(',').filter(Boolean) : [];
                              if (e.target.checked) return [...arr, val].join(',');
                              return arr.filter(x => x !== val).join(',');
                            });
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.username}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={isAddingBatch}>
                {isAddingBatch ? 'Creating...' : 'Create Batch & Finalize'}
              </button>
            </form>

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

      {activeTab === 'analytics' && (
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
                         <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700 }}>₹{d.amount > 1000 ? (d.amount/1000).toFixed(1)+'k' : d.amount}</div>
                         <div style={{ width: '100%', height: `${height}%`, background: 'linear-gradient(to top, #6366f1, #8B5CF6)', borderRadius: '4px 4px 0 0', transition: 'height 1s ease-out' }}></div>
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

      {activeTab === 'attendance' && (
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
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{s.username}</div>
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

      {activeTab === 'materials' && (
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
                        <span style={{ fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', background: '#4f46e5', fontWeight: 800 }}>{mat.type}</span>
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
                  <option value="VIDEO">🎥 Video Tutorial Link</option>
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

              <div className="input-group">
                <label style={{ fontWeight: 600 }}>Public File URL</label>
                <input type="url" required placeholder="https://drive.google.com/..." value={matUrl} onChange={e => setMatUrl(e.target.value)} />
              </div>

              <button type="submit" className="btn-primary" disabled={isUploading} style={{ background: '#10b981', border: 'none', marginTop: '0.5rem' }}>
                {isUploading ? 'Publishing...' : '🚀 Publish Material'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'tests' && (
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
                        Course: <strong>{test.course?.name}</strong> • Date: {new Date(test.date).toLocaleDateString()}
                      </div>
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
                <label style={{ fontWeight: 600 }}>Test Title / Subject</label>
                <input type="text" required placeholder="e.g. Chemistry Unit 1 Test" value={newTest.title} onChange={e => setNewTest({ ...newTest, title: e.target.value })} />
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
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{s.username}</div>
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

      {activeTab === 'messages' && session?.user && (
        <ChatWindow currentUserId={(session.user as any).id} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsPanel />
      )}
      {showDelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
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
                       onChange={e => setEditingProfile({...editingProfile, className: e.target.value})}
                       style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                     >
                       <option value="">Select Class...</option>
                       {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th (Sci)", "11th (Com)", "12th (Sci)", "12th (Com)"].map(c => (
                         <option key={c} value={c}>{c}</option>
                       ))}
                     </select>
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
               
               {editingProfile.role === 'STUDENT' && (
                 <div style={{ gridColumn: 'span 2', marginTop: '1rem', marginBottom: '1.5rem' }}>
                   <StudentLedger studentId={editingProfile.userId} refreshTrigger={financeRefreshTrigger} />
                 </div>
               )}

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
          <div className="glass-card batch-modal-card">
            <button onClick={() => setShowBatchEditModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>

            <div style={{ marginBottom: '2.5rem' }}>
               <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Batch Control Center</h2>
               <p style={{ color: 'var(--text-muted)' }}>Configuring <strong>{editingBatch.name}</strong> • {editingBatch.course?.name}</p>
            </div>

            <div className="batch-control-grid">
              
              {/* ── LEFT COLUMN: INFO & ROSTER ───────────────── */}
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
                  <div style={{ maxHeight: '150px', overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    {allTeachers.map(t => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)', flexWrap: 'wrap' }}>
                        <input 
                          type="checkbox" 
                          checked={editingBatch.teachers?.some((te:any) => te.id === t.id)}
                          onChange={e => {
                            const checked = e.target.checked;
                            const newTeachers = checked ? [...(editingBatch.teachers || []), t] : editingBatch.teachers.filter((te:any) => te.id !== t.id);
                            setEditingBatch({...editingBatch, teachers: newTeachers});
                          }}
                        />
                        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({t.username})</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🎓 Student Roster ({editingBatch.students?.length || 0})</h3>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    {directoryUsers.filter(u => u.role === 'STUDENT').map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)', flexWrap: 'wrap' }}>
                        <input 
                          type="checkbox" 
                          checked={editingBatch.students?.some((st:any) => st.id === s.id)}
                          onChange={e => {
                            const checked = e.target.checked;
                            const newStudents = checked ? [...(editingBatch.students || []), s] : editingBatch.students.filter((st:any) => st.id !== s.id);
                            setEditingBatch({...editingBatch, students: newStudents});
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, wordBreak: 'break-word' }}>{s.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.username}</span>
                        </div>
                      </label>
                    ))}
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
                        if (!confirm(`Assign ₹${editingBatch.defaultFee} fee to all students for ${new Date().toLocaleString('default', { month: 'long' })}?`)) return;
                        const billingMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
                        const dueDate = new Date();
                        dueDate.setDate(12); // standard 12th due date

                        for (const student of editingBatch.students) {
                          await fetch('/api/admin/finances', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              studentUsername: student.username,
                              amount: editingBatch.defaultFee,
                              title: `${editingBatch.name} - Monthly Fee`,
                              billingMonth,
                              dueDate: dueDate.toISOString().split('T')[0]
                            })
                          });
                        }
                        alert('Batch billing completed successfully!');
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
      {activeReceipt && (
        <div className="receipt-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card receipt-print-area" style={{ 
            width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden', 
            background: '#fff', color: '#1a1a1a', borderRadius: '12px', 
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative', margin: 'auto' 
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

            <div style={{ padding: '2.5rem', border: '8px solid #f3f4f6', position: 'relative', zIndex: 2 }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: '#1a1a1a', fontSize: '1.5rem', margin: 0, letterSpacing: '1px', fontWeight: 800 }}>SUDHIR TUTORIALS</h1>
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
                  <div style={{ fontWeight: 700, color: '#1a1a1a' }}>REC-{activeReceipt.id.slice(-6).toUpperCase()}</div>
                  <div style={{ color: '#6b7280' }}>
                    {activeReceipt.paidAt 
                      ? `${new Date(activeReceipt.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}, ${new Date(activeReceipt.paidAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` 
                      : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', color: '#10b981' }}>
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
                {activeReceipt.transactionId && <div><strong>TXN ID:</strong> {activeReceipt.transactionId}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '3rem' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: '120px', height: '1px', background: '#e5e7eb', marginBottom: '0.5rem' }}></div>
                  <div style={{ fontSize: '0.6rem', color: '#9ca3af', textTransform: 'uppercase' }}>Receiver Signature</div>
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
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', 
                    fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s', fontSize: '0.85rem',
                    boxShadow: '0 4px 15px rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
                >
                  {downloadingPDF ? 'Generating...' : '📥 Download PDF'}
                </button>
              </div>

            </div>
          </div>
        </div>
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
               {payingFee.currentLateFine > 0 && (
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ef4444' }}>
                    <span>Late Fine:</span>
                    <span>+₹{payingFee.currentLateFine}</span>
                 </div>
               )}
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#10b981' }}>
                  <span>Discount:</span>
                  <input 
                    type="number" 
                    value={paymentDetails.discount} 
                    onChange={e => setPaymentDetails({...paymentDetails, discount: parseFloat(e.target.value || '0')})}
                    style={{ width: '80px', padding: '2px 8px', borderRadius: '4px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: '#10b981', textAlign: 'right' }}
                  />
               </div>
               <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '1rem', borderTop: '1px solid var(--border)', fontWeight: 800, fontSize: '1.2rem' }}>
                  <span>Total Payable:</span>
                  <span>₹{Math.max(0, payingFee.amount + (payingFee.currentLateFine || 0) - paymentDetails.discount)}</span>
               </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
                 <button onClick={() => updateFeeStatus(payingFee.id, 'PAID', paymentDetails)} className="btn-primary" style={{ flex: 1 }}>Confirm Payment</button>
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
              Student: <strong>{editingFeeRecord.student?.name}</strong> (@{editingFeeRecord.student?.username})
            </p>

            <form onSubmit={saveFeeRecordEdits} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div className="input-group">
                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Billing Month</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. May 2026"
                  value={editingFeeRecord.billingMonth || ''} 
                  onChange={e => setEditingFeeRecord({...editingFeeRecord, billingMonth: e.target.value})} 
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }}
                />
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

      {/* ── View User Details Modal ─────────────────── */}
      {selectedUserDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 3000, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '550px', padding: '2.5rem', margin: 'auto', position: 'relative', border: '1px solid var(--primary)', borderRadius: '24px', background: 'var(--card-bg)' }}>
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
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{selectedUserDetail.username}</span>
                <span style={{ fontSize: '0.75rem', padding: '3px 10px', borderRadius: '100px', fontWeight: 800, background: selectedUserDetail.role === 'ADMIN' ? 'rgba(239,68,68,0.15)' : selectedUserDetail.role === 'TEACHER' ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)', color: selectedUserDetail.role === 'ADMIN' ? '#f87171' : selectedUserDetail.role === 'TEACHER' ? '#34d399' : '#818cf8' }}>
                  {selectedUserDetail.role}
                </span>
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

                  <div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>Personal Email</div>
                    <div style={{ fontWeight: 600 }}>{selectedUserDetail.studentProfile.email || 'N/A'}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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
        </div>
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
