"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { Input, Textarea, Select } from '@/components/ui/Input';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    name?: string;
    role?: string;
  } | null;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case 'SYSTEM':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
    case 'FEE':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
    case 'ALERT':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
    case 'MESSAGE':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
    case 'REPORT':
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18.6 18.6L16 16M5.4 5.4L8 8m10.6-2.6L16 8M5.4 18.6L8 16M2 18.6L8 16M2 12h3m14 0h3M12 2v3m0 14v3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>;
    default:
      return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
  }
}

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

function parseNotificationMessage(msg: string) {
  let cleanMessage = msg || "";
  let screenshot: string | null = null;
  let email: string | null = null;

  const ssMatch = cleanMessage.match(/\[Screenshot:\s*(data:image\/[^\]]+)\]/i);
  if (ssMatch) {
    screenshot = ssMatch[1];
    cleanMessage = cleanMessage.replace(ssMatch[0], '').trim();
  }

  const emailMatch = cleanMessage.match(/\[Email:\s*([^\]]+)\]/i);
  if (emailMatch) {
    email = emailMatch[1];
    cleanMessage = cleanMessage.replace(emailMatch[0], '').trim();
  }

  return { cleanMessage, screenshot, email };
}

export function NotificationsPanel({
  onUnreadChange,
}: {
  onUnreadChange?: (count: number) => void;
}) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<'received' | 'sent'>('received');

  const visibleCountRef = useRef(10);
  useEffect(() => {
    visibleCountRef.current = visibleCount;
  }, [visibleCount]);

  const [showCompose, setShowCompose] = useState(false);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMsg, setComposeMsg] = useState('');
  const [targetAudienceMode, setTargetAudienceMode] = useState<'ALL_STUDENTS' | 'ALL_TEACHERS' | 'BATCHES' | 'CUSTOM' | 'ALL'>('ALL_STUDENTS');
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [availableBatches, setAvailableBatches] = useState<any[]>([]);
  const [customUserSearch, setCustomUserSearch] = useState('');
  const [searchedUsers, setSearchedUsers] = useState<any[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedCustomUsers, setSelectedCustomUsers] = useState<any[]>([]);
  const [composing, setComposing] = useState(false);
  const [composeSuccess, setComposeSuccess] = useState('');

  useEffect(() => {
    fetch('/api/admin/batches')
      .then(r => r.json())
      .then(data => {
        if (data.batches) setAvailableBatches(data.batches);
      })
      .catch(console.error);
  }, []);

  // Debounced search for custom recipient selection
  useEffect(() => {
    if (targetAudienceMode !== 'CUSTOM' || !customUserSearch.trim()) {
      setSearchedUsers([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchingUsers(true);
      try {
        const res = await fetch('/api/admin/directory?q=' + encodeURIComponent(customUserSearch.trim()));
        if (res.ok) {
          const data = await res.json();
          setSearchedUsers(data.users || []);
        }
      } catch (err) {
        console.error("User search error:", err);
      } finally {
        setSearchingUsers(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customUserSearch, targetAudienceMode]);

  const toggleBatch = (bId: string) => {
    setSelectedBatchIds(prev => 
      prev.includes(bId) ? prev.filter(id => id !== bId) : [...prev, bId]
    );
  };

  const selectAllBatches = () => {
    setSelectedBatchIds(availableBatches.map(b => b.id || b.name));
  };

  const clearAllBatches = () => {
    setSelectedBatchIds([]);
  };

  const addCustomUser = (user: any) => {
    if (!selectedCustomUsers.some(u => u.id === user.id)) {
      setSelectedCustomUsers(prev => [...prev, user]);
    }
    setCustomUserSearch('');
    setSearchedUsers([]);
  };

  const removeCustomUser = (userId: string) => {
    setSelectedCustomUsers(prev => prev.filter(u => u.id !== userId));
  };

  const role = (session?.user as any)?.role as string;

  const fetchNotifications = async (currentLimit?: number) => {
    try {
      const limitToUse = currentLimit ?? visibleCountRef.current;
      const url = panelTab === 'sent' 
        ? `/api/notifications?sent=true&limit=${limitToUse}` 
        : `/api/notifications?limit=${limitToUse}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const rawNotifications = data.notifications || [];
        const unread = data.unreadCount ?? 0;
        
        if (panelTab === 'received' && unread > 0) {
          fetch('/api/notifications', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: [] })
          }).catch(console.error);
          
          setNotifications(rawNotifications.map((n: Notification) => ({ ...n, isRead: true })));
          setTotalCount(data.totalCount || 0);
          setUnreadCount(0);
          onUnreadChange?.(0);
        } else {
          setNotifications(rawNotifications);
          setTotalCount(data.totalCount || 0);
          if (panelTab === 'received') {
            setUnreadCount(unread);
            onUnreadChange?.(unread);
          }
        }
        setLoading(false);
      }
    } catch (e) { console.error(e); }
  };

  const handleLoadMore = () => {
    const newLimit = visibleCount + 10;
    setVisibleCount(newLimit);
    fetchNotifications(newLimit);
  };

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;
    let fallbackInterval: any = null;

    const connectSSE = () => {
      if (panelTab !== 'received') return;
      if (eventSource) eventSource.close();

      eventSource = new EventSource('/api/notifications/subscribe');

      eventSource.onopen = () => {
        fetchNotifications();
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected' || data.type === 'ping') return;
          fetchNotifications();
        } catch (e) {
          console.error('Failed to parse SSE notification:', e);
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, 30000);

        if (!fallbackInterval) {
          fallbackInterval = setInterval(() => {
            if (document.visibilityState === 'visible') fetchNotifications();
          }, 15000);
        }
      };
    };

    fetchNotifications();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') connectSSE();
      else {
        if (eventSource) { eventSource.close(); eventSource = null; }
        if (fallbackInterval) { clearInterval(fallbackInterval); fallbackInterval = null; }
      }
    };

    if (document.visibilityState === 'visible') connectSSE();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (eventSource) eventSource.close();
      clearTimeout(reconnectTimeout);
      if (fallbackInterval) clearInterval(fallbackInterval);
    };
  }, [panelTab]);

  const markAllRead = async () => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [] }) });
    fetchNotifications();
  };

  const markOneRead = async (id: string) => {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [id] }) });
    fetchNotifications();
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();

    if (targetAudienceMode === 'BATCHES' && selectedBatchIds.length === 0) {
      alert("Please select at least one batch from the available batches list.");
      return;
    }

    if (targetAudienceMode === 'CUSTOM' && selectedCustomUsers.length === 0) {
      alert("Please search and select at least one individual student or teacher.");
      return;
    }

    setComposing(true);
    try {
      const payload: any = {
        title: composeTitle,
        message: composeMsg,
        type: 'SYSTEM',
        targetMode: targetAudienceMode
      };

      if (targetAudienceMode === 'BATCHES') {
        payload.batchIds = selectedBatchIds;
      } else if (targetAudienceMode === 'CUSTOM') {
        payload.targetUserIds = selectedCustomUsers.map(u => u.id);
      }

      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setComposeSuccess('Notification dispatched to ' + (data.sent || 0) + ' user(s) successfully!');
        setComposeTitle('');
        setComposeMsg('');
        setSelectedBatchIds([]);
        setSelectedCustomUsers([]);
        setTimeout(() => { setComposeSuccess(''); setShowCompose(false); }, 3000);
      } else {
        alert(data.error || 'Failed to send notification');
      }
    } catch (e) { console.error(e); }
    finally { setComposing(false); }
  };

  return (
    <div style={{ width: '100%', maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingRight: '2.2rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', margin: 0, color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Notifications
            {unreadCount > 0 && (
              <Badge variant="danger">{unreadCount} new</Badge>
            )}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
          {(role === 'ADMIN' || role === 'TEACHER') && (
            <Button variant="primary" size="sm" onClick={() => setShowCompose(!showCompose)}>
              {showCompose ? 'Cancel' : 'Send Notice'}
            </Button>
          )}
        </div>
      </div>

      {/* Compose Form */}
      {showCompose && (
        <Card variant="glass" style={{ marginBottom: '1.5rem', border: '1px solid var(--primary)', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📢 Send Notification
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Targeted & Broadcast Dispatch</span>
          </div>

          {composeSuccess && (
            <Badge variant="success" style={{ padding: '0.6rem 1rem', marginBottom: '1.25rem', width: '100%', justifyContent: 'center', fontSize: '0.88rem' }}>
              {composeSuccess}
            </Badge>
          )}

          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Recipient Audience Selector */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-heading)' }}>
                🎯 Select Recipients:
              </label>

              {/* Mode Selection Pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {[
                  { id: 'ALL_STUDENTS', label: '🎓 All Students' },
                  { id: 'ALL_TEACHERS', label: '👨‍🏫 All Teachers' },
                  { id: 'BATCHES', label: '🏫 Available Batches' },
                  { id: 'CUSTOM', label: '👤 Custom (Individual Student / Teacher)' },
                  { id: 'ALL', label: '🌐 Everyone' }
                ].map(opt => {
                  const isSelected = targetAudienceMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setTargetAudienceMode(opt.id as any)}
                      style={{
                        padding: '0.4rem 0.85rem',
                        borderRadius: '20px',
                        border: '1px solid ' + (isSelected ? 'var(--primary)' : 'var(--border)'),
                        background: isSelected ? 'var(--primary)' : 'var(--card-bg-alt, rgba(255,255,255,0.04))',
                        color: isSelected ? '#ffffff' : 'var(--text)',
                        fontSize: '0.82rem',
                        fontWeight: isSelected ? 800 : 600,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Audience Context Info Banner */}
              {targetAudienceMode === 'ALL_STUDENTS' && (
                <div style={{ padding: '0.6rem 0.85rem', background: 'rgba(59, 130, 246, 0.08)', borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#3b82f6', fontSize: '0.82rem', fontWeight: 600 }}>
                  ✓ This notification will be received by all active students across all classes.
                </div>
              )}

              {targetAudienceMode === 'ALL_TEACHERS' && (
                <div style={{ padding: '0.6rem 0.85rem', background: 'rgba(16, 185, 129, 0.08)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10b981', fontSize: '0.82rem', fontWeight: 600 }}>
                  ✓ This notification will be received by all faculty and teaching staff.
                </div>
              )}

              {targetAudienceMode === 'ALL' && (
                <div style={{ padding: '0.6rem 0.85rem', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '10px', border: '1px solid rgba(245, 158, 11, 0.25)', color: '#f59e0b', fontSize: '0.82rem', fontWeight: 600 }}>
                  ✓ Broad broadcast: will be sent to all active students AND all teachers.
                </div>
              )}

              {/* Batches Available Sub-Selector */}
              {targetAudienceMode === 'BATCHES' && (
                <div style={{ marginTop: '0.35rem', padding: '0.9rem', background: 'var(--card-bg-alt, rgba(255,255,255,0.03))', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Select Batches ({selectedBatchIds.length} of {availableBatches.length} selected):
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button type="button" onClick={selectAllBatches} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                        Select All
                      </button>
                      <span style={{ color: 'var(--border)' }}>•</span>
                      <button type="button" onClick={clearAllBatches} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                        Clear
                      </button>
                    </div>
                  </div>

                  {availableBatches.length === 0 ? (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Loading batches...</div>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', maxHeight: '180px', overflowY: 'auto' }}>
                      {availableBatches.map(b => {
                        const bKey = b.id || b.name;
                        const isChecked = selectedBatchIds.includes(bKey);
                        return (
                          <button
                            key={bKey}
                            type="button"
                            onClick={() => toggleBatch(bKey)}
                            style={{
                              padding: '0.35rem 0.75rem',
                              borderRadius: '8px',
                              border: '1px solid ' + (isChecked ? '#10b981' : 'var(--border)'),
                              background: isChecked ? 'rgba(16,185,129,0.12)' : 'var(--card-bg)',
                              color: isChecked ? '#10b981' : 'var(--text)',
                              fontSize: '0.8rem',
                              fontWeight: isChecked ? 800 : 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem'
                            }}
                          >
                            <span>{isChecked ? '✓' : '+'}</span>
                            <span>{b.name}</span>
                            {b.className && <span style={{ opacity: 0.65, fontSize: '0.72rem' }}>({b.className})</span>}
                            {b._count?.students !== undefined && (
                              <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: 'rgba(255,255,255,0.08)' }}>
                                {b._count.students}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Custom Individual User Sub-Selector */}
              {targetAudienceMode === 'CUSTOM' && (
                <div style={{ marginTop: '0.35rem', padding: '0.9rem', background: 'var(--card-bg-alt, rgba(255,255,255,0.03))', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ marginBottom: '0.6rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      Search & add individual students or teachers:
                    </span>
                  </div>

                  {/* Selected User Pills */}
                  {selectedCustomUsers.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.75rem', padding: '0.5rem', background: 'var(--card-bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      {selectedCustomUsers.map(u => (
                        <span
                          key={u.id}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '16px',
                            background: u.role === 'TEACHER' ? 'rgba(16,185,129,0.15)' : 'rgba(59,130,246,0.15)',
                            color: u.role === 'TEACHER' ? '#10b981' : '#3b82f6',
                            border: '1px solid ' + (u.role === 'TEACHER' ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'),
                            fontSize: '0.78rem',
                            fontWeight: 700
                          }}
                        >
                          <span>{u.role === 'TEACHER' ? '👨‍🏫' : '🎓'}</span>
                          <span>{u.name || u.username}</span>
                          {u.studentProfile?.className && (
                            <span style={{ opacity: 0.75, fontSize: '0.7rem' }}>({u.studentProfile.className})</span>
                          )}
                          <button
                            type="button"
                            onClick={() => removeCustomUser(u.id)}
                            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: '0 2px', fontWeight: 900, fontSize: '0.85rem' }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Search Bar */}
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      placeholder="Type name or username (e.g. Rahul, rohit123)..."
                      value={customUserSearch}
                      onChange={e => setCustomUserSearch(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text)',
                        fontSize: '0.85rem'
                      }}
                    />
                    {searchingUsers && (
                      <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Searching...
                      </span>
                    )}

                    {/* Search Results Dropdown */}
                    {searchedUsers.length > 0 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '105%',
                          left: 0,
                          right: 0,
                          maxHeight: '200px',
                          overflowY: 'auto',
                          background: 'var(--card-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '8px',
                          zIndex: 50,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.35)'
                        }}
                      >
                        {searchedUsers.map(u => (
                          <div
                            key={u.id}
                            onClick={() => addCustomUser(u)}
                            style={{
                              padding: '0.55rem 0.85rem',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              borderBottom: '1px solid rgba(255,255,255,0.04)',
                              fontSize: '0.82rem'
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div>
                              <strong style={{ color: 'var(--text-heading)' }}>{u.name || u.username}</strong>
                              <span style={{ color: 'var(--text-muted)', marginLeft: '0.5rem', fontSize: '0.75rem' }}>
                                @{u.username} {u.studentProfile?.className ? '• Class ' + u.studentProfile.className : ''}
                              </span>
                            </div>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                background: u.role === 'TEACHER' ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)',
                                color: u.role === 'TEACHER' ? '#10b981' : '#3b82f6'
                              }}
                            >
                              {u.role}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <Input
              label="Notification Title"
              required
              placeholder="e.g. Fee Reminder / Exam Schedule"
              value={composeTitle}
              onChange={e => setComposeTitle(e.target.value)}
            />

            <Textarea
              label="Message Content"
              required
              placeholder="Write your notification message here..."
              value={composeMsg}
              onChange={e => setComposeMsg(e.target.value)}
              rows={3}
            />
            
            <Button type="submit" isLoading={composing} variant="primary" size="sm" style={{ alignSelf: 'flex-end', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 800 }}>
              🚀 Send Notification
            </Button>
          </form>
        </Card>
      )}

        {/* Sent / Received Navigation */}
        {(role === 'ADMIN' || role === 'TEACHER') && (
          <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button 
              type="button"
              onClick={() => { setLoading(true); setPanelTab('received'); }}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid ' + (panelTab === 'received' ? 'var(--primary)' : 'var(--border)'),
                background: panelTab === 'received' ? 'var(--primary)' : 'transparent',
                color: panelTab === 'received' ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Inbox
            </button>
            <button 
              type="button"
              onClick={() => { setLoading(true); setPanelTab('sent'); }}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid ' + (panelTab === 'sent' ? 'var(--primary)' : 'var(--border)'),
                background: panelTab === 'sent' ? 'var(--primary)' : 'transparent',
                color: panelTab === 'sent' ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              Sent Notices
            </button>
          </div>
        )}

        {/* Notifications List */}
        <Card variant="glass" style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <Spinner size="md" />
              <span className="input-label">Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
                {panelTab === 'sent' ? 'No sent broadcasts' : 'No notifications yet'}
              </div>
              <div className="input-label">
                {panelTab === 'sent' ? 'Broadcast notices to see them listed here.' : "You'll see messages from admin and teachers here."}
              </div>
            </div>
          ) : (
            <>
              {notifications.slice(0, visibleCount).map((n, i) => {
                const { cleanMessage, screenshot, email } = parseNotificationMessage(n.message);
                const badgeType = n.type === 'FEE' || n.type === 'REPORT' ? 'danger' : n.type === 'ALERT' ? 'warning' : n.type === 'MESSAGE' ? 'success' : 'info';

                return (
                  <div
                    key={n.id}
                    onClick={() => panelTab === 'received' && !n.isRead && markOneRead(n.id)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                      background: (panelTab === 'received' && !n.isRead) ? 'var(--surface-light)' : 'transparent',
                      cursor: (panelTab === 'received' && !n.isRead) ? 'pointer' : 'default',
                      transition: 'background 0.2s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                        <span style={{ fontWeight: n.isRead ? 600 : 800, color: 'var(--text-heading)', fontSize: '0.95rem' }}>
                          {n.title}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                          <span className="input-label" style={{ fontSize: '0.75rem' }}>{timeAgo(n.createdAt)}</span>
                        </div>
                      </div>
                      <p className="input-label" style={{ margin: '0.3rem 0 0 0', fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                        {cleanMessage}
                      </p>
                      
                      {email && (
                        <div className="input-label" style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}>
                          Contact Email: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{email}</span>
                        </div>
                      )}

                      {screenshot && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); setLightboxImg(screenshot); }}
                          >
                            View Attachment
                          </Button>
                        </div>
                      )}

                      {(() => {
                        let senderLabel = 'Admin';
                        if (n.sender) {
                          if (n.sender.role === 'TEACHER') {
                            senderLabel = n.sender.name || 'Teacher';
                          } else if (n.sender.role === 'ADMIN') {
                            senderLabel = 'Admin';
                          } else {
                            senderLabel = n.sender.name || 'Admin';
                          }
                        } else if (n.type && n.type !== 'SYSTEM') {
                          senderLabel = n.type;
                        }

                        return (
                          <div style={{ marginTop: '0.35rem' }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              textTransform: 'uppercase',
                              letterSpacing: '0.4px',
                              background: badgeType === 'danger' ? 'rgba(239,68,68,0.1)' : badgeType === 'warning' ? 'rgba(245,158,11,0.1)' : 'rgba(59,130,246,0.1)',
                              color: badgeType === 'danger' ? '#ef4444' : badgeType === 'warning' ? '#f59e0b' : 'var(--secondary)',
                              border: `1px solid ${badgeType === 'danger' ? 'rgba(239,68,68,0.25)' : badgeType === 'warning' ? 'rgba(245,158,11,0.25)' : 'rgba(59,130,246,0.25)'}`
                            }}>
                              {senderLabel}
                            </span>
                          </div>
                        );
                      })()}
                  </div>
                </div>
              );
            })}
            {notifications.length < totalCount && (
              <Button
                variant="ghost"
                fullWidth
                onClick={handleLoadMore}
                style={{ borderRadius: 0 }}
              >
                View More Notifications
              </Button>
            )}
          </>
        )}
      </Card>

      {/* Lightbox Modal */}
      {lightboxImg && (
        <div 
          onClick={() => setLightboxImg(null)} 
          className="modal-overlay"
        >
          <img src={lightboxImg} alt="Enlarged Screenshot" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '12px' }} />
          <button 
            onClick={() => setLightboxImg(null)} 
            className="modal-close-btn"
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: '#fff' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
