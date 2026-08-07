"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Input, Textarea, Select } from '@/components/ui/Input';

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

interface LecturesSectionProps {
  subTab?: 'DASHBOARD' | 'LIVE' | 'RECORDED' | 'ASSIGN';
  setSubTab?: (tab: 'DASHBOARD' | 'LIVE' | 'RECORDED' | 'ASSIGN') => void;
}

let globalCachedLectures: Lecture[] | null = null;
let globalCachedBatches: any[] | null = null;

export function LecturesSection({ subTab, setSubTab }: LecturesSectionProps = {}) {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role || 'STUDENT';
  const currentUserId = (session?.user as any)?.id;

  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [localSubTab, setLocalSubTab] = useState<'DASHBOARD' | 'LIVE' | 'RECORDED' | 'ASSIGN'>('DASHBOARD');
  const lectureSubTab = subTab || localSubTab;
  const setLectureSubTab = setSubTab || setLocalSubTab;
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'LIVE' | 'RECORDED'>('ALL');
  const [subjectFilter, setSubjectFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeLecture, setActiveLecture] = useState<Lecture | null>(null);
  const [isCinemaMode, setIsCinemaMode] = useState(false);

  const renderTheaterPlayer = () => {
    if (!activeLecture) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-heading)' }}>
          🎬 Now Watching / Selected Lecture
        </h4>
        <Card variant="glass" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div 
              className="video-fullscreen-wrapper"
              style={{ position: 'relative', width: '100%', paddingTop: '56.25%', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', background: 'black' }}
            >
              <iframe
                src={`https://www.youtube.com/embed/${activeLecture.videoId}?autoplay=0&rel=0&modestbranding=1&fs=1`}
                title={activeLecture.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                allowFullScreen
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="secondary"
                size="sm"
                onClick={() => setIsCinemaMode(true)}
              >
                📺 Watch Full Screen
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.5rem 0' }}>
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                <Badge variant={activeLecture.type === 'LIVE' ? 'danger' : 'info'}>
                  {activeLecture.type === 'LIVE' ? '🔴 LIVE STREAM' : '🎥 RECORDED'}
                </Badge>
                <Badge variant="neutral">{activeLecture.subject}</Badge>
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-heading)', margin: '0 0 0.5rem 0', lineHeight: 1.3 }}>{activeLecture.title}</h2>
              <p className="input-label" style={{ fontSize: '0.8rem', lineHeight: 1.5, margin: 0, maxHeight: '150px', overflowY: 'auto' }}>
                {activeLecture.description || 'No descriptive details available for this lecture slot.'}
              </p>
            </div>

            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span className="input-label" style={{ fontSize: '0.65rem', display: 'block' }}>Assigned Batch:</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text)' }}>
                  {activeLecture.batch?.name || 'N/A'} ({activeLecture.batch?.className || 'N/A'})
                </span>
              </div>
              
              {(role === 'ADMIN' || (role === 'TEACHER' && activeLecture.assignedById === currentUserId)) && (
                <Button 
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteLecture(activeLecture.id, e)}
                  style={{ color: '#ef4444' }}
                >
                  🗑️ Delete Slot
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  };

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

  useEffect(() => {
    fetchLectures();
    if (role === 'ADMIN' || role === 'TEACHER') {
      fetchBatches();
    }
  }, [role]);

  const fetchLectures = async () => {
    if (globalCachedLectures) {
      setLectures(globalCachedLectures);
      setLoading(false);
      const liveLectures = globalCachedLectures.filter((l: Lecture) => l.type === 'LIVE');
      if (liveLectures.length > 0) setActiveLecture(liveLectures[0]);
      else if (globalCachedLectures.length > 0) setActiveLecture(globalCachedLectures[0]);
      
      fetch('/api/lectures').then(r => r.json()).then(data => {
        globalCachedLectures = data.lectures || [];
        setLectures(globalCachedLectures || []);
      }).catch(e => console.error(e));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/lectures');
      if (res.ok) {
        const data = await res.json();
        globalCachedLectures = data.lectures || [];
        setLectures(globalCachedLectures || []);
        
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
    if (globalCachedBatches) {
      processBatches(globalCachedBatches);
      fetch('/api/admin/batches').then(r => r.json()).then(data => {
        globalCachedBatches = data.batches || [];
        processBatches(globalCachedBatches || []);
      }).catch(e => console.error(e));
      return;
    }

    try {
      const res = await fetch('/api/admin/batches');
      if (res.ok) {
        const data = await res.json();
        globalCachedBatches = data.batches || [];
        processBatches(globalCachedBatches || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const processBatches = (allBatches: any[]) => {
    if (role === 'TEACHER') {
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
  };

  const selectedBatch = batches.find(b => b.id === assignForm.batchId);
  const batchSubjects = selectedBatch?.subjects
    ? selectedBatch.subjects.split(',').map((s: string) => s.trim())
    : ['Mathematics', 'Science', 'Physics', 'Chemistry', 'Biology', 'English', 'SST'];

  useEffect(() => {
    if (batchSubjects.length > 0) {
      setAssignForm(prev => ({ ...prev, subject: batchSubjects[0] }));
    }
  }, [assignForm.batchId, selectedBatch]);

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

  const filteredLectures = lectures.filter(lecture => {
    const matchesSearch = lecture.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (lecture.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = activeFilter === 'ALL' || lecture.type === activeFilter;
    const matchesSubject = subjectFilter === 'ALL' || lecture.subject === subjectFilter;
    return matchesSearch && matchesType && matchesSubject;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%' }}>
      {/* Main Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--text-heading)' }}>
            📺 Live & Recorded Lectures
          </h3>
          <p className="input-label" style={{ marginTop: 4 }}>Watch live streams and review assigned batch recordings</p>
        </div>

        {/* Tab Bar */}
        <div className="tab-nav">
          {[
            { id: 'DASHBOARD', label: '📺 Lecture Hub' },
            { id: 'LIVE', label: '🔴 Live Streams' },
            { id: 'RECORDED', label: '🎥 Video Archive' },
            ...((role === 'ADMIN' || role === 'TEACHER') ? [{ id: 'ASSIGN', label: '➕ Broadcast Scheduler' }] : [])
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setLectureSubTab(tab.id as any)}
              className={`tab-btn ${lectureSubTab === tab.id ? 'tab-btn-active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* SUB-TAB: DASHBOARD */}
      {lectureSubTab === 'DASHBOARD' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Card variant="glass">
            <h3 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800, color: 'var(--text-heading)' }}>Welcome to your Live Classrooms & Video Library! 📺</h3>
            <p className="input-label" style={{ marginTop: '0.4rem', maxWidth: '700px', lineHeight: '1.4' }}>
              Attend interactive live streams, catch up on syllabus recordings, and view lecture syllabus documents.
            </p>
          </Card>

          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
            {[
              { label: 'Total Index Lectures', value: lectures.length, icon: '📺' },
              { label: '🔴 Live Now', value: lectures.filter(l => l.type === 'LIVE').length, icon: '🎥' },
              { label: '🎥 Recorded Archives', value: lectures.filter(l => l.type === 'RECORDED').length, icon: '💾' },
              { label: 'Linked Batches', value: Array.from(new Set(lectures.map(l => l.batchId))).length, icon: '👥' }
            ].map((s, i) => (
              <Card key={i} variant="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div className="input-label" style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>{s.label}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--text-heading)' }}>{s.value}</div>
                </div>
                <span style={{ fontSize: '1.75rem', opacity: 0.7 }}>{s.icon}</span>
              </Card>
            ))}
          </div>

          {activeLecture ? (
            renderTheaterPlayer()
          ) : (
            <Card variant="glass" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem', textAlign: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '3rem' }}>📺</span>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-heading)' }}>No Active Lecture Selected</h4>
                <p className="input-label" style={{ marginTop: '0.25rem', maxWidth: '500px' }}>
                  Select any live class or video recording from the tabs above to launch the interactive theatre player.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                <Button variant="primary" onClick={() => setLectureSubTab('LIVE')}>
                  🔴 Watch Live Streams
                </Button>
                <Button variant="outline" onClick={() => setLectureSubTab('RECORDED')}>
                  🎥 Browse Video Archive
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* SUB-TAB: LIVE BROADCASTS */}
      {lectureSubTab === 'LIVE' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {activeLecture && renderTheaterPlayer()}
          
          <Card variant="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.25rem' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)' }}>🔴 Live Timetable & Active Streams</h4>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Select
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Subjects' },
                  ...uniqueSubjects.map(s => ({ value: s, label: s }))
                ]}
              />
              <Input 
                placeholder="Search live streams..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '220px' }}
              />
            </div>
          </Card>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <Spinner size="md" />
              <span className="input-label">Loading active stream listings...</span>
            </div>
          ) : filteredLectures.filter(l => l.type === 'LIVE').length === 0 ? (
            <Card variant="glass" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔴</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '1.1rem', fontWeight: 800 }}>No Live Streams Scheduled</h3>
              <p className="input-label">There are no scheduled live interactive streams assigned to your batch profile right now.</p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {filteredLectures.filter(l => l.type === 'LIVE').map(lecture => (
                <Card 
                  key={lecture.id}
                  interactive
                  onClick={() => { setActiveLecture(lecture); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    borderColor: activeLecture?.id === lecture.id ? 'var(--primary)' : undefined
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', overflow: 'hidden' }}>
                    <img 
                      src={lecture.thumbnailUrl} 
                      alt={lecture.title} 
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    
                    <span style={{ position: 'absolute', top: '10px', left: '10px' }}>
                      <Badge variant="danger">🔴 LIVE</Badge>
                    </span>
                    
                    <span style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
                      <Badge variant="info">{lecture.subject}</Badge>
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
                        {lecture.title}
                      </h4>
                      <p className="input-label" style={{ fontSize: '0.75rem', margin: 0 }}>
                        {lecture.description || 'No stream syllabus details logged.'}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="input-label" style={{ fontSize: '0.7rem' }}>
                        Batch: {lecture.batch.name}
                      </span>
                      
                      {(role === 'ADMIN' || (role === 'TEACHER' && lecture.assignedById === currentUserId)) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteLecture(lecture.id, e)}
                          style={{ color: '#ef4444' }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: RECORDED ARCHIVE */}
      {lectureSubTab === 'RECORDED' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {activeLecture && renderTheaterPlayer()}

          <Card variant="glass" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1rem 1.25rem' }}>
            <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-heading)' }}>🎥 Recorded Session Video Library</h4>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <Select
                value={subjectFilter}
                onChange={e => setSubjectFilter(e.target.value)}
                options={[
                  { value: 'ALL', label: 'All Subjects' },
                  ...uniqueSubjects.map(s => ({ value: s, label: s }))
                ]}
              />
              <Input 
                placeholder="Search video archive..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '220px' }}
              />
            </div>
          </Card>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <Spinner size="md" />
              <span className="input-label">Loading recorded library archive...</span>
            </div>
          ) : filteredLectures.filter(l => l.type === 'RECORDED').length === 0 ? (
            <Card variant="glass" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎥</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-heading)', fontSize: '1.1rem', fontWeight: 800 }}>No Videos Found</h3>
              <p className="input-label">There are no recorded lessons assigned to your batch profile right now.</p>
            </Card>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {filteredLectures.filter(l => l.type === 'RECORDED').map(lecture => (
                <Card 
                  key={lecture.id}
                  interactive
                  onClick={() => { setActiveLecture(lecture); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  style={{
                    padding: 0,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    borderColor: activeLecture?.id === lecture.id ? 'var(--primary)' : undefined
                  }}
                >
                  <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', overflow: 'hidden' }}>
                    <img 
                      src={lecture.thumbnailUrl} 
                      alt={lecture.title} 
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    
                    <span style={{ position: 'absolute', top: '10px', left: '10px' }}>
                      <Badge variant="neutral">🎥 VIDEO</Badge>
                    </span>
                    
                    <span style={{ position: 'absolute', bottom: '10px', right: '10px' }}>
                      <Badge variant="info">{lecture.subject}</Badge>
                    </span>
                  </div>

                  <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 }}>
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--text-heading)' }}>
                        {lecture.title}
                      </h4>
                      <p className="input-label" style={{ fontSize: '0.75rem', margin: 0 }}>
                        {lecture.description || 'No lecture syllabus details logged.'}
                      </p>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="input-label" style={{ fontSize: '0.7rem' }}>
                        Batch: {lecture.batch.name}
                      </span>
                      
                      {(role === 'ADMIN' || (role === 'TEACHER' && lecture.assignedById === currentUserId)) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleDeleteLecture(lecture.id, e)}
                          style={{ color: '#ef4444' }}
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: BROADCAST SCHEDULER */}
      {lectureSubTab === 'ASSIGN' && (role === 'ADMIN' || role === 'TEACHER') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '600px', margin: '0 auto', width: '100%' }}>
          <Card variant="glass" style={{ padding: '2.5rem' }}>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-heading)', margin: '0 0 0.5rem 0' }}>Assign Interactive Video Lecture</h3>
            <p className="input-label" style={{ marginBottom: '1.5rem' }}>Schedule a YouTube live stream or index a pre-recorded subject video for batch students.</p>

            {assignError && (
              <Badge variant="danger" style={{ padding: '0.75rem 1rem', marginBottom: '1.25rem', width: '100%', justifyContent: 'center' }}>
                {assignError}
              </Badge>
            )}

            <form onSubmit={handleAssignLecture} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Input 
                label="Lecture Title"
                required
                placeholder="e.g. Chemical Reactions & Equations - Part 1"
                value={assignForm.title}
                onChange={e => setAssignForm(p => ({ ...p, title: e.target.value }))}
              />

              <Textarea 
                label="Syllabus / Description"
                placeholder="Summarize key takeaways, homework, or links for students..."
                value={assignForm.description}
                onChange={e => setAssignForm(p => ({ ...p, description: e.target.value }))}
                rows={3}
              />

              <Select
                label="Target Batch"
                required
                value={assignForm.batchId}
                onChange={e => setAssignForm(p => ({ ...p, batchId: e.target.value }))}
                options={[
                  ...(batches.length === 0 ? [{ value: '', label: 'No Batches Allocated' }] : []),
                  ...batches.map(b => ({ value: b.id, label: `${b.name} (${b.className || 'General'})` }))
                ]}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <Select
                  label="Subject Wise"
                  required
                  value={assignForm.subject}
                  onChange={e => setAssignForm(p => ({ ...p, subject: e.target.value }))}
                  options={batchSubjects.map((s: string) => ({ value: s, label: s }))}
                />

                <Select
                  label="Lecture Type"
                  required
                  value={assignForm.type}
                  onChange={e => setAssignForm(p => ({ ...p, type: e.target.value as 'LIVE' | 'RECORDED' }))}
                  options={[
                    { value: 'LIVE', label: '🔴 Live Stream' },
                    { value: 'RECORDED', label: '🎥 Recorded Video' }
                  ]}
                />
              </div>

              <Input 
                label="YouTube URL / Live Stream Link"
                type="url"
                required
                placeholder="https://www.youtube.com/watch?v=..."
                value={assignForm.youtubeUrl}
                onChange={e => setAssignForm(p => ({ ...p, youtubeUrl: e.target.value }))}
              />

              <Button 
                type="submit" 
                isLoading={assignLoading}
                variant="primary"
                fullWidth
                style={{ marginTop: '1rem' }}
              >
                🚀 Broadcast & Assign Lecture
              </Button>
            </form>
          </Card>
        </div>
      )}

      {/* Cinema Fullscreen Overlay */}
      {isCinemaMode && activeLecture && (
        <div className="modal-overlay" style={{ background: '#000000', padding: 0 }}>
          <Button 
            onClick={() => setIsCinemaMode(false)}
            variant="secondary"
            style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 5100 }}
          >
            ✕ Close Full Screen
          </Button>
          
          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <iframe
              src={`https://www.youtube.com/embed/${activeLecture.videoId}?autoplay=1&rel=0&modestbranding=1&fs=1`}
              title={activeLecture.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 'none', position: 'absolute', top: 0, left: 0 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
