"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const typeColors: Record<string, { bg: string; color: string; icon: string }> = {
  SYSTEM:  { bg: 'rgba(99,102,241,0.12)', color: '#818cf8', icon: '🔔' },
  FEE:     { bg: 'rgba(239,68,68,0.12)',  color: '#f87171', icon: '💰' },
  ALERT:   { bg: 'rgba(245,158,11,0.12)', color: '#fbbf24', icon: '⚠️' },
  MESSAGE: { bg: 'rgba(16,185,129,0.12)', color: '#34d399', icon: '💬' },
  REPORT:  { bg: 'rgba(239,68,68,0.15)',  color: '#ef4444', icon: '🐛' },
};

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return (() => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  })();
}

function parseNotificationMessage(msg: string) {
  let cleanMessage = msg || "";
  let screenshot: string | null = null;
  let email: string | null = null;

  // Extract screenshot: support standard base64 URL format
  const ssMatch = cleanMessage.match(/\[Screenshot:\s*(data:image\/[^;]+;base64,[a-zA-Z0-9+/=]+)\]/i);
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

  // Admin-only broadcast form state
  const [showCompose, setShowCompose] = useState(false);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMsg, setComposeMsg] = useState('');
  const [composeRole, setComposeRole] = useState('ALL');
  const [composing, setComposing] = useState(false);
  const [composeSuccess, setComposeSuccess] = useState('');

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
        setNotifications(data.notifications || []);
        setTotalCount(data.totalCount || 0);
        if (panelTab === 'received') {
          const unread = data.unreadCount ?? 0;
          setUnreadCount(unread);
          onUnreadChange?.(unread);
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
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

      if (eventSource) {
        eventSource.close();
      }

      eventSource = new EventSource('/api/notifications/subscribe');

      eventSource.onopen = () => {
        console.log('[SSE Notifications] Connection established successfully');
        fetchNotifications();
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Ignore control messages
          if (data.type === 'connected' || data.type === 'ping') {
            return;
          }
          // Real-time update signal received
          fetchNotifications();
        } catch (e) {
          console.error('Failed to parse SSE notification:', e);
        }
      };

      eventSource.onerror = () => {
        console.error('[SSE Notifications] Connection error. Closing stream...');
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        
        // Attempt reconnection after 30 seconds
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectSSE, 30000);

        // Start fallback polling (once every 15s) while SSE is down
        if (!fallbackInterval) {
          fallbackInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
              fetchNotifications();
            }
          }, 15000);
        }
      };
    };

    // Initial load
    fetchNotifications();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        connectSSE();
      } else {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        if (fallbackInterval) {
          clearInterval(fallbackInterval);
          fallbackInterval = null;
        }
      }
    };

    if (document.visibilityState === 'visible') {
      connectSSE();
    }

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(reconnectTimeout);
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
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
    setComposing(true);
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: composeTitle, message: composeMsg, type: 'SYSTEM', targetRole: composeRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setComposeSuccess(`✅ Sent to ${data.sent} user(s)!`);
        setComposeTitle('');
        setComposeMsg('');
        setTimeout(() => { setComposeSuccess(''); setShowCompose(false); }, 3000);
      }
    } catch (e) { console.error(e); }
    finally { setComposing(false); }
  };

  // unreadCount is managed as a state synchronized from the fetchNotifications call

  return (
    <div style={{ maxWidth: '720px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', margin: 0 }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{ marginLeft: '0.75rem', background: '#ef4444', color: '#fff', fontSize: '0.75rem', fontWeight: 800, padding: '2px 10px', borderRadius: '20px', verticalAlign: 'middle' }}>
                {unreadCount} new
              </span>
            )}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.25rem 0 0 0' }}>Stay updated with messages from your institute.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {unreadCount > 0 && (
            <button onClick={markAllRead} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.5rem 1rem', borderRadius: '10px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
              Mark all read
            </button>
          )}
          {(role === 'ADMIN' || role === 'TEACHER') && (
            <button onClick={() => setShowCompose(!showCompose)} className="btn-primary" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}>
              {showCompose ? 'Cancel' : '📣 Send Notice'}
            </button>
          )}
        </div>
      </div>

      {/* Compose Form (Admin/Teacher) */}
      {showCompose && (
        <div className="glass-card animate-fade-in" style={{ padding: '1.5rem', marginBottom: '1.5rem', border: '1px solid rgba(99,102,241,0.3)' }}>
          <h3 style={{ margin: '0 0 1.25rem 0', fontSize: '1.1rem' }}>📣 Broadcast Notification</h3>
          {composeSuccess && (
            <div style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1rem', fontWeight: 600 }}>
              {composeSuccess}
            </div>
          )}
          <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="input-group">
                <label>Title</label>
                <input type="text" required placeholder="e.g. Fee Reminder" value={composeTitle} onChange={e => setComposeTitle(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Send To</label>
                <select value={composeRole} onChange={e => setComposeRole(e.target.value)}>
                  <option value="ALL">All Students & Teachers</option>
                  <option value="STUDENT">All Students</option>
                  <option value="TEACHER">All Teachers</option>
                </select>
              </div>
            </div>
            <div className="input-group">
              <label>Message</label>
              <textarea
                required
                placeholder="Write your notification message here..."
                value={composeMsg}
                onChange={e => setComposeMsg(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.95rem', resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>
            <button type="submit" disabled={composing} className="btn-primary" style={{ alignSelf: 'flex-end', padding: '0.65rem 2rem' }}>
              {composing ? 'Sending...' : 'Send Notification'}
            </button>
          </form>
        </div>
      )}

      {/* Sent / Received Tabs (Admin/Teacher only) */}
      {(role === 'ADMIN' || role === 'TEACHER') && (
        <div className="dashboard-tab-bar" style={{ alignSelf: 'flex-start', maxWidth: '280px', marginBottom: '1.5rem' }}>
          <button 
            onClick={() => { setLoading(true); setPanelTab('received'); }}
            className={`dashboard-tab-button ${panelTab === 'received' ? 'active' : ''}`}
            style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
          >
            📥 Inbox
          </button>
          <button 
            onClick={() => { setLoading(true); setPanelTab('sent'); }}
            className={`dashboard-tab-button ${panelTab === 'sent' ? 'active' : ''}`}
            style={{ flex: 1, fontSize: '0.8rem', padding: '0.45rem 0.8rem' }}
          >
            📤 Sent Notices
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '1rem', opacity: 0.4 }}>🔔</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem' }}>{panelTab === 'sent' ? 'No sent broadcasts' : 'No notifications yet'}</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{panelTab === 'sent' ? 'Broadcast notices to see them listed here.' : "You'll see messages from admin and teachers here."}</div>
          </div>
        ) : (
          <>
            {notifications.slice(0, visibleCount).map((n, i) => {
              const style = typeColors[n.type] || typeColors.SYSTEM;
              const { cleanMessage, screenshot, email } = parseNotificationMessage(n.message);
            return (
              <div
                key={n.id}
                onClick={() => panelTab === 'received' && !n.isRead && markOneRead(n.id)}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  padding: '0.85rem 1.25rem',
                  borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                  background: (panelTab === 'received' && !n.isRead) ? 'rgba(99,102,241,0.04)' : 'transparent',
                  cursor: (panelTab === 'received' && !n.isRead) ? 'pointer' : 'default',
                  transition: 'background 0.2s',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  background: style.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1rem', flexShrink: 0
                }}>
                  {style.icon}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <span style={{ fontWeight: n.isRead ? 600 : 800, color: n.isRead ? 'var(--text-muted)' : 'var(--text)', fontSize: '0.95rem' }}>
                      {n.title}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{timeAgo(n.createdAt)}</span>
                      {!n.isRead && (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: style.color, flexShrink: 0 }} />
                      )}
                    </div>
                  </div>
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, whiteSpace: 'pre-line' }}>
                    {cleanMessage}
                  </p>
                  
                  {email && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ✉️ Contact Email: <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{email}</span>
                    </div>
                  )}

                  {screenshot && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); setLightboxImg(screenshot); }}
                        style={{
                          background: 'rgba(99,102,241,0.1)',
                          border: '1px solid rgba(99,102,241,0.2)',
                          color: '#818cf8',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        📎 View Attachment
                      </button>
                    </div>
                  )}

                  <span style={{
                    display: 'inline-block', marginTop: '0.5rem', fontSize: '0.65rem',
                    padding: '2px 8px', borderRadius: '6px',
                    background: style.bg, color: style.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>
                    {n.type}
                  </span>
                </div>
              </div>
            );
            })}
            {notifications.length < totalCount && (
              <button 
                onClick={handleLoadMore} 
                style={{ width: '100%', padding: '1rem', background: 'transparent', border: 'none', borderTop: '1px solid var(--border)', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                View More Notifications
              </button>
            )}
          </>
        )}
      </div>

      {/* Lightbox Modal for full-screen screenshot viewing */}
      {lightboxImg && (
        <div 
          onClick={() => setLightboxImg(null)} 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', cursor: 'zoom-out' }}
        >
          <img src={lightboxImg} alt="Enlarged Bug Screenshot" style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.7)' }} />
          <button 
            onClick={() => setLightboxImg(null)} 
            style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
