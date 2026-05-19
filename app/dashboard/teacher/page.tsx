"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { NotificationsPanel } from '@/components/NotificationsPanel';
import { ProfileEditor } from '@/components/ProfileEditor';
import { useSession } from 'next-auth/react';
import { LiveClock } from '@/components/LiveClock';
import { Sidebar } from '@/components/Sidebar';

function TeacherDashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('classes');

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
    fetchUnreadCounts();
    const interval = setInterval(fetchUnreadCounts, 6000);
    return () => clearInterval(interval);
  }, []);
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);
  
  // States
  const [classes, setClasses] = useState<any[]>([]);
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
  
  // Test States
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTest, setSelectedTest] = useState<any>(null);
  const [testMarks, setTestMarks] = useState<Record<string, { marks: string, totalMarks: string, remarks: string }>>({});
  const [isSavingMarks, setIsSavingMarks] = useState(false);
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [newTest, setNewTest] = useState({ title: '', courseId: '', date: new Date().toISOString().split('T')[0] });
  
  // Profile State
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
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
    if (activeTab === 'profile') {
      fetchProfile();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [studentSearchQuery, studentBatchQuery]);

  useEffect(() => {
    if (attBatchId) {
      fetchAttendance();
    }
  }, [attBatchId, attDate]);

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
        setProfile(data.profile);
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
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            जय सियाराम 🙏 <span style={{ color: '#10b981' }}>{session?.user?.name || 'Teacher'}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Manage your classes, students, and materials.</p>
        </div>
        <LiveClock />
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem', overflowX: 'auto' }}>
        {['classes', 'materials', 'students', 'attendance', 'tests', 'messages', 'notifications', 'profile'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
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
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'classes' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', marginBottom: '3rem' }}>
            <div className="glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Quick Actions</h3>
              <button onClick={() => setActiveTab('attendance')} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', color: '#34d399', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>📝</span> Mark Attendance
              </button>
              <button onClick={() => setActiveTab('tests')} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', color: '#fbbf24', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '1.2rem' }}>🎯</span> Manage Tests & Marks
              </button>
              <button onClick={() => setActiveTab('materials')} style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#60a5fa', fontWeight: 700, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
                            {batch.schedules.map((s: any) => (
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
                      <button onClick={() => { setAttBatchId(batch.id); setActiveTab('attendance'); }} style={{ padding: '0.5rem 1rem', borderRadius: '10px', background: '#10b981', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}>Take Attendance</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'materials' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
          {/* Uploaded Materials List */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Uploaded Materials</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {materials.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>You haven't uploaded any materials yet.</p>
              ) : (
                materials.map(mat => (
                  <div key={mat.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border)', borderRadius: '8px', background: 'rgba(0,0,0,0.2)' }}>
                    <div>
                      <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: '#3f3f46' }}>{mat.type}</span>
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
                  <option value="PDF">PDF Document</option>
                  <option value="VIDEO">Video Link</option>
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

              <div className="input-group">
                <label>File URL / Link</label>
                <input type="url" required placeholder="https://..." value={matUrl} onChange={e => setMatUrl(e.target.value)} />
              </div>

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
                      <td style={{ padding: '1rem 0', fontWeight: 'bold' }}>{student.name}</td>
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
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }}>
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
      {activeTab === 'tests' && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
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
                        Course: <strong>{test.course?.name}</strong> • Date: {((() => { const d = new Date(test.date); const day = String(d.getDate()).padStart(2, '0'); const month = String(d.getMonth() + 1).padStart(2, '0'); const year = d.getFullYear(); return `${day}/${month}/${year}`; })())}
                      </div>
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
                <input type="text" required placeholder="e.g. Chemistry Unit 1 Test" value={newTest.title} onChange={e => setNewTest({ ...newTest, title: e.target.value })} />
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
              <button type="submit" className="btn-primary" disabled={isCreatingTest} style={{ background: '#10b981', boxShadow: 'none' }}>
                {isCreatingTest ? 'Creating...' : 'Schedule Test'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Marks Entry Modal */}
      {selectedTest && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '700px', padding: '2rem', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Enter Marks: {selectedTest.title}</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Course: {selectedTest.course?.name}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              {students.map(s => {
                const data = testMarks[s.id] || { marks: '', totalMarks: '100', remarks: '' };
                return (
                  <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: '1rem', alignItems: 'center', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{s.name}</div>
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

      {activeTab === 'profile' && (
        <ProfileEditor role="TEACHER" />
      )}

      {activeTab === 'messages' && session?.user && (
        <ChatWindow currentUserId={(session.user as any).id} />
      )}

      {activeTab === 'notifications' && (
        <NotificationsPanel />
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
