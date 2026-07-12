"use client";

import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Capacitor } from '@capacitor/core';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { ProfileEditor } from '@/components/ProfileEditor';
import { StudentPurchases } from '@/components/StudentPurchases';
import { useSession } from 'next-auth/react';
import { LiveClock } from '@/components/LiveClock';
import { Sidebar } from '@/components/Sidebar';
import { StudentLedger } from '@/components/StudentLedger';
import { LecturesSection } from '@/components/LecturesSection';
import { useTheme } from '@/components/ThemeProvider';
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

function StudentDashboardContent() {
  const { data: session } = useSession();
  const { theme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeProfileUserId, setActiveProfileUserId] = useState<string | null>(null);
  const [chatSelectedUserId, setChatSelectedUserId] = useState<string | null>(null);


  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    router.push(pathname + '?' + params.toString(), { scroll: false });
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
    const isStoreUser = (session.user as any).isStoreUser;
    const tab = searchParams.get('tab');
    if (isStoreUser) {
      if (!tab || tab === 'dashboard' || tab === 'fees' || tab === 'messages' || tab === 'notifications') {
        setActiveTab('materials');
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', 'materials');
        router.replace(pathname + '?' + params.toString());
        return;
      }
    }
    if (tab) setActiveTab(tab);
  }, [searchParams, session, router, pathname]);

  const [dashboard, setDashboard] = useState<{
    name: string;
    batches: any[];
    feeHighlight: any;
    attendance?: { percentage: number; present: number; total: number; history: any[] };
    testStats?: { averageScore: number | null; results: any[] };
  }>({
    name: 'Student',
    batches: [],
    feeHighlight: { totalAmount: 0, amount: 0, status: 'NO_PENDING', dueDate: '' },
    attendance: { percentage: 0, present: 0, total: 0, history: [] },
    testStats: { averageScore: 0, results: [] }
  });
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [materials, setMaterials] = useState<any[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const materialsFetchedRef = useRef(false);
  const [fees, setFees] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);

  const [selectedFee, setSelectedFee] = useState<any>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);
  const [razorpayFee, setRazorpayFee] = useState<any>(null);
  const [payAmount, setPayAmount] = useState<string>('');
  const [paymentOption, setPaymentOption] = useState<'outstanding' | 'month'>('month');
  const [isRazorpayPaying, setIsRazorpayPaying] = useState(false);
  const [razorpaySuccess, setRazorpaySuccess] = useState(false);
  const [razorpayMethod, setRazorpayMethod] = useState('UPI');
  const [razorpayUpiApp, setRazorpayUpiApp] = useState('GPay');
  const [razorpayTxId, setRazorpayTxId] = useState('');

  useEffect(() => {
    // Only lock body scroll for the profile overlay (not the receipt portal,
    // because the receipt modal is rendered via createPortal at document.body
    // and body overflow:hidden would prevent it from scrolling).
    if (activeProfileUserId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [activeProfileUserId]);

  useEffect(() => {
    const handleBackButton = (e: Event) => {
      if (isReceiptOpen) {
        e.preventDefault();
        setIsReceiptOpen(false);
      } else if (isRazorpayOpen) {
        e.preventDefault();
        setIsRazorpayOpen(false);
      } else if (activeProfileUserId) {
        e.preventDefault();
        setActiveProfileUserId(null);
      } else if (chatSelectedUserId) {
        e.preventDefault();
        setChatSelectedUserId(null);
      }
    };

    window.addEventListener('backbuttonpress', handleBackButton);
    return () => {
      window.removeEventListener('backbuttonpress', handleBackButton);
    };
  }, [isReceiptOpen, isRazorpayOpen, activeProfileUserId, chatSelectedUserId]);

  // Digital Guru Ji AI states
  const [guruQuestion, setGuruQuestion] = useState('');
  const [guruSubject, setGuruSubject] = useState('Mathematics');
  const [guruLanguage, setGuruLanguage] = useState<'ENGLISH' | 'HINDI' | 'HINGLISH'>('ENGLISH');
  const [guruHistory, setGuruHistory] = useState<Array<{ role: 'user' | 'guru', content: string, subject?: string, file?: string, fileName?: string, image?: string, revealedSteps?: number }>>([]);
  const [guruFile, setGuruFile] = useState<string | null>(null);
  const [guruFileName, setGuruFileName] = useState<string>('');
  const [dbHistoryList, setDbHistoryList] = useState<any[]>([]);
  const [showGuruHistoryPanel, setShowGuruHistoryPanel] = useState(false);
  const [showFullWeekModal, setShowFullWeekModal] = useState(false);

  // Audio recording states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<any | null>(null);
  const [audioChunks, setAudioChunks] = useState<any[]>([]);
  const [isTranscribing, setIsTranscribing] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      setGuruHistory([]);
    }
  }, [session?.user?.name]);

  const [guruLoading, setGuruLoading] = useState(false);

  const handleGuruFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      alert("File size should be less than 10MB");
      return;
    }

    setGuruFileName(file.name);

    const reader = new FileReader();
    reader.onloadend = () => {
      setGuruFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const startVoiceRecording = async () => {
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
        await transcribeAudio(audioBlob);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone. Please check permission settings.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice_query.webm');
      
      const res = await fetch('/api/student/guru-ji/transcribe', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGuruQuestion(data.text);
      } else {
        alert("Transcription failed. Please try again or type your doubt.");
      }
    } catch (err) {
      console.error("Transcription query error:", err);
    } finally {
      setIsTranscribing(false);
    }
  };

  const renderSimpleLines = (text: string, baseKey: any, animate: boolean = false) => {
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
        return (
          <div key={`${baseKey}_${idx}`} style={{ fontWeight: 800, fontSize: '1.02rem', color: '#f59e0b', margin: '0.6rem 0 0.3rem 0' }}>
            {animate ? <TypewriterText text={finalHeading} /> : <span dangerouslySetInnerHTML={{ __html: finalHeading }} />}
          </div>
        );
      }

      // Clean other isolated hash symbols
      lineText = lineText.replace(/#(?![0-9a-fA-F]{3}\b|[0-9a-fA-F]{6}\b)/g, '');

      if (lineText.startsWith('👉 ')) {
        return (
          <div key={`${baseKey}_${idx}`} style={{ background: 'rgba(245,158,11,0.06)', padding: '0.4rem 0.6rem', borderRadius: '8px', borderLeft: '3px solid #f59e0b', margin: '0.35rem 0', fontWeight: 700, color: 'var(--text)', fontSize: 'inherit' }}>
            {animate ? <TypewriterText text={lineText.slice(2)} /> : <span dangerouslySetInnerHTML={{ __html: lineText.slice(2) }} />}
          </div>
        );
      }
      if (lineText.startsWith('* ') || lineText.startsWith('- ')) {
        return (
          <li key={`${baseKey}_${idx}`} style={{ marginLeft: '0.75rem', marginBottom: '0.2rem', listStyleType: 'square', color: 'var(--text)', fontSize: 'inherit' }}>
            {animate ? <TypewriterText text={lineText.slice(2)} /> : <span dangerouslySetInnerHTML={{ __html: lineText.slice(2) }} />}
          </li>
        );
      }
      if (lineText.startsWith('---')) {
        return <hr key={`${baseKey}_${idx}`} style={{ border: 'none', borderTop: '1px dashed var(--border)', margin: '0.5rem 0' }} />;
      }
      return (
        <p key={`${baseKey}_${idx}`} style={{ margin: '0.2rem 0', color: 'var(--text)', lineHeight: 1.45, fontSize: 'inherit' }}>
          {animate ? <TypewriterText text={lineText} /> : <span dangerouslySetInnerHTML={{ __html: lineText }} />}
        </p>
      );
    });
  };

  const formatGuruResponse = (content: string, revealedSteps: number = 1, messageIndex: number = 0, isNew: boolean = false) => {
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
              {renderSimpleLines(part, idx, isNew)}
            </div>
          );
        })}
      </div>
    );
  };

  const askGuruJi = async () => {
    if (!guruQuestion.trim() && !guruFile) return;
    const q = guruQuestion;
    const subj = guruSubject;
    const fl = guruFile;
    const fn = guruFileName;
    setGuruQuestion('');
    setGuruFile(null);
    setGuruFileName('');
    
    // Add user message to history
    setGuruHistory(prev => [...prev, { role: 'user', content: q, subject: subj, file: fl || undefined, fileName: fn || undefined }]);
    setGuruLoading(true);

    try {
      const res = await fetch('/api/student/guru-ji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, subject: subj, language: guruLanguage, file: fl })
      });

      if (!res.ok) {
        setGuruHistory(prev => [...prev, { role: 'guru', content: '❌ Sorry dear child, I encountered a connection issue. Please try seeking my guidance again.', revealedSteps: 1, isNew: true }]);
        setGuruLoading(false);
        return;
      }

      setGuruLoading(false);
      setGuruHistory(prev => [...prev, { role: 'guru', content: '', revealedSteps: 1, isNew: false }]);

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          setGuruHistory(prev => {
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
          const feed = document.getElementById('guru-chat-feed');
          if (feed) feed.scrollTop = feed.scrollHeight;
        }
      }
    } catch (e) {
      setGuruHistory(prev => [...prev, { role: 'guru', content: '❌ Network connection error occurred. Make sure you are connected to the Internet.', revealedSteps: 1, isNew: true }]);
      setGuruLoading(false);
    }
  };

  const fetchGuruHistory = async () => {
    try {
      const res = await fetch('/api/student/guru-ji/history');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.doubts) {
          setDbHistoryList(data.doubts);
        }
      }
    } catch (e) {
      console.error('Failed to fetch guru-ji history:', e);
    }
  };

  useEffect(() => {
    if (!session?.user) return;
    fetchUnreadCounts();
    if (activeTab === 'dashboard') {
      fetchDashboard();
      fetchFees();
    }
    if (activeTab === 'materials') fetchMaterials();
    if (activeTab === 'fees') fetchFees();
    if (activeTab === 'tests') fetchTests();
    if (activeTab === 'guru-ji') {
      fetchGuruHistory();
      setGuruHistory([]);
    }
  }, [activeTab, session]);

  const fetchDashboard = async () => {
    setDashboardLoading(true);
    try {
      const res = await fetch('/api/student/dashboard');
      if (res.ok) {
        setDashboard(await res.json());
        setDashboardLoading(false);
      }
    } catch (e) {
      console.error(e);
      setDashboardLoading(false);
    }
  };

  const fetchMaterials = async () => {
    if (materialsFetchedRef.current) return;
    setMaterialsLoading(true);
    try {
      const res = await fetch('/api/student/materials');
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

  const fetchFees = async () => {
    try {
      const res = await fetch('/api/student/fees');
      if (res.ok) {
        const data = await res.json();
        setFees(data.fees || []);
      }
    } catch (e) { console.error(e); }
  };

  const fetchTests = async () => {
    try {
      const res = await fetch('/api/student/tests');
      if (res.ok) {
        const data = await res.json();
        setTests(data.tests || []);
      }
    } catch (e) { console.error(e); }
  };

  const totalOutstanding = useMemo(() => {
    return fees.reduce((sum, fee) => {
      if (fee.status === 'PAID_ONLINE' || fee.status === 'VERIFIED' || fee.status === 'PAID') return sum;
      const fineVal = Math.max(fee.lateFine || 0, fee.currentLateFine || 0);
      const remainingDue = Math.max(0, fee.amount + fineVal - (fee.discount || 0) - (fee.paidAmount || 0));
      return sum + remainingDue;
    }, 0);
  }, [fees]);

  const handlePayOnline = (fee: any, initialOption: 'outstanding' | 'month' = 'month') => {
    const fineVal = Math.max(fee.lateFine || 0, fee.currentLateFine || 0);
    const calculatedTotal = Math.max(0, fee.amount + fineVal - (fee.discount || 0) - (fee.paidAmount || 0));
    
    setRazorpayFee({
      ...fee,
      totalAmount: calculatedTotal
    });
    setPaymentOption(initialOption);
    
    // We compute total outstanding at the time of click
    const outstandingVal = fees.reduce((sum, f) => {
      if (f.status === 'PAID_ONLINE' || f.status === 'VERIFIED' || f.status === 'PAID') return sum;
      const fVal = Math.max(f.lateFine || 0, f.currentLateFine || 0);
      const rem = Math.max(0, f.amount + fVal - (f.discount || 0) - (f.paidAmount || 0));
      return sum + rem;
    }, 0);

    setPayAmount(initialOption === 'outstanding' ? outstandingVal.toString() : calculatedTotal.toString());
    setIsRazorpayOpen(true);
    setRazorpaySuccess(false);
    setIsRazorpayPaying(false);
    setRazorpayTxId('');
  };

  const handleRazorpaySubmit = async () => {
    if (!razorpayFee) return;
    setIsRazorpayPaying(true);
    
    // Simulate secure network/bank connection delay for 1.8s
    await new Promise(resolve => setTimeout(resolve, 1800));

    try {
      const res = await fetch('/api/student/fees/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feeId: paymentOption === 'outstanding' ? 'OUTSTANDING' : razorpayFee.id,
          transactionId: razorpayTxId,
          paymentMethod: 'Razorpay Direct Link',
          customAmount: parseFloat(payAmount)
        })
      });

      if (res.ok) {
        setRazorpaySuccess(true);
        fetchFees(); // refresh fee history
        router.refresh(); // force instant layout refresh
        // Wait 2.5s for success checkmark before closing modal
        setTimeout(() => {
          setIsRazorpayOpen(false);
          setRazorpayFee(null);
        }, 2500);
      } else {
        const err = await res.json();
        alert(err.error || 'Payment failed. Please try again.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to process payment.');
    } finally {
      setIsRazorpayPaying(false);
    }
  };

  const viewReceipt = async (feeId: string) => {
    try {
      const res = await fetch(`/api/student/fees/receipt/${feeId}`);
      if (res.ok) {
        const data = await res.json();
        setReceiptData(data.fee);
        setIsReceiptOpen(true);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to open receipt.');
      }
    } catch (e) {
      console.error(e);
      alert('Network error. Failed to load receipt.');
    }
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
        filename: `Receipt_${receiptData?.receiptNo?.replace(/\//g, '_') || 'REC_' + receiptId.slice(-6).toUpperCase()}.pdf`,
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
        const filename = `Receipt_${receiptData?.receiptNo?.replace(/\//g, '_') || 'REC_' + receiptId.slice(-6).toUpperCase()}.pdf`;
        
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
              text: `Receipt for ${receiptData?.title}`,
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
      alert('Failed to generate PDF. Please try print option.');
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="student-dashboard-root animate-fade-in" style={{ position: 'relative' }}>
      <style>{`
        .student-dashboard-root {
          --primary: hsl(217, 80%, 45%) !important;
          --primary-hover: hsl(217, 80%, 35%) !important;
          --accent: hsl(217, 70%, 55%) !important;
        }
        [data-theme="dark"] .student-dashboard-root {
          --primary: hsl(217, 91%, 60%) !important;
          --primary-hover: hsl(217, 91%, 50%) !important;
          --accent: hsl(217, 80%, 70%) !important;
        }
        /* Custom scrollbar override for student portal */
        .student-dashboard-root ::-webkit-scrollbar-thumb:hover {
          background: var(--primary) !important;
        }
        .student-dashboard-root .overdue-pulse {
          animation: pulse-blue 2s infinite !important;
        }
        @keyframes pulse-blue {
          0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
      `}</style>
      <div className="bg-glow" style={{ top: '20%', left: '-10%', opacity: 0.5 }}></div>
      {activeTab === 'dashboard' && (
        <header className="dashboard-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem', fontWeight: 800 }}>
              जय सियाराम 🙏 <span style={{ color: 'var(--primary)' }}>{dashboard?.name || 'Student'}</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Here is a summary of your academic progress and dues.</p>
          </div>
          <LiveClock />
        </header>
      )}


      {/* Tabs */}
      <div className="dashboard-tab-bar no-scrollbar no-print">
        {['dashboard', 'attendance', 'materials', 'tests', 'fees', 'purchases', 'lectures', 'guru-ji', 'messages', 'notifications', 'profile'].map(tab => (
          <button 
            key={tab}
            onClick={() => handleTabChange(tab)}
            className={`dashboard-tab-button ${activeTab === tab ? 'active' : ''}`}
            style={{ textTransform: 'capitalize', whiteSpace: 'nowrap' }}
          >
            {tab === 'messages' && unreadMessages > 0 && (
              <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', marginRight: '6px', fontWeight: 800 }}>{unreadMessages}</span>
            )}
            {tab === 'notifications' && unreadNotifications > 0 && (
              <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', marginRight: '6px', fontWeight: 800 }}>{unreadNotifications}</span>
            )}
            {tab === 'dashboard' ? 'Dashboard' :
             tab === 'attendance' ? 'My Attendance' :
             tab === 'materials' ? 'Study Materials' :
             tab === 'tests' ? 'Tests & Marks' :
             tab === 'fees' ? 'Pay/View fees' :
             tab === 'purchases' ? 'My Purchases' :
             tab === 'lectures' ? 'Lectures/Classes' :
             tab === 'guru-ji' ? 'ST Guru ji' :
             tab === 'messages' ? 'My Chats' :
             tab === 'notifications' ? 'Notifications' :
             tab === 'profile' ? 'My Profile' :
             tab}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && (
        <>
          <QuickServicesWidget role="STUDENT" setActiveTab={handleTabChange} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))', gap: '2rem', marginBottom: '2rem' }}>
            
            {/* Column 1: Academics (Timetable & Batches) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Weekly Timetable */}
              {/* Weekly Timetable */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Timetable</h2>
                  <button
                    onClick={() => setShowFullWeekModal(true)}
                    style={{
                      background: 'rgba(99, 102, 241, 0.1)',
                      border: '1px solid rgba(99, 102, 241, 0.2)',
                      color: 'var(--primary)',
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
                      dashboard?.batches?.forEach(b => {
                        b.schedules?.forEach((s: any) => {
                          if (s.dayOfWeek === idx) daySchedules.push({ ...s, batchName: b.name });
                        });
                      });
                      daySchedules.sort((a, b) => a.startTime.localeCompare(b.startTime));
                      const isToday = idx === todayIdx;

                      return (
                        <div 
                          key={day} 
                          style={{ 
                            background: isToday ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.01)', 
                            borderRadius: '16px', 
                            padding: '1.25rem', 
                            border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
                            boxShadow: isToday ? '0 8px 24px rgba(99, 102, 241, 0.15)' : 'none',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: daySchedules.length > 0 ? '0.75rem' : 0 }}>
                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: isToday ? 'var(--primary)' : 'var(--text-heading)' }}>
                              {isToday ? '📅 Today\'s Schedule' : `📅 ${day}`}
                            </span>
                            {isToday && (
                              <span style={{ fontSize: '0.65rem', background: 'var(--primary)', color: 'white', padding: '2px 8px', borderRadius: '10px', fontWeight: 900, textTransform: 'uppercase' }}>
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

              {/* My Batches & Teachers */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  My Batches & Instructors
                </h3>
                 {dashboardLoading ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    {[1, 2].map((i) => (
                      <div key={i} className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid var(--border)', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ height: '1.2rem', width: '40%', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                            <div style={{ height: '0.8rem', width: '60%', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginTop: '0.5rem' }} />
                          </div>
                          <div style={{ height: '1.2rem', width: '80px', background: 'rgba(255,255,255,0.05)', borderRadius: '100px' }} />
                        </div>
                        <div style={{ height: '1px', background: 'var(--border)' }} />
                        <div>
                          <div style={{ height: '0.8rem', width: '120px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', marginBottom: '0.75rem' }} />
                          <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ height: '40px', width: '150px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : dashboard?.batches && dashboard.batches.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
                    {dashboard.batches.map((b: any) => (
                      <div key={b.id} style={{ display: 'flex', flexDirection: 'column', padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--border)', gap: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                          <div>
                            <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--primary)' }}>{b.name}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.2rem' }}>Course: {b.course?.name} | Grade: {b.className || 'N/A'}</span>
                          </div>
                          {b.subjects && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                              {b.subjects.split(',').map((subj: string) => (
                                <span key={subj} style={{ fontSize: '0.7rem', padding: '4px 10px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', borderRadius: '100px', fontWeight: 700 }}>
                                  {subj.trim()}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div style={{ height: '1px', background: 'var(--border)' }}></div>

                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Assigned Instructors
                          </div>
                          {b.teachers && b.teachers.length > 0 ? (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                              {b.teachers.map((t: any, idx: number) => (
                                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--secondary), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: '0.85rem' }}>
                                    {t.name?.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <div 
                                      onClick={() => setActiveProfileUserId(t.id)} 
                                      style={{ fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline decoration-dotted' }} 
                                      className="clickable-name"
                                    >
                                      {t.name}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Instructor</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No teachers assigned yet for this batch.</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '16px', border: '1px dashed var(--border)' }}>
                    Not enrolled in any academic batches yet. Please contact the administrator.
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Status & Attendance */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Fee Status */}
              <div className={`glass-card ${((dashboard as any)?.feeHighlight?.isOverdue || (dashboard as any)?.feeHighlight?.status === 'PENDING') ? 'overdue-pulse' : ''}`} style={{
                padding: '2rem',
                background: ((dashboard as any)?.feeHighlight?.isOverdue || (dashboard as any)?.feeHighlight?.status === 'PENDING')
                  ? 'rgba(239, 68, 68, 0.1)'
                  : 'linear-gradient(135deg, var(--primary), var(--accent))',
                border: ((dashboard as any)?.feeHighlight?.isOverdue || (dashboard as any)?.feeHighlight?.status === 'PENDING')
                  ? '1px solid rgba(239, 68, 68, 0.5)'
                  : undefined
              }}>
                 <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', color: ((dashboard as any)?.feeHighlight?.isOverdue || (dashboard as any)?.feeHighlight?.status === 'PENDING') ? '#ef4444' : '#fff' }}>Fee Status</h3>
                 
                 {(dashboard as any)?.feeHighlight ? (
                   <>
                     <div style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: ((dashboard as any).feeHighlight.isOverdue || (dashboard as any).feeHighlight.status === 'PENDING') ? '#ef4444' : '#fff' }}>
                       ₹{((dashboard as any).feeHighlight.totalAmount ?? (dashboard as any).feeHighlight.amount).toFixed(0)}
                     </div>
                     <p style={{ color: ((dashboard as any)?.feeHighlight?.isOverdue || (dashboard as any)?.feeHighlight?.status === 'PENDING') ? 'var(--text)' : 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                       {(dashboard as any).feeHighlight.status === 'PENDING' ? `Due by ${formatDateDisplay((dashboard as any).feeHighlight.dueDate)}` : `Status: ${(dashboard as any).feeHighlight.status}`}
                     </p>
                     <button className="btn-secondary" style={{ width: '100%', fontSize: '0.9rem', background: ((dashboard as any)?.feeHighlight?.isOverdue || (dashboard as any)?.feeHighlight?.status === 'PENDING') ? undefined : 'rgba(255,255,255,0.15)', color: ((dashboard as any)?.feeHighlight?.isOverdue || (dashboard as any)?.feeHighlight?.status === 'PENDING') ? undefined : '#fff', border: ((dashboard as any)?.feeHighlight?.isOverdue || (dashboard as any)?.feeHighlight?.status === 'PENDING') ? undefined : '1px solid rgba(255,255,255,0.2)' }} onClick={() => {
                        handleTabChange('fees');
                        if ((dashboard as any)?.feeHighlight) {
                          handlePayOnline((dashboard as any).feeHighlight, 'month');
                        }
                      }}>Pay Online</button>
                   </>
                 ) : (
                   <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>No pending fees. You are all caught up!</p>
                 )}
              </div>

              {/* Overall Attendance */}
              <div className="glass-card" style={{ padding: '2rem', background: 'rgba(59,130,246,0.05)', cursor: 'pointer' }} onClick={() => handleTabChange('attendance')}>
                 <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Overall Attendance</h3>
                 <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--secondary)' }}>{(dashboard as any)?.attendance?.percentage || 0}%</div>
                 <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
                    <div style={{ width: `${(dashboard as any)?.attendance?.percentage || 0}%`, height: '100%', background: 'var(--secondary)', boxShadow: '0 0 10px rgba(59,130,246,0.4)' }}></div>
                 </div>
                 <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>{(dashboard as any)?.attendance?.present || 0} / {(dashboard as any)?.attendance?.total || 0} Days Present</p>
              </div>
            </div>

          </div>
        </>
      )}

      {activeTab === 'attendance' && (
        <div className="glass-card animate-scale-up" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Attendance Record</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
             <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Attendance Rate</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{(dashboard as any)?.attendance?.percentage || 0}%</div>
             </div>
             <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Sessions</div>
                <div style={{ fontSize: '2rem', fontWeight: 800 }}>{(dashboard as any)?.attendance?.total || 0}</div>
             </div>
             <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Days Present</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>{(dashboard as any)?.attendance?.present || 0}</div>
             </div>
          </div>

          <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: '500px', width: '100%', maxWidth: '100%' }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <th style={{ padding: '1rem' }}>Date</th>
                  <th>Batch</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(dashboard as any)?.attendance?.history?.length > 0 ? (
                  (dashboard as any).attendance.history.map((a: any) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '1rem' }}>{formatDateDisplay(a.date)}</td>
                      <td>Batch assigned</td>
                      <td>
                        <span style={{ 
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700,
                          background: a.status === 'PRESENT' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                          color: a.status === 'PRESENT' ? 'var(--secondary)' : '#ef4444'
                        }}>
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={3} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No attendance history recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Course Materials</h2>
          <div style={{ display: 'grid', gap: '1rem' }}>
            {materialsLoading ? (
              <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem', width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <div>Loading study materials...</div>
              </div>
            ) : materials.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No materials have been uploaded for your courses yet.</p>
            ) : (
              materials.map(mat => (
                <div key={mat.id} className="flex-mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '1.1rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        padding: '3px 8px', 
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
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                      Course: <strong>{mat.course?.name}</strong> • Uploaded by <span 
                        onClick={() => setActiveProfileUserId(mat.teacher?.id)} 
                        style={{ cursor: 'pointer', textDecoration: 'underline decoration-dotted', fontWeight: 600 }}
                        className="clickable-name"
                      >
                        {mat.teacher?.name}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => handleOpenMaterial(mat)} className="btn-secondary">Open Material →</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'fees' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Beautiful warning banner if there are any pending invoices */}
          {fees.some(f => f.status === 'PENDING') && (
            <div className="glass-card" style={{ padding: '1.5rem', background: 'rgba(239,68,68,0.05)', border: '1px solid #ef4444', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#ef4444' }}>⚠️ Outstanding Invoice Alert</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Please settle your pending balance online to avoid automatic late fines.</p>
              </div>
              <button onClick={() => {
                const pending = fees.find(f => f.status === 'PENDING');
                if (pending) handlePayOnline(pending, 'outstanding');
              }} className="btn-primary" style={{ padding: '0.75rem 1.5rem' }}>
                Pay Outstanding Now
              </button>
            </div>
          )}
          
          <StudentLedger onPayOnline={handlePayOnline} onViewReceipt={viewReceipt} />
        </div>
      )}

      {activeTab === 'purchases' && (
        <div className="fade-in">
          <StudentPurchases />
        </div>
      )}

      {activeTab === 'lectures' && (
        <LecturesSection />
      )}

      {activeTab === 'tests' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
             <h2 style={{ fontSize: '1.5rem', margin: 0 }}>My Test Performance</h2>
             {(dashboard as any)?.testStats?.averageScore != null && (
                <div style={{ background: 'var(--primary)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 800 }}>
                   Avg. Score: {(dashboard as any)?.testStats?.averageScore}%
                </div>
             )}
          </div>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {tests.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No tests are scheduled for your courses at the moment.</p>
            ) : (
              tests.map(test => {
                const testDate = new Date(test.date);
                const isUpcoming = testDate > new Date();
                const result = test.results?.[0] || (dashboard as any)?.testStats?.results?.find((r: any) => r.testId === test.id);
                
                return (
                  <div key={test.id} className="flex-mobile-stack" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', border: `1px solid ${isUpcoming ? 'var(--primary)' : 'var(--border)'}`, borderRadius: '12px', background: isUpcoming ? 'rgba(79, 70, 229, 0.05)' : 'rgba(255,255,255,0.02)' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{test.title}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Course: <strong>{test.course?.name}</strong>
                        {test.subject && <> • Subject: <strong>{test.subject}</strong></>}
                      </div>
                      {(test.time || test.syllabus) && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                          {test.time && <span>🕒 Time: <strong>{test.time}</strong></span>}
                          {test.syllabus && <span>📖 Syllabus: <strong>{test.syllabus}</strong></span>}
                        </div>
                      )}
                      {test.isPublished && result ? (
                        <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                           <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>Score: {result.marks} / {result.totalMarks}</span>
                           <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{result.remarks}</span>
                        </div>
                      ) : (
                        !isUpcoming && (
                          <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', background: 'rgba(255, 255, 255, 0.05)', color: 'var(--text-muted)', borderRadius: '6px', fontWeight: 600 }}>Result Pending</span>
                          </div>
                        )
                      )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: isUpcoming ? '#fff' : 'var(--text-muted)' }}>
                        {formatDateDisplay(testDate)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {test.time || testDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {isUpcoming && <div style={{ fontSize: '0.65rem', color: 'var(--primary)', fontWeight: 800, marginTop: '4px' }}>UPCOMING</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}





      {isReceiptOpen && receiptData && typeof window !== 'undefined' && createPortal(
        <div className="receipt-modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 5000, overflowY: 'auto', overflowX: 'hidden', padding: '2rem 1rem 4rem' }}>
          <div className="glass-card receipt-print-area" style={{ 
            width: '100%', maxWidth: '500px', padding: 0, overflow: 'visible', 
            background: '#fff', color: '#1a1a1a', borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative', margin: '2rem auto'
          }}>
            {/* PAID Stamp Overlay */}
            {(receiptData.status === 'PAID' || receiptData.status === 'VERIFIED' || receiptData.status === 'PAID_ONLINE') && (
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
                  <div><strong>Receipt No.:</strong> <span style={{ fontWeight: 700 }}>{receiptData.receiptNo || `REC-${receiptData.id.slice(-6).toUpperCase()}`}</span></div>
                  <div><strong>Date:</strong> <span style={{ fontWeight: 700 }}>{receiptData.paidAt ? formatDateDisplay(receiptData.paidAt) : formatDateDisplay(new Date())}</span></div>
                </div>
                <div style={{ color: '#1a1a1a' }}>
                  <strong>Student Name:</strong> <span style={{ fontWeight: 700 }}>{receiptData.student?.name}</span>
                </div>
                <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  <strong>Student ID:</strong> <span style={{ fontWeight: 650 }}>{receiptData.student?.username}</span>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #f3f4f6', borderBottom: '2px solid #f3f4f6', padding: '0.85rem 0', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#374151' }}>
                  <span>{receiptData.title} ({receiptData.billingMonth})</span>
                  <span style={{ fontWeight: 700, color: '#1a1a1a' }}>₹{receiptData.amount.toFixed(2)}</span>
                </div>
                {receiptData.lateFine > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#ef4444' }}>
                    <span>Late Fine</span>
                    <span style={{ fontWeight: 700 }}>+₹{receiptData.lateFine.toFixed(2)}</span>
                  </div>
                )}
                {receiptData.discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', color: '#10b981' }}>
                    <span>Discount Applied</span>
                    <span style={{ fontWeight: 700 }}>-₹{receiptData.discount.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px dashed #e5e7eb', color: '#1a1a1a' }}>
                  <span style={{ fontWeight: 800 }}>TOTAL PAID</span>
                  <span style={{ fontWeight: 800, fontSize: '1.15rem' }}>₹{(receiptData.paidAmount || (receiptData.amount + (receiptData.lateFine || 0) - (receiptData.discount || 0))).toFixed(2)}</span>
                </div>
                {(() => {
                  const netDue = receiptData.amount + (receiptData.lateFine || 0) - (receiptData.discount || 0);
                  const paid = receiptData.paidAmount || 0;
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
                <div style={{ marginBottom: '0.2rem' }}><strong>Method:</strong> {receiptData.paymentMethod || 'ONLINE'}</div>
                {receiptData.transactionId && <div style={{ marginBottom: '0.2rem' }}><strong>TXN ID:</strong> {receiptData.transactionId}</div>}
                {receiptData.collectedBy && <div><strong>Collected/Verified By:</strong> {receiptData.collectedBy}</div>}
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
                  onClick={() => setIsReceiptOpen(false)}
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
                  onClick={() => Capacitor.isNativePlatform() ? downloadReceiptPDF(receiptData.id, true) : window.print()}
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
                  onClick={() => downloadReceiptPDF(receiptData.id, false)}
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
        </div>,
        document.body
      )}

      {/* 💳 SIMULATED RAZORPAY GATEWAY OVERLAY */}
      {isRazorpayOpen && razorpayFee && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 1000, overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="animate-scale-up" style={{ 
            width: '680px', maxWidth: '100%', 
            background: 'var(--card-bg)', border: '1px solid var(--border)',
            borderRadius: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
            position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', margin: 'auto'
          }}>
            {/* Header: Razorpay Secured */}
            <div style={{ 
              background: 'var(--card-bg-alt)', padding: '1.25rem 2rem', 
              borderBottom: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.4rem', color: '#3b82f6', fontWeight: 900, letterSpacing: '-0.5px' }}>
                  Razorpay <span style={{ color: '#fff', fontSize: '0.75rem', fontWeight: 600, background: '#3b82f6', padding: '2px 6px', borderRadius: '4px', marginLeft: '4px' }}>SECURE</span>
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#10b981' }}>
                <span>🔒 PCI-DSS Compliant</span>
              </div>
            </div>

            {/* Inner Content Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', minHeight: '380px' }}>
              
              {/* Left Side Panel: Merchant and Amount (Locked) */}
              <div style={{ 
                background: 'var(--card-bg-alt)', padding: '2rem 1.5rem',
                borderRight: '1px solid var(--border)',
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.65rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Coaching Institute</div>
                  <h3 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <img src="/logo.png" alt="Logo" style={{ width: '24px', height: '24px', objectFit: 'contain', borderRadius: '4px' }} />
                    <span style={{ color: '#ef4444', fontWeight: 800 }}>SUDHIR</span> <span style={{ color: '#2563eb', fontWeight: 800 }}>TUTORIALS</span>
                  </h3>

                  {/* Premium Payment Mode Selector */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid var(--border)' }}>
                    <button 
                      type="button"
                      onClick={() => {
                        setPaymentOption('outstanding');
                        setPayAmount(totalOutstanding.toString());
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: 'none',
                        background: paymentOption === 'outstanding' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
                        color: paymentOption === 'outstanding' ? '#fff' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Outstanding
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setPaymentOption('month');
                        setPayAmount(razorpayFee.totalAmount.toString());
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        borderRadius: '8px',
                        border: 'none',
                        background: paymentOption === 'month' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
                        color: paymentOption === 'month' ? '#fff' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      Monthly
                    </button>
                  </div>

                  {paymentOption === 'outstanding' ? (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>All Pending Dues (FIFO)</div>
                      <div style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '6px', display: 'inline-block', marginTop: '0.5rem' }}>
                        Total Outstanding: ₹{totalOutstanding.toFixed(2)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{razorpayFee.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#3b82f6', background: 'rgba(59,130,246,0.1)', padding: '4px 8px', borderRadius: '6px', display: 'inline-block', marginTop: '0.5rem' }}>
                        {razorpayFee.billingMonth} (₹{razorpayFee.totalAmount.toFixed(2)} Due)
                      </div>
                    </div>
                  )}
                </div>

                {(() => {
                  const maxAmount = paymentOption === 'outstanding' ? totalOutstanding : razorpayFee.totalAmount;
                  const leftBalance = Math.max(0, maxAmount - (parseFloat(payAmount) || 0));
                  return (
                    <div style={{ marginTop: '1.5rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: 700 }}>Amount to Pay (₹)</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '4px' }}>
                        <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-muted)' }}>₹</span>
                        <input
                          type="number"
                          value={payAmount}
                          min="1"
                          max={maxAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          style={{
                            background: 'var(--input-bg)',
                            border: '1px solid var(--border)',
                            borderRadius: '10px',
                            color: 'var(--text)',
                            fontSize: '1.5rem',
                            fontWeight: 800,
                            width: '100%',
                            padding: '0.4rem 0.8rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                          }}
                        />
                      </div>

                      {/* Left Balance Display */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        padding: '0.65rem 0.75rem',
                        marginTop: '0.75rem',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>Left Balance:</span>
                        <span style={{ fontWeight: 800, color: leftBalance > 0 ? '#f59e0b' : '#10b981', fontSize: '0.85rem' }}>
                          ₹{leftBalance.toFixed(2)}
                        </span>
                      </div>

                      {parseFloat(payAmount) < maxAmount && parseFloat(payAmount) > 0 && (
                        <div style={{
                          background: 'rgba(245, 158, 11, 0.08)',
                          border: '1px solid rgba(245, 158, 11, 0.25)',
                          borderRadius: '10px',
                          padding: '0.65rem 0.75rem',
                          marginTop: '0.75rem',
                          fontSize: '0.75rem',
                          color: '#f59e0b',
                          lineHeight: '1.3',
                          backdropFilter: 'blur(4px)'
                        }}>
                          ⚠️ <strong>Partial Payment Alert:</strong> The remaining balance of <strong>₹{leftBalance.toFixed(2)}</strong> will remain as outstanding dues.
                        </div>
                      )}
                      {parseFloat(payAmount) > maxAmount && (
                        <div style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          borderRadius: '10px',
                          padding: '0.65rem 0.75rem',
                          marginTop: '0.75rem',
                          fontSize: '0.75rem',
                          color: '#ef4444',
                          lineHeight: '1.3'
                        }}>
                          ❌ <strong>Error:</strong> Amount cannot exceed <strong>₹{maxAmount.toFixed(2)}</strong>.
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1.5rem' }}>
                  <div><strong style={{ color: 'var(--text)' }}>Student ID:</strong> {session?.user?.name}</div>
                  <div><strong style={{ color: 'var(--text)' }}>Email:</strong> {(session?.user as any)?.email || 'student@sudhirtutorials.com'}</div>
                </div>
              </div>

              {/* Right Side Panel: Razorpay Direct Payment Gateway */}
              <div style={{ padding: '2.5rem 2rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)' }}>Official Razorpay Gateway</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                    Please click the button below to complete your payment of <strong style={{ color: 'var(--text)' }}>₹{parseFloat(payAmount || '0').toFixed(0)}</strong> securely via Razorpay's official portal.
                  </p>
                  
                  {/* Step 1: Open Link */}
                  <div style={{ marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Step 1: Complete Payment</span>
                    <a
                      href="https://razorpay.me/@sudhiir"
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem',
                        width: '100%', padding: '1.1rem', borderRadius: '16px',
                        background: 'linear-gradient(135deg, #0070f3, #00df00)', color: '#fff',
                        fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
                        boxShadow: '0 4px 20px rgba(0, 112, 243, 0.4)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        textAlign: 'center', letterSpacing: '0.5px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 8px 30px rgba(0, 223, 0, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0) scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 112, 243, 0.4)';
                      }}
                    >
                      🔒 Click to Pay Securely
                    </a>
                  </div>

                  {/* Step 2: Verification Details */}
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Step 2: Submit Verification Reference</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      After successful transfer, enter the payment transaction ID or Reference ID below:
                    </p>
                    <div className="input-group">
                      <input 
                        type="text" 
                        required
                        value={razorpayTxId} 
                        onChange={e => setRazorpayTxId(e.target.value)} 
                        placeholder="e.g. pay_N23sd9fX87 or UPI Txn Ref No" 
                        style={{ width: '100%', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', padding: '0.85rem', borderRadius: '12px' }} 
                      />
                    </div>
                  </div>
                </div>

                {/* Confirm Pay Button */}
                {(() => {
                  const maxAmount = paymentOption === 'outstanding' ? totalOutstanding : razorpayFee.totalAmount;
                  const isValid = razorpayTxId.trim() && payAmount && parseFloat(payAmount) > 0 && parseFloat(payAmount) <= maxAmount;
                  return (
                    <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsRazorpayOpen(false);
                          setRazorpayFee(null);
                        }}
                        style={{
                          flex: 1, padding: '0.85rem', borderRadius: '12px',
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#ef4444', cursor: 'pointer', fontWeight: 700,
                          transition: 'all 0.2s', fontSize: '0.9rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!isValid}
                        onClick={handleRazorpaySubmit}
                        className="btn-primary"
                        style={{
                          flex: 2, padding: '0.85rem', background: '#10b981', color: '#fff', border: 'none',
                          opacity: isValid ? 1 : 0.5,
                          cursor: isValid ? 'pointer' : 'not-allowed',
                          fontWeight: 700
                        }}
                      >
                        Confirm & Submit Details
                      </button>
                    </div>
                  );
                })()}

              </div>

            </div>

            {/* PROCESSING OVERLAY SPINNER */}
            {isRazorpayPaying && (
              <div style={{ 
                position: 'absolute', inset: 0, 
                background: 'var(--card-bg)', 
                display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center', 
                zIndex: 100
              }}>
                <div className="spinner" style={{ borderTopColor: '#3b82f6', width: '50px', height: '50px' }}></div>
                <h3 style={{ marginTop: '1.5rem', color: 'var(--text)', fontSize: '1.25rem' }}>Processing Payment Securely</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  Do not refresh this page or click back button...
                </p>
              </div>
            )}

            {/* SUCCESS OVERLAY */}
            {razorpaySuccess && (
              <div style={{ 
                position: 'absolute', inset: 0, 
                background: '#0b132b', 
                display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center', 
                zIndex: 100,
                textAlign: 'center', padding: '2rem'
              }}>
                <div style={{ 
                  width: '80px', height: '80px', borderRadius: '50%', 
                  background: 'rgba(16,185,129,0.1)', border: '3px solid #10b981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '3rem', color: '#10b981', marginBottom: '1.5rem',
                  boxShadow: '0 0 20px rgba(16,185,129,0.3)'
                }}>
                  ✔
                </div>
                <h2 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 800 }}>Payment Successful!</h2>
                <p style={{ color: '#10b981', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.5rem' }}>
                  ₹{parseFloat(payAmount || '0').toFixed(0)} Paid Online via {razorpayMethod}
                </p>
                <div style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)',
                  padding: '0.75rem 1.5rem', borderRadius: '12px',
                  marginTop: '1.5rem', fontSize: '0.8rem', color: 'var(--text-muted)'
                }}>
                  <strong>Transaction ID:</strong> {razorpayTxId || 'N/A'}<br />
                  <span>The administrator has been notified to verify your ledger record.</span>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      <style jsx>{`
        .overdue-pulse {
          animation: pulse-red 2s infinite;
        }
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }
        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid #f3f3f3;
          border-top: 4px solid #10b981;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      {activeTab === 'guru-ji' && (
        <div 
          className="animate-scale-up" 
          style={{ 
            padding: '0', 
            display: 'flex', 
            flexDirection: 'column', 
            height: 'calc(100vh - 170px)', 
            minHeight: '450px', 
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
          {/* ST Guru ji Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', padding: '0.4rem 1rem', background: 'var(--surface-light)' }}>
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)', animation: 'pulse 2s infinite' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                </svg>
              </div>
              <div>
                <h2 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#f59e0b', margin: 0, whiteSpace: 'nowrap' }}>ST Guru ji</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.6rem', margin: '1px 0 0 0' }}>AI Tutor • Online</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <button 
                onClick={() => {
                  fetchGuruHistory();
                  setShowGuruHistoryPanel(prev => !prev);
                }}
                style={{ background: 'none', border: 'none', color: '#f59e0b', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                📜 History
              </button>
              <button 
                onClick={() => setGuruHistory([])}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                🧹 Clear Chat
              </button>
            </div>
          </div>

          <style>{`
            @keyframes pulse {
              0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
              70% { transform: scale(1.05); box-shadow: 0 0 10px 5px rgba(245,158,11,0); }
              100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(245,158,11,0); }
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
              color: var(--primary);
              font-weight: 600;
            }
            .guru-card-text {
              font-size: 0.88rem;
              line-height: 1.45;
              color: var(--text);
            }
            .attachment-btn {
              transition: all 0.2s ease;
            }
            .attachment-btn:hover {
              transform: scale(1.08);
              background: var(--border) !important;
            }
            .attachment-btn:hover svg {
              stroke: #f59e0b !important;
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
              .chat-bubble {
                max-width: 95% !important;
                padding: 0.45rem 0.65rem !important;
                font-size: 0.82rem !important;
                line-height: 1.4 !important;
              }
              #guru-chat-feed {
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

          {/* Horizontal Layout for Feed & History Sidebar */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', flexDirection: 'row' }}>
            
            {/* Left Panel: Chat Feed & Input */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Message Feed */}
              <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }} id="guru-chat-feed">
                {guruHistory.length === 0 ? (
                  <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.6 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '0.5rem' }}>
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                    <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Ask me your doubts</span>
                  </div>
                ) : (
                  guruHistory.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', gap: '0.75rem', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start' }}>
                      {msg.role !== 'user' && (
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '0.8rem' }}>🤖</span>
                        </div>
                      )}
                      <div 
                        className={msg.role === 'user' ? 'chat-bubble' : ''}
                        style={msg.role === 'user' ? { 
                          background: 'linear-gradient(135deg, var(--primary), var(--accent))', 
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
                          maxWidth: '90%',
                          width: '100%',
                          fontSize: '0.88rem'
                        }}
                      >
                        <div>
                          {msg.role === 'guru' ? (
                            formatGuruResponse(msg.content, msg.revealedSteps || 1, i, (msg as any).isNew)
                          ) : (
                            <div>
                              {msg.image && (
                                <img 
                                  src={msg.image} 
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
                              )}
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
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--secondary), var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
                          {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </div>
                  ))
                )}
                
                {guruLoading && (
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-start', alignItems: 'center' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.8rem' }}>🤖</span>
                    </div>
                    <div className="chat-bubble" style={{ background: 'var(--surface-light)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="spinner" style={{ width: '12px', height: '12px', border: '2px solid #f3f3f3', borderTop: '2px solid #f59e0b', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Thinking...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Chat Input Bar */}
              <div className="guru-input-bar" style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--surface-light)' }}>
                <div style={{ maxWidth: '680px', margin: '0 auto', width: '100%' }}>
                  {guruFile && (
                    <div style={{ position: 'relative', display: 'inline-block', marginBottom: '0.75rem', marginLeft: '0.5rem', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
                      {guruFile.startsWith('data:application/pdf') ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 2rem 0.75rem 1rem', borderRadius: '12px', color: '#ef4444', fontSize: '0.85rem', fontWeight: 600 }}>
                          <span style={{ fontSize: '1.25rem' }}>📄</span>
                          <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>
                            {guruFileName || 'Document.pdf'}
                          </span>
                        </div>
                      ) : (
                        <img src={guruFile} alt="Doubt Preview" style={{ width: '80px', height: '80px', objectFit: 'cover' }} />
                      )}
                      <button 
                        onClick={() => {
                          setGuruFile(null);
                          setGuruFileName('');
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
                        onChange={handleGuruFileChange} 
                        style={{ display: 'none' }} 
                      />
                    </label>

                    {/* Voice Record Button */}
                    <button 
                      onClick={isRecording ? stopVoiceRecording : startVoiceRecording}
                      disabled={guruLoading || isTranscribing}
                      className="attachment-btn guru-btn-circle"
                      style={{ 
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        width: '36px', height: '36px', borderRadius: '50%', 
                        background: isRecording ? 'rgba(239, 68, 68, 0.15)' : 'var(--surface-light)', 
                        border: isRecording ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid var(--border)', 
                        transition: 'all 0.2s', marginRight: '4px',
                        color: isRecording ? '#ef4444' : 'var(--text-muted)',
                        animation: isRecording ? 'pulse 1.5s infinite' : 'none'
                      }}
                      title={isRecording ? "Stop Recording" : "Voice Doubt Query"}
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
                      placeholder={isTranscribing ? "🎙️ Transcribing voice doubt..." : isRecording ? "🎙️ Recording... speak your doubt clearly, click Mic to stop" : "Ask ST Guru ji a question, upload a PDF/Photo..."}
                      value={guruQuestion}
                      onChange={(e) => setGuruQuestion(e.target.value)}
                      disabled={isTranscribing || isRecording}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !guruLoading && (guruQuestion.trim() || guruFile)) {
                          askGuruJi();
                        }
                      }}
                      style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', outline: 'none', color: isRecording ? '#ef4444' : 'var(--text)', fontSize: '0.96rem', padding: '0.55rem 0', fontStyle: isRecording || isTranscribing ? 'italic' : 'normal' }}
                    />
                    
                    <button 
                      onClick={askGuruJi}
                      className="guru-send-btn"
                      disabled={guruLoading || (!guruQuestion.trim() && !guruFile) || isRecording || isTranscribing}
                      style={{ 
                        width: '40px', height: '40px', borderRadius: '50%', 
                        background: (guruQuestion.trim() || guruFile) ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--border)', 
                        border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        cursor: (guruLoading || (!guruQuestion.trim() && !guruFile) || isRecording || isTranscribing) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: (guruQuestion.trim() || guruFile) ? '0 2px 8px rgba(245,158,11,0.3)' : 'none'
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
                            setGuruHistory([
                              { role: 'user', content: doubt.question, subject: doubt.subject || undefined, image: doubt.imageUrl || undefined },
                              { role: 'guru', content: doubt.answer }
                            ]);
                            if (window.innerWidth <= 768) {
                              setShowGuruHistoryPanel(false);
                            }
                          }}
                          onMouseEnter={e => e.currentTarget.style.borderColor = '#f59e0b'}
                          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.65rem', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, textTransform: 'uppercase' }}>
                              {doubt.subject || 'General'}
                            </span>
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (confirm('Delete this doubt from history?')) {
                                  try {
                                    const res = await fetch(`/api/student/guru-ji/history?id=${doubt.id}`, { method: 'DELETE' });
                                    if (res.ok) {
                                      fetchGuruHistory();
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
        </div>
      )}

      {activeTab === 'messages' && session?.user && (
        <ChatWindow currentUserId={(session.user as any).id} onMessagesRead={fetchUnreadCounts} initialSelectedUserId={chatSelectedUserId} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsPanel onUnreadChange={setUnreadNotifications} />
      )}

      {activeTab === 'profile' && (
        <ProfileEditor role="STUDENT" />
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
                dashboard?.batches?.forEach(b => {
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
                      background: isToday ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)', 
                      borderRadius: '16px', 
                      padding: '1rem', 
                      border: isToday ? '2px solid var(--primary)' : '1px solid var(--border)',
                      minHeight: '200px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem'
                    }}
                  >
                    <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: isToday ? 'var(--primary)' : 'var(--text)' }}>{day}</span>
                      {isToday && <span style={{ fontSize: '0.6rem', color: 'var(--primary)', fontWeight: 900, textTransform: 'uppercase' }}>Today</span>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      {daySchedules.length > 0 ? (
                        daySchedules.map(ds => (
                          <div key={ds.id} style={{ background: 'var(--surface)', padding: '8px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.7rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--text-heading)', display: 'block', marginBottom: '2px' }}>{ds.subject || 'Lecture'}</span>
                            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.65rem' }}>{ds.batchName}</span>
                            <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'block', marginTop: '4px', fontSize: '0.65rem' }}>{ds.startTime} - {ds.endTime}</span>
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
    </div>
  );
}

export default function StudentDashboard() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-white">Loading Dashboard...</div>}>
      <StudentDashboardContent />
    </Suspense>
  );
}
