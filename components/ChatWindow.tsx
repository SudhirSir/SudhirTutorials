"use client";

import { useState, useEffect, useRef } from 'react';

export function ChatWindow({ currentUserId, onMessagesRead }: { currentUserId: string, onMessagesRead?: () => void }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('blocked_users');
    if (saved) {
      try {
        setBlockedUsers(JSON.parse(saved));
      } catch (e) {}
    }
  }, []);

  const handleToggleBlock = (userId: string) => {
    let updated;
    if (blockedUsers.includes(userId)) {
      updated = blockedUsers.filter(id => id !== userId);
      alert('🔓 User has been successfully unblocked.');
    } else {
      updated = [...blockedUsers, userId];
      alert('🚫 User has been blocked. You will no longer receive or send messages with this user.');
    }
    setBlockedUsers(updated);
    localStorage.setItem('blocked_users', JSON.stringify(updated));
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      const res = await fetch(`/api/messages?messageId=${messageId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.id !== messageId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteChat = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this entire chat? This action cannot be undone.')) return;
    try {
      const res = await fetch(`/api/messages?chatUserId=${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedUser(null);
        setMessages(prev => prev.filter(m => m.senderId !== userId && m.receiverId !== userId));
        setContacts(prev => prev.filter(c => c.id !== userId));
      }
    } catch (e) {
      console.error(e);
    }
  };

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
      if (onMessagesRead) onMessagesRead();
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
    <div className={`chat-window-container ${selectedUser ? 'has-selected-user' : ''}`}>
      <style>{`
        .chat-window-container {
          display: grid;
          grid-template-columns: 320px 1fr;
          height: 70vh;
          min-height: 600px;
          overflow: hidden;
          padding: 0;
          border: 1px solid var(--border);
          border-radius: var(--radius);
          background: var(--glass-bg);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          box-shadow: var(--shadow);
        }

        .chat-sidebar {
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          background: var(--surface);
        }

        .chat-main-area {
          display: flex;
          flex-direction: column;
          background: var(--background);
        }

        .chat-back-btn {
          display: none;
        }

        @media (max-width: 768px) {
          .chat-window-container {
            grid-template-columns: 1fr;
            height: 80vh;
            min-height: 500px;
          }

          .chat-sidebar {
            display: flex;
          }

          .chat-window-container.has-selected-user .chat-sidebar {
            display: none !important;
          }

          .chat-main-area {
            display: none;
          }

          .chat-window-container.has-selected-user .chat-main-area {
            display: flex !important;
          }

          .chat-back-btn {
            display: flex !important;
          }
        }
      `}</style>
      {/* Sidebar Contacts */}
      <div className="chat-sidebar">
        <div style={{ padding: '1.25rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)', letterSpacing: '0.5px' }}>Chats</span>
          <button 
            onClick={openNewChat}
            style={{ padding: '6px 12px', borderRadius: '20px', background: 'var(--primary)', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)' }}
          >
            {showUserSearch ? 'Cancel' : '📝 New Chat'}
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {showUserSearch ? (
            <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', gap: '0.75rem' }}>
              <input 
                type="text" 
                placeholder="Search name or ID..." 
                value={searchQuery}
                onChange={e => handleSearchUsers(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', flexShrink: 0 }}
              />
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', flexShrink: 0, marginTop: '0.25rem' }}>Directory</div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', paddingRight: '4px' }}>
                {searchResults.filter(u => u && u.id && u.id !== currentUserId).length > 0 ? (
                  searchResults.filter(u => u && u.id && u.id !== currentUserId).map((u, idx) => (
                    <div key={u.id || `search-${idx}`} onClick={() => startChat(u)} style={{ padding: '0.75rem', borderRadius: '12px', cursor: 'pointer', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--card-bg-alt)'}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', overflow: 'hidden', border: '1px solid var(--primary)', flexShrink: 0 }}>
                        {u.photoUrl ? (
                          <img src={u.photoUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          u.name ? u.name[0] : '?'
                        )}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || 'Anonymous'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.username || 'N/A'} • {u.role}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    No users found matching query.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {sortedContacts.filter(u => u && u.id).map((u, idx) => {
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
                      borderBottom: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                  >
                    <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--surface-light), var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: '1.2rem', overflow: 'hidden', border: '2px solid var(--primary)' }}>
                      {u.photoUrl ? (
                        <img src={u.photoUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        u.name ? u.name[0] : '?'
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: selectedUser?.id === u.id ? 'var(--primary)' : 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name || 'Anonymous'}</span>
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
              })}
              {!showUserSearch && contacts.length === 0 && (
                <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }}>📭</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '0.5rem' }}>Your inbox is empty</div>
                  <div style={{ fontSize: '0.85rem' }}>Click "New Chat" to find teachers or students to message.</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-main-area">
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
            <div style={{ padding: '1rem 2rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', zIndex: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button 
                  onClick={() => setSelectedUser(null)} 
                  className="chat-back-btn"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text)',
                    cursor: 'pointer',
                    padding: '8px 12px 8px 0',
                    alignItems: 'center',
                    fontWeight: 'bold',
                    fontSize: '1.1rem',
                  }}
                >
                  ← Back
                </button>
                <div 
                  onClick={() => setShowProfileModal(true)}
                  title="View Profile Details & Options"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '4px 8px', borderRadius: '12px', transition: 'background 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--card-bg-alt)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 800, color: 'white', overflow: 'hidden', border: '2px solid var(--primary)', flexShrink: 0 }}>
                    {selectedUser.photoUrl ? (
                      <img src={selectedUser.photoUrl} alt={selectedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      selectedUser.name ? selectedUser.name[0] : '?'
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '6px' }}>{selectedUser.name} <span style={{ fontSize: '0.8rem', opacity: 0.6 }}>ℹ️</span></div>
                    <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>● {selectedUser.role}</div>
                  </div>
                </div>
              </div>
               <button
                 onClick={() => handleDeleteChat(selectedUser.id)}
                 title="Delete Chat Thread"
                 style={{
                   background: 'transparent',
                   color: '#f87171',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '0.5rem',
                   padding: '0.5rem 0.75rem',
                   borderRadius: '10px',
                   fontSize: '0.85rem',
                   fontWeight: 700,
                   transition: 'all 0.2s',
                   border: '1px solid rgba(239, 68, 68, 0.2)'
                 }}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                   e.currentTarget.style.color = '#ef4444';
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.background = 'transparent';
                   e.currentTarget.style.color = '#f87171';
                 }}
               >
                 🗑️ Delete Chat
               </button>
            </div>

            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '2rem', display: 'flex', flexDirection: 'column-reverse', gap: '0.5rem', background: 'linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.1))' }}>
               {[...filteredMessages].map((m, i, arr) => {
                 const isMe = m.senderId === currentUserId;
                 const prevMsg = arr[i + 1]; // Because it's reversed
                 const isConsecutive = prevMsg && prevMsg.senderId === m.senderId;

                 return (
                   <div 
                     key={m.id || i}
                     onMouseEnter={() => setHoveredMessageId(m.id)}
                     onMouseLeave={() => setHoveredMessageId(null)}
                     style={{ 
                       alignSelf: isMe ? 'flex-end' : 'flex-start', 
                       maxWidth: '75%', 
                       marginTop: isConsecutive ? '2px' : '12px',
                       display: 'flex',
                       alignItems: 'center',
                       gap: '0.5rem',
                       flexDirection: isMe ? 'row' : 'row-reverse'
                     }}
                   >
                     {hoveredMessageId === m.id && (
                       <button
                         onClick={() => handleDeleteMessage(m.id)}
                         title="Delete Message"
                         style={{
                           background: 'transparent',
                           border: 'none',
                           color: '#f87171',
                           cursor: 'pointer',
                           fontSize: '0.8rem',
                           padding: '4px',
                           display: 'flex',
                           alignItems: 'center',
                           justifyContent: 'center',
                           opacity: 0.6,
                           transition: 'all 0.2s'
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                         onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
                       >
                         🗑️
                       </button>
                     )}
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
                  placeholder={blockedUsers.includes(selectedUser.id) ? "🚫 You have blocked this user. Unblock to message." : "Type a message..."} 
                  value={newMsg} 
                  disabled={blockedUsers.includes(selectedUser.id)}
                  onChange={e => setNewMsg(e.target.value)}
                  style={{ 
                    flex: 1, 
                    padding: '1rem 1.5rem', 
                    borderRadius: '24px', 
                    background: blockedUsers.includes(selectedUser.id) ? 'rgba(239, 68, 68, 0.05)' : 'var(--input-bg)', 
                    border: blockedUsers.includes(selectedUser.id) ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid var(--border)', 
                    color: blockedUsers.includes(selectedUser.id) ? 'var(--text-muted)' : 'var(--text)', 
                    fontSize: '1rem', 
                    outline: 'none', 
                    transition: 'all 0.2s',
                    cursor: blockedUsers.includes(selectedUser.id) ? 'not-allowed' : 'text'
                  }}
                />
                <button 
                  type="submit" 
                  disabled={!newMsg.trim() || blockedUsers.includes(selectedUser.id)}
                  style={{ width: '50px', height: '50px', borderRadius: '50%', background: newMsg.trim() && !blockedUsers.includes(selectedUser.id) ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: 'white', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: newMsg.trim() && !blockedUsers.includes(selectedUser.id) ? 'pointer' : 'default', transition: 'all 0.2s' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
             </form>
          </>
        )}
      </div>

      {showProfileModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: '400px', padding: '2.5rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', position: 'relative', textAlign: 'center', boxShadow: 'var(--shadow-lg)', margin: 'auto' }}>
            <button 
              onClick={() => setShowProfileModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', width: '36px', height: '36px', borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              ×
            </button>
            <div style={{ width: '90px', height: '90px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: 'white', overflow: 'hidden', border: '3px solid var(--primary)', margin: '0 auto 1.5rem' }}>
              {selectedUser.photoUrl ? (
                <img src={selectedUser.photoUrl} alt={selectedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                selectedUser.name ? selectedUser.name[0] : '?'
              )}
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 0.5rem 0' }}>{selectedUser.name}</h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1.5rem' }}>
              ● {selectedUser.role}
            </div>

            <div style={{ background: 'var(--card-bg-alt)', borderRadius: '12px', padding: '1rem 1.25rem', textAlign: 'left', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Username</span>
                <span style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: 600 }}>@{selectedUser.username || 'N/A'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email Address</span>
                <span style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: 600, wordBreak: 'break-all' }}>{selectedUser.email || 'Not disclosed'}</span>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
                <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span> Active {selectedUser.role}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button 
                onClick={() => handleToggleBlock(selectedUser.id)}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  background: 'transparent',
                  border: blockedUsers.includes(selectedUser.id) ? '1px solid #10b981' : '1px solid #f87171',
                  color: blockedUsers.includes(selectedUser.id) ? '#10b981' : '#f87171',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                {blockedUsers.includes(selectedUser.id) ? '🔓 Unblock User' : '🚫 Block User'}
              </button>
              <button 
                onClick={() => {
                  if (confirm('Are you sure you want to delete this entire chat thread? This action cannot be undone.')) {
                    handleDeleteChat(selectedUser.id);
                    setShowProfileModal(false);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  background: '#ef4444',
                  border: 'none',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                🗑️ Delete Chat Thread
              </button>
              <button 
                onClick={() => {
                  alert('Report submitted. Our administrative team will review this user shortly.');
                }}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: '12px',
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                ⚠️ Report User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
