"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Lecture {
  id: string;
  title: string;
  description?: string;
  youtubeUrl: string;
  videoId: string;
  thumbnailUrl: string;
  type: 'LIVE' | 'RECORDED';
  subject: string;
  batchId: string;
  assignedById: string;
  createdAt: string;
  batch: {
    name: string;
    className?: string;
  };
}

export function LecturesSection() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'STUDENT';
  const currentUserId = (session?.user as any)?.id;

  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LIVE' | 'RECORDED'>('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Theater Player State
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);

  // Assignment Modal & Form State
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [batches, setBatches] = useState<any[]>([]);
  const [assignForm, setAssignForm] = useState({
    title: '',
    description: '',
    youtubeUrl: '',
    type: 'LIVE' as 'LIVE' | 'RECORDED',
    batchId: '',
    subject: ''
  });
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Fetch batches for Admin/Teacher to assign
  useEffect(() => {
    fetchLectures();
    if (role === 'ADMIN' || role === 'TEACHER') {
      fetchBatches();
    }
  }, [role]);

  const fetchLectures = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lectures');
      if (res.ok) {
        const data = await res.json();
        setLectures(data.lectures || []);
        
        // Auto-play first live lecture if available
        const liveLectures = (data.lectures || []).filter((l: Lecture) => l.type === 'LIVE');
        if (liveLectures.length > 0) {
          setActiveLecture(liveLectures[0]);
        } else if ((data.lectures || []).length > 0) {
          setActiveLecture(data.lectures[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/admin/batches');
      if (res.ok) {
        const data = await res.json();
        const allBatches = data.batches || [];
        
        if (role === 'TEACHER') {
          // Filter batches where teacher teaches
          const teacherBatches = allBatches.filter((b: any) => 
            b.teachers.some((t: any) => t.username === (session?.user as any)?.username)
          );
          setBatches(teacherBatches);
          if (teacherBatches.length > 0) {
            setAssignForm(prev => ({ ...prev, batchId: teacherBatches[0].id }));
          }
        } else {
          setBatches(allBatches);
          if (allBatches.length > 0) {
            setAssignForm(prev => ({ ...prev, batchId: allBatches[0].id }));
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Get subjects of the selected batch
  const selectedBatch = batches.find(b => b.id === assignForm.batchId);
  const batchSubjects = selectedBatch?.subjects
    ? selectedBatch.subjects.split(',').map((s: string) => s.trim())
    : ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'SST'];

  // Auto-set the first subject when selected batch changes
  useEffect(() => {
    if (batchSubjects.length > 0) {
      setAssignForm(prev => ({ ...prev, subject: batchSubjects[0] }));
    }
  }, [assignForm.batchId, selectedBatch]);

  // Extract unique subjects in current lectures for filters
  const uniqueSubjects = Array.from(new Set(lectures.map(l => l.subject)));

  const handleAssignLecture = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignLoading(true);
    setAssignError('');

    try {
      const res = await fetch('/api/lectures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assignForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('🎉 Lecture assigned and scheduled successfully! Students notified.');
        setShowAssignModal(false);
        setAssignForm({
          title: '',
          description: '',
          youtubeUrl: '',
          type: 'LIVE',
          batchId: batches[0]?.id || '',
          subject: ''
        });
        fetchLectures();
      } else {
        setAssignError(data.error || 'Failed to assign lecture');
      }
    } catch (err) {
      setAssignError('Network connection issue');
    } finally {
      setAssignLoading(false);
    }
  };

  const handleDeleteLecture = async (lectureId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this lecture assignment?')) return;

    try {
      const res = await fetch(`/api/lectures?id=${lectureId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        if (activeLecture?.id === lectureId) {
          setActiveLecture(null);
        }
        fetchLectures();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtering Lectures
  const filteredLectures = lectures.filter(lecture => {
    const matchesSearch = lecture.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (lecture.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activeFilter === 'ALL' || lecture.type === activeFilter;
    const matchesSubject = subjectFilter === 'ALL' || lecture.subject === subjectFilter;
    return matchesSearch && matchesType && matchesSubject;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* 1. Main Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text)' }}>
            📺 Live & Recorded Lectures
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Watch live streams and review assigned batch recordings</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {(role === 'ADMIN' || role === 'TEACHER') && (
            <button 
              onClick={() => setShowAssignModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, padding: '10px 18px', borderRadius: '20px', fontSize: '0.85rem' }}
            >
              ➕ Assign New Lecture
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive Theater Player */}
      {activeLecture && (
        <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', padding: '1.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '20px', overflow: 'hidden', boxShadow: 'var(--shadow-lg)' }}>
          {/* Main Video Embed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: 'black' }}>
              <iframe
                src={`https://www.youtube.com/embed/${activeLecture.videoId}?autoplay=1&rel=0&modestbranding=1`}
                title={activeLecture.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
          </div>

          {/* Video Metadata & Theatre Info */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ 
                  background: activeLecture.type === 'LIVE' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)', 
                  color: activeLecture.type === 'LIVE' ? '#ef4444' : 'var(--primary)',
                  padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {activeLecture.type === 'LIVE' ? '🔴 LIVE STREAM' : '🎥 RECORDED'}
                </span>
                <span style={{ background: 'var(--card-bg-alt)', color: 'var(--text-muted)', padding: '4px 10px', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 700 }}>
                  {activeLecture.subject}
                </span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.5rem 0', lineHeight: 1.3 }}>{activeLecture.title}</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0, maxHeight: '180px', overflowY: 'auto' }}>
                {activeLecture.description || 'No descriptive details available for this lecture slot.'}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Assigned Batch:</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)' }}>
                  {activeLecture.batch.name} ({activeLecture.batch.className || 'N/A'})
                </span>
              </div>
              
              {role === 'ADMIN' && (
                <button 
                  onClick={(e) => handleDeleteLecture(activeLecture.id, e)}
                  style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  🗑️ Delete Slot
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Search & Quick Filter Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'var(--card-bg-alt)', padding: '1rem 1.25rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
        {/* Toggle between All, Live, Recorded */}
        <div style={{ display: 'flex', background: 'var(--input-bg)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border)' }}>
          {(['ALL', 'LIVE', 'RECORDED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none',
                background: activeFilter === f ? 'var(--primary)' : 'transparent',
                color: activeFilter === f ? '#fff' : 'var(--text-muted)',
                fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', transition: '0.2s'
              }}
            >
              {f === 'ALL' ? 'All' : f === 'LIVE' ? '🔴 Live Classes' : '🎥 Recorded Lectures'}
            </button>
          ))}
        </div>

        {/* Filter & Search Form */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flex: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
          <select
            value={subjectFilter}
            onChange={e => setSubjectFilter(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.8rem', fontWeight: 600 }}
          >
            <option value="ALL">All Subjects</option>
            {uniqueSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <input 
            type="text"
            placeholder="Search lectures..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ padding: '8px 14px', borderRadius: '10px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.8rem', width: '220px', outline: 'none' }}
          />
        </div>
      </div>

      {/* 4. Lectures List Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem', width: '40px', height: '40px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div>Synchronizing Interactive Stream Deck...</div>
        </div>
      ) : filteredLectures.length === 0 ? (
        <div className="glass-card" style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.6 }}>🎬</div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text)', fontSize: '1.1rem', fontWeight: 800 }}>No Lectures Found</h3>
          <p style={{ margin: 0, fontSize: '0.85rem' }}>There are no scheduled live lectures or video recordings assigned to your batch profile right now.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {filteredLectures.map(lecture => (
            <div 
              key={lecture.id}
              onClick={() => { setActiveLecture(lecture); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              className="lecture-grid-card"
              style={{
                borderRadius: '16px',
                background: 'var(--card-bg)',
                border: activeLecture?.id === lecture.id ? '2px solid var(--primary)' : '1px solid var(--border)',
                overflow: 'hidden',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: activeLecture?.id === lecture.id ? '0 8px 30px rgba(99, 102, 241, 0.15)' : 'none'
              }}
            >
              {/* Thumbnail with overlay status */}
              <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', overflow: 'hidden' }}>
                <img 
                  src={lecture.thumbnailUrl} 
                  alt={lecture.title} 
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                
                {/* Play Button Overlay */}
                <div className="play-overlay" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: activeLecture?.id === lecture.id ? 1 : 0, transition: '0.2s' }}>
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1.2rem', boxShadow: '0 4px 15px rgba(99,102,241,0.5)' }}>
                    ▶
                  </div>
                </div>

                {/* Badge Type */}
                <span style={{ 
                  position: 'absolute', top: '10px', left: '10px',
                  background: lecture.type === 'LIVE' ? '#ef4444' : 'rgba(0,0,0,0.7)', 
                  color: 'white',
                  padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px'
                }}>
                  {lecture.type === 'LIVE' ? '🔴 LIVE' : '🎥 RECORDED'}
                </span>
                
                {/* Subject Badge */}
                <span style={{ 
                  position: 'absolute', bottom: '10px', right: '10px',
                  background: 'rgba(99, 102, 241, 0.9)', 
                  color: 'white',
                  padding: '3px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800
                }}>
                  {lecture.subject}
                </span>
              </div>

              {/* Info text details */}
              <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>
                    {lecture.title}
                  </h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.4 }}>
                    {lecture.description || 'No lecture syllabus details logged.'}
                  </p>
                </div>

                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                    Batch: {lecture.batch.name}
                  </span>
                  
                  {(role === 'ADMIN' || (role === 'TEACHER' && lecture.assignedById === currentUserId)) && (
                    <button
                      onClick={(e) => handleDeleteLecture(lecture.id, e)}
                      style={{ background: 'transparent', border: 'none', color: '#f87171', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Assign New Lecture Modal */}
      {showAssignModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
          <div className="glass-card animate-scale-up" style={{ width: '480px', padding: '2.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', position: 'relative', boxShadow: 'var(--shadow-lg)' }}>
            <button 
              onClick={() => setShowAssignModal(false)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              ×
            </button>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.5rem 0' }}>Assign Interactive Video Lecture</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1.5rem 0' }}>Schedule a YouTube live stream or index a pre-recorded subject video for batch students.</p>

            {assignError && (
              <div style={{ padding: '0.75rem 1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '12px', fontSize: '0.8rem', marginBottom: '1.25rem', fontWeight: 600 }}>
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignLecture} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem', display: 'block' }}>Lecture Title</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. Chemical Reactions & Equations - Part 1"
                  value={assignForm.title}
                  onChange={e => setAssignForm(p => ({ ...p, title: e.target.value }))}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem', display: 'block' }}>Syllabus / Description</label>
                <textarea 
                  placeholder="Summarize key takeaways, homework, or links for students..."
                  value={assignForm.description}
                  onChange={e => setAssignForm(p => ({ ...p, description: e.target.value }))}
                  style={{ width: '100%', minHeight: '60px', padding: '0.8rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem', display: 'block' }}>Target Batch</label>
                <select
                  required
                  value={assignForm.batchId}
                  onChange={e => setAssignForm(p => ({ ...p, batchId: e.target.value }))}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', fontWeight: 600 }}
                >
                  {batches.length === 0 && <option value="">No Batches Allocated</option>}
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.className || 'General'})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem', display: 'block' }}>Subject Wise</label>
                  <select
                    required
                    value={assignForm.subject}
                    onChange={e => setAssignForm(p => ({ ...p, subject: e.target.value }))}
                    style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', fontWeight: 600 }}
                  >
                    {batchSubjects.map((s: string) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem', display: 'block' }}>Lecture Type</label>
                  <div style={{ display: 'flex', background: 'var(--input-bg)', padding: '3px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => setAssignForm(p => ({ ...p, type: 'LIVE' }))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                        background: assignForm.type === 'LIVE' ? '#ef4444' : 'transparent',
                        color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
                      }}
                    >
                      🔴 Live
                    </button>
                    <button
                      type="button"
                      onClick={() => setAssignForm(p => ({ ...p, type: 'RECORDED' }))}
                      style={{
                        flex: 1, padding: '8px', borderRadius: '8px', border: 'none',
                        background: assignForm.type === 'RECORDED' ? 'var(--primary)' : 'transparent',
                        color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer'
                      }}
                    >
                      🎥 Video
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.4rem', display: 'block' }}>YouTube URL / Live Stream Link</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={assignForm.youtubeUrl}
                  onChange={e => setAssignForm(p => ({ ...p, youtubeUrl: e.target.value }))}
                  style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>

              <button 
                type="submit" 
                disabled={assignLoading}
                style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer', opacity: assignLoading ? 0.7 : 1, transition: '0.2s', marginTop: '0.5rem', boxShadow: '0 4px 15px rgba(99,102,241,0.3)' }}
              >
                {assignLoading ? 'Scheduling...' : '🚀 Broadcast & Assign Lecture'}
              </button>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .lecture-grid-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.1);
        }
        .lecture-grid-card:hover .play-overlay {
          opacity: 1 !important;
        }
        .spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.1); border-top: 3px solid var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
