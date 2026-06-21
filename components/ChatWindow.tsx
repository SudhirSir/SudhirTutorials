"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─── Image compressor: max 600px, 70% JPEG ───────────────────────────────────
function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 600;
        let w = img.width, h = img.height;
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
        else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChatUser {
  id: string;
  name: string;
  username?: string;
  email?: string;
  role: string;
  photoUrl?: string | null;
}

interface ChatMessage {
  id: string;
  senderId: string;
  receiverId?: string;
  groupId?: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  sender?: ChatUser;
  receiver?: ChatUser;
  group?: {
    id: string;
    name: string;
    photoUrl?: string | null;
  } | null;
}

interface ChatWindowProps {
  currentUserId: string;
  onMessagesRead?: () => void;
  initialSelectedUserId?: string | null;
}

// ─── Double-tick read-receipt component ──────────────────────────────────────
const Ticks = React.memo(({ isRead }: { isRead: boolean }) => (
  <span style={{
    display: 'inline-flex', marginLeft: 6, verticalAlign: 'middle',
    color: isRead ? '#34b7f1' : 'rgba(255,255,255,0.4)', flexShrink: 0,
  }}>
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'block' }}>
      <path d="M2 12l5 5L20 4" />
      <path d="M8 12l5 5L22 4" />
    </svg>
  </span>
));
Ticks.displayName = 'Ticks';

// ─── Date separator label ─────────────────────────────────────────────────────
function dateSeparatorText(dateStr: string): string {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function ChatWindow({ currentUserId, onMessagesRead, initialSelectedUserId }: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null);
  const [contacts, setContacts] = useState<ChatUser[]>([]);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [preloadedUsers, setPreloadedUsers] = useState<ChatUser[]>([]);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sseConnected, setSseConnected] = useState(false);

  // New States for loading, group, and message actions
  const [initialLoading, setInitialLoading] = useState(true);
  const [activeMenuMessageId, setActiveMenuMessageId] = useState<string | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<string[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);
  const [forwardingContent, setForwardingContent] = useState<string | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');

  // Group Settings & Management States
  const [groupMembers, setGroupMembers] = useState<any[]>([]);
  const [groupCreatorId, setGroupCreatorId] = useState<string>('');
  const [isAdminOfGroup, setIsAdminOfGroup] = useState<boolean>(false);
  const [loadingGroupDetails, setLoadingGroupDetails] = useState<boolean>(false);
  const [showAddMembersPanel, setShowAddMembersPanel] = useState<boolean>(false);
  const [selectedAddUsers, setSelectedAddUsers] = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectedUserRef = useRef<ChatUser | null>(null);
  const sseRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false);

  const longPressTimerRef = useRef<any>(null);

  const startLongPress = (messageId: string) => {
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setActiveMenuMessageId(messageId);
    }, 2000); // 2 seconds
  };

  const endLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Keep selectedUserRef in sync
  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  // Clear selection when switching chats
  useEffect(() => {
    setSelectedMessageIds([]);
    setMultiSelectMode(false);
  }, [selectedUser]);

  // ── Load blocked list from localStorage ────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('blocked_users');
      if (saved) setBlockedUsers(JSON.parse(saved));
    } catch {}
  }, []);

  // ── Hardware back-button support (Capacitor/Android) ──────────────────────
  useEffect(() => {
    const handleBack = (e: Event) => {
      if (showProfileModal) { e.preventDefault(); setShowProfileModal(false); }
      else if (showUserSearch) { e.preventDefault(); setShowUserSearch(false); }
      else if (selectedUser) { e.preventDefault(); setSelectedUser(null); }
    };
    window.addEventListener('backbuttonpress', handleBack);
    return () => window.removeEventListener('backbuttonpress', handleBack);
  }, [showProfileModal, showUserSearch, selectedUser]);

  // ── Core: fetch all messages (debounced to prevent parallel calls) ─────────
  const fetchMessages = useCallback(async () => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      const res = await fetch('/api/messages', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const msgs: ChatMessage[] = data.messages || [];

      // Merge and preserve temporary messages
      setMessages(prev => {
        const temps = prev.filter(m => m.id.startsWith('temp-'));
        const activeTemps = temps.filter(t => !msgs.some(m => m.content === t.content && (t.groupId ? m.groupId === t.groupId : m.receiverId === t.receiverId)));
        return [...activeTemps, ...msgs];
      });

      // Derive contacts (including groups) from messages, merging with existing
      setContacts(prev => {
        const map = new Map<string, ChatUser>(prev.map(u => [u.id, u]));
        msgs.forEach(m => {
          if (m.groupId && m.group) {
            const gid = m.groupId;
            if (!map.has(gid)) {
              map.set(gid, {
                id: gid,
                name: m.group.name,
                photoUrl: m.group.photoUrl,
                role: 'GROUP',
              });
            }
          } else {
            const other = m.senderId === currentUserId ? m.receiver : m.sender;
            if (other?.id && !map.has(other.id)) map.set(other.id, other);
          }
        });
        return Array.from(map.values());
      });

      // Auto mark as read for current open chat
      const su = selectedUserRef.current;
      if (su) {
        const isGrp = su.role === 'GROUP';
        const hasUnread = isGrp
          ? msgs.some(m => m.groupId === su.id && m.senderId !== currentUserId && !m.isRead)
          : msgs.some(m => m.senderId === su.id && m.receiverId === currentUserId && !m.isRead);
        if (hasUnread) markAsRead(su.id, false);
      }
      setInitialLoading(false);
    } catch (e) {
      console.warn('[Chat] fetchMessages error:', e);
    } finally {
      isFetchingRef.current = false;
    }
  }, [currentUserId]);

  // ── Mark messages as read (silent - no re-fetch) ──────────────────────────
  const markAsRead = useCallback(async (id: string, updateState = true) => {
    const isGroup = contacts.some(c => c.id === id && c.role === 'GROUP');
    try {
      await fetch('/api/messages/read', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isGroup ? { groupId: id } : { senderId: id }),
      });
      if (updateState) {
        setMessages(prev => prev.map(m => {
          if (isGroup) {
            return m.groupId === id ? { ...m, isRead: true } : m;
          }
          return m.senderId === id && m.receiverId === currentUserId ? { ...m, isRead: true } : m;
        }));
      }
      onMessagesRead?.();
    } catch {}
  }, [currentUserId, onMessagesRead, contacts]);

  // ── SSE real-time connection ───────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
    if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }

    const es = new EventSource('/api/messages/subscribe');
    sseRef.current = es;

    es.onopen = () => {
      setSseConnected(true);
      fetchMessages(); // Sync state on (re)connect
    };

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected' || data.type === 'ping') return;

        if (data.type === 'create') {
          const newMsg: ChatMessage = data.message;
          setMessages(prev => {
            const deduped = prev.filter(m =>
              !(m.id.startsWith('temp-') && m.content === newMsg.content && 
                (newMsg.groupId ? m.groupId === newMsg.groupId : m.receiverId === newMsg.receiverId)
              )
              && m.id !== newMsg.id
            );
            return [newMsg, ...deduped];
          });
          // Add to contacts if new
          if (newMsg.groupId && newMsg.group) {
            const gid = newMsg.groupId;
            setContacts(prev => prev.some(c => c.id === gid) ? prev : [{
              id: gid,
              name: newMsg.group!.name,
              photoUrl: newMsg.group!.photoUrl,
              role: 'GROUP',
            }, ...prev]);
          } else {
            const other = newMsg.senderId === currentUserId ? newMsg.receiver : newMsg.sender;
            if (other?.id) {
              setContacts(prev => prev.some(c => c.id === other.id) ? prev : [other, ...prev]);
            }
          }
          // Auto-read if chat is open
          const su = selectedUserRef.current;
          if (su && (su.role === 'GROUP' ? newMsg.groupId === su.id : newMsg.senderId === su.id) && newMsg.senderId !== currentUserId) {
            markAsRead(su.id, true);
          }
        }
        else if (data.type === 'read') {
          setMessages(prev => prev.map(m => {
            if (data.groupId) {
              return m.groupId === data.groupId ? { ...m, isRead: true } : m;
            }
            return m.senderId === data.senderId && m.receiverId === data.receiverId
              ? { ...m, isRead: true } : m;
          }));
          onMessagesRead?.();
        }
        else if (data.type === 'delete') {
          if (data.messageId) {
            setMessages(prev => prev.filter(m => m.id !== data.messageId));
          }
        }
        else if (data.type === 'deleteChat') {
          if (data.deletedByUserId === currentUserId || data.chatGroupId) {
            const id = data.chatGroupId || data.chatUserId;
            setMessages(prev => prev.filter(m => m.groupId !== id && m.senderId !== id && m.receiverId !== id));
            setContacts(prev => prev.filter(c => c.id !== id));
            if (selectedUserRef.current?.id === id) setSelectedUser(null);
          }
        }
        else if (data.type === 'update') {
          setMessages(prev => prev.map(m => m.id === data.message.id ? data.message : m));
        }
      } catch (e) {
        console.warn('[SSE] parse error:', e);
      }
    };

    es.onerror = () => {
      setSseConnected(false);
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
      // Reconnect after 5s (not 30s like before)
      reconnectTimerRef.current = setTimeout(connectSSE, 5000);
    };
  }, [currentUserId, fetchMessages, markAsRead, onMessagesRead]);

  // ── Polling helpers (defined first so SSE effect can reference them) ────────
  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    const delay = sseConnected ? 15000 : 4000;
    pollTimerRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') fetchMessages();
    }, delay);
  }, [sseConnected, fetchMessages, stopPolling]);

  // ── SSE lifecycle: connect on mount, disconnect on unmount / tab hidden ────
  useEffect(() => {
    if (document.visibilityState === 'visible') {
      connectSSE();
    } else {
      fetchMessages();
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        connectSSE();
        startPolling();
      } else {
        sseRef.current?.close();
        sseRef.current = null;
        setSseConnected(false);
        stopPolling();
      }
    };

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      sseRef.current?.close();
      sseRef.current = null;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      stopPolling();
    };
  }, [connectSSE, fetchMessages, startPolling, stopPolling]);

  // Start/adjust polling when SSE status changes or selected user changes
  useEffect(() => {
    startPolling();
    return stopPolling;
  }, [startPolling, stopPolling, selectedUser?.id]);

  // ── Auto-scroll to bottom unconditionally when opening a chat ──────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !selectedUser) return;
    // Use a small timeout to ensure DOM has updated with the selected user's messages
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedUser?.id]);

  // ── Auto-scroll to bottom when messages change ────────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Only auto-scroll if already near the bottom (within 120px)
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (isNearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ── Handle initialSelectedUserId prop ─────────────────────────────────────
  useEffect(() => {
    if (!initialSelectedUserId) return;
    const existing = contacts.find(c => c.id === initialSelectedUserId);
    if (existing) { setSelectedUser(existing); markAsRead(existing.id); return; }

    (async () => {
      try {
        const res = await fetch(`/api/user/profile?userId=${initialSelectedUserId}`);
        if (res.ok) {
          const u = await res.json();
          setSelectedUser(u);
          setContacts(prev => prev.some(c => c.id === u.id) ? prev : [u, ...prev]);
          markAsRead(u.id);
        }
      } catch {}
    })();
  }, [initialSelectedUserId]);

  // Click outside menu listener to close three-dots dropdowns
  useEffect(() => {
    const handleOutsideClick = () => {
      setActiveMenuMessageId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  // ── Preload user directory when New Chat opens ────────────────────────────
  const openNewChat = useCallback(async () => {
    setShowUserSearch(v => !v);
    if (showUserSearch) return;
    if (preloadedUsers.length > 0) { setSearchResults(preloadedUsers); setSearchQuery(''); return; }
    try {
      const res = await fetch('/api/messages/directory?q=');
      if (res.ok) {
        const data = await res.json();
        setPreloadedUsers(data.users || []);
        setSearchResults(data.users || []);
      }
    } catch {}
    setSearchQuery('');
  }, [showUserSearch, preloadedUsers]);

  // ── Debounced search ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!showUserSearch) return;
    if (!searchQuery.trim()) { setSearchResults(preloadedUsers); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/messages/directory?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) setSearchResults((await res.json()).users || []);
      } catch {}
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery, showUserSearch, preloadedUsers]);

  // ── Start chat with a user ────────────────────────────────────────────────
  const startChat = useCallback((user: ChatUser) => {
    setSelectedUser(user);
    setShowUserSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setContacts(prev => prev.some(c => c.id === user.id) ? prev : [user, ...prev]);
    markAsRead(user.id);
  }, [markAsRead]);

  // ── Send message with instant optimistic update ────────────────────────────
  const handleSendMessage = useCallback(async (e?: React.FormEvent, customContent?: string) => {
    if (e) e.preventDefault();
    const content = customContent ?? newMsg;
    if (!content.trim() || !selectedUser || isSending) return;

    setIsSending(true);
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const isGrp = selectedUser.role === 'GROUP';
    const tempMsg: ChatMessage = {
      id: tempId,
      senderId: currentUserId,
      receiverId: isGrp ? '' : selectedUser.id,
      groupId: isGrp ? selectedUser.id : undefined,
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
    } as any;

    // Instant optimistic render
    setMessages(prev => [tempMsg, ...prev]);
    if (!customContent) setNewMsg('');

    try {
      const payload = isGrp ? { groupId: selectedUser.id, content } : { receiverId: selectedUser.id, content };
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const realMsg: ChatMessage = data.message;
        // Replace temp with real message (SSE may have already done this — dedup)
        setMessages(prev => {
          if (prev.some(m => m.id === realMsg.id)) {
            // SSE already injected real msg; just remove the temp
            return prev.filter(m => m.id !== tempId);
          }
          return prev.map(m => m.id === tempId ? realMsg : m);
        });
      } else {
        const d = await res.json().catch(() => ({}));
        alert(`⚠️ Could not send: ${d.error || 'Unknown error'}`);
        setMessages(prev => prev.filter(m => m.id !== tempId));
        if (!customContent) setNewMsg(content);
      }
    } catch {
      alert('⚠️ Network error. Please check your connection.');
      setMessages(prev => prev.filter(m => m.id !== tempId));
      if (!customContent) setNewMsg(content);
    } finally {
      setIsSending(false);
    }
  }, [newMsg, selectedUser, currentUserId, isSending]);

  // ── Open group modal & load users ──────────────────────────────────────────
  const openNewGroupModal = useCallback(async () => {
    setShowGroupModal(true);
    if (preloadedUsers.length > 0) return;
    try {
      const res = await fetch('/api/messages/directory?q=');
      if (res.ok) {
        const data = await res.json();
        setPreloadedUsers(data.users || []);
      }
    } catch {}
  }, [preloadedUsers]);

  // ── Create Group Chat handler ──────────────────────────────────────────────
  const handleCreateGroup = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || selectedGroupMembers.length === 0) {
      alert('Please enter group name and select members.');
      return;
    }
    try {
      const res = await fetch('/api/messages/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName.trim(), memberIds: selectedGroupMembers }),
      });
      if (res.ok) {
        const data = await res.json();
        const newGrp: ChatUser = {
          id: data.group.id,
          name: data.group.name,
          role: 'GROUP',
        };
        setContacts(prev => [newGrp, ...prev]);
        setSelectedUser(newGrp);
        setGroupName('');
        setSelectedGroupMembers([]);
        setShowGroupModal(false);
      } else {
        const d = await res.json().catch(() => ({}));
        alert(`Failed: ${d.error || 'Unknown error'}`);
      }
    } catch { alert('Network error.'); }
  }, [groupName, selectedGroupMembers]);

  // Group Details and Member Actions
  const fetchGroupDetails = useCallback(async (groupId: string) => {
    setLoadingGroupDetails(true);
    try {
      const res = await fetch(`/api/messages/groups/settings?groupId=${groupId}`);
      const data = await res.json();
      if (res.ok && data.group) {
        setGroupMembers(data.group.members || []);
        setGroupCreatorId(data.group.createdById || '');
        const me = data.group.members.find((m: any) => m.userId === currentUserId);
        setIsAdminOfGroup(me?.isAdmin || data.group.createdById === currentUserId);
      }
    } catch (err) {
      console.error('Failed to fetch group details:', err);
    } finally {
      setLoadingGroupDetails(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (showProfileModal && selectedUser && selectedUser.role === 'GROUP') {
      fetchGroupDetails(selectedUser.id);
      setShowAddMembersPanel(false);
      setSelectedAddUsers([]);
    }
  }, [showProfileModal, selectedUser, fetchGroupDetails]);

  const openAddMembersPanel = useCallback(async () => {
    setShowAddMembersPanel(true);
    setSelectedAddUsers([]);
    if (preloadedUsers.length === 0) {
      try {
        const res = await fetch('/api/messages/directory?q=');
        if (res.ok) {
          const data = await res.json();
          setPreloadedUsers(data.users || []);
        }
      } catch {}
    }
  }, [preloadedUsers]);

  const handleSetGroupAdmin = async (targetUserId: string, isAdmin: boolean) => {
    if (!selectedUser) return;
    try {
      const res = await fetch('/api/messages/groups/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedUser.id, action: 'SET_ADMIN', targetUserId, isAdmin })
      });
      if (res.ok) {
        fetchGroupDetails(selectedUser.id);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update admin status.');
      }
    } catch { alert('Network error.'); }
  };

  const handleRemoveGroupMember = async (targetUserId: string) => {
    if (!selectedUser) return;
    if (!confirm('Are you sure you want to remove this member from the group?')) return;
    try {
      const res = await fetch('/api/messages/groups/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedUser.id, action: 'REMOVE_MEMBER', targetUserId })
      });
      if (res.ok) {
        fetchGroupDetails(selectedUser.id);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to remove member.');
      }
    } catch { alert('Network error.'); }
  };

  const handleLeaveGroup = async () => {
    if (!selectedUser) return;
    if (!confirm('Are you sure you want to leave this group?')) return;
    try {
      const res = await fetch('/api/messages/groups/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedUser.id, action: 'LEAVE_GROUP' })
      });
      if (res.ok) {
        setSelectedUser(null);
        setContacts(prev => prev.filter(c => c.id !== selectedUser.id));
        setShowProfileModal(false);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to leave group.');
      }
    } catch { alert('Network error.'); }
  };

  const handleAddGroupMembers = async () => {
    if (!selectedUser || selectedAddUsers.length === 0) return;
    try {
      const res = await fetch('/api/messages/groups/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: selectedUser.id, action: 'ADD_MEMBERS', userIds: selectedAddUsers })
      });
      if (res.ok) {
        setShowAddMembersPanel(false);
        setSelectedAddUsers([]);
        fetchGroupDetails(selectedUser.id);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to add members.');
      }
    } catch { alert('Network error.'); }
  };

  const handleDeleteGroup = async () => {
    if (!selectedUser) return;
    if (!confirm('Are you sure you want to delete this group? All messages will be permanently deleted for all members.')) return;
    try {
      const res = await fetch(`/api/messages/groups/settings?groupId=${selectedUser.id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setSelectedUser(null);
        setContacts(prev => prev.filter(c => c.id !== selectedUser.id));
        setShowProfileModal(false);
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to delete group.');
      }
    } catch { alert('Network error.'); }
  };

  // ── Attach file / image ───────────────────────────────────────────────────
  const handleAttachFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedUser) return;
    if (file.size > 3 * 1024 * 1024) {
      alert('⚠️ Max file size is 3 MB.');
      return;
    }
    setIsUploading(true);
    setUploadProgress(`Processing ${file.name.slice(0, 18)}...`);
    try {
      const isImg = file.type.startsWith('image/');
      const mediaUrl = isImg
        ? await compressImage(file)
        : await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onload = () => res(r.result as string);
            r.onerror = rej;
            r.readAsDataURL(file);
          });
      const envelope = JSON.stringify({ type: 'media', mediaUrl, fileName: file.name, fileType: file.type, fileSize: file.size });
      await handleSendMessage(undefined, envelope);
    } catch {
      alert('⚠️ Attachment failed.');
    } finally {
      setIsUploading(false);
      setUploadProgress('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [selectedUser, handleSendMessage]);

  // ── Delete single message ─────────────────────────────────────────────────
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!confirm('Delete this message?')) return;
    setMessages(prev => prev.filter(m => m.id !== messageId)); // optimistic
    try {
      const res = await fetch(`/api/messages?messageId=${messageId}`, { method: 'DELETE' });
      if (!res.ok) fetchMessages(); // rollback on failure
    } catch { fetchMessages(); }
  }, [fetchMessages]);

  // ── Bulk delete messages ──────────────────────────────────────────────────
  const handleBulkDeleteMessages = useCallback(async () => {
    if (selectedMessageIds.length === 0) return;
    if (!confirm(`Delete all ${selectedMessageIds.length} selected messages?`)) return;
    setMessages(prev => prev.filter(m => !selectedMessageIds.includes(m.id)));
    const ids = selectedMessageIds.join(',');
    setSelectedMessageIds([]);
    setMultiSelectMode(false);
    try {
      const res = await fetch(`/api/messages?messageIds=${ids}`, { method: 'DELETE' });
      if (!res.ok) fetchMessages();
    } catch { fetchMessages(); }
  }, [selectedMessageIds, fetchMessages]);

  // ── Delete entire chat / Leave group ──────────────────────────────────────
  const handleDeleteChat = useCallback(async (userId: string) => {
    const isGrp = selectedUser?.role === 'GROUP';
    const confirmMsg = isGrp 
      ? 'Leave and delete this entire group chat? This cannot be undone.' 
      : 'Delete this entire chat? This cannot be undone.';
    if (!confirm(confirmMsg)) return;

    if (isGrp) {
      setMessages(prev => prev.filter(m => m.groupId !== userId));
      setContacts(prev => prev.filter(c => c.id !== userId));
      setSelectedUser(null);
      try {
        await fetch(`/api/messages?chatGroupId=${userId}`, { method: 'DELETE' });
      } catch {}
    } else {
      setMessages(prev => prev.filter(m => m.senderId !== userId && m.receiverId !== userId));
      setContacts(prev => prev.filter(c => c.id !== userId));
      setSelectedUser(null);
      try {
        await fetch(`/api/messages?chatUserId=${userId}`, { method: 'DELETE' });
      } catch {}
    }
  }, [selectedUser]);

  // ── Edit message ──────────────────────────────────────────────────────────
  const handleEditMessage = useCallback(async (messageId: string, currentContent: string) => {
    if (currentContent.startsWith('{') && currentContent.endsWith('}')) {
      alert('Attachments cannot be edited.'); return;
    }
    const msg = messages.find(m => m.id === messageId);
    if (msg && Date.now() - new Date(msg.createdAt).getTime() > 240000) {
      alert('Edit window (4 min) expired.'); return;
    }
    const newContent = window.prompt('Edit message:', currentContent);
    if (newContent === null) return;
    if (!newContent.trim()) { alert('Cannot be empty.'); return; }
    try {
      const res = await fetch('/api/messages', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId, content: newContent.trim() }),
      });
      if (res.ok) {
        const d = await res.json();
        setMessages(prev => prev.map(m => m.id === messageId ? { ...m, content: d.message.content } : m));
      } else {
        const d = await res.json().catch(() => ({}));
        alert(`Edit failed: ${d.error || 'Unknown error'}`);
      }
    } catch { alert('Network error.'); }
  }, [messages]);

  // ── Forward message ───────────────────────────────────────────────────────
  const openForwardModal = useCallback(async (content: string) => {
    setForwardingContent(content);
    setShowForwardModal(true);
    if (preloadedUsers.length === 0) {
      try {
        const res = await fetch('/api/messages/directory?q=');
        if (res.ok) {
          const data = await res.json();
          setPreloadedUsers(data.users || []);
        }
      } catch {}
    }
  }, [preloadedUsers]);

  const handleForwardMessage = useCallback(async (content: string, target: ChatUser) => {
    const isGrp = target.role === 'GROUP';
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const tempMsg: ChatMessage = {
      id: tempId,
      senderId: currentUserId,
      receiverId: isGrp ? '' : target.id,
      groupId: isGrp ? target.id : undefined,
      content,
      createdAt: new Date().toISOString(),
      isRead: false,
    } as any;

    if (selectedUser && selectedUser.id === target.id) {
      setMessages(prev => [tempMsg, ...prev]);
    }

    try {
      const payload = isGrp ? { groupId: target.id, content } : { receiverId: target.id, content };
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const realMsg: ChatMessage = data.message;
        if (selectedUser && selectedUser.id === target.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === realMsg.id)) {
              return prev.filter(m => m.id !== tempId);
            }
            return prev.map(m => m.id === tempId ? realMsg : m);
          });
        }
        setContacts(prev => {
          const filtered = prev.filter(c => c.id !== target.id);
          return [target, ...filtered];
        });
      } else {
        const d = await res.json().catch(() => ({}));
        alert(`⚠️ Forward failed: ${d.error || 'Unknown error'}`);
        if (selectedUser && selectedUser.id === target.id) {
          setMessages(prev => prev.filter(m => m.id !== tempId));
        }
      }
    } catch {
      alert('⚠️ Network error forwarding message.');
      if (selectedUser && selectedUser.id === target.id) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    }
  }, [currentUserId, selectedUser]);

  // ── Block / unblock ───────────────────────────────────────────────────────
  const handleToggleBlock = useCallback((userId: string) => {
    setBlockedUsers(prev => {
      const updated = prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId];
      localStorage.setItem('blocked_users', JSON.stringify(updated));
      alert(prev.includes(userId) ? '🔓 User unblocked.' : '🚫 User blocked.');
      return updated;
    });
  }, []);

  // ── Derived / memoized data ───────────────────────────────────────────────
  const sortedMessages = useMemo(() => {
    if (!selectedUser) return [];
    return messages
      .filter(m => {
        if (selectedUser.role === 'GROUP') {
          return m.groupId === selectedUser.id;
        }
        return (
          ((m.senderId === selectedUser.id && m.receiverId === currentUserId) ||
           (m.senderId === currentUserId && m.receiverId === selectedUser.id)) &&
          !m.groupId
        );
      })
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [messages, selectedUser, currentUserId]);

  const sortedContacts = useMemo(() => {
    // Build a map: contactId → most recent message timestamp
    const latestTime = new Map<string, number>();
    messages.forEach(m => {
      const contactId = m.groupId ? m.groupId : (m.senderId === currentUserId ? m.receiverId : m.senderId);
      if (contactId) {
        const t = new Date(m.createdAt).getTime();
        if (!latestTime.has(contactId) || latestTime.get(contactId)! < t) {
          latestTime.set(contactId, t);
        }
      }
    });
    return [...contacts]
      .filter(u => u?.id)
      .sort((a, b) => (latestTime.get(b.id) ?? 0) - (latestTime.get(a.id) ?? 0));
  }, [contacts, messages, currentUserId]);

  // ── Render message content (media or text) ────────────────────────────────
  const renderMessageContent = useCallback((content: string) => {
    if (content.startsWith('{') && content.endsWith('}')) {
      try {
        const media = JSON.parse(content);
        if (media.type === 'media') {
          const isImg = media.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(media.fileName);
          if (isImg) return (
            <div style={{ margin: '4px 0', cursor: 'pointer' }} onClick={() => setLightboxUrl(media.mediaUrl)}>
              <img src={media.mediaUrl} alt={media.fileName}
                style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: 4, textDecoration: 'underline', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                🖼️ {media.fileName}
              </div>
            </div>
          );
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 10, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', margin: '4px 0', minWidth: 220 }}>
              <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>📄</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{media.fileName}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{media.fileSize ? `${(media.fileSize / 1024).toFixed(1)} KB` : ''}</div>
              </div>
              <a href={media.mediaUrl} download={media.fileName} target="_blank" rel="noreferrer"
                style={{ padding: 6, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', flexShrink: 0 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </a>
            </div>
          );
        }
      } catch {}
    }
    if (/^(https?:\/\/[^\s]+)$/i.test(content))
      return <a href={content} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'underline' }}>{content}</a>;
    return <span>{content}</span>;
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className={`chat-window-container ${selectedUser ? 'has-selected-user' : ''}`}>
      <style>{`
        .chat-window-container {
          display: grid;
          grid-template-columns: 320px 1fr;
          height: 70vh;
          min-height: 600px;
          overflow: hidden;
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
          height: 100%;
          overflow: hidden;
        }
        .chat-main-area {
          display: flex;
          flex-direction: column;
          background: var(--background);
          height: 100%;
          overflow: hidden;
        }
        .chat-back-btn { display: none; }
        .chat-messages-list {
          flex: 1;
          overflow-y: auto;
          padding: 1.25rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        .chat-messages-list::-webkit-scrollbar { width: 4px; }
        .chat-messages-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .chat-input-form {
          padding: 0.75rem 1rem;
          display: flex;
          gap: 0.6rem;
          background: var(--surface);
          border-top: 1px solid var(--border);
          align-items: center;
          flex-shrink: 0;
        }
        .chat-contacts-list {
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }
        .chat-contacts-list::-webkit-scrollbar { width: 3px; }
        .chat-contacts-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        @media (max-width: 768px) {
          .chat-window-container {
            grid-template-columns: 1fr;
            height: calc(100vh - 130px);
            min-height: 400px;
          }
          .chat-sidebar { display: flex; }
          .chat-window-container.has-selected-user .chat-sidebar { display: none !important; }
          .chat-main-area { display: none; }
          .chat-window-container.has-selected-user .chat-main-area { display: flex !important; }
          .chat-back-btn { display: flex !important; }
          .chat-input-form { padding: 0.5rem 0.65rem !important; gap: 0.4rem !important; }
          .chat-input-form input[type="text"] { padding: 0.55rem 0.9rem !important; font-size: 0.88rem !important; }
          .chat-action-btn { width: 36px !important; height: 36px !important; }
        }
      `}</style>

      {/* ── SIDEBAR ── */}
      <div className="chat-sidebar">
        <div style={{ padding: '1rem 1.25rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>Chats</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: sseConnected ? '#10b981' : '#f59e0b', display: 'inline-block', flexShrink: 0 }} title={sseConnected ? 'Live' : 'Polling'} />
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={openNewGroupModal}
              style={{ padding: '5px 10px', borderRadius: 20, background: 'var(--card-bg-alt)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', transition: '0.18s' }}>
              👥 Group
            </button>
            <button onClick={openNewChat}
              style={{ padding: '5px 10px', borderRadius: 20, background: 'var(--primary)', border: 'none', color: 'white', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 8px rgba(99,102,241,0.3)', transition: '0.18s' }}>
              {showUserSearch ? 'Cancel' : '✏️ New'}
            </button>
          </div>
        </div>

        {showUserSearch ? (
          <div style={{ padding: '0.75rem', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', gap: '0.6rem' }}>
            <input type="text" placeholder="Search name or ID..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)} autoFocus
              style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', flexShrink: 0, boxSizing: 'border-box' }} />
            <div className="chat-contacts-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingRight: 2 }}>
              {searchResults.filter(u => u?.id && u.id !== currentUserId).map((u, i) => (
                <div key={u.id || i} onClick={() => startChat(u)}
                  style={{ padding: '0.6rem 0.75rem', borderRadius: 10, cursor: 'pointer', background: 'var(--card-bg-alt)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.6rem', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--card-bg-alt)')}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, overflow: 'hidden', border: '1px solid var(--primary)', flexShrink: 0, fontSize: '0.9rem' }}>
                    {u.photoUrl ? <img src={u.photoUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.name?.[0] ?? '?')}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name || 'Unknown'}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.username} • {u.role}</div>
                  </div>
                </div>
              ))}
              {searchResults.filter(u => u?.id && u.id !== currentUserId).length === 0 && (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No users found.</div>
              )}
            </div>
          </div>
        ) : (
          <div className="chat-contacts-list">
            {initialLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', padding: '0.75rem' }}>
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} style={{ padding: '0.85rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.85rem', borderBottom: '1px solid var(--border)', opacity: 0.6 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%',
                      background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 75%)',
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite linear',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        width: '60%', height: 12, borderRadius: 4,
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite linear',
                        marginBottom: 6
                      }} />
                      <div style={{
                        width: '40%', height: 8, borderRadius: 4,
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite linear'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {sortedContacts.map((u, idx) => {
                  const unread = u.role === 'GROUP' ? 0 : messages.filter(m => m.senderId === u.id && m.receiverId === currentUserId && !m.isRead).length;
                  const chatMsgs = messages.filter(m =>
                    u.role === 'GROUP' ? m.groupId === u.id : (
                      (m.senderId === u.id && m.receiverId === currentUserId && !m.groupId) ||
                      (m.senderId === currentUserId && m.receiverId === u.id && !m.groupId)
                    )
                  );
                  const latest = chatMsgs.length > 0 ? chatMsgs[0] : null;
                  let preview = u.role === 'GROUP' ? 'Group Chat' : (u.role ?? '');
                  if (latest) {
                    const pfx = latest.senderId === currentUserId ? 'You: ' : (u.role === 'GROUP' ? `${latest.sender?.name || 'Someone'}: ` : '');
                    if (latest.content.startsWith('{') && latest.content.endsWith('}')) {
                      try {
                        const m = JSON.parse(latest.content);
                        preview = pfx + (m.fileType?.startsWith('image/') ? '🖼️ Photo' : `📄 ${m.fileName}`);
                      } catch { preview = pfx + latest.content; }
                    } else { preview = pfx + latest.content; }
                  }
                  const isActive = selectedUser?.id === u.id;
                  const isGrp = u.role === 'GROUP';
                  return (
                    <div key={u.id || idx}
                      onClick={() => { setSelectedUser(u); markAsRead(u.id); }}
                      style={{
                        padding: '0.85rem 1.25rem', cursor: 'pointer',
                        background: isActive ? 'rgba(99,102,241,0.1)' : 'transparent',
                        borderLeft: `3px solid ${isActive ? 'var(--primary)' : 'transparent'}`,
                        borderBottom: '1px solid var(--border)',
                        display: 'flex', alignItems: 'center', gap: '0.85rem',
                        transition: 'background 0.15s, border-color 0.15s',
                      }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: isGrp ? 'linear-gradient(135deg,#60a5fa,#2563eb)' : 'linear-gradient(135deg,var(--surface-light),var(--border))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, fontSize: '1.1rem', overflow: 'hidden', border: isGrp ? '2px solid #2563eb' : '2px solid var(--primary)' }}>
                        {u.photoUrl ? <img src={u.photoUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (isGrp ? '👥' : (u.name?.[0] ?? '?'))}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                          <span style={{ fontWeight: unread > 0 ? 800 : 600, fontSize: '0.95rem', color: isActive ? 'var(--primary)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>{u.name || 'Unknown'}</span>
                          {latest && (
                            <span style={{ fontSize: '0.68rem', color: unread > 0 ? '#10b981' : 'var(--text-muted)', flexShrink: 0 }}>
                              {new Date(latest.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '82%' }}>{preview}</span>
                          {unread > 0 && (
                            <div style={{ background: '#10b981', color: 'white', fontSize: '0.62rem', fontWeight: 900, minWidth: 18, height: 18, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px', boxShadow: '0 0 8px rgba(16,185,129,0.4)', flexShrink: 0 }}>
                              {unread}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {contacts.length === 0 && (
                  <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>📭</div>
                    <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>No conversations yet</div>
                    <div style={{ fontSize: '0.82rem' }}>Tap ✏️ New to start a chat.</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── CHAT AREA ── */}
      <div className="chat-main-area">
        {!selectedUser ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', opacity: 0.7 }}>
            <div style={{ fontSize: '4rem' }}>💬</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Sudhir Tutorials</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: 280, textAlign: 'center', margin: 0 }}>
              Select a conversation or start a new one.
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '0.45rem 0.75rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexShrink: 0, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                <button onClick={() => setSelectedUser(null)} className="chat-back-btn"
                  style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '4px 6px 4px 0', fontWeight: 700, fontSize: '0.88rem', flexShrink: 0 }}>
                  ← Back
                </button>
                <div onClick={() => setShowProfileModal(true)} title="View profile"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', padding: '2px 6px', borderRadius: 8, transition: 'background 0.15s', minWidth: 0, flex: 1 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--card-bg-alt)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 800, color: 'white', overflow: 'hidden', border: '1px solid var(--primary)', flexShrink: 0 }}>
                    {selectedUser.photoUrl ? <img src={selectedUser.photoUrl} alt={selectedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (selectedUser.name?.[0] ?? '?')}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedUser.name} <span style={{ fontSize: '0.6rem', opacity: 0.5 }}>ℹ️</span>
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>● {selectedUser.role}</div>
                  </div>
                </div>
              </div>
              <button onClick={() => handleDeleteChat(selectedUser.id)} title="Delete Chat"
                style={{ background: 'transparent', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)', width: 30, height: 30, flexShrink: 0, transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                🗑️
              </button>
            </div>

            {/* Message list */}
            <div ref={scrollRef} className="chat-messages-list"
              style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.08))', position: 'relative' }}>
              {initialLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem 1rem' }}>
                  {[1, 2, 3, 4].map(i => {
                    const isLeft = i % 2 !== 0;
                    return (
                      <div key={i} style={{
                        alignSelf: isLeft ? 'flex-start' : 'flex-end',
                        width: '50%',
                        padding: '0.8rem 1.1rem',
                        borderRadius: 16,
                        background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.05) 75%)',
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 1.5s infinite linear',
                        border: '1px solid var(--border)',
                        height: 50,
                      }} />
                    );
                  })}
                </div>
              ) : (
                sortedMessages.map((m, i) => {
                  const isMe = m.senderId === currentUserId;
                  const prev = sortedMessages[i - 1];
                  const isConsecutive = !!prev && prev.senderId === m.senderId &&
                    new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60000;
                  const showDate = !prev || new Date(m.createdAt).toDateString() !== new Date(prev.createdAt).toDateString();
                  const isTemp = m.id.startsWith('temp-');
                  const isSelected = selectedMessageIds.includes(m.id);

                  const hasLinkOrMedia = (content: string) => {
                    if (content.startsWith('{') && content.endsWith('}')) {
                      try {
                        const media = JSON.parse(content);
                        return media.type === 'media' && media.mediaUrl;
                      } catch {}
                    }
                    return /https?:\/\/[^\s]+/i.test(content);
                  };

                  const handleOpenMessageContent = (content: string) => {
                    if (content.startsWith('{') && content.endsWith('}')) {
                      try {
                        const media = JSON.parse(content);
                        if (media.type === 'media') {
                          const isImg = media.fileType?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(media.fileName);
                          if (isImg) {
                            setLightboxUrl(media.mediaUrl);
                          } else {
                            window.open(media.mediaUrl, '_blank');
                          }
                          return;
                        }
                      } catch {}
                    }
                    const match = content.match(/(https?:\/\/[^\s]+)/i);
                    if (match) {
                      window.open(match[1], '_blank');
                    }
                  };

                  const menuItemStyle = {
                    background: 'none',
                    border: 'none',
                    color: 'var(--text)',
                    padding: '5px 8px',
                    textAlign: 'left' as const,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    borderRadius: 8,
                    width: '100%',
                    transition: 'background 0.15s',
                  };

                  return (
                    <React.Fragment key={m.id}>
                      {showDate && (
                        <div style={{ display: 'flex', justifyContent: 'center', margin: '1rem 0 0.4rem' }}>
                          <span style={{ background: 'rgba(255,255,255,0.07)', color: 'var(--text-muted)', fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 10, textTransform: 'uppercase', letterSpacing: '0.5px', border: '1px solid rgba(255,255,255,0.04)' }}>
                            {dateSeparatorText(m.createdAt)}
                          </span>
                        </div>
                      )}
                      <div
                        onMouseEnter={() => setHoveredMessageId(m.id)}
                        onMouseLeave={() => setHoveredMessageId(null)}
                        onClick={() => {
                          if (multiSelectMode) {
                            setSelectedMessageIds(prev =>
                              prev.includes(m.id) ? prev.filter(id => id !== m.id) : [...prev, m.id]
                            );
                          } else {
                            setActiveMenuMessageId(prev => prev === m.id ? null : m.id);
                          }
                        }}
                        style={{
                          alignSelf: isMe ? 'flex-end' : 'flex-start',
                          maxWidth: '78%',
                          marginTop: isConsecutive ? 2 : 8,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          flexDirection: isMe ? 'row-reverse' : 'row',
                          opacity: isTemp ? 0.7 : 1,
                          cursor: multiSelectMode ? 'pointer' : 'default',
                        }}>
                        {multiSelectMode && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // handled by click on outer container
                            style={{ width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer', flexShrink: 0 }}
                          />
                        )}
                        {!isTemp && !multiSelectMode && (hoveredMessageId === m.id || activeMenuMessageId === m.id) && (
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuMessageId(prev => prev === m.id ? null : m.id);
                            }}
                              style={{
                                background: 'none', border: 'none', color: 'var(--text-muted)',
                                cursor: 'pointer', fontSize: '1rem', padding: '4px 6px',
                                opacity: 0.7, outline: 'none'
                              }}>
                              ⋮
                            </button>
                            {activeMenuMessageId === m.id && (
                              <div className="message-dropdown-menu" 
                                onClick={(e) => e.stopPropagation()}
                                style={{
                                position: 'absolute',
                                bottom: i < 3 ? 'auto' : '100%',
                                top: i < 3 ? '100%' : 'auto',
                                [isMe ? 'right' : 'left']: 0,
                                background: 'var(--surface-light)',
                                border: '1px solid var(--border)',
                                borderRadius: 12,
                                boxShadow: 'var(--shadow-lg)',
                                zIndex: 100,
                                minWidth: 100,
                                padding: '4px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '2px',
                                marginBottom: i < 3 ? 0 : 4,
                                marginTop: i < 3 ? 4 : 0
                              }}>
                                <button onClick={() => {
                                  navigator.clipboard.writeText(m.content);
                                  setActiveMenuMessageId(null);
                                  alert('Message text copied!');
                                }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  style={menuItemStyle}>
                                  Copy
                                </button>
                                {hasLinkOrMedia(m.content) && (
                                  <button onClick={() => {
                                    handleOpenMessageContent(m.content);
                                    setActiveMenuMessageId(null);
                                  }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    style={menuItemStyle}>
                                    Open
                                  </button>
                                )}
                                <button onClick={() => {
                                  setMultiSelectMode(true);
                                  setSelectedMessageIds([m.id]);
                                  setActiveMenuMessageId(null);
                                }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  style={menuItemStyle}>
                                  Select
                                </button>
                                {isMe && !(m.content.startsWith('{') && m.content.endsWith('}')) && (Date.now() - new Date(m.createdAt).getTime() <= 240000) && (
                                  <button onClick={() => {
                                    handleEditMessage(m.id, m.content);
                                    setActiveMenuMessageId(null);
                                  }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    style={menuItemStyle}>
                                    Edit
                                  </button>
                                )}
                                <button onClick={() => {
                                  openForwardModal(m.content);
                                  setActiveMenuMessageId(null);
                                }}
                                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                  style={menuItemStyle}>
                                  Forward
                                </button>
                                {true && (
                                  <button onClick={() => {
                                    handleDeleteMessage(m.id);
                                    setActiveMenuMessageId(null);
                                  }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    style={{ ...menuItemStyle, color: '#f87171' }}>
                                    Delete
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        <div 
                          onMouseDown={() => !multiSelectMode && startLongPress(m.id)}
                          onMouseUp={endLongPress}
                          onMouseLeave={endLongPress}
                          onTouchStart={() => !multiSelectMode && startLongPress(m.id)}
                          onTouchEnd={endLongPress}
                          style={{
                            padding: '0.55rem 0.9rem',
                            borderRadius: isMe
                              ? (isConsecutive ? '16px 4px 16px 16px' : '16px 16px 4px 16px')
                              : (isConsecutive ? '4px 16px 16px 16px' : '16px 16px 16px 4px'),
                            background: isMe ? '#10b981' : '#27272a',
                            color: isMe ? '#fff' : '#e4e4e7',
                            fontSize: '0.9rem',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                            lineHeight: 1.45,
                            wordBreak: 'break-word',
                            overflowWrap: 'break-word',
                            border: isMe ? 'none' : '1px solid rgba(255,255,255,0.05)',
                            transition: 'opacity 0.2s',
                            cursor: 'pointer',
                          }}
                        >
                          {selectedUser.role === 'GROUP' && !isMe && m.sender && (
                            <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', marginBottom: 2 }}>
                              {m.sender.name}
                            </div>
                          )}
                          {renderMessageContent(m.content)}
                          <span style={{ fontSize: '0.63rem', color: isMe ? 'rgba(255,255,255,0.72)' : 'var(--text-muted)', float: 'right', marginTop: 8, marginLeft: 12, fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {isMe && !isTemp && <Ticks isRead={m.isRead} />}
                            {isTemp && <span style={{ marginLeft: 4, fontSize: '0.6rem', opacity: 0.6 }}>⏳</span>}
                          </span>
                        </div>
                      </div>
                    </React.Fragment>
                  );
                })
              )}
            </div>

            {/* Input Form or Multi-Select Action Bar */}
            {multiSelectMode ? (
              <div style={{ padding: '0.75rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>
                  Selected: {selectedMessageIds.length} messages
                </span>
                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <button onClick={() => { setMultiSelectMode(false); setSelectedMessageIds([]); }}
                    style={{ padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleBulkDeleteMessages} disabled={selectedMessageIds.length === 0}
                    style={{ padding: '6px 14px', borderRadius: 20, background: '#ef4444', border: 'none', color: 'white', fontSize: '0.8rem', fontWeight: 700, cursor: selectedMessageIds.length > 0 ? 'pointer' : 'not-allowed', opacity: selectedMessageIds.length > 0 ? 1 : 0.5 }}>
                    Delete Selected
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendMessage} className="chat-input-form">
                <input type="file" ref={fileInputRef} onChange={handleAttachFile} style={{ display: 'none' }} />
                <button type="button" className="chat-action-btn"
                  disabled={(selectedUser.role !== 'GROUP' && blockedUsers.includes(selectedUser.id)) || isUploading || isSending}
                  onClick={() => fileInputRef.current?.click()} title="Attach file"
                  style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', color: 'var(--text)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background 0.15s', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                  </svg>
                </button>

                {isUploading ? (
                  <div style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: 24, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.1)', borderTop: '2px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>{uploadProgress}</span>
                  </div>
                ) : (
                  <input type="text"
                    placeholder={(selectedUser.role !== 'GROUP' && blockedUsers.includes(selectedUser.id)) ? '🚫 Blocked — unblock to message' : 'Type a message...'}
                    value={newMsg}
                    disabled={(selectedUser.role !== 'GROUP' && blockedUsers.includes(selectedUser.id)) || isSending}
                    onChange={e => setNewMsg(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    style={{
                      flex: 1, padding: '0.68rem 1.1rem', borderRadius: 24,
                      background: (selectedUser.role !== 'GROUP' && blockedUsers.includes(selectedUser.id)) ? 'rgba(239,68,68,0.05)' : 'var(--input-bg)',
                      border: `1px solid ${(selectedUser.role !== 'GROUP' && blockedUsers.includes(selectedUser.id)) ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                      color: 'var(--text)', fontSize: '0.92rem', outline: 'none',
                      cursor: (selectedUser.role !== 'GROUP' && blockedUsers.includes(selectedUser.id)) ? 'not-allowed' : 'text',
                      transition: 'border-color 0.15s',
                    }} />
                )}

                <button type="submit" className="chat-action-btn"
                  disabled={(!newMsg.trim() && !isUploading) || (selectedUser.role !== 'GROUP' && blockedUsers.includes(selectedUser.id)) || isSending}
                  style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: newMsg.trim() && !(selectedUser.role !== 'GROUP' && blockedUsers.includes(selectedUser.id)) && !isSending ? 'var(--primary)' : 'var(--card-bg-alt)',
                    color: newMsg.trim() && !(selectedUser.role !== 'GROUP' && blockedUsers.includes(selectedUser.id)) && !isSending ? 'white' : 'var(--text-muted)',
                    border: newMsg.trim() ? 'none' : '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: newMsg.trim() && !(selectedUser.role !== 'GROUP' && blockedUsers.includes(selectedUser.id)) ? 'pointer' : 'default',
                    transition: 'background 0.15s, color 0.15s',
                  }}>
                  {isSending
                    ? <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
                  }
                </button>
              </form>
            )}
          </>
        )}
      </div>

      {/* ── PROFILE / GROUP DETAIL MODAL ── */}
      {showProfileModal && selectedUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: 380, padding: '2.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, position: 'relative', textAlign: 'center', boxShadow: 'var(--shadow-lg)', margin: 'auto' }}>
            <button onClick={() => setShowProfileModal(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', width: 34, height: 34, borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            <div style={{ width: 84, height: 84, borderRadius: '50%', background: selectedUser.role === 'GROUP' ? 'linear-gradient(135deg,#60a5fa,#2563eb)' : 'linear-gradient(135deg,var(--primary),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 800, color: 'white', overflow: 'hidden', border: '3px solid var(--primary)', margin: '0 auto 1.25rem' }}>
              {selectedUser.photoUrl ? <img src={selectedUser.photoUrl} alt={selectedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (selectedUser.role === 'GROUP' ? '👥' : (selectedUser.name?.[0] ?? '?'))}
            </div>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.35rem' }}>{selectedUser.name}</h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: '1.25rem' }}>● {selectedUser.role === 'GROUP' ? 'Group Chat' : selectedUser.role}</div>
            
            {selectedUser.role === 'GROUP' ? (
              <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Group Members ({groupMembers.length})
                  </span>
                  {isAdminOfGroup && !showAddMembersPanel && (
                    <button 
                      type="button" 
                      onClick={openAddMembersPanel}
                      style={{ padding: '4px 10px', background: 'rgba(16,185,129,0.1)', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer' }}
                    >
                      ➕ Add Member
                    </button>
                  )}
                </div>

                {showAddMembersPanel ? (
                  <div style={{ background: 'var(--card-bg-alt)', borderRadius: 12, padding: '1rem', border: '1px solid var(--border)', maxHeight: 220, overflowY: 'auto', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 'bold' }}>Select Users to Add</span>
                      <button 
                        type="button" 
                        onClick={() => setShowAddMembersPanel(false)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}
                      >
                        Cancel
                      </button>
                    </div>
                    {preloadedUsers
                      .filter(u => u.id !== currentUserId && !groupMembers.some(m => m.userId === u.id))
                      .map(u => (
                        <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0', cursor: 'pointer', fontSize: '0.85rem' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedAddUsers.includes(u.id)}
                            onChange={e => {
                              if (e.target.checked) setSelectedAddUsers(prev => [...prev, u.id]);
                              else setSelectedAddUsers(prev => prev.filter(id => id !== u.id));
                            }}
                          />
                          <span>{u.name} ({u.role})</span>
                        </label>
                      ))}
                    {preloadedUsers.filter(u => u.id !== currentUserId && !groupMembers.some(m => m.userId === u.id)).length === 0 && (
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>No users available to add.</div>
                    )}
                    {selectedAddUsers.length > 0 && (
                      <button 
                        type="button" 
                        onClick={handleAddGroupMembers}
                        style={{ width: '100%', padding: '0.6rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', marginTop: '0.75rem', fontSize: '0.8rem', cursor: 'pointer' }}
                      >
                        Add {selectedAddUsers.length} Member(s)
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ background: 'var(--card-bg-alt)', borderRadius: 12, padding: '0.75rem 1rem', border: '1px solid var(--border)', maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {loadingGroupDetails ? (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem 0', fontSize: '0.85rem' }}>Loading group details...</div>
                    ) : (
                      groupMembers.map((m: any) => {
                        const isTargetCreator = m.userId === groupCreatorId;
                        const isTargetMe = m.userId === currentUserId;
                        return (
                          <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '0.35rem' }}>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: '0.88rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                {m.user?.name || 'Unknown User'}
                                {isTargetCreator && (
                                  <span style={{ fontSize: '0.6rem', background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>
                                    CREATOR
                                  </span>
                                )}
                                {m.isAdmin && !isTargetCreator && (
                                  <span style={{ fontSize: '0.6rem', background: 'rgba(59,130,246,0.15)', color: '#3b82f6', padding: '1px 4px', borderRadius: 4, fontWeight: 700 }}>
                                    ADMIN
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>@{m.user?.username || ''} ({m.user?.role || ''})</div>
                            </div>
                            
                            {isAdminOfGroup && !isTargetMe && !isTargetCreator && (
                              <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                                <button 
                                  onClick={() => handleSetGroupAdmin(m.userId, !m.isAdmin)}
                                  style={{ padding: '3px 6px', background: 'rgba(255,255,255,0.08)', color: 'var(--text)', border: 'none', borderRadius: 4, fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}
                                  title={m.isAdmin ? 'Demote to Member' : 'Promote to Admin'}
                                >
                                  {m.isAdmin ? 'Demote' : 'Admin'}
                                </button>
                                <button 
                                  onClick={() => handleRemoveGroupMember(m.userId)}
                                  style={{ padding: '3px 6px', background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: 'none', borderRadius: 4, fontSize: '0.65rem', fontWeight: 'bold', cursor: 'pointer' }}
                                  title="Remove Member"
                                >
                                  ❌
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: 'var(--card-bg-alt)', borderRadius: 12, padding: '0.9rem 1.1rem', textAlign: 'left', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', border: '1px solid var(--border)' }}>
                {[['Username', selectedUser.username || 'N/A'], ['Email', selectedUser.email || 'Not disclosed'], ['Status', `● Active ${selectedUser.role}`]].map(([label, val]) => (
                  <div key={label}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                    <span style={{ fontSize: '0.92rem', color: label === 'Status' ? '#10b981' : 'var(--text)', fontWeight: 600, wordBreak: 'break-all' }}>{val}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {selectedUser.role === 'GROUP' ? (
                <>
                  <button onClick={handleLeaveGroup}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: 12, background: 'rgba(255,255,255,0.08)', border: '1px solid var(--border)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                    🚪 Leave Group
                  </button>
                  {isAdminOfGroup && (
                    <button onClick={handleDeleteGroup}
                      style={{ width: '100%', padding: '0.8rem', borderRadius: 12, background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                      🗑️ Delete Group
                    </button>
                  )}
                </>
              ) : (
                <>
                  <button onClick={() => handleToggleBlock(selectedUser.id)}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: 12, background: 'transparent', border: `1px solid ${blockedUsers.includes(selectedUser.id) ? '#10b981' : '#f87171'}`, color: blockedUsers.includes(selectedUser.id) ? '#10b981' : '#f87171', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {blockedUsers.includes(selectedUser.id) ? '🔓 Unblock User' : '🚫 Block User'}
                  </button>
                  <button onClick={() => { if (confirm('Delete entire chat? Cannot be undone.')) { handleDeleteChat(selectedUser.id); setShowProfileModal(false); } }}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: 12, background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                    🗑️ Delete Chat
                  </button>
                  <button onClick={async () => {
                    const reason = window.prompt(`Report reason for ${selectedUser.name}:`);
                    if (!reason?.trim()) return;
                    try {
                      await fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'User Report', message: reason.trim(), reportedUserId: selectedUser.id, isBugReport: false }) });
                      alert('Report submitted.');
                    } catch { alert('Failed. Try again.'); }
                  }}
                    style={{ width: '100%', padding: '0.8rem', borderRadius: 12, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', fontWeight: 600, cursor: 'pointer' }}>
                    ⚠️ Report User
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── LIGHTBOX ── */}
      {lightboxUrl && (
        <div onClick={() => setLightboxUrl(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '1rem', cursor: 'zoom-out' }}>
          <button onClick={() => setLightboxUrl(null)}
            style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', borderRadius: '50%', width: 38, height: 38, fontSize: '1.4rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
          <img src={lightboxUrl} alt="Full image" onClick={e => e.stopPropagation()}
            style={{ maxWidth: '95%', maxHeight: '92vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 10px 40px rgba(0,0,0,0.5)', cursor: 'default' }} />
        </div>
      )}

      {/* ── CREATE GROUP MODAL ── */}
      {showGroupModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: 400, padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, position: 'relative', boxShadow: 'var(--shadow-lg)', margin: 'auto' }}>
            <button onClick={() => { setShowGroupModal(false); setGroupName(''); setSelectedGroupMembers([]); }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', width: 34, height: 34, borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem', textAlign: 'center' }}>👥 Create Group Chat</h3>
            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Group Name</label>
                <input type="text" placeholder="Enter group name..." value={groupName} onChange={e => setGroupName(e.target.value)}
                  style={{ width: '100%', padding: '0.68rem 1.1rem', borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }} required />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Select Members ({selectedGroupMembers.length} selected)</label>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--card-bg-alt)', padding: '0.5rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {preloadedUsers.filter(u => u.id !== currentUserId).map(u => {
                    const isChecked = selectedGroupMembers.includes(u.id);
                    return (
                      <div key={u.id} onClick={() => setSelectedGroupMembers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '6px 8px', borderRadius: 8, cursor: 'pointer', background: isChecked ? 'rgba(99,102,241,0.08)' : 'transparent', transition: 'background 0.15s' }}>
                        <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ accentColor: 'var(--primary)' }} />
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.75rem', overflow: 'hidden', border: '1px solid var(--primary)', flexShrink: 0 }}>
                          {u.photoUrl ? <img src={u.photoUrl} alt={u.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.name?.[0] ?? '?')}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name} ({u.role})</span>
                      </div>
                    );
                  })}
                  {preloadedUsers.filter(u => u.id !== currentUserId).length === 0 && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>Loading contacts...</div>
                  )}
                </div>
              </div>
              <button type="submit" disabled={!groupName.trim() || selectedGroupMembers.length === 0}
                style={{ width: '100%', padding: '0.8rem', borderRadius: 12, background: 'var(--primary)', border: 'none', color: 'white', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem', opacity: (groupName.trim() && selectedGroupMembers.length > 0) ? 1 : 0.5, transition: 'opacity 0.15s' }}>
                Create Group
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── FORWARD MESSAGE MODAL ── */}
      {showForwardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 9999, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', overflowY: 'auto', padding: '2rem 1rem' }}>
          <div className="glass-card animate-scale-up" style={{ width: '100%', maxWidth: 400, padding: '2rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 24, position: 'relative', boxShadow: 'var(--shadow-lg)', margin: 'auto' }}>
            <button onClick={() => { setShowForwardModal(false); setForwardingContent(null); setForwardSearchQuery(''); }}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', width: 34, height: 34, borderRadius: '50%', fontSize: '1.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1.25rem', textAlign: 'center' }}>➡️ Forward Message</h3>
            
            <input type="text" placeholder="Search chats or users..." value={forwardSearchQuery} onChange={e => setForwardSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '0.68rem 1.1rem', borderRadius: 12, background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', marginBottom: '1rem', boxSizing: 'border-box' }} />

            <div style={{ maxHeight: 300, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(() => {
                const query = forwardSearchQuery.toLowerCase().trim();
                const uniqueTargetsMap = new Map<string, ChatUser>();
                
                contacts.forEach(c => {
                  if (c.id !== currentUserId) {
                    uniqueTargetsMap.set(c.id, c);
                  }
                });
                
                preloadedUsers.forEach(u => {
                  if (u.id !== currentUserId && !uniqueTargetsMap.has(u.id)) {
                    uniqueTargetsMap.set(u.id, u);
                  }
                });
                
                const allTargets = Array.from(uniqueTargetsMap.values());
                const filtered = allTargets.filter(t => 
                  t.name.toLowerCase().includes(query) || 
                  (t.username && t.username.toLowerCase().includes(query)) ||
                  (t.role && t.role.toLowerCase().includes(query))
                );

                if (filtered.length === 0) {
                  return (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      No chats or users found.
                    </div>
                  );
                }

                return filtered.map(target => {
                  const isGrp = target.role === 'GROUP';
                  return (
                    <div key={target.id}
                      onClick={async () => {
                        if (forwardingContent) {
                          await handleForwardMessage(forwardingContent, target);
                          setShowForwardModal(false);
                          setForwardingContent(null);
                          setForwardSearchQuery('');
                          alert(`Forwarded to ${target.name}`);
                        }
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '10px 12px', borderRadius: 12, cursor: 'pointer', transition: 'background 0.15s', border: '1px solid transparent' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: isGrp ? 'linear-gradient(135deg,#60a5fa,#2563eb)' : 'linear-gradient(135deg,var(--primary),var(--accent))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', color: 'white', overflow: 'hidden', border: '2px solid var(--primary)', flexShrink: 0 }}>
                        {target.photoUrl ? <img src={target.photoUrl} alt={target.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (isGrp ? '👥' : (target.name?.[0] ?? '?'))}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{target.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{isGrp ? 'Group Chat' : target.role}</div>
                      </div>
                      <button style={{ padding: '6px 12px', borderRadius: 16, background: 'var(--primary)', color: 'white', border: 'none', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                        Send
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
