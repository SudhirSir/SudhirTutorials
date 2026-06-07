"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { ProfileEditor } from '@/components/ProfileEditor';
import { useSession } from 'next-auth/react';
import { LiveClock } from '@/components/LiveClock';
import { Sidebar } from '@/components/Sidebar';
import { LecturesSection } from '@/components/LecturesSection';
import { UserProfileModal } from '@/components/UserProfileModal';

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

function TeacherDashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('classes');

  const [activeProfileUserId, setActiveProfileUserId] = useState<string | null>(null);
  const [chatSelectedUserId, setChatSelectedUserId] = useState<string | null>(null);


  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(pathname + '?' + params.toString());
  };

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
    const interval = setInterval(fetchUnreadCounts, 30000);
    return () => clearInterval(interval);
  }, [session]);
  
  useEffect(() => {
    if (!session?.user) return;
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams, session]);
  
  // States
  const [classes, setClasses] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [fetchingSalaries, setFetchingSalaries] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentBatchQuery, setStudentBatchQuery] = useState('');
  
  // Attendance States
  const [attBatchId, setAttBatchId] = useState('');
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attStudents, setAttStudents] = useState<any[]>([]);
  const [attRecords, setAttRecords] = useState<Record<string, string>>({});
  const [isSavingAtt, setIsSavingAtt] = useState(false);
  
  // Material Upload Form
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState('PDF');
  const [matUrl, setMatUrl] = useState('');
  const [matCourseId, setMatCourseId] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Custom File Uploader helper states
  const [uploadMode, setUploadMode] = useState<'FILE' | 'URL'>('FILE');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [selectedFileSize, setSelectedFileSize] = useState('');
  const [filePreview, setFilePreview] = useState('');

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
  
  // Test States
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [testMarks, setTestMarks] = useState<Record<string, { marks: string, totalMarks: string, remarks: string }>>({});
  const [isSavingMarks, setIsSavingMarks] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [newTest, setNewTest] = useState({ title: '', subject: '', courseId: '', date: new Date().toISOString().split('T')[0], time: '', syllabus: '' });
  
  // Profile State
  const [profile, setProfile] = useState<any>(null);

  // ─── AI GURU WORKSPACE FOR TEACHERS ───────────────────
  const [aiMode, setAiMode] = useState<'GURU' | 'PREPARE'>('GURU');
  const [teacherGuruQuestion, setTeacherGuruQuestion] = useState('');
  const [teacherGuruSubject, setTeacherGuruSubject] = useState('Mathematics');
  const [teacherGuruLanguage, setTeacherGuruLanguage] = useState<'ENGLISH' | 'HINDI' | 'HINGLISH'>('ENGLISH');
  const [teacherGuruHistory, setTeacherGuruHistory] = useState<Array<{ role: 'user' | 'guru', content: string, subject?: string }>>([]);
  const [teacherGuruLoading, setTeacherGuruLoading] = useState(false);

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
    await new Promise(resolve => setTimeout(resolve, 1500));

    const topic = pptTopic.trim();
    const grade = pptGrade;
    const focus = pptFocus;

    const slides = [
      {
        type: 'TITLE',
        title: `📖 LESSON PLAN & LECTURE OUTLINE`,
        subtitle: `${topic.toUpperCase()}`,
        badge: `SUDHIR TUTORIALS`,
        meta: `Curriculum: ${grade} | Designed for Premium Academic Excellence`,
        content: `Welcome to the official premium lecture presentation. This slide deck has been custom-prepared for ${grade} scholars. Let's delve into the core concepts, analytical frameworks, and practical problem-solving methods of this topic.`
      },
      {
        type: 'CONCEPT',
        title: `⚡ Core Concepts & Definitions`,
        subtitle: `Understanding the Foundations`,
        badge: `SUDHIR TUTORIALS`,
        meta: `Topic Focus: ${topic}`,
        content: `What is ${topic}? Let's break down the scientific/mathematical definition of this topic.

👉 **Definition & Core Philosophy:**
This topic forms the fundamental bedrock of academic science/mathematics. It explains the core interactions, equations, and principles that govern physical systems or mathematical relations.

👉 **Key Principles to Remember:**
1. **Precision & Consistency**: Every definition must match scientific standards.
2. **Interconnected Nature**: This relates closely to higher-level analytical mechanics and logical deductions.
3. **Application in Exams**: Conceptual clarity is highly tested in competitive papers like IIT-JEE, NEET, and Board Exams.`
      },
      {
        type: 'FORMULA',
        title: `🧮 Mathematical Formulas & Derivations`,
        subtitle: `The Quantitative Framework`,
        badge: `SUDHIR TUTORIALS`,
        meta: `Formulas for ${topic}`,
        content: `Let's analyze the governing mathematical framework of ${topic}:

👉 **Primary Governing Equation:**
Depending on your specific focus, this represents the vital equation model for this topic:
*   **Formula**: Balanced Conservation Equation or Governing Algebraic Matrix of variables.
*   **Variables Invoiced**:
    *   **Independent Parameters**: Measured constants and boundary values.
    *   **Dependent Variables**: Calculated dynamic outputs.

👉 **Derivation & Step-by-Step Proof:**
1. Set up initial boundary conditions of the system.
2. Integrate across the boundary constraints.
3. Establish the final balanced conservation equation.`
      },
      {
        type: 'PRACTICAL',
        title: `🌍 Real-World Applications & Examples`,
        subtitle: `Connecting Theory to Reality`,
        badge: `SUDHIR TUTORIALS`,
        meta: `Industry & Real-Life Use Cases`,
        content: `Why do we study ${topic}? Let's check where this is applied in modern technology:

👉 **Practical Real-world Scenarios:**
*   **Engineering & Design**: Designing robust structures, electronic circuits, or thermal power grids.
*   **Daily Life Phenomenon**: Explaining natural occurrences, biological metabolic pathways, or standard kinematic motions.
*   **Technology Integration**: Utilized in space research, software algorithms, or dynamic industrial automation.

👉 **Classroom Activity / Discussion:**
"How would changing the input constraint parameter affect the net output efficiency of this system?" Discuss in groups of 3.`
      },
      {
        type: 'QUIZ',
        title: `📝 Lecture Self-Assessment (5 MCQs)`,
        subtitle: `Test Your Conceptual Understanding`,
        badge: `SUDHIR TUTORIALS`,
        meta: `Quiz Session | Grade: ${grade}`,
        content: `Let's solve these hand-picked conceptual multiple-choice questions:

**Q1. What is the primary governing factor of ${topic}?**
*   [A] Ambient atmospheric conditions
*   [B] Intrinsic system parameters (Correct ✓)
*   [C] Random quantum perturbations
*   [D] None of the above

**Q2. Which constant plays the most vital role here?**
*   [A] Planck's Constant
*   [B] Ideal Gas Constant
*   [C] Proportionality Coefficient (Correct ✓)
*   [D] Gravitational Parameter

**Q3. If we double the active system variable, the resulting net output will:**
*   [A] Increase by 2x (Correct ✓)
*   [B] Reduce by half
*   [C] Remain absolutely unchanged
*   [D] Exponentially decay

**Q4. Under what boundary state does this model fail?**
*   [A] High temperatures
*   [B] Outside normal operating limits (Correct ✓)
*   [C] Absolute zero temperature
*   [D] All of the above

**Q5. The ultimate goal of studying this topic is to enable:**
*   [A] Rote memorization of derivations
*   [B] Dynamic industrial predictions & calculations (Correct ✓)
*   [C] Pure historical analysis
*   [D] None of the above`
      }
    ];

    setGeneratedPpt({
      topic,
      grade,
      focus,
      slides
    });
    setActiveSlideIndex(0);
    setPptGenerating(false);
  };

  const printTeacherPpt = () => {
    if (!generatedPpt) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Sudhir Tutorials - Premium Lesson Slides: ${generatedPpt.topic}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
            .slide-page { page-break-after: always; border: 2px solid #4f46e5; border-radius: 12px; padding: 30px; margin-bottom: 40px; background: #fff; min-height: 500px; display: flex; flexDirection: column; justify-content: space-between; }
            .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .header h1 { margin: 0; font-size: 20px; color: #4f46e5; font-weight: 800; }
            .badge { background: #4f46e5; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }
            .meta { font-size: 13px; color: #6b7280; margin-top: 5px; }
            .content { font-size: 16px; line-height: 1.6; color: #374151; flex: 1; whiteSpace: pre-line; }
            .footer { border-top: 1px dashed #d1d5db; padding-top: 15px; margin-top: 20px; display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; font-weight: bold; }
            .logo-text { font-size: 16px; font-weight: 900; color: #4f46e5; letter-spacing: 0.5px; }
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

  const askTeacherGuru = async () => {
    if (!teacherGuruQuestion.trim()) return;
    const q = teacherGuruQuestion;
    const subj = teacherGuruSubject;
    setTeacherGuruQuestion('');
    setTeacherGuruHistory(prev => [...prev, { role: 'user', content: q, subject: subj }]);
    setTeacherGuruLoading(true);

    try {
      const res = await fetch('/api/student/guru-ji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, subject: subj, language: teacherGuruLanguage })
      });
      if (res.ok) {
        const data = await res.json();
        setTeacherGuruHistory(prev => [...prev, { role: 'guru', content: data.solution }]);
      } else {
        setTeacherGuruHistory(prev => [...prev, { role: 'guru', content: 'Sorry, I encountered a connection issue. Please try seeking my guidance again.' }]);
      }
    } catch (e) {
      setTeacherGuruHistory(prev => [...prev, { role: 'guru', content: 'Network connection error occurred.' }]);
    } finally {
      setTeacherGuruLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.name) {
      setTeacherGuruHistory([
        { role: 'guru', content: `Hello, Teacher ${profile.name}! 👋 I am Digital Sahayak, your premium teaching companion. Let's make learning, lesson planning, and notes generation incredibly creative today!` }
      ]);
    }
  }, [profile]);

  const fetchSalaries = async () => {
    setFetchingSalaries(true);
    try {
      const res = await fetch('/api/teacher/salaries');
      if (res.ok) {
        const data = await res.json();
        setSalaries(data.salaries || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingSalaries(false);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    fetchUnreadCounts();
    if (activeTab === 'classes') {
      fetchClasses();
    }
    if (activeTab === 'materials') {
      fetchMaterials();
    }
    if (activeTab === 'students') {
      fetchStudents();
    }
    if (activeTab === 'tests') {
      fetchTests();
    }
    if (activeTab === 'salary') {
      fetchSalaries();
    }
    if (activeTab === 'profile') {
      fetchProfile();
    }
  }, [activeTab, session]);

  useEffect(() => {
    if (!session?.user) return;
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [studentSearchQuery, studentBatchQuery, session, activeTab]);

  useEffect(() => {
    if (!session?.user) return;
    if (attBatchId) {
      fetchAttendance();
    }
  }, [attBatchId, attDate, session]);

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/teacher/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data.batches || []);
      }
    } catch (e) {
      console.error(e);
    }
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

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/teacher/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile ? { ...data.profile, name: data.name } : { name: data.name });
      }
    } catch (e) { console.error(e); }
  };

  const fetchMaterials = async () => {
    try {
      const res = await fetch('/api/teacher/materials');
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStudents = async () => {
    try {
      const params = new URLSearchParams();
      if (studentSearchQuery) params.append('q', studentSearchQuery);
      if (studentBatchQuery) params.append('batch', studentBatchQuery);
      const res = await fetch(`/api/teacher/students?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAttendance = async () => {
    if (!attBatchId) return;
    try {
      // Get all students in the batch first
      const batchRes = await fetch(`/api/teacher/students?batchId=${attBatchId}`);
      if (batchRes.ok) {
        const bData = await batchRes.json();
        setAttStudents(bData.students || []);
        
        // Get existing records for the date
        const attRes = await fetch(`/api/teacher/attendance?batchId=${attBatchId}&date=${attDate}`);
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

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault();
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

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
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
      // Fetch students for the course
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
        setStudents(data.students); // reuse students state for mark entry
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

  // Get unique courses from assigned batches for the dropdown
  const uniqueCourses = Array.from(new Set(classes.map(c => c.courseId))).map(id => {
    return classes.find(c => c.courseId === id)?.course;
  }).filter(Boolean);


  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      <div className="bg-glow accent" style={{ top: '-10%', right: '-10%', opacity: 0.5 }}></div>
      {activeTab === 'classes' && (
        <header className="dashboard-header" style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
              जय सियाराम 🙏 <span style={{ color: '#10b981' }}>{session?.user?.name || 'Teacher'}</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Manage your classes, students, and materials.</p>
          </div>
          <LiveClock />
        </header>
      )}


      <div className="dashboard-tab-bar no-scrollbar no-print">
        {['classes', 'materials', 'students', 'attendance', 'tests', 'salary', 'lectures', 'guru-ai', 'messages', 'notifications', 'profile'].map(tab => (
          <button 
            key={tab}
            onClick={() => handleTabChange(tab)}
            style={{ 
              padding: '0.75rem 1rem', 
              background: 'transparent', 
              border: 'none', 
              color: activeTab === tab ? '#10b981' : 'var(--text-muted)', 
              borderBottom: activeTab === tab ? '2px solid #10b981' : '2px solid transparent', 
              fontWeight: 600, 
              whiteSpace: 'nowrap',
              textTransform: 'capitalize',
              cursor: 'pointer' 
            }}
          >
            {tab === 'messages' && unreadMessages > 0 && (
              <span style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', marginRight: '6px', fontWeight: 800 }}>{unreadMessages}</span>
            )}
            {tab === 'notifications' && unreadNotifications > 0 && (
              <span style={{ background: '#10b981', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', marginRight: '6px', fontWeight: 800 }}>{unreadNotifications}</span>
            )}
            {tab === 'classes' ? 'Classes & Batches' :
             tab === 'materials' ? 'Study Materials' :
             tab === 'students' ? 'My Students' :
             tab === 'attendance' ? 'Mark Attendance' :
             tab === 'tests' ? 'Tests & Marks' :
             tab === 'salary' ? 'Salary Records' :
             tab === 'lectures' ? 'Live Classes' :
             tab === 'guru-ai' ? 'Guru AI Workspace' :
             tab === 'messages' ? 'My Chats' :
             tab === 'notifications' ? 'Notifications' :
             tab === 'profile' ? 'My Profile' :
             tab}
          </button>
        ))}
      </div>

      {activeTab === 'classes' && (
        <>
          <div className="resp-grid-2col" style={{ marginBottom: '3rem' }}>
            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Quick Actions</h3>
              <button onClick={() => handleTabChange('attendance')} style={{ width: '100%', padding: '0.75rem 1.25rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#34d399', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'}>
                <span style={{ fontSize: '1.2rem' }}>📝</span> Mark Attendance
              </button>
              <button onClick={() => handleTabChange('tests')} style={{ width: '100%', padding: '0.75rem 1.25rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', color: '#fbbf24', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)'}>
                <span style={{ fontSize: '1.2rem' }}>🎯</span> Manage Tests & Marks
              </button>
              <button onClick={() => handleTabChange('materials')} style={{ width: '100%', padding: '0.75rem 1.25rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#60a5fa', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}>
                <span style={{ fontSize: '1.2rem' }}>📚</span> Upload Materials
              </button>
            </div>

            <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Today's Classes</h3>
                <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</span>
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {(() => {
                  const today = new Date().getDay();
                  const todaysClasses: any[] = [];
                  classes.forEach(b => {
                    b.schedules?.forEach((s: any) => {
                      if (s.dayOfWeek === today) todaysClasses.push({ ...s, batchName: b.name, courseName: b.course.name });
                    });
                  });

                  if (todaysClasses.length === 0) return <p style={{ color: 'var(--text-muted)' }}>No classes scheduled for today.</p>;

                  return todaysClasses.sort((a,b) => a.startTime.localeCompare(b.startTime)).map(c => (
                    <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>
                          {c.batchName} {c.subject && <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 600 }}>{c.subject}</span>}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{c.courseName} • Room {c.room || 'TBA'}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 800, color: '#10b981', fontSize: '1.2rem' }}>{c.startTime}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Ends {c.endTime}</div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>

          {/* Weekly Timetable Grid */}
          <div className="glass-card" style={{ padding: '2rem', marginBottom: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Weekly Timetable</h2>
              <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>Teaching Schedule</span>
            </div>
            
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%', paddingBottom: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.75rem', minWidth: '800px' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
                  const daySchedules: any[] = [];
                  classes.forEach(b => {
                    b.schedules?.forEach((s: any) => {
                      if (s.dayOfWeek === idx) daySchedules.push({ ...s, batchName: b.name, courseName: b.course?.name });
                    });
                  });

                  // Sort chronologically by start time
                  daySchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));

                  const isToday = idx === new Date().getDay();

                  return (
                    <div 
                      key={day} 
                      style={{ 
                        background: isToday ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255,255,255,0.02)', 
                        borderRadius: '16px', 
                        padding: '1.25rem 0.75rem', 
                        minHeight: '160px', 
                        border: isToday ? '2px solid #10b981' : '1px solid var(--border)',
                        boxShadow: isToday ? '0 8px 20px rgba(16, 185, 129, 0.15)' : 'none',
                        transition: 'all 0.3s ease',
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isToday ? '#10b981' : 'var(--text-muted)' }}>{day}</span>
                        {isToday && (
                          <span style={{ 
                            fontSize: '0.55rem', 
                            background: '#10b981', 
                            color: 'white', 
                            padding: '2px 6px', 
                            borderRadius: '20px', 
                            fontWeight: 900, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.5px',
                            marginTop: '4px',
                            boxShadow: '0 2px 5px rgba(16, 185, 129, 0.4)'
                          }}>
                            Today
                          </span>
                        )}
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {daySchedules.length > 0 ? (
                          daySchedules.map(ds => (
                            <div 
                              key={ds.id} 
                              style={{ 
                                background: 'var(--card-bg-alt)', 
                                border: '1px solid var(--border)', 
                                color: 'var(--text)', 
                                fontSize: '0.7rem', 
                                padding: '8px', 
                                borderRadius: '10px',
                                boxShadow: 'var(--shadow-sm)',
                                transition: 'transform 0.2s',
                              }}
                            >
                              <div style={{ fontWeight: 800, color: '#10b981', fontSize: '0.75rem', marginBottom: '2px' }}>{ds.startTime}</div>
                              {ds.subject && (
                                <div style={{ 
                                  fontWeight: 700, 
                                  fontSize: '0.6rem', 
                                  background: 'rgba(16, 185, 129, 0.1)', 
                                  color: '#10b981', 
                                  padding: '2px 4px', 
                                  borderRadius: '4px', 
                                  display: 'inline-block', 
                                  margin: '2px 0', 
                                  textTransform: 'uppercase', 
                                  letterSpacing: '0.5px' 
                                }}>
                                  {ds.subject}
                                </div>
                              )}
                              <div style={{ opacity: 0.85, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }} title={`${ds.batchName} (${ds.courseName || ''})`}>
                                {ds.batchName}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.65rem', fontStyle: 'italic', padding: '1rem 0' }}>No classes</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>All Assigned Batches</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {classes.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No batches assigned yet.</p>
              ) : (
                classes.map(batch => (
                  <div key={batch.id} style={{ border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '20px', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', transition: 'transform 0.3s' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{batch.name}</h3>
                          <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>{batch.course?.name}</div>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>ACTIVE</div>
                      </div>
                      
                      {batch.schedules && batch.schedules.length > 0 && (
                        <div style={{ marginBottom: '1.5rem' }}>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem', fontWeight: 800 }}>Weekly Schedule</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                            {[...batch.schedules].sort((a, b) => {
                              if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                              return a.startTime.localeCompare(b.startTime);
                            }).map((s: any) => (
                              <div key={s.id} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }}>
                                <span style={{ fontWeight: 800 }}>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.dayOfWeek]}</span> • {s.startTime} {s.subject && `(${s.subject})`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <span style={{ fontSize: '1rem' }}>👥</span> {batch._count?.students || 0} Students
                      </div>
                      <button onClick={() => { setAttBatchId(batch.id); handleTabChange('attendance'); }} style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: '#10b981', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.opacity = '0.9'} onMouseLeave={e => e.currentTarget.style.opacity = '1'}>Take Attendance</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'materials' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          {/* Uploaded Materials List */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Uploaded Materials</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {materials.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>You haven't uploaded any materials yet.</p>
              ) : (
                materials.map(mat => (
                  <div key={mat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontWeight: 800, 
                          color: '#fff',
                          background: mat.type === 'PDF' ? '#ef4444' : 
                                      mat.type === 'VIDEO' ? '#8b5cf6' : 
                                      mat.type === 'WORD' ? '#3b82f6' : 
                                      mat.type === 'IMAGE' ? '#10b981' : '#6366f1'
                        }}>
                          {mat.type === 'PDF' ? '📄 PDF' : 
                           mat.type === 'VIDEO' ? '🎥 VIDEO' : 
                           mat.type === 'WORD' ? '📝 WORD' : 
                           mat.type === 'IMAGE' ? '🖼️ IMAGE' : '🔗 LINK'}
                        </span>
                        {mat.title}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>Course: {mat.course?.name}</div>
                    </div>
                    <a href={mat.url} target="_blank" rel="noreferrer" style={{ padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>Open Link</a>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* New Material Form */}
          <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Upload New Material</h3>
            <form onSubmit={handleUploadMaterial} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="input-group">
                <label>Title</label>
                <input type="text" required placeholder="e.g. Physics Chapter 1 Notes" value={matTitle} onChange={e => setMatTitle(e.target.value)} />
              </div>

              <div className="input-group">
                <label>Type</label>
                <select value={matType} onChange={e => setMatType(e.target.value)} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <option value="PDF">📄 PDF Document</option>
                  <option value="VIDEO">🎥 Video File / Clip</option>
                  <option value="WORD">📝 Word Document (DOCX)</option>
                  <option value="IMAGE">🖼️ Reference Image / Diagram</option>
                  <option value="LINK">🔗 External Link</option>
                </select>
              </div>

              <div className="input-group">
                <label>Course</label>
                <select required value={matCourseId} onChange={e => setMatCourseId(e.target.value)} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <option value="">Select a course...</option>
                  {uniqueCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {classes.length === 0 && <span style={{fontSize: '0.75rem', color: '#ef4444'}}>You must be assigned to a batch first.</span>}
              </div>

              <div style={{ display: 'flex', background: 'var(--input-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setUploadMode('FILE')}
                  style={{
                    flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                    background: uploadMode === 'FILE' ? '#10b981' : 'transparent',
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
                    background: uploadMode === 'URL' ? '#10b981' : 'transparent',
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
                    <div style={{ marginTop: '0.75rem', padding: '0.5rem', background: 'rgba(16,185,129,0.08)', border: '1px solid #10b981', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                  <label>File URL / External Link</label>
                  <input type="text" required placeholder="https://..." value={matUrl} onChange={e => setMatUrl(e.target.value)} />
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={isUploading || classes.length === 0} style={{ background: '#10b981', boxShadow: 'none' }}>
                {isUploading ? 'Uploading...' : 'Publish Material'}
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Search & Check Enrolled Students</h2>
          
          {/* Dynamic Full-Directory Search Filters */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
              <input
                type="text"
                placeholder="🔍 Search Student Name or ID (e.g. STU00001)..."
                value={studentSearchQuery}
                onChange={e => setStudentSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
              {studentSearchQuery && (
                <button 
                  onClick={() => setStudentSearchQuery('')}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  ✕
                </button>
              )}
            </div>
            
            <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
              <input
                type="text"
                placeholder="🎒 Search by Batch Name..."
                value={studentBatchQuery}
                onChange={e => setStudentBatchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '12px',
                  background: 'rgba(0,0,0,0.2)',
                  border: '1px solid var(--border)',
                  color: 'white',
                  fontSize: '0.9rem'
                }}
              />
              {studentBatchQuery && (
                <button 
                  onClick={() => setStudentBatchQuery('')}
                  style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.9rem' }}
                >
                  ✕
                </button>
              )}
            </div>

            {(studentSearchQuery || studentBatchQuery) && (
              <button
                onClick={() => {
                  setStudentSearchQuery('');
                  setStudentBatchQuery('');
                }}
                className="btn-secondary"
                style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', fontSize: '0.9rem', color: 'white', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}
              >
                Clear Filters
              </button>
            )}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '0.75rem 0' }}>Student Name</th>
                  <th>ID</th>
                  <th>Batches</th>
                  <th>Contact</th>
                  <th>Fee Status</th>
                </tr>
              </thead>
              <tbody>
                {students.length === 0 ? (
                  <tr><td colSpan={5} style={{ padding: '2rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No students found in your batches.</td></tr>
                ) : (
                  students.map(student => (
                    <tr key={student.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>
                        <span 
                          onClick={() => setActiveProfileUserId(student.id)} 
                          style={{ cursor: 'pointer', textDecoration: 'underline decoration-dotted', transition: 'color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#10b981'}
                          onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
                          title="Click to view profile"
                        >
                          {student.name}
                        </span>
                      </td>
                      <td>{student.username}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                          {student.studentBatches?.map((b: any, i: number) => (
                            <span key={i} style={{ fontSize: '0.8rem', background: 'rgba(59,130,246,0.1)', color: '#60a5fa', padding: '2px 6px', borderRadius: '4px', width: 'fit-content' }}>
                              {b.course.name} - {b.name}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{student.studentProfile?.phone || 'N/A'}</td>
                      <td>
                        {student.payments && student.payments.length > 0 ? (
                          <span style={{ fontSize: '0.75rem', background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '2px 6px', borderRadius: '4px' }}>Pending Dues</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px' }}>Cleared</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="resp-grid-2col" style={{}}>
           <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Attendance Control</h3>
              
              <div className="input-group">
                <label>Select Batch</label>
                <select value={attBatchId} onChange={e => setAttBatchId(e.target.value)} style={{ padding: '0.85rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%' }}>
                  <option value="">Select Batch...</option>
                  {classes.map(b => <option key={b.id} value={b.id}>{b.name} ({b.course.name})</option>)}
                </select>
              </div>

              <div className="input-group">
                <label>Select Date</label>
                <input type="date" value={attDate} onChange={e => setAttDate(e.target.value)} style={{ padding: '0.85rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px', width: '100%' }} />
              </div>

              <button 
                className="btn-primary" 
                onClick={handleSaveAttendance} 
                disabled={isSavingAtt || !attBatchId || attStudents.length === 0}
                style={{ width: '100%', background: '#10b981', marginTop: '1rem' }}
              >
                {isSavingAtt ? 'Saving...' : 'Save Attendance'}
              </button>
           </div>

           <div className="glass-card" style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Student Roll Call</h3>
                <div style={{ display: 'flex', gap: '1rem' }}>
                   <button onClick={() => markAll('PRESENT')} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>Mark All Present</button>
                </div>
              </div>

              {!attBatchId ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                   Please select a batch to start roll call.
                </div>
              ) : attStudents.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                   No students enrolled in this batch.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                   {attStudents.map(s => {
                     const status = attRecords[s.id] || 'PRESENT';
                     return (
                       <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                          <div>
                             <div style={{ fontWeight: 600 }}>
                               <span 
                                 onClick={() => setActiveProfileUserId(s.id)} 
                                 style={{ cursor: 'pointer', textDecoration: 'underline decoration-dotted', transition: 'color 0.2s' }}
                                 onMouseEnter={e => e.currentTarget.style.color = '#10b981'}
                                 onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
                                 title="Click to view profile"
                               >
                                 {s.name}
                               </span>
                             </div>
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
      {activeTab === 'tests' && (
        <div className="resp-grid-2col" style={{}}>
          {/* Tests List */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Test Schedule & Results</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {tests.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No tests scheduled yet.</p>
              ) : (
                tests.map(test => (
                  <div key={test.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
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
                         Results recorded: {test.results?.length || 0} students
                      </div>
                    </div>
                    <button onClick={() => handleEnterMarks(test)} className="btn-secondary" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                       Enter Marks →
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Schedule New Test Form */}
          <div className="glass-card" style={{ padding: '2rem', height: 'fit-content' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Schedule New Test</h3>
            <form onSubmit={handleCreateTest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label>Test Title</label>
                <input type="text" required placeholder="e.g. Unit 1 Exam" value={newTest.title} onChange={e => setNewTest({ ...newTest, title: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Subject</label>
                <input type="text" required placeholder="e.g. Chemistry" value={newTest.subject} onChange={e => setNewTest({ ...newTest, subject: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Course</label>
                <select required value={newTest.courseId} onChange={e => setNewTest({ ...newTest, courseId: e.target.value })} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                  <option value="">Select a course...</option>
                  {uniqueCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Test Date</label>
                <input type="date" required value={newTest.date} onChange={e => setNewTest({ ...newTest, date: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Test Time / Duration (Optional)</label>
                <input type="text" placeholder="e.g. 10:00 AM - 12:00 PM" value={newTest.time} onChange={e => setNewTest({ ...newTest, time: e.target.value })} />
              </div>
              <div className="input-group">
                <label>Syllabus (Optional)</label>
                <textarea placeholder="e.g. Chapters 1 to 4, Laws of Motion" value={newTest.syllabus} onChange={e => setNewTest({ ...newTest, syllabus: e.target.value })} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px', minHeight: '60px', resize: 'vertical' }} />
              </div>
              <button type="submit" className="btn-primary" disabled={isCreatingTest} style={{ background: '#10b981', boxShadow: 'none' }}>
                {isCreatingTest ? 'Creating...' : 'Schedule Test'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Marks Entry Modal */}
      {selectedTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, padding: '1rem', overflowY: 'auto' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '700px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto', margin: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Enter Marks: {selectedTest.title}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Course: {selectedTest.course?.name}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {students.map(s => {
                const data = testMarks[s.id] || { marks: '', totalMarks: '100', remarks: '' };
                return (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>
                        <span 
                          onClick={() => setActiveProfileUserId(s.id)} 
                          style={{ cursor: 'pointer', textDecoration: 'underline decoration-dotted', transition: 'color 0.2s' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#10b981'}
                          onMouseLeave={e => e.currentTarget.style.color = 'inherit'}
                          title="Click to view profile"
                        >
                          {s.name}
                        </span>
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
                        style={{ padding: '6px 12px' }}
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
                        style={{ padding: '6px 12px' }}
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
                        style={{ padding: '6px 12px' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedTest(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: '#10b981', boxShadow: 'none' }} onClick={handleSaveMarks} disabled={isSavingMarks}>
                {isSavingMarks ? 'Saving...' : 'Save Marks'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'guru-ai' && (
        <div className="glass-card animate-scale-up" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', minHeight: '650px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', marginBottom: '2rem' }}>
          {/* Guru AI Header */}
          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', borderBottom: '1px dashed var(--border)', paddingBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)', animation: 'pulse 2s infinite' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5z" fill="#fff" />
                <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1z" fill="#fff" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10b981', margin: 0 }}>✨ Guru AI Workspace</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '4px 0 0 0' }}>Supercharge your lessons. Seek immediate academic insights or generate high-fidelity presentations dynamically.</p>
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
                  background: aiMode === 'GURU' ? '#10b981' : 'transparent',
                  color: aiMode === 'GURU' ? 'white' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  transition: 'all 0.2s ease',
                  boxShadow: aiMode === 'GURU' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '0.95rem' }}>🤖</span> Digital Guru AI
              </button>
              <button
                onClick={() => setAiMode('PREPARE')}
                style={{
                  padding: '0.4rem 1.1rem',
                  borderRadius: '25px',
                  border: 'none',
                  cursor: 'pointer',
                  background: aiMode === 'PREPARE' ? '#10b981' : 'transparent',
                  color: aiMode === 'PREPARE' ? 'white' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  transition: 'all 0.2s ease',
                  boxShadow: aiMode === 'PREPARE' ? '0 2px 8px rgba(16, 185, 129, 0.3)' : 'none'
                }}
              >
                <span style={{ fontSize: '0.95rem' }}>📝</span> Lesson Plans & Slides
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
                  <label style={{ color: '#10b981', fontWeight: 700 }}>Academic Subject</label>
                  <select
                    value={teacherGuruSubject}
                    onChange={(e) => setTeacherGuruSubject(e.target.value)}
                    style={{ width: '100%', padding: '1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem' }}
                  >
                    {['Mathematics', 'Physics', 'Chemistry', 'Biology', 'General Academics'].map(subj => (
                      <option key={subj} value={subj} style={{ background: 'var(--surface)', color: 'var(--text)' }}>{subj}</option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label style={{ color: '#10b981', fontWeight: 700 }}>Explanatory Mode</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                    {(['ENGLISH', 'HINDI', 'HINGLISH'] as const).map(lang => (
                      <button
                        key={lang}
                        onClick={() => setTeacherGuruLanguage(lang)}
                        style={{
                          flex: 1,
                          padding: '0.8rem 0.5rem',
                          borderRadius: '10px',
                          border: '1px solid',
                          borderColor: teacherGuruLanguage === lang ? '#10b981' : 'var(--border)',
                          background: teacherGuruLanguage === lang ? 'rgba(16, 185, 129, 0.15)' : 'var(--input-bg)',
                          color: teacherGuruLanguage === lang ? '#10b981' : 'var(--text)',
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
                  <label style={{ color: '#10b981', fontWeight: 700 }}>Enter doubt, question, or lesson query</label>
                  <textarea
                    placeholder="Verify standard definitions, solve analytical equations or plan outlines..."
                    value={teacherGuruQuestion}
                    onChange={(e) => setTeacherGuruQuestion(e.target.value)}
                    style={{ width: '100%', flex: 1, minHeight: '120px', padding: '1rem', background: 'var(--input-bg)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text)', fontSize: '1rem', resize: 'none', lineHeight: 1.5 }}
                  />
                </div>

                <button
                  onClick={askTeacherGuru}
                  disabled={teacherGuruLoading || !teacherGuruQuestion.trim()}
                  style={{
                    width: '100%', padding: '0.75rem 1.5rem', borderRadius: '12px',
                    background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none',
                    fontWeight: 800, cursor: teacherGuruLoading || !teacherGuruQuestion.trim() ? 'not-allowed' : 'pointer', fontSize: '0.9rem',
                    boxShadow: '0 4px 15px rgba(16, 185, 129, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  {teacherGuruLoading ? 'Processing...' : '✨ Ask Digital Sahayak'}
                </button>
              </div>

              {/* Right Message Desk */}
              <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--card-bg-alt)', borderRadius: '16px', border: '1px solid var(--border)', overflow: 'hidden', height: '550px' }}>
                <div style={{ background: 'var(--surface-light)', padding: '1rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#10b981', fontSize: '0.9rem' }}>📖 ACADEMIC EXPERT WORKSPACE</span>
                  <button
                    onClick={() => setTeacherGuruHistory([{ role: 'guru', content: `Hello, Teacher ${profile?.name || 'Academic'}! 👋 I am Digital Sahayak. How can I assist you in verifying details or planning today?` }])}
                    style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    🧹 Clear Feed
                  </button>
                </div>

                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {teacherGuruHistory.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                      <div
                        className="chat-bubble"
                        style={{
                          background: msg.role === 'user' ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface)',
                          border: msg.role === 'user' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
                          color: 'var(--text)',
                          alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}
                      >
                        {msg.subject && (
                          <span style={{ display: 'inline-block', fontSize: '0.65rem', background: '#10b981', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                            {msg.subject}
                          </span>
                        )}
                        <div style={{ whiteSpace: 'pre-line' }}>{msg.content}</div>
                      </div>
                    </div>
                  ))}

                  {teacherGuruLoading && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <div className="chat-bubble" style={{ background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="spinner" style={{ width: '15px', height: '15px', border: '2px solid #f3f3f3', borderTop: '2px solid #10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Guru AI is preparing key solutions...</span>
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
                <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '1.5rem', color: '#10b981' }}>⚡ AI Premium Lesson slide Deck Generator</h3>
                
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
                      {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'IIT-JEE / NEET Spec'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>

                  <div className="input-group">
                    <label style={{ fontWeight: 700 }}>Focus & Output Style</label>
                    <select
                      value={pptFocus}
                      onChange={(e) => setPptFocus(e.target.value)}
                      style={{ padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                    >
                      <option value="Comprehensive explanations, formulas, derivations, and 5 MCQs">Derivations & formulas + 5 MCQs</option>
                      <option value="Practical real-world case studies and daily life applications">Real World Applications & Case Studies</option>
                      <option value="Exam review, quick revisions and mock paper pattern">Exam Review & Crash Outlines</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={generateLessonPPT}
                  disabled={pptGenerating || !pptTopic.trim()}
                  className="btn-primary"
                  style={{ width: '100%', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: 'none' }}
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
                        onClick={printTeacherPpt}
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

      {activeTab === 'salary' && (
        <div className="glass-card animate-scale-up" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>My Salary Records</h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Detailed historical record of your base salary, bonus payments, deductions, and payouts</p>
            </div>
            <button
              onClick={fetchSalaries}
              disabled={fetchingSalaries}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid #10b981',
                color: '#34d399',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              {fetchingSalaries ? 'Refreshing...' : '🔄 Refresh'}
            </button>
          </div>

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1.25rem', background: 'var(--surface-light)', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Earnings Received</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '0.4rem', display: 'block' }}>
                ₹{salaries.filter(s => s.status === 'PAID').reduce((acc, s) => acc + s.netPaid, 0).toLocaleString('en-IN')}
              </span>
            </div>
            <div style={{ padding: '1.25rem', background: 'var(--surface-light)', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Last Paid Salary</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', marginTop: '0.4rem', display: 'block' }}>
                {(() => {
                  const paid = salaries.filter(s => s.status === 'PAID');
                  return paid.length > 0 ? `₹${paid[0].netPaid.toLocaleString('en-IN')}` : '₹0';
                })()}
              </span>
            </div>
            <div style={{ padding: '1.25rem', background: 'var(--surface-light)', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pending Invoices / Slips</span>
              <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f59e0b', marginTop: '0.4rem', display: 'block' }}>
                {salaries.filter(s => s.status === 'PENDING').length}
              </span>
            </div>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface-light)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '750px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 800 }}>
                  <th style={{ padding: '1.1rem 1.5rem' }}>Billing Month</th>
                  <th>Base Salary</th>
                  <th>Bonus</th>
                  <th>Deductions</th>
                  <th>Net Paid</th>
                  <th>Status</th>
                  <th>Transaction Reference</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                    <td style={{ padding: '1.1rem 1.5rem', color: 'var(--text)', fontWeight: 700 }}>{s.month}</td>
                    <td style={{ color: 'var(--text)', fontWeight: 600 }}>₹{s.baseSalary.toLocaleString('en-IN')}</td>
                    <td style={{ color: '#10b981', fontWeight: 600 }}>+₹{s.bonus.toLocaleString('en-IN')}</td>
                    <td style={{ color: '#ef4444', fontWeight: 600 }}>-₹{s.deductions.toLocaleString('en-IN')}</td>
                    <td style={{ color: 'var(--text)', fontWeight: 800 }}>₹{s.netPaid.toLocaleString('en-IN')}</td>
                    <td>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                        background: s.status === 'PAID' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                        color: s.status === 'PAID' ? '#10b981' : '#f59e0b'
                      }}>
                        {s.status}
                      </span>
                    </td>
                    <td>
                      {s.status === 'PAID' ? (
                        <div>
                          <div style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{s.transactionId}</div>
                          {s.paidAt && <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Paid {formatDateDisplay(s.paidAt)}</div>}
                        </div>
                      ) : (
                        <span style={{ fontStyle: 'italic', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Processing payout...</span>
                      )}
                    </td>
                  </tr>
                ))}
                {salaries.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No salary history or slips generated yet. Please contact the administrator.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'lectures' && (
        <LecturesSection />
      )}

      {activeTab === 'profile' && (
        <ProfileEditor role="TEACHER" />
      )}

      {activeTab === 'messages' && session?.user && (
        <ChatWindow 
          currentUserId={(session.user as any).id} 
          onMessagesRead={fetchUnreadCounts} 
          initialSelectedUserId={chatSelectedUserId || undefined}
        />
      )}

      {activeTab === 'notifications' && (
        <NotificationsPanel onUnreadChange={setUnreadNotifications} />
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

export default function TeacherDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">Loading Dashboard...</div>}>
      <TeacherDashboardContent />
    </Suspense>
  );
}
