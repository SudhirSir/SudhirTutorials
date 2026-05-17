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
        
        // Derive unique contacts from messages and MERGE with existing contacts
        setContacts(prev => {
          const usersMap = new Map(prev.filter(u => u?.id).map(u => [u.id, u]));
          (data.messages || []).forEach((m: any) => {
            const other = m.senderId === currentUserId ? m.receiver : m.sender;
            if (other?.id && !usersMap.has(other.id)) {
              usersMap.set(other.id, other);
            }
          });
          return Array.from(usersMap.values());
        });
      }
    } catch (e) { console.error(e); }
  };

  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    try {
      const res = await fetch(`/api/messages/directory?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults(data.users || []);
    } catch (e) { console.error(e); }
  };

  const openNewChat = () => {
    setShowUserSearch(!showUserSearch);
    if (!showUserSearch && searchResults.length === 0) {
      handleSearchUsers(''); // Preload some users
    }
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

    // Optimistic UI update
    const tempMsg = {
      id: Date.now(),
      senderId: currentUserId,
      receiverId: selectedUser.id,
      content: newMsg,
      createdAt: new Date().toISOString()
    };
    setMessages([tempMsg, ...messages]);
    setNewMsg('');

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: selectedUser.id, content: tempMsg.content })
      });
      if (res.ok) fetchMessages();
    } catch (e) { console.error(e); }
  };

  const filteredMessages = selectedUser 
    ? messages.filter(m => (m.senderId === selectedUser.id && m.receiverId === currentUserId) || (m.senderId === currentUserId && m.receiverId === selectedUser.id))
    : [];

  // Sort contacts so ones with newest messages are at the top
  const sortedContacts = [...contacts].sort((a, b) => {
    const aMsg = messages.find(m => m.senderId === a.id || m.receiverId === a.id);
    const bMsg = messages.find(m => m.senderId === b.id || m.receiverId === b.id);
    const aTime = aMsg ? new Date(aMsg.createdAt).getTime() : 0;
    const bTime = bMsg ? new Date(bMsg.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return (
    <div className="glass-card" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', height: '70vh', minHeight: '600px', overflow: 'hidden', padding: 0, border: '1px solid var(--border)' }}>
      {/* Sidebar Contacts */}
      <div style={{ borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--surface)' }}>
        <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '0.5px' }}>Chats</span>
          <button 
            onClick={openNewChat}
            style={{ padding: '6px 12px', borderRadius: '20px', background: 'var(--primary)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)' }}
          >
            {showUserSearch ? 'Cancel' : '📝 New Chat'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {showUserSearch ? (
            <div style={{ padding: '1rem' }}>
              <input 
                type="text" 
                placeholder="Search name or ID..." 
                value={searchQuery}
                onChange={e => handleSearchUsers(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontSize: '0.9rem', marginBottom: '1rem', outline: 'none' }}
              />
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Directory</div>
              {searchResults.filter(u => u && u.id && u.id !== currentUserId).map((u, idx) => (
                <div key={u.id || `search-${idx}`} onClick={() => startChat(u)} style={{ padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{u.name ? u.name[0] : '?'}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>{u.name || 'Anonymous'}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.username || 'N/A'} • {u.role}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            sortedContacts.filter(u => u && u.id).map((u, idx) => {
              const unreadCount = messages.filter(m => m.senderId === u.id && m.receiverId === currentUserId && !m.isRead).length;
              
              const chatMessages = messages.filter(m => (m.senderId === u.id && m.receiverId === currentUserId) || (m.senderId === currentUserId && m.receiverId === u.id));
              const latestMessage = chatMessages.length > 0 ? chatMessages[0] : null;

              return (
                <div 
                  key={u.id || `contact-${idx}`} 
                  onClick={() => { setSelectedUser(u); markAsRead(u.id); }}
                  style={{ 
                    padding: '1rem 1.5rem', 
                    cursor: 'pointer', 
                    background: selectedUser?.id === u.id ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                    borderLeft: selectedUser?.id === u.id ? '4px solid var(--primary)' : '4px solid transparent',
                    transition: 'all 0.2s',
                    borderBottom: '1px solid rgba(255,255,255,0.02)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                  }}
                >
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--surface-light), var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '1.2rem' }}>
                    {u.name ? u.name[0] : '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '1rem', color: selectedUser?.id === u.id ? 'white' : '#d1d5db', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || 'Anonymous'}</span>
                      {latestMessage && (
                        <span style={{ fontSize: '0.7rem', color: unreadCount > 0 ? '#10b981' : 'var(--text-muted)', flexShrink: 0 }}>
                          {new Date(latestMessage.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '80%' }}>
                        {latestMessage ? (latestMessage.senderId === currentUserId ? 'You: ' + latestMessage.content : latestMessage.content) : u.role}
                      </span>
                      {unreadCount > 0 && (
                        <div style={{ background: '#10b981', color: 'white', fontSize: '0.65rem', fontWeight: 900, minWidth: '20px', height: '20px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)' }}>
                          {unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {!showUserSearch && contacts.length === 0 && (
            <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📭</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: '#fff', marginBottom: '0.5rem' }}>Your inbox is empty</div>
              <div style={{ fontSize: '0.85rem' }}>Click "New Chat" to find teachers or students to message.</div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
        {!selectedUser ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.01)' }}>
             <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
               <div style={{ fontSize: '3.5rem', opacity: 0.8 }}>💬</div>
             </div>
             <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>Sudhir Tutorials Web</h2>
             <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '300px', textAlign: 'center' }}>Send and receive messages with your teachers and administration seamlessly.</p>
          </div>
        ) : (
          <>
            <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 10 }}>
               <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>{selectedUser.name ? selectedUser.name[0] : '?'}</div>
               <div>
                 <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff' }}>{selectedUser.name}</div>
                 <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>● {selectedUser.role}</div>
               </div>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column-reverse', gap: '0.5rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.1))' }}>
               {[...filteredMessages].map((m, i, arr) => {
                 const isMe = m.senderId === currentUserId;
                 const prevMsg = arr[i + 1]; // Because it's reversed
                 const isConsecutive = prevMsg && prevMsg.senderId === m.senderId;

                 return (
                   <div key={m.id || i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', marginTop: isConsecutive ? '2px' : '12px' }}>
                      <div style={{ 
                        padding: '0.65rem 1rem', 
                        borderRadius: isMe 
                          ? (isConsecutive ? '16px 4px 4px 16px' : '16px 16px 4px 16px') 
                          : (isConsecutive ? '4px 16px 16px 4px' : '16px 16px 16px 4px'),
                        background: isMe ? '#10b981' : '#27272a',
                        color: isMe ? '#fff' : '#e4e4e7',
                        fontSize: '0.95rem',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                        lineHeight: 1.4,
                        position: 'relative',
                        border: isMe ? 'none' : '1px solid rgba(255,255,255,0.05)'
                      }}>
                        {m.content}
                        <span style={{ fontSize: '0.65rem', color: isMe ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)', float: 'right', marginTop: '10px', marginLeft: '15px', fontWeight: 600 }}>
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                   </div>
                 );
               })}
            </div>

            <form onSubmit={handleSendMessage} style={{ padding: '1.25rem 2rem', display: 'flex', gap: '1rem', background: 'var(--surface)', borderTop: '1px solid var(--border)', alignItems: 'center' }}>
               <input 
                 type="text" 
                 placeholder="Type a message..." 
                 value={newMsg} 
                 onChange={e => setNewMsg(e.target.value)}
                 style={{ flex: 1, padding: '1rem 1.5rem', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'white', fontSize: '1rem', outline: 'none', transition: 'all 0.2s' }}
               />
               <button 
                 type="submit" 
                 disabled={!newMsg.trim()}
                 style={{ width: '50px', height: '50px', borderRadius: '50%', background: newMsg.trim() ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newMsg.trim() ? 'pointer' : 'default', transition: 'all 0.2s' }}
               >
                 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
               </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
