"use client";

import { useState, useEffect } from 'react';
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
};

function timeAgo(date: string) {
  const diff = (Date.now() - new Date(date).getTime()) / 1000;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

export function NotificationsPanel({
  onUnreadChange,
}: {
  onUnreadChange?: (count: number) => void;
}) {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Admin-only broadcast form state
  const [showCompose, setShowCompose] = useState(false);
  const [composeTitle, setComposeTitle] = useState('');
  const [composeMsg, setComposeMsg] = useState('');
  const [composeRole, setComposeRole] = useState('ALL');
  const [composing, setComposing] = useState(false);
  const [composeSuccess, setComposeSuccess] = useState('');

  const role = (session?.user as any)?.role as string;

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        const unread = (data.notifications || []).filter((n: Notification) => !n.isRead).length;
        onUnreadChange?.(unread);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const unreadCount = notifications.filter(n => !n.isRead).length;

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

      {/* Notifications List */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>🔔</div>
            <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: '0.5rem' }}>No notifications yet</div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>You'll see messages from admin and teachers here.</div>
          </div>
        ) : (
          notifications.map((n, i) => {
            const style = typeColors[n.type] || typeColors.SYSTEM;
            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && markOneRead(n.id)}
                style={{
                  display: 'flex',
                  gap: '1rem',
                  padding: '1.25rem 1.5rem',
                  borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                  background: n.isRead ? 'transparent' : 'rgba(99,102,241,0.04)',
                  cursor: n.isRead ? 'default' : 'pointer',
                  transition: 'background 0.2s',
                }}
              >
                {/* Icon */}
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  background: style.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0
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
                  <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {n.message}
                  </p>
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
          })
        )}
      </div>
    </div>
  );
}
