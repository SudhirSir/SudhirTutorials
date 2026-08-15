"use client";

import { useState, useEffect, Suspense, useRef } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { ProfileEditor } from '@/components/ProfileEditor';
import { useSession } from 'next-auth/react';
import { LiveClock } from '@/components/LiveClock';
import { Sidebar } from '@/components/Sidebar';
import { LecturesSection } from '@/components/LecturesSection';
import { UserProfileModal } from '@/components/UserProfileModal';
import { QuickServicesWidget } from '@/components/QuickServicesWidget';

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
  }, [searchParams, session]);
  
  // States
  const [classes, setClasses] = useState<any[]>([]);
  const [salaries, setSalaries] = useState<any[]>([]);
  const [fetchingSalaries, setFetchingSalaries] = useState(false);
  const [materials, setMaterials] = useState<any[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const materialsFetchedRef = useRef(false);
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
  const [matIsAssignment, setMatIsAssignment] = useState(false);
  const [matDeadline, setMatDeadline] = useState('');
  
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
  const [showCreateTestForm, setShowCreateTestForm] = useState(false);
  const [newTest, setNewTest] = useState({ title: '', subject: '', courseId: '', totalMarks: '100', date: new Date().toISOString().split('T')[0], time: '', syllabus: '' });
  const [editingTest, setEditingTest] = useState<any>(null);

  const handleEditTest = (test: any) => {
    setEditingTest({
      id: test.id,
      title: test.title,
      subject: test.subject || '',
      courseId: test.courseId,
      totalMarks: test.totalMarks || '100',
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
    if (!confirm('Are you sure you want to publish the results for this test? Once published, students will be able to view their marks and editing will be restricted.')) return;
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
  
  // Profile State
  const [profile, setProfile] = useState<any>({ name: '' });

  useEffect(() => {
    const handleBackButton = (e: Event) => {
      if (activeProfileUserId) {
        e.preventDefault();
        setActiveProfileUserId(null);
      } else if (selectedTest) {
        e.preventDefault();
        setSelectedTest(null);
      } else if (chatSelectedUserId) {
        e.preventDefault();
        setChatSelectedUserId(null);
      }
    };

    window.addEventListener('backbuttonpress', handleBackButton);
    return () => {
      window.removeEventListener('backbuttonpress', handleBackButton);
    };
  }, [activeProfileUserId, selectedTest, chatSelectedUserId]);

  // ─── AI GURU WORKSPACE FOR TEACHERS ───────────────────
  const [aiMode, setAiMode] = useState<'GURU' | 'PREPARE'>('GURU');
  const [teacherGuruQuestion, setTeacherGuruQuestion] = useState('');
  const [teacherGuruSubject, setTeacherGuruSubject] = useState('Mathematics');
  const [teacherGuruLanguage, setTeacherGuruLanguage] = useState<'ENGLISH' | 'HINDI' | 'HINGLISH'>('ENGLISH');
  const [teacherGuruHistory, setTeacherGuruHistory] = useState<Array<{ role: 'user' | 'guru', content: string, subject?: string, file?: string, fileName?: string, image?: string, revealedSteps?: number }>>([]);
  const [teacherGuruLoading, setTeacherGuruLoading] = useState(false);
  const [dbHistoryList, setDbHistoryList] = useState<any[]>([]);
  const [showGuruHistoryPanel, setShowGuruHistoryPanel] = useState(false);
  const [showFullWeekModal, setShowFullWeekModal] = useState(false);
  const [selectedBatchDetails, setSelectedBatchDetails] = useState<any | null>(null);
  const [batchMsgTarget, setBatchMsgTarget] = useState<{ id: string; name: string } | null>(null);
  const [batchMsgContent, setBatchMsgContent] = useState('');
  const [isSendingBatchMsg, setIsSendingBatchMsg] = useState(false);

  const [teacherGuruFile, setTeacherGuruFile] = useState<string | null>(null);
  const [teacherGuruFileName, setTeacherGuruFileName] = useState<string>('');

  // Audio recording states
  const [teacherIsRecording, setTeacherIsRecording] = useState(false);
  const [teacherMediaRecorder, setTeacherMediaRecorder] = useState<any | null>(null);
  const [teacherAudioChunks, setTeacherAudioChunks] = useState<any[]>([]);
  const [teacherIsTranscribing, setTeacherIsTranscribing] = useState(false);

  // Lesson PPT/Notes Generator States
  const [pptTopic, setPptTopic] = useState('');
  const [pptGrade, setPptGrade] = useState('Class 10');
  const [pptFocus, setPptFocus] = useState('Comprehensive explanations, formulas, derivations, and 5 MCQs');
  const [pptSlideCount, setPptSlideCount] = useState(5);
  const [pptGenerating, setPptGenerating] = useState(false);
  const [generatedPpt, setGeneratedPpt] = useState<any>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [pptViewMode, setPptViewMode] = useState<'SLIDES' | 'NOTES'>('SLIDES');
  const [pptDifficulty, setPptDifficulty] = useState('Intermediate');
  const [pptDuration, setPptDuration] = useState('45');

  // Slide inline editing states
  const [isEditingSlide, setIsEditingSlide] = useState(false);
  const [editedSlideTitle, setEditedSlideTitle] = useState('');
  const [editedSlideSubtitle, setEditedSlideSubtitle] = useState('');
  const [editedSlideContent, setEditedSlideContent] = useState('');

  const handleTeacherGuruFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB");
      return;
    }

    setTeacherGuruFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setTeacherGuruFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startTeacherVoiceRecording = async () => {
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
        await transcribeTeacherAudio(audioBlob);
      };

      recorder.start();
      setTeacherMediaRecorder(recorder);
      setTeacherAudioChunks(chunks);
      setTeacherIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Please check permission settings.");
    }
  };

  const stopTeacherVoiceRecording = () => {
    if (teacherMediaRecorder && teacherIsRecording) {
      teacherMediaRecorder.stop();
      setTeacherIsRecording(false);
    }
  };

  const transcribeTeacherAudio = async (audioBlob: Blob) => {
    setTeacherIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_query.webm');
      
      const res = await fetch('/api/student/guru-ji/transcribe', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTeacherGuruQuestion(data.text);
      } else {
        alert("Transcription failed. Please try again or type your doubt.");
      }
    } catch (err) {
      console.error("Transcription query error:", err);
    } finally {
      setTeacherIsTranscribing(false);
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

  const renderTeacherSimpleLines = (text: string, baseKey: any, animate: boolean = false) => {
    return text.split('\n').map((line, idx) => {
      let lineText = line.trim();
      if (!lineText) return <div key={`${baseKey}_${idx}`} style={{ height: '0.2rem' }} />;
      
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
          <div key={`${baseKey}_${idx}`} style={{ fontWeight: 800, fontSize: '1.02rem', color: '#10b981', margin: '0.6rem 0 0.3rem 0' }}>
            {animate ? <TypewriterText text={mathHeading} /> : <span dangerouslySetInnerHTML={{ __html: mathHeading }} />}
          </div>
        );
      }

      // Clean other isolated hash symbols
      lineText = lineText.replace(/#(?![0-9a-fA-F]{3}\b|[0-9a-fA-F]{6}\b)/g, '');

      if (lineText.startsWith('👉 ')) {
        const mathTextLine = renderMath(lineText.slice(2));
        return (
          <div key={`${baseKey}_${idx}`} style={{ background: 'rgba(16,185,129,0.06)', padding: '0.4rem 0.6rem', borderRadius: '8px', borderLeft: '3px solid #10b981', margin: '0.35rem 0', fontWeight: 700, color: 'var(--text)', fontSize: 'inherit' }}>
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

  const renderTeacherSlideContent = (content: string, baseKey: string) => {
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
          {renderTeacherSimpleLines(part, `${baseKey}_lines_${idx}`)}
        </div>
      );
    });
  };

  const formatTeacherGuruResponse = (content: string, revealedSteps: number = 1, messageIndex: number = 0, isNew: boolean = false) => {
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
              {renderTeacherSimpleLines(part, idx, isNew)}
            </div>
          );
        })}
      </div>
    );
  };

  // Custom prompt slide content generator from AI backend
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

  const printTeacherPpt = () => {
    if (!generatedPpt) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(
      '<html><head><title>Sudhir Tutorials - Premium Lesson Slides: ' + generatedPpt.topic + '</title>' +
      '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css" />' +
      '<style>' +
      'body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }' +
      '.slide-page { page-break-after: always; border: 2px solid #10b981; border-radius: 12px; padding: 30px; margin-bottom: 40px; background: #fff; min-height: 500px; display: flex; flex-direction: column; justify-content: space-between; }' +
      '.header { border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }' +
      '.header h1 { margin: 0; font-size: 20px; color: #10b981; font-weight: 800; }' +
      '.badge { background: #10b981; color: white; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold; }' +
      '.meta { font-size: 13px; color: #6b7280; margin-top: 5px; }' +
      '.content { font-size: 16px; line-height: 1.6; color: #374151; flex: 1; }' +
      '.footer { border-top: 1px dashed #d1d5db; padding-top: 15px; margin-top: 20px; display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; font-weight: bold; }' +
      '.logo-text { font-size: 16px; font-weight: 900; color: #10b981; letter-spacing: 0.5px; }' +
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

  const downloadTeacherPptAsPdf = async () => {
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
          return '<div style="page-break-after: always; border: 2px solid #10b981; border-radius: 12px; padding: 30px; margin-bottom: 25px; background: #fff; min-height: 520px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">' +
            '<div>' +
               '<div style="border-bottom: 2px solid #e5e7eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">' +
                '<div style="display: flex; align-items: center; gap: 10px;">' +
                  '<img src="/logo.png" alt="Sudhir Tutorials" style="width: 38px; height: 38px; object-fit: contain; border-radius: 8px;" />' +
                  '<div>' +
                    '<h1 style="margin: 0; font-size: 20px; color: #10b981; font-weight: 800;">' + s.title + '</h1>' +
                    '<div style="font-size: 13px; color: #6b7280; margin-top: 2px;">' + (s.subtitle || '') + '</div>' +
                  '</div>' +
                '</div>' +
                '<div style="background: #10b981; color: white; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px;">' +
                  (s.badge || 'SUDHIR TUTORIALS') +
                '</div>' +
              '</div>' +
              '<div style="font-size: 12px; color: #6b7280; margin-bottom: 15px; font-weight: bold;">' + s.meta + '</div>' +
              '<div style="font-size: 16px; line-height: 1.6; color: #374151; flex: 1;">' +
                formatContentForPrint(s.content) +
              '</div>' +
            '</div>' +
            '<div style="border-top: 1px dashed #d1d5db; padding-top: 15px; margin-top: 20px; display: flex; justify-content: space-between; font-size: 12px; color: #9ca3af; font-weight: bold; align-items: center;">' +
              '<span style="font-size: 14px; font-weight: 900; color: #10b981; letter-spacing: 0.5px; display: flex; align-items: center; gap: 5px;">' +
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
      printTeacherPpt();
    }
  };

  const askTeacherGuru = async () => {
    if (!teacherGuruQuestion.trim() && !teacherGuruFile) return;
    const q = teacherGuruQuestion;
    const subj = teacherGuruSubject;
    const fl = teacherGuruFile;
    const fn = teacherGuruFileName;
    setTeacherGuruQuestion('');
    setTeacherGuruFile(null);
    setTeacherGuruFileName('');

    setTeacherGuruHistory(prev => [...prev, { role: 'user', content: q, subject: subj, file: fl || undefined, fileName: fn || undefined }]);
    setTeacherGuruLoading(true);

    try {
      const res = await fetch('/api/student/guru-ji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, subject: subj, language: teacherGuruLanguage, file: fl })
      });

      if (!res.ok) {
        setTeacherGuruHistory(prev => [...prev, { role: 'guru', content: '❌ Sorry, I encountered a connection issue. Please try seeking my guidance again.', revealedSteps: 1, isNew: true }]);
        setTeacherGuruLoading(false);
        return;
      }

      setTeacherGuruLoading(false);
      setTeacherGuruHistory(prev => [...prev, { role: 'guru', content: '', revealedSteps: 1, isNew: false }]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setTeacherGuruHistory(prev => {
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
          const feed = document.getElementById('teacher-guru-chat-feed');
          if (feed) feed.scrollTop = feed.scrollHeight;
        }
      }
    } catch (e) {
      setTeacherGuruHistory(prev => [...prev, { role: 'guru', content: '❌ Network connection error occurred. Make sure you are connected to the Internet.', revealedSteps: 1, isNew: true }]);
      setTeacherGuruLoading(false);
    }
  };

  const fetchTeacherGuruHistory = async () => {
    try {
      const res = await fetch('/api/student/guru-ji/history');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.doubts) {
          setDbHistoryList(data.doubts);
        }
      }
    } catch (e) {
      console.error('Failed to fetch teacher guru-ji history:', e);
    }
  };

  useEffect(() => {
    if (profile?.name) {
      setTeacherGuruHistory([]);
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
    if (activeTab === 'guru-ai') {
      fetchTeacherGuruHistory();
      setTeacherGuruHistory([]);
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
    if (materialsFetchedRef.current) return;
    setMaterialsLoading(true);
    try {
      const res = await fetch('/api/teacher/materials');
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
        materialsFetchedRef.current = true;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setMaterialsLoading(false);
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
          courseId: matCourseId,
          isAssignment: matIsAssignment,
          deadline: matIsAssignment ? (matDeadline ? new Date(matDeadline).toISOString() : null) : null
        })
      });

      if (res.ok) {
        setMatTitle('');
        setMatUrl('');
        setSelectedFileName('');
        setSelectedFileSize('');
        setFilePreview('');
        setMatIsAssignment(false);
        setMatDeadline('');
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
        setNewTest({ title: '', subject: '', courseId: '', totalMarks: '100', date: new Date().toISOString().split('T')[0], time: '', syllabus: '' });
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
        const testMaxMarks = test.totalMarks?.toString() || '100';
        data.students.forEach((s: any) => {
          const existingResult = test.results?.find((r: any) => r.studentId === s.id);
          initialMarks[s.id] = {
            marks: existingResult?.marks?.toString() || '',
            totalMarks: existingResult?.totalMarks?.toString() || testMaxMarks,
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
        <header className="dashboard-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', fontWeight: 800 }}>
              जय सियाराम 🙏 <span style={{ color: '#10b981' }}>{session?.user?.name || 'Teacher'}</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Manage your classes, students, and materials.</p>
          </div>
          <LiveClock />
        </header>
      )}


      <div className="dashboard-tab-bar no-scrollbar no-print">
        {['classes', 'materials', 'students', 'attendance', 'tests', 'salary', 'lectures', 'guru-ai', 'messages', 'notifications', 'profile'].map(tab => (
          <button 
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`dashboard-tab-button ${activeTab === tab ? 'active' : ''}`}
            style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}
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
             tab === 'lectures' ? 'Lectures/Classes' :
             tab === 'guru-ai' ? 'ST Guru ji' :
             tab === 'messages' ? 'My Chats' :
             tab === 'notifications' ? 'Notifications' :
             tab === 'profile' ? 'My Profile' :
             tab}
          </button>
        ))}
      </div>

      {activeTab === 'classes' && (
        <>
          <QuickServicesWidget role="TEACHER" setActiveTab={handleTabChange} />
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
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Timetable</h2>
              <button
                onClick={() => setShowFullWeekModal(true)}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#10b981',
                  padding: '4px 12px',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📅 Full Week
              </button>
            </div>
            
            {/* Unified Today-First Scrollable Schedule Area */}
            <div style={{ maxHeight: '350px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', paddingRight: '4px' }}>
              {(() => {
                const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const todayIdx = new Date().getDay();
                const orderedDayIndices = Array.from({ length: 7 }, (_, i) => (todayIdx + i) % 7);

                return orderedDayIndices.map(idx => {
                  const day = daysOfWeek[idx];
                  const daySchedules: any[] = [];
                  classes.forEach(b => {
                    b.schedules?.forEach((s: any) => {
                      if (s.dayOfWeek === idx) daySchedules.push({ ...s, batchName: b.name, courseName: b.course?.name });
                    });
                  });
                  daySchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));
                  const isToday = idx === todayIdx;

                  return (
                    <div 
                      key={day} 
                      style={{ 
                        background: isToday ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.01)', 
                        borderRadius: '16px', 
                        padding: '1.25rem', 
                        border: isToday ? '2px solid #10b981' : '1px solid var(--border)',
                        boxShadow: isToday ? '0 8px 24px rgba(16, 185, 129, 0.15)' : 'none',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: daySchedules.length > 0 ? '0.75rem' : 0 }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: isToday ? '#10b981' : 'var(--text-heading)' }}>
                          {isToday ? '📅 Today\'s Schedule' : `📅 ${day}`}
                        </span>
                        {isToday && (
                          <span style={{ fontSize: '0.65rem', background: '#10b981', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 900, textTransform: 'uppercase' }}>
                            {day}
                          </span>
                        )}
                      </div>

                      {daySchedules.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {daySchedules.map(ds => (
                            <div key={ds.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', padding: '0.75rem 1rem', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div>
                                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text-heading)', display: 'block' }}>{ds.subject || 'Lecture'}</span>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{ds.batchName} {ds.room ? `• Room ${ds.room}` : ''}</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)' }}>⏱️ {ds.startTime} - {ds.endTime}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0.5rem 0', fontStyle: 'italic' }}>
                          No classes scheduled.
                        </p>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>All Assigned Batches</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {classes.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No batches assigned yet.</p>
              ) : (
                classes.map(batch => (
                  <div 
                    key={batch.id} 
                    onClick={() => setSelectedBatchDetails(batch)}
                    className="batch-hover-card"
                    style={{ 
                      border: '1px solid var(--border)', 
                      padding: '1.5rem', 
                      borderRadius: '20px', 
                      background: 'rgba(255,255,255,0.02)', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <div>
                          <h3 style={{ fontSize: '1.2rem', margin: 0 }}>{batch.name}</h3>
                          <div style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 600 }}>{batch.course?.name}</div>
                        </div>
                        <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800 }}>ACTIVE</div>
                      </div>
                      
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBatchDetails(batch);
                        }}
                        style={{ 
                          marginBottom: '1.5rem', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          color: '#10b981', 
                          fontSize: '0.85rem', 
                          cursor: 'pointer', 
                          fontWeight: 700, 
                          textDecoration: 'underline decoration-dotted',
                          transition: 'opacity 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        📅 View Details & Timetable
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1.25rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                         <span style={{ fontSize: '1rem' }}>👥</span> {batch._count?.students || 0} Students
                      </div>
                      <button 
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          setAttBatchId(batch.id); 
                          handleTabChange('attendance'); 
                        }} 
                        style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: '#10b981', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', transition: 'all 0.2s' }} 
                        onMouseEnter={e => e.currentTarget.style.opacity = '0.9'} 
                        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                      >
                        Take Attendance
                      </button>
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
              {materialsLoading ? (
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 1rem', width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <div>Loading materials...</div>
                </div>
              ) : materials.length === 0 ? (
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
                    <button onClick={() => handleOpenMaterial(mat)} style={{ padding: '0.5rem 1rem', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: 'none', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Open Link</button>
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
                  <option value="PDF">PDF Document</option>
                  <option value="VIDEO">Video File / Clip</option>
                  <option value="WORD">Word Document (DOCX)</option>
                  <option value="IMAGE">Reference Image / Diagram</option>
                  <option value="LINK">External Link</option>
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

              <div className="input-group" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '0.75rem', background: 'var(--input-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <input type="checkbox" id="matIsAssignment" checked={matIsAssignment} onChange={e => setMatIsAssignment(e.target.checked)} style={{ width: '1.25rem', height: '1.25rem', cursor: 'pointer' }} />
                <label htmlFor="matIsAssignment" style={{ margin: 0, cursor: 'pointer', flex: 1, fontWeight: 700 }}>This is an Assignment</label>
              </div>

              {matIsAssignment && (
                <div className="input-group">
                  <label>Submission Deadline (Optional)</label>
                  <input type="datetime-local" value={matDeadline} onChange={e => setMatDeadline(e.target.value)} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }} />
                </div>
              )}

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
          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px' }}>
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
                <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 700 }}>Test Schedule & Results</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>View, record, or update student test scores.</p>
              </div>
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
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        {test.isPublished ? (
                          <span style={{ fontSize: '0.75rem', padding: '0.35rem 0.6rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', fontWeight: 600 }}>✅ Published</span>
                        ) : (
                          <>
                            <button onClick={() => handlePublishResult(test.id)} style={{ padding: '0.5rem 1rem', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', borderRadius: '8px', border: 'none', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Publish Result</button>
                            <button onClick={() => handleEditTest(test)} className="btn-secondary" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>Edit</button>
                          </>
                        )}
                        <button onClick={() => handleEnterMarks(test)} className="btn-secondary" style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}>
                           {test.isPublished ? 'View Marks →' : 'Enter Marks →'}
                        </button>
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
                  <label style={{ fontWeight: 600 }}>Total Marks</label>
                  <input type="number" required placeholder="e.g. 100" value={newTest.totalMarks || '100'} onChange={e => setNewTest({ ...newTest, totalMarks: e.target.value })} />
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
                <button type="submit" className="btn-primary" disabled={isCreatingTest} style={{ background: 'var(--primary)', border: 'none' }}>
                  {isCreatingTest ? 'Creating...' : 'Schedule Test'}
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
                  {uniqueCourses.map(c => c && <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label style={{ fontWeight: 600 }}>Total Marks</label>
                <input type="number" required value={editingTest.totalMarks || '100'} onChange={e => setEditingTest({ ...editingTest, totalMarks: e.target.value })} style={{ padding: '0.85rem 1.25rem', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '12px' }} />
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

      {/* Marks Entry Modal */}
      {selectedTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '850px', padding: '2rem', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 800 }}>{selectedTest.isPublished ? 'View Marks' : 'Enter Marks'}: {selectedTest.title}</h2>
                <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.8rem' }}>Course: {selectedTest.course?.name}</p>
              </div>
              {!selectedTest.isPublished && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const updated: any = { ...testMarks };
                      students.forEach(s => {
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
              )}
            </div>

            {/* Compact Table */}
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
                  {students.length === 0 ? (
                    <tr><td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No students enrolled in this class.</td></tr>
                  ) : (
                    students.map(s => {
                      const data = testMarks[s.id] || { marks: '', totalMarks: '100', remarks: '' };
                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 14px', fontWeight: 600 }}>
                            <div 
                              onClick={() => setActiveProfileUserId(s.id)} 
                              style={{ color: 'var(--text)', cursor: 'pointer', textDecoration: 'underline decoration-dotted' }}
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
                              disabled={selectedTest.isPublished}
                              onChange={e => setTestMarks({ ...testMarks, [s.id]: { ...data, marks: e.target.value } })}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontWeight: 700 }}
                            />
                          </td>
                          <td style={{ padding: '6px 14px' }}>
                            <input
                              type="number"
                              placeholder="Total"
                              value={data.totalMarks}
                              disabled={selectedTest.isPublished}
                              onChange={e => setTestMarks({ ...testMarks, [s.id]: { ...data, totalMarks: e.target.value } })}
                              style={{ width: '100%', padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)', fontWeight: 600 }}
                            />
                          </td>
                          <td style={{ padding: '6px 14px' }}>
                            <input
                              type="text"
                              placeholder="Remarks"
                              value={data.remarks}
                              disabled={selectedTest.isPublished}
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
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setSelectedTest(null)}>{selectedTest.isPublished ? 'Close' : 'Cancel'}</button>
              {!selectedTest.isPublished && (
                <button className="btn-primary" style={{ flex: 1, background: '#10b981', boxShadow: 'none' }} onClick={handleSaveMarks} disabled={isSavingMarks}>
                  {isSavingMarks ? 'Saving...' : '💾 Save Marks'}
                </button>
              )}
            </div>
          </div>
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
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)', animation: 'pulse 2s infinite' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </div>
              <div className="mobile-hide">
                <h2 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#10b981', margin: 0, whiteSpace: 'nowrap' }}>ST Guru ji</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.68rem', margin: '1px 0 0 0' }}>Digital Sahayak • Online</p>
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
                  background: aiMode === 'GURU' ? '#10b981' : 'transparent',
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
                  background: aiMode === 'PREPARE' ? '#10b981' : 'transparent',
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
                    fetchTeacherGuruHistory();
                    setShowGuruHistoryPanel(prev => !prev);
                  }}
                  style={{ background: 'none', border: 'none', color: '#10b981', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  📜 History
                </button>
                <button 
                  onClick={() => setTeacherGuruHistory([])}
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
              0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
              70% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(16, 185, 129, 0); }
              100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
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
              color: #10b981;
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
              border-color: #10b981;
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
              background: #10b981;
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
              border-color: #10b981;
              background: rgba(16, 185, 129, 0.05);
              color: #10b981;
              box-shadow: 0 0 10px rgba(16,185,129,0.1);
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
              #teacher-guru-chat-feed {
                padding: 0.5rem !important;
                gap: 0.5rem !important;
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
            @media (max-width: 768px) {
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
              #teacher-guru-chat-feed {
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
                <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }} id="teacher-guru-chat-feed">
                  {teacherGuruHistory.length === 0 ? (
                    <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.6 }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem' }}>
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                      <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Ask me your doubts</span>
                    </div>
                  ) : (
                    teacherGuruHistory.map((msg, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.75rem', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                        {msg.role !== 'user' && (
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.8rem' }}>🤖</span>
                          </div>
                        )}
                        <div 
                          className={msg.role === 'user' ? 'chat-bubble' : ''}
                          style={msg.role === 'user' ? { 
                            background: 'linear-gradient(135deg, #10b981, #3b82f6)', 
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
                              formatTeacherGuruResponse(msg.content, msg.revealedSteps || 1, i, (msg as any).isNew)
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
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                            T
                          </div>
                        )}
                      </div>
                    ))
                  )}
                  
                  {teacherGuruLoading && (
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start', alignItems: 'center' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.8rem' }}>🤖</span>
                      </div>
                      <div className="chat-bubble" style={{ background: 'var(--surface-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid #f3f3f3', borderTop: '2px solid #10b981', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Chat Input Bar */}
                <div className="guru-input-bar" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface-light)' }}>
                  <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
                    {teacherGuruFile && (
                      <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem', marginLeft: '0.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                        {teacherGuruFile.startsWith('data:application/pdf') ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '0.75rem 2rem 0.75rem 1rem', borderRadius: '12px', color: '#10b981', fontSize: '0.85rem', fontWeight: 600 }}>
                            <span style={{ fontSize: '1.25rem' }}>📄</span>
                            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                              {teacherGuruFileName || 'Document.pdf'}
                            </span>
                          </div>
                        ) : (
                          <img src={teacherGuruFile} alt="Doubt Preview" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                        )}
                        <button 
                          onClick={() => {
                            setTeacherGuruFile(null);
                            setTeacherGuruFileName('');
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
                          onChange={handleTeacherGuruFileChange} 
                          style={{ display: 'none' }} 
                        />
                      </label>

                      {/* Voice Record Button */}
                      <button 
                        onClick={teacherIsRecording ? stopTeacherVoiceRecording : startTeacherVoiceRecording}
                        disabled={teacherGuruLoading || teacherIsTranscribing}
                        className="attachment-btn guru-btn-circle"
                        style={{ 
                          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          width: '36px', height: '36px', borderRadius: '50%', 
                          background: teacherIsRecording ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-light)', 
                          border: teacherIsRecording ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border)', 
                          transition: 'all 0.2s', marginRight: '4px',
                          color: teacherIsRecording ? '#10b981' : 'var(--text-muted)',
                          animation: teacherIsRecording ? 'pulse 1.5s infinite' : 'none'
                        }}
                        title={teacherIsRecording ? "Stop Recording" : "Voice Doubt Query"}
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
                        placeholder={teacherIsTranscribing ? "🎙️ Transcribing voice query..." : teacherIsRecording ? "🎙️ Recording... click Mic to stop" : "Ask ST Guru ji a question, upload a PDF/Photo..."} 
                        value={teacherGuruQuestion}
                        onChange={(e) => setTeacherGuruQuestion(e.target.value)}
                        disabled={teacherIsTranscribing || teacherIsRecording}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !teacherGuruLoading && (teacherGuruQuestion.trim() || teacherGuruFile)) {
                            askTeacherGuru();
                          }
                        }}
                        style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', color: teacherIsRecording ? '#10b981' : 'var(--text)', fontSize: '0.96rem', padding: '0.55rem 0', fontStyle: teacherIsRecording || teacherIsTranscribing ? 'italic' : 'normal' }}
                      />
                      <button 
                        onClick={askTeacherGuru}
                        disabled={teacherGuruLoading || (!teacherGuruQuestion.trim() && !teacherGuruFile) || teacherIsRecording || teacherIsTranscribing}
                        className="guru-send-btn"
                        style={{ 
                          width: '40px', height: '40px', borderRadius: '50%', 
                          background: (teacherGuruQuestion.trim() || teacherGuruFile) ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--border)', 
                          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                          cursor: teacherGuruLoading || (!teacherGuruQuestion.trim() && !teacherGuruFile) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s',
                          boxShadow: (teacherGuruQuestion.trim() || teacherGuruFile) ? '0 2px 8px rgba(16,185,129,0.3)' : 'none'
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
                              setTeacherGuruHistory([
                                { role: 'user', content: doubt.question, subject: doubt.subject || undefined, image: doubt.imageUrl || undefined },
                                { role: 'guru', content: doubt.answer }
                              ]);
                              if (window.innerWidth <= 768) {
                                setShowGuruHistoryPanel(false);
                              }
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = '#10b981'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.65rem', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>
                                {doubt.subject || 'General'}
                              </span>
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (confirm('Delete this doubt from history?')) {
                                    try {
                                      const res = await fetch(`/api/student/guru-ji/history?id=${doubt.id}`, { method: 'DELETE' });
                                      if (res.ok) {
                                        fetchTeacherGuruHistory();
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
                    <h3 style={{ margin: '0.5rem 0 0.25rem 0', fontSize: '1.4rem', fontWeight: 800, color: '#10b981' }}>Lesson Notes & Slides Generator</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Create highly structured, professional slide presentations and study notes in seconds.</p>
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
                        background: pptTopic.trim() ? 'linear-gradient(135deg, #10b981, #3b82f6)' : 'var(--border)',
                        color: '#fff',
                        fontWeight: '800',
                        fontSize: '0.95rem',
                        cursor: pptTopic.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s',
                        boxShadow: pptTopic.trim() ? '0 4px 15px rgba(16, 185, 129, 0.3)' : 'none',
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
                    <div style={{ position: 'absolute', width: '100%', height: '100%', borderRadius: '50%', border: '4px solid rgba(16,185,129,0.1)', borderTopColor: '#10b981', animation: 'spin 1s linear infinite' }} />
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--surface-light)' }}>
                    {/* View Selector */}
                    <div style={{ display: 'flex', gap: '0.25rem', background: 'var(--input-bg)', padding: '2px', borderRadius: '20px', border: '1px solid var(--border)' }}>
                      <button 
                        onClick={() => { setPptViewMode('SLIDES'); setIsEditingSlide(false); }}
                        className="slide-tab-btn"
                        style={{
                          background: pptViewMode === 'SLIDES' ? '#10b981' : 'transparent',
                          color: pptViewMode === 'SLIDES' ? '#fff' : 'var(--text-muted)'
                        }}
                      >
                        👁️ Slide Deck
                      </button>
                      <button 
                        onClick={() => { setPptViewMode('NOTES'); setIsEditingSlide(false); }}
                        className="slide-tab-btn"
                        style={{
                          background: pptViewMode === 'NOTES' ? '#10b981' : 'transparent',
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
                      
                      <button onClick={downloadTeacherPptAsPdf} className="slide-btn">
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
                              border: activeSlideIndex === idx ? '2px solid #10b981' : '1px solid var(--border)',
                              background: activeSlideIndex === idx ? 'rgba(16, 185, 129, 0.05)' : 'var(--surface-light)',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px'
                            }}
                          >
                            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#10b981' }}>SLIDE {idx + 1}</span>
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
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#10b981', marginBottom: '4px' }}>SLIDE TITLE</label>
                                <input 
                                  type="text" 
                                  value={editedSlideTitle}
                                  onChange={(e) => setEditedSlideTitle(e.target.value)}
                                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: '#252529', color: '#fff', outline: 'none' }}
                                />
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#10b981', marginBottom: '4px' }}>SLIDE SUBTITLE / META</label>
                                <input 
                                  type="text" 
                                  value={editedSlideSubtitle}
                                  onChange={(e) => setEditedSlideSubtitle(e.target.value)}
                                  style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid var(--border)', background: '#252529', color: '#fff', outline: 'none' }}
                                />
                              </div>
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 800, color: '#10b981', marginBottom: '4px' }}>SLIDE BODY CONTENT</label>
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
                                        <span style={{ background: '#10b981', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.5px' }}>
                                          {s.badge || 'SUDHIR TUTORIALS'}
                                        </span>
                                      </div>
                                    </div>

                                    {/* Slide Main Content */}
                                    <div style={{ fontSize: '0.9rem', lineHeight: '1.65', color: '#dcdce2', paddingBottom: '1.5rem', whiteSpace: 'pre-line' }}>
                                      {renderTeacherSlideContent(s.content, activeSlideIndex + '_slide')}
                                    </div>
                                  </div>

                                  {/* Slide Footer */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '0.85rem', fontSize: '0.7rem', color: '#707075', fontWeight: 700, flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981' }}>
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
                        <div style={{ borderBottom: '3px solid #10b981', paddingBottom: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
                          <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.8rem', fontWeight: 900, color: '#10b981', letterSpacing: '-0.5px' }}>
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
                                  <span style={{ color: '#10b981', fontStyle: 'italic', fontSize: '0.9rem' }}>#{idx + 1}</span> 
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
                                {renderTeacherSlideContent(slide.content, idx + '_note')}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Footer */}
                        <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1.5rem', marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981' }}>
                            <img src="/logo.png" alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />
                            SUDHIR TUTORIALS • PREMIUM NOTES SUITE
                          </span>
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

          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', border: '1px solid var(--border)', borderRadius: '14px', background: 'var(--surface-light)' }}>
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
      {showFullWeekModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          padding: '1rem'
        }}>
          <div className="glass-card animate-scale-up" style={{
            width: '95%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            position: 'relative',
            boxShadow: 'var(--shadow-2xl)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>📅 Full Weekly Timetable</h3>
              <button 
                onClick={() => setShowFullWeekModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem' }}>
              {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, idx) => {
                const daySchedules: any[] = [];
                classes.forEach(b => {
                  b.schedules?.forEach((s: any) => {
                    if (s.dayOfWeek === idx) daySchedules.push({ ...s, batchName: b.name });
                  });
                });
                daySchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));
                const isToday = idx === new Date().getDay();

                return (
                  <div 
                    key={day} 
                    style={{ 
                      background: isToday ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.02)', 
                      borderRadius: '16px', 
                      padding: '1rem', 
                      border: isToday ? '2px solid #10b981' : '1px solid var(--border)',
                      minHeight: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isToday ? '#10b981' : 'var(--text)' }}>{day}</span>
                      {isToday && <span style={{ fontSize: '0.6rem', color: '#10b981', fontWeight: 900, textTransform: 'uppercase' }}>Today</span>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      {daySchedules.length > 0 ? (
                        daySchedules.map(ds => (
                          <div key={ds.id} style={{ background: 'var(--surface)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.7rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-heading)', display: 'block', marginBottom: '2px' }}>{ds.subject || 'Lecture'}</span>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem' }}>{ds.batchName}</span>
                            <span style={{ color: '#10b981', fontWeight: 600, display: 'block', marginTop: '4px', fontSize: '0.65rem' }}>{ds.startTime} - {ds.endTime}</span>
                          </div>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 'auto' }}>No classes</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedBatchDetails && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 4000,
          padding: '1rem'
        }}>
          <div className="glass-card animate-scale-up" style={{
            width: '95%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: '24px',
            position: 'relative',
            boxShadow: 'var(--shadow-2xl)'
          }}>
            {/* Close Button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
              <div>
                <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', display: 'inline-block', marginBottom: '0.5rem' }}>Batch Information</span>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>{selectedBatchDetails.name}</h3>
              </div>
              <button 
                onClick={() => setSelectedBatchDetails(null)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1.25rem',
                  cursor: 'pointer',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                ✕
              </button>
            </div>

            {/* Details Section */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Course</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{selectedBatchDetails.course?.name || 'N/A'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Target Class</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>{selectedBatchDetails.className || 'General/All'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Subjects</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', whiteSpace: 'normal', wordBreak: 'break-word' }}>{selectedBatchDetails.subjects || 'All Subjects'}</div>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.25rem' }}>Strength</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)' }}>👥 {selectedBatchDetails._count?.students || 0} Enrolled Students</div>
              </div>
            </div>

            {/* Schedule Section */}
            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>📅</span> Weekly Timetable
              </h4>
              
              {selectedBatchDetails.schedules && selectedBatchDetails.schedules.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {[...selectedBatchDetails.schedules].sort((a, b) => {
                    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
                    return a.startTime.localeCompare(b.startTime);
                  }).map((s: any) => (
                    <div 
                      key={s.id} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: 'rgba(255,255,255,0.03)', 
                        padding: '0.85rem 1.25rem', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,255,255,0.06)' 
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ 
                          width: '45px', 
                          height: '24px', 
                          background: new Date().getDay() === s.dayOfWeek ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255,255,255,0.05)', 
                          color: new Date().getDay() === s.dayOfWeek ? '#10b981' : 'var(--text-muted)', 
                          borderRadius: '6px', 
                          fontSize: '0.75rem', 
                          fontWeight: 800, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][s.dayOfWeek]}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                          {s.subject || 'Lecture'}
                        </div>
                      </div>
                      <div style={{ color: '#10b981', fontSize: '0.85rem', fontWeight: 700 }}>
                        🕒 {s.startTime} - {s.endTime}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '1rem', background: 'rgba(0,0,0,0.1)', borderRadius: '12px', textAlign: 'center' }}>
                  No classes scheduled for this batch.
                </p>
              )}
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <button 
                onClick={() => setSelectedBatchDetails(null)}
                style={{ 
                  padding: '0.6rem 1.25rem', 
                  borderRadius: '10px', 
                  background: 'transparent', 
                  border: '1px solid var(--border)', 
                  color: 'var(--text-muted)', 
                  cursor: 'pointer', 
                  fontWeight: 700, 
                  fontSize: '0.85rem' 
                }}
              >
                Close Details
              </button>
              <button 
                onClick={() => {
                  setBatchMsgTarget({ id: selectedBatchDetails.id, name: selectedBatchDetails.name });
                  setSelectedBatchDetails(null);
                }} 
                style={{ 
                  padding: '0.6rem 1.5rem', 
                  borderRadius: '10px', 
                  background: 'linear-gradient(135deg, var(--secondary), var(--accent))', 
                  border: 'none', 
                  color: 'white', 
                  cursor: 'pointer', 
                  fontWeight: 700, 
                  fontSize: '0.85rem' 
                }}
              >
                💬 Message Students
              </button>
              <button 
                onClick={() => {
                  setAttBatchId(selectedBatchDetails.id);
                  setSelectedBatchDetails(null);
                  handleTabChange('attendance');
                }} 
                style={{ 
                  padding: '0.6rem 1.5rem', 
                  borderRadius: '10px', 
                  background: '#10b981', 
                  border: 'none', 
                  color: 'white', 
                  cursor: 'pointer', 
                  fontWeight: 700, 
                  fontSize: '0.85rem' 
                }}
              >
                Take Attendance
              </button>
            </div>
          </div>
        </div>
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
