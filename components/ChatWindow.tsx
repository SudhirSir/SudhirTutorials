"use client";

import { useState, useEffect, useRef } from 'react';

export function ChatWindow({ currentUserId }: { currentUserId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedUser]);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages');
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        
        // Derive unique contacts from messages
        const users: any[] = [];
        const userIds = new Set();
        data.messages.forEach((m: any) => {
          const other = m.senderId === currentUserId ? m.receiver : m.sender;
          if (other && !userIds.has(other.id)) {
            userIds.add(other.id);
            users.push(other);
          }
        });
        setContacts(users);
      }
    } catch (e) { console.error(e); }
  };

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/admin/directory?q=${q}`);
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (e) { console.error(e); }
  };

  const markAsRead = async (senderId: string) => {
    try {
      await fetch('/api/messages/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senderId })
      });
      fetchMessages();
    } catch (e) {}
  };

  const startChat = (user: any) => {
    setSelectedUser(user);
    setShowUserSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    if (!contacts.find(c => c.id === user.id)) {
      setContacts([user, ...contacts]);
    }
    markAsRead(user.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedUser) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: selectedUser.id, content: newMsg })
      });
      if (res.ok) {
        setNewMsg('');
        fetchMessages();
      }
    } catch (e) { console.error(e); }
  };

  const filteredMessages = selectedUser 
    ? messages.filter(m => (m.senderId === selectedUser.id && m.receiverId === currentUserId) || (m.senderId === currentUserId && m.receiverId === selectedUser.id))
    : [];

  return (
    <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: '600px', overflow: 'hidden', padding: 0, border: '1px solid var(--border)' }}>
      {/* Sidebar Contacts */}
      <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.1)' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>MESSAGES</span>
          <button 
            onClick={() => setShowUserSearch(!showUserSearch)}
            style={{ padding: '4px 10px', borderRadius: '8px', background: 'var(--primary)', border: 'none', color: 'white', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
          >
            {showUserSearch ? 'Back' : '+ New'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {showUserSearch ? (
            <div style={{ padding: '1rem' }}>
              <input 
                type="text" 
                placeholder="Search name/ID..." 
                value={searchQuery}
                onChange={e => handleSearchUsers(e.target.value)}
                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontSize: '0.85rem', marginBottom: '1rem' }}
              />
              {searchResults.filter(u => u && u.id).map((u, idx) => (
                <div key={u.id || `search-${idx}`} onClick={() => startChat(u)} style={{ padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{u.name || 'Anonymous'}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{u.username || 'N/A'} • {u.role || 'User'}</div>
                </div>
              ))}
            </div>
          ) : (
            contacts.filter(u => u && u.id).map((u, idx) => {
              const unreadCount = messages.filter(m => m.senderId === u.id && m.receiverId === currentUserId && !m.isRead).length;
              return (
                <div 
                  key={u.id || `contact-${idx}`} 
                  onClick={() => { setSelectedUser(u); markAsRead(u.id); }}
                  style={{ 
                    padding: '1.25rem 1.5rem', 
                    cursor: 'pointer', 
                    background: selectedUser?.id === u.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    borderLeft: selectedUser?.id === u.id ? '4px solid var(--primary)' : '4px solid transparent',
                    transition: 'all 0.2s',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: selectedUser?.id === u.id ? 'white' : '#d1d5db' }}>{u.name || 'Anonymous'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.role || 'User'}</div>
                  </div>
                  {unreadCount > 0 && (
                    <div style={{ background: '#ef4444', color: 'white', fontSize: '0.65rem', fontWeight: 900, minWidth: '18px', height: '18px', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', boxShadow: '0 0 10px rgba(239, 68, 68, 0.5)' }}>
                      {unreadCount}
                    </div>
                  )}
                </div>
              );
            })
          )}
          {!showUserSearch && contacts.length === 0 && (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              No messages yet.<br/>Click <strong>+ New</strong> to start.
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'rgba(0,0,0,0.3)' }}>
        {!selectedUser ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '1rem' }}>
             <div style={{ fontSize: '4rem', opacity: 0.3 }}>💬</div>
             <p style={{ fontWeight: 500 }}>Select a contact to start messaging</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '1rem', backdropFilter: 'blur(10px)' }}>
               <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: 'white' }}>{selectedUser.name.charAt(0)}</div>
               <div>
                 <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{selectedUser.name}</div>
                 <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{selectedUser.role} • Online</div>
               </div>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column-reverse', gap: '1.25rem' }}>
               {[...filteredMessages].map((m, i) => {
                 const isMe = m.senderId === currentUserId;
                 return (
                   <div key={i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                      <div style={{ 
                        padding: '0.85rem 1.25rem', 
                        borderRadius: isMe ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                        background: isMe ? 'var(--primary)' : 'var(--surface-light)',
                        color: 'white',
                        fontSize: '0.95rem',
                        boxShadow: isMe ? '0 4px 15px rgba(99, 102, 241, 0.2)' : 'none',
                        lineHeight: 1.5
                      }}>
                        {m.content}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: isMe ? 'right' : 'left', fontWeight: 600 }}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                   </div>
                 );
               })}
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: '1.5rem 2rem', display: 'flex', gap: '1rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid var(--border)' }}>
               <input 
                 type="text" 
                 placeholder="Write your message..." 
                 value={newMsg} 
                 onChange={e => setNewMsg(e.target.value)}
                 style={{ flex: 1, padding: '1rem 1.5rem', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontSize: '1rem', outline: 'none' }}
               />
               <button type="submit" className="btn-primary" style={{ padding: '1rem 2rem', borderRadius: '16px' }}>
                 Send
               </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
