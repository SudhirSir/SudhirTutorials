"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWindow } from '@/components/ChatWindow';
import { useSession } from 'next-auth/react';
import { LiveClock } from '@/components/LiveClock';
import { Sidebar } from '@/components/Sidebar';

export default function AdminDashboard() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');
  
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
    if (tab === 'courses') {
      fetchCourses();
      fetchBatches();
      fetchTeachers();
      handleSearchDirectory(); // to get students
    }
  }, [searchParams]);

  const fetchTeachers = async () => {
    try {
      const res = await fetch('/api/admin/directory?q=');
      const data = await res.json();
      setAllTeachers(data.users?.filter((u:any) => u.role === 'TEACHER') || []);
    } catch (e) {}
  };
  
  // User Creation State
  const [overviewStats, setOverviewStats] = useState<{ totalStudents: number, totalTeachers: number, revenueThisMonth: number, pendingDues: number } | null>(null);
  const [newUserRole, setNewUserRole] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [newUserName, setNewUserName] = useState('');
  const [createdUser, setCreatedUser] = useState<{username: string, password: string, role: string} | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Analytics State
  const [reportData, setReportData] = useState<{ enrollmentData: any[], revenueTrend: any[], attendanceRate: number } | null>(null);
  const [isReportsLoading, setIsReportsLoading] = useState(false);

  // Deletion Modal State
  const [showDelModal, setShowDelModal] = useState(false);
  const [delTargetId, setDelTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Directory State
  const [searchQuery, setSearchQuery] = useState('');
  const [directoryUsers, setDirectoryUsers] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Finance State
  const [fees, setFees] = useState<any[]>([]);
  const [feeSearchQuery, setFeeSearchQuery] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<any>(null);
  const [addFeeMode, setAddFeeMode] = useState<'INDIVIDUAL' | 'BATCH'>('INDIVIDUAL');
  const [feeStudentId, setFeeStudentId] = useState('');
  const [feeAmount, setFeeAmount] = useState('');
  const [feeBillingMonth, setFeeBillingMonth] = useState('April 2026');
  const [feeTitle, setFeeTitle] = useState('Monthly Fee');
  const [isAddingFee, setIsAddingFee] = useState(false);

  // Courses & Batches State
  const [courses, setCourses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [newBatchName, setNewBatchName] = useState('');
  const [newBatchCourseId, setNewBatchCourseId] = useState('');
  const [newBatchTeacherUsername, setNewBatchTeacherUsername] = useState('');
  const [newBatchStudentUsernames, setNewBatchStudentUsernames] = useState('');
  const [newBatchClassName, setNewBatchClassName] = useState('');
  const [newBatchSubjects, setNewBatchSubjects] = useState('');
  const [newBatchDefaultFee, setNewBatchDefaultFee] = useState('');
  const [isAddingBatch, setIsAddingBatch] = useState(false);
  const [allTeachers, setAllTeachers] = useState<any[]>([]);

  // Advanced Batch Edit State
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<any>(null);
  const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ dayOfWeek: '1', startTime: '16:00', endTime: '17:00', room: '' });

  // Profile Edit State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingProfile, setEditingProfile] = useState<any>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // --- Handlers ---
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setErrorMsg('');
    setCreatedUser(null);

    if (!newUserName) {
      setErrorMsg("Name is required.");
      setIsCreating(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newUserRole, name: newUserName })
      });

      const data = await res.json();
      if (res.ok) {
        setCreatedUser(data.user);
        setNewUserName('');
      } else {
        setErrorMsg(data.error || "Failed to create user.");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleSearchDirectory = async () => {
    setIsSearching(true);
    try {
      const res = await fetch(`/api/admin/directory?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      if (res.ok) {
        setDirectoryUsers(data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const fetchFinances = async () => {
    try {
      const res = await fetch('/api/admin/finances');
      const data = await res.json();
      if (res.ok) setFees(data.fees || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingFee(true);
    try {
      const res = await fetch('/api/admin/finances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: addFeeMode,
          studentId: addFeeMode === 'INDIVIDUAL' ? feeStudentId : undefined,
          amount: feeAmount,
          billingMonth: feeBillingMonth,
          title: feeTitle
        })
      });
      if (res.ok) {
        setFeeStudentId('');
        setFeeAmount('');
        fetchFinances();
        alert('Fee(s) successfully assigned!');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to assign fee.');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAddingFee(false);
    }
  };

  const updateFeeStatus = async (id: string, status: string) => {
    try {
      const res = await fetch('/api/admin/finances', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id, 
          status,
          paidAt: status === 'PAID' ? new Date().toISOString() : undefined 
        })
      });
      if (res.ok) fetchFinances();
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/admin/courses');
      const data = await res.json();
      if (res.ok) setCourses(data.courses || []);
    } catch (err) { console.error(err); }
  };

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/admin/batches');
      const data = await res.json();
      if (res.ok) setBatches(data.batches || []);
    } catch (err) { console.error(err); }
  };

  const fetchOverviewStats = async () => {
    try {
      const res = await fetch('/api/admin/overview');
      if (res.ok) {
        const data = await res.json();
        setOverviewStats(data);
      }
    } catch (err) { console.error(err); }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingCourse(true);
    try {
      const res = await fetch('/api/admin/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCourseName, description: newCourseDesc })
      });
      if (res.ok) {
        setNewCourseName('');
        setNewCourseDesc('');
        fetchCourses();
      }
    } catch(e) {} finally { setIsAddingCourse(false); }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingBatch(true);
    try {
      const res = await fetch('/api/admin/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newBatchName, 
          courseId: newBatchCourseId, 
          className: newBatchClassName, // need to add state
          subjects: newBatchSubjects, // need to add state
          defaultFee: parseFloat(newBatchDefaultFee || '0'),
          teacherUsernames: newBatchTeacherUsername.split(',').map(u=>u.trim()).filter(Boolean),
          studentUsernames: newBatchStudentUsernames.split(',').map(u=>u.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        setNewBatchName('');
        setNewBatchCourseId('');
        setNewBatchTeacherUsername('');
        setNewBatchStudentUsernames('');
        setNewBatchClassName('');
        setNewBatchSubjects('');
        setNewBatchDefaultFee('');
        fetchBatches();
      }
    } catch(e) {} finally { setIsAddingBatch(false); }
  };

  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);

  const fetchPendingVerifications = async () => {
    try {
      const res = await fetch('/api/admin/verify');
      if (res.ok) {
        const data = await res.json();
        setPendingVerifications(data.users || []);
      }
    } catch (err) { console.error(err); }
  };

  const handleVerifyUser = async (userId: string) => {
    setIsVerifying(userId);
    try {
      const res = await fetch('/api/admin/verify', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        fetchPendingVerifications();
        fetchOverviewStats();
      }
    } catch (err) { console.error(err); } finally { setIsVerifying(null); }
  };

  useEffect(() => {
    if (activeTab === 'overview') fetchOverviewStats();
    if (activeTab === 'users') handleSearchDirectory();
    if (activeTab === 'finances') fetchFinances();
    if (activeTab === 'verifications') fetchPendingVerifications();
    if (activeTab === 'courses') {
      fetchCourses();
      fetchBatches();
    }
    if (activeTab === 'analytics') fetchReports();
  }, [activeTab]);

  const fetchReports = async () => {
    setIsReportsLoading(true);
    try {
      const res = await fetch('/api/admin/reports');
      if (res.ok) setReportData(await res.json());
    } catch (e) { console.error(e); }
    finally { setIsReportsLoading(false); }
  };

  const deleteFee = async () => {
    if (!delTargetId) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/finances?id=${delTargetId}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDelModal(false);
        setDelTargetId(null);
        fetchFinances();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete');
      }
    } catch (e) { console.error(e); }
    finally { setIsDeleting(false); }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/profiles?userId=${userId}`);
      const data = await res.json();
      setEditingProfile(data.profile || { userId, baseFee: 0 });
      setShowProfileModal(true);
    } catch (e) { console.error(e); }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    try {
      const res = await fetch('/api/admin/profiles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingProfile)
      });
      if (res.ok) {
        setShowProfileModal(false);
        setEditingProfile(null);
        handleSearchDirectory(); // Refresh directory
      } else {
        alert('Failed to save profile');
      }
    } catch (e) { console.error(e); }
    finally { setIsSavingProfile(false); }
  };

  const openDelModal = (id: string) => {
    setDelTargetId(id);
    setShowDelModal(true);
  };

  return (
    <div className="animate-fade-in" style={{ position: 'relative' }}>
      <div className="bg-glow" style={{ top: '-10%', right: '-10%', opacity: 0.5 }}></div>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            जय सियाराम 🙏 <span style={{ color: '#ef4444' }}>{session?.user?.name || 'Admin'}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Welcome back, Admin. Manage your institute's members here.</p>
        </div>
        <LiveClock />
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '2rem', overflowX: 'auto' }}>
        {['overview', 'users', 'verifications', 'finances', 'courses', 'analytics', 'messages'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{ 
              padding: '0.75rem 1rem', 
              background: 'transparent', 
              border: 'none', 
              color: activeTab === tab ? '#ef4444' : 'var(--text-muted)', 
              borderBottom: activeTab === tab ? '2px solid #ef4444' : '2px solid transparent', 
              fontWeight: 600, 
              textTransform: 'capitalize',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {tab === 'verifications' && pendingVerifications.length > 0 && (
              <span style={{ background: '#ef4444', color: '#fff', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', marginRight: '6px' }}>{pendingVerifications.length}</span>
            )}
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            {[
              { label: 'Total Students', value: overviewStats?.totalStudents ?? 0, trend: '', color: '#6366f1' },
              { label: 'Active Teachers', value: overviewStats?.totalTeachers ?? 0, trend: '', color: '#10b981' },
              { label: 'Revenue This Month', value: `₹${(overviewStats?.revenueThisMonth ?? 0).toLocaleString()}`, trend: '', color: '#3b82f6' },
              { label: 'Pending Dues', value: `₹${(overviewStats?.pendingDues ?? 0).toLocaleString()}`, trend: '', color: '#ef4444' }
            ].map((stat, i) => (
              <div key={i} className="glass-card" style={{ padding: '1.5rem', borderTop: `3px solid ${stat.color}` }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem', fontWeight: 600 }}>{stat.label}</div>
                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{stat.value}</div>
                  {stat.trend && <div style={{ color: stat.trend.startsWith('+') ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '1rem', marginBottom: '5px' }}>{stat.trend}</div>}
                </div>
              </div>
            ))}
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Create New Users</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Generate auto-IDs (FAC* / STU*) for new teachers and students. The system will automatically generate an initial secure password.</p>
            
            {createdUser && (
              <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
                <h3 style={{ color: '#34d399', marginBottom: '1rem' }}>✅ Successfully created {createdUser.role}!</h3>
                <p style={{ marginBottom: '0.5rem' }}>Please securely share these credentials with the user:</p>
                <p><strong>Username / ID:</strong> <span style={{ background: '#000', padding: '2px 8px', borderRadius: '4px' }}>{createdUser.username}</span></p>
                <p><strong>Password:</strong> <span style={{ background: '#000', padding: '2px 8px', borderRadius: '4px' }}>{createdUser.password}</span></p>
                <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>*User will be prompted to change their password on first login.</p>
              </div>
            )}

            {errorMsg && (
              <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', marginBottom: '1.5rem' }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', alignItems: 'end' }}>
              <div className="input-group">
                <label>Role</label>
                <select 
                  value={newUserRole} 
                  onChange={e => setNewUserRole(e.target.value as any)}
                  style={{ padding: '0.85rem 1.25rem', borderRadius: '12px', background: 'rgba(9, 9, 11, 0.5)', border: '1px solid var(--border)', color: 'white' }}
                >
                  <option value="STUDENT">Student</option>
                  <option value="TEACHER">Teacher</option>
                </select>
              </div>
              
              <div className="input-group">
                <label>Full Name</label>
                <input type="text" placeholder="e.g. Rahul Kumar" value={newUserName} onChange={e => setNewUserName(e.target.value)} />
              </div>

              <button type="submit" className="btn-primary" disabled={isCreating} style={{ padding: '0.9rem', marginBottom: '1.25rem' }}>
                {isCreating ? "Creating..." : "Generate ID & Save"}
              </button>
            </form>
          </div>
        </>
      )}

      {activeTab === 'verifications' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Pending Profile Verifications</h2>
          {pendingVerifications.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No profiles are currently awaiting verification.</p>
          ) : (
            <div style={{ display: 'grid', gap: '1rem' }}>
              {pendingVerifications.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'rgba(255,255,255,0.02)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{u.name || 'Anonymous'}</span>
                      <span className="role-badge" style={{ fontSize: '0.65rem' }}>{u.role}</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      Username: <strong>{u.username}</strong> • Joined {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                    {u.studentProfile && (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                        📞 {u.studentProfile.phone} • ✉️ {u.studentProfile.email}
                      </div>
                    )}
                  </div>
                  <button 
                    className="btn-primary" 
                    disabled={isVerifying === u.id}
                    onClick={() => handleVerifyUser(u.id)}
                    style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', background: '#10b981' }}
                  >
                    {isVerifying === u.id ? 'Verifying...' : 'Approve & Verify'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>User Directory</h2>
          
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
            <input 
              type="text" 
              placeholder="Search by Name or ID (e.g. STU12345)" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchDirectory()}
              style={{ flex: 1, padding: '0.75rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white' }}
            />
            <button onClick={handleSearchDirectory} className="btn-primary" disabled={isSearching} style={{ padding: '0 2rem' }}>
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {directoryUsers.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No users found.</p>
            ) : (
              directoryUsers.map(u => (
                <div key={u.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{u.name || 'Unnamed'}</span>
                    <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '20px', background: u.role === 'TEACHER' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)', color: u.role === 'TEACHER' ? '#34d399' : '#818cf8' }}>
                      {u.role}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>ID: {u.username}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Joined: {new Date(u.createdAt).toLocaleDateString()}</div>
                  {u.role === 'STUDENT' && (
                    <button 
                      onClick={() => fetchProfile(u.id)}
                      style={{ marginTop: '1rem', width: '100%', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '8px', color: '#fff', cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      ✎ Edit Profile & Fee
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'finances' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }}>

          {/* ── Left: Ledger ────────────────────────────── */}
          <div className="glass-card" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', margin: 0 }}>Fee Ledger & Collections</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Track and verify all student payments</p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <input 
                  type="text" 
                  placeholder="Search Name or ID..." 
                  value={feeSearchQuery}
                  onChange={e => setFeeSearchQuery(e.target.value)}
                  style={{ padding: '0.6rem 1rem', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border)', color: 'white', fontSize: '0.85rem', width: '200px' }}
                />
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    <th style={{ padding: '0.75rem 0' }}>Student / ID</th>
                    <th>Billing Details</th>
                    <th>Payment Status</th>
                    <th>Total Due</th>
                    <th>Paid On</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const filteredFees = fees.filter(f => 
                      f.student?.name?.toLowerCase().includes(feeSearchQuery.toLowerCase()) || 
                      f.student?.username?.toLowerCase().includes(feeSearchQuery.toLowerCase())
                    );

                    if (filteredFees.length === 0) return <tr><td colSpan={6} style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>No matching fee records found.</td></tr>;

                    return filteredFees.map(fee => {
                      const isOverdue = fee.status === 'PENDING' && fee.lateFine > 0;
                      return (
                        <tr key={fee.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isOverdue ? 'rgba(239,68,68,0.03)' : 'transparent' }}>
                          <td style={{ padding: '1rem 0' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{fee.student?.name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>{fee.student?.username}</div>
                          </td>
                          <td>
                            <div style={{ fontSize: '0.9rem' }}>{fee.billingMonth}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{fee.title}</div>
                          </td>
                          <td>
                            <span style={{
                              padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800,
                              background: fee.status === 'PAID' ? 'rgba(52,211,153,0.1)' : fee.status === 'VERIFIED' ? 'rgba(59,130,246,0.1)' : 'rgba(239,68,68,0.1)',
                              color: fee.status === 'PAID' ? '#10b981' : fee.status === 'VERIFIED' ? '#3b82f6' : '#ef4444',
                              border: `1px solid ${fee.status === 'PAID' ? '#10b981' : fee.status === 'VERIFIED' ? '#3b82f6' : '#ef4444'}`
                            }}>
                              {fee.status}
                            </span>
                            {isOverdue && <div style={{ fontSize: '0.65rem', color: '#ef4444', fontWeight: 700, marginTop: '4px' }}>⚠ {fee.daysLate} DAYS LATE</div>}
                          </td>
                          <td style={{ fontWeight: 700 }}>₹{fee.totalAmount.toFixed(0)}</td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {fee.paidAt ? new Date(fee.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              {fee.status === 'PENDING' && (
                                <button onClick={() => updateFeeStatus(fee.id, 'PAID')} style={{ padding: '6px', background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>Mark Paid</button>
                              )}
                              {(fee.status === 'PAID' || fee.status === 'PAID_ONLINE') && (
                                <button onClick={() => updateFeeStatus(fee.id, 'VERIFIED')} style={{ padding: '6px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>Verify</button>
                              )}
                              {(fee.status !== 'PENDING') && (
                                <button onClick={() => setActiveReceipt(fee)} style={{ padding: '6px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>🧾 Receipt</button>
                              )}
                              <button onClick={() => openDelModal(fee.id)} style={{ padding: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.7rem' }}>🗑</button>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Right: Quick Actions ───────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-card" style={{ padding: '2rem' }}>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Assign New Fee</h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px' }}>
                <button 
                  onClick={() => setAddFeeMode('INDIVIDUAL')}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: addFeeMode === 'INDIVIDUAL' ? 'var(--primary)' : 'transparent', color: 'white' }}
                >
                  Student
                </button>
                <button 
                  onClick={() => setAddFeeMode('BATCH')}
                  style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', border: 'none', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', background: addFeeMode === 'BATCH' ? 'var(--primary)' : 'transparent', color: 'white' }}
                >
                  Batch
                </button>
              </div>

              <form onSubmit={handleAddFee} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {addFeeMode === 'INDIVIDUAL' ? (
                  <div className="input-group">
                    <label>Select Student</label>
                    <select required value={feeStudentId} onChange={e => setFeeStudentId(e.target.value)}>
                      <option value="">Choose...</option>
                      {directoryUsers.filter(u => u.role === 'STUDENT').map(s => (
                        <option key={s.id} value={s.username}>{s.name} ({s.username})</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="input-group">
                    <label>Select Batch</label>
                    <select required value={feeStudentId} onChange={e => setFeeStudentId(e.target.value)}>
                      <option value="">Choose...</option>
                      {batches.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.className})</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div className="input-group">
                  <label>Amount (₹)</label>
                  <input type="number" required placeholder="1500" value={feeAmount} onChange={e => setFeeAmount(e.target.value)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div className="input-group">
                    <label>Month</label>
                    <input type="text" value={feeBillingMonth} onChange={e => setFeeBillingMonth(e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label>Category</label>
                    <select value={feeTitle} onChange={e => setFeeTitle(e.target.value)}>
                      <option value="Monthly Fee">Monthly</option>
                      <option value="Registration">Registration</option>
                      <option value="Exam Fee">Exam Fee</option>
                      <option value="Books/Materials">Materials</option>
                    </select>
                  </div>
                </div>

                <button type="submit" disabled={isAddingFee} className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  {isAddingFee ? 'Assigning...' : 'Assign Fee'}
                </button>
              </form>
            </div>

            <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), transparent)' }}>
               <h4 style={{ fontSize: '0.9rem', color: '#10b981', marginBottom: '0.5rem' }}>Total Collected (Month)</h4>
               <p style={{ fontSize: '1.8rem', fontWeight: 800 }}>₹{fees.filter(f => f.status !== 'PENDING').reduce((acc, f) => acc + f.totalAmount, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ───────────────────────────── */}
      {activeReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '2rem' }}>
          <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '500px', padding: 0, overflow: 'hidden', background: '#fff', color: '#1a1a1a', borderRadius: '0' }}>
            <div style={{ padding: '2.5rem', border: '8px solid #f3f4f6' }}>
              <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                <h1 style={{ color: '#1a1a1a', fontSize: '1.5rem', margin: 0, letterSpacing: '1px' }}>SUDHIR TUTORIALS</h1>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '4px 0' }}>Professional Coaching for Academic Excellence</p>
                <div style={{ height: '1px', background: '#e5e7eb', width: '60px', margin: '1rem auto' }}></div>
                <h2 style={{ fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '2px', color: '#374151' }}>Payment Receipt</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem', fontSize: '0.85rem' }}>
                <div>
                  <div style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800 }}>Student Name</div>
                  <div style={{ fontWeight: 700 }}>{activeReceipt.student?.name}</div>
                  <div style={{ color: '#6b7280' }}>ID: {activeReceipt.student?.username}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 800 }}>Receipt #</div>
                  <div style={{ fontWeight: 700 }}>REC-{activeReceipt.id.slice(-6).toUpperCase()}</div>
                  <div style={{ color: '#6b7280' }}>{new Date(activeReceipt.paidAt || Date.now()).toLocaleDateString()}</div>
                </div>
              </div>

              <div style={{ borderTop: '2px solid #f3f4f6', borderBottom: '2px solid #f3f4f6', padding: '1.5rem 0', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#6b7280' }}>{activeReceipt.title} ({activeReceipt.billingMonth})</span>
                  <span style={{ fontWeight: 700 }}>₹{activeReceipt.amount.toFixed(2)}</span>
                </div>
                {activeReceipt.lateFine > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#ef4444' }}>
                    <span>Late Fine ({activeReceipt.daysLate} Days)</span>
                    <span style={{ fontWeight: 700 }}>+₹{activeReceipt.lateFine.toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>Total Paid</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981' }}>₹{activeReceipt.totalAmount.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '0.65rem', color: '#9ca3af' }}>
                  Status: <b>{activeReceipt.status}</b><br/>
                  Verified by: <b>Admin</b>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#1a1a1a', fontWeight: 800, marginBottom: '0.5rem' }}>AUTHORIZED SIGNATORY</div>
                  <div style={{ width: '120px', height: '1px', background: '#1a1a1a' }}></div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setActiveReceipt(null)}
              style={{ width: '100%', padding: '1rem', background: '#1a1a1a', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
              CLOSE RECEIPT
            </button>
          </div>
        </div>
      )}

      {activeTab === 'courses' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Courses</h2>
            <form onSubmit={handleCreateCourse} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <input type="text" required placeholder="Course Name" value={newCourseName} onChange={e => setNewCourseName(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border)', color: 'white', flex: 1 }} />
              <button type="submit" className="btn-primary" disabled={isAddingCourse}>{isAddingCourse ? '...' : 'Add'}</button>
            </form>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {courses.map(course => (
                <div key={course.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontWeight: 'bold' }}>{course.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Batches: {course._count?.batches || 0}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="glass-card" style={{ padding: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Create New Batch</h2>
            <form onSubmit={handleCreateBatch} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="input-group">
                  <label>Batch Name</label>
                  <input type="text" required placeholder="e.g. Morning 2026" value={newBatchName} onChange={e => setNewBatchName(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Course / Program</label>
                  <select required value={newBatchCourseId} onChange={e => setNewBatchCourseId(e.target.value)}>
                    <option value="">Select Course...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Class / Grade</label>
                  <select value={newBatchClassName} onChange={e => setNewBatchClassName(e.target.value)}>
                    <option value="">Select Class...</option>
                    {["6th", "7th", "8th", "9th", "10th", "11th Sci", "11th Com", "12th Sci", "12th Com"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                <div className="input-group">
                  <label>Subjects (Select all that apply)</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                    {["Physics", "Chemistry", "Mathematics", "Biology", "English", "Hindi", "Social Studies", "Accountancy", "Business Studies", "Economics"].map(s => (
                      <label key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={newBatchSubjects.split(',').includes(s)}
                          onChange={e => {
                            const arr = newBatchSubjects ? newBatchSubjects.split(',').filter(Boolean) : [];
                            if (e.target.checked) setNewBatchSubjects([...arr, s].join(','));
                            else setNewBatchSubjects(arr.filter(x => x !== s).join(','));
                          }}
                        />
                        {s}
                      </label>
                    ))}
                    <input 
                      type="text" 
                      placeholder="+ Other" 
                      style={{ width: '80px', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', background: 'transparent', border: '1px dashed var(--border)' }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as any).value.trim();
                          if (val) {
                            setNewBatchSubjects(prev => prev ? `${prev},${val}` : val);
                            (e.target as any).value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="input-group">
                  <label>Monthly Fee (₹)</label>
                  <input type="number" placeholder="e.g. 1500" value={newBatchDefaultFee} onChange={e => setNewBatchDefaultFee(e.target.value)} />
                </div>
              </div>
              
              <div className="input-group">
                <label>Assign Teachers (Check all that apply)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', padding: '0.75rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                  {allTeachers.map(t => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', padding: '6px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', cursor: 'pointer' }}>
                      <input 
                        type="checkbox" 
                        value={t.username} 
                        checked={newBatchTeacherUsername.includes(t.username)}
                        onChange={e => {
                          const val = e.target.value;
                          setNewBatchTeacherUsername(prev => {
                            const arr = prev ? prev.split(',') : [];
                            if (arr.includes(val)) return arr.filter(x => x !== val).join(',');
                            return [...arr, val].join(',');
                          });
                        }}
                      />
                      {t.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="input-group">
                <label>Enroll Students (Select from Database)</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                  {directoryUsers.filter(u => u.role === 'STUDENT').length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No students found in directory.</p>
                  ) : (
                    directoryUsers.filter(u => u.role === 'STUDENT').map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <input 
                          type="checkbox" 
                          value={s.username}
                          checked={newBatchStudentUsernames.split(',').includes(s.username)}
                          onChange={e => {
                            const val = e.target.value;
                            setNewBatchStudentUsernames(prev => {
                              const arr = prev ? prev.split(',').filter(Boolean) : [];
                              if (e.target.checked) return [...arr, val].join(',');
                              return arr.filter(x => x !== val).join(',');
                            });
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.username}</span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <button type="submit" className="btn-primary" disabled={isAddingBatch}>
                {isAddingBatch ? 'Creating...' : 'Create Batch & Finalize'}
              </button>
            </form>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {batches.map(batch => (
                <div key={batch.id} style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.03)', borderRadius: '18px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.2rem' }}>{batch.name}</span>
                      <span style={{ fontSize: '0.75rem', padding: '3px 10px', background: 'var(--primary)', borderRadius: '6px', fontWeight: 700 }}>{batch.className || 'NO CLASS'}</span>
                    </div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                      <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{batch.course?.name}</span> • {batch.subjects || 'All Subjects'}
                    </div>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                      <span title="Enrolled Students">👥 <strong>{batch._count?.students || 0}</strong> Students</span>
                      <span title="Assigned Teachers">👨‍🏫 <strong>{batch.teachers?.length || 0}</strong> Teachers</span>
                      <span title="Weekly Schedule">🗓️ <strong>{batch.schedules?.length || 0}</strong> Slots/Week</span>
                      <span title="Default Batch Fee">💰 <strong>₹{batch.defaultFee || 0}</strong>/mo</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => { setEditingBatch(batch); setShowBatchEditModal(true); }}
                    className="btn-secondary"
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '12px' }}
                  >
                    Manage & Timings
                  </button>
                </div>
              ))}
            </div>
          </div>
          
        </div>
      )}

      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem' }}>
          
          {/* Revenue Trend Chart (CSS Bar Chart) */}
          <div className="glass-card" style={{ padding: '2rem' }}>
             <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Revenue Trends (6 Months)</h3>
             {isReportsLoading ? <div className="spinner"></div> : (
               <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '200px', paddingBottom: '2rem', borderBottom: '1px solid var(--border)' }}>
                  {reportData?.revenueTrend.map((d, i) => {
                    const max = Math.max(...reportData.revenueTrend.map(x => x.amount), 1);
                    const height = (d.amount / max) * 100;
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '40px', gap: '0.5rem' }}>
                         <div style={{ fontSize: '0.7rem', color: '#6366f1', fontWeight: 700 }}>₹{d.amount > 1000 ? (d.amount/1000).toFixed(1)+'k' : d.amount}</div>
                         <div style={{ width: '100%', height: `${height}%`, background: 'linear-gradient(to top, #6366f1, #8B5CF6)', borderRadius: '4px 4px 0 0', transition: 'height 1s ease-out' }}></div>
                         <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>{d.name}</div>
                      </div>
                    );
                  })}
               </div>
             )}
          </div>

          {/* Enrollment by Course */}
          <div className="glass-card" style={{ padding: '2rem' }}>
             <h3 style={{ fontSize: '1.25rem', marginBottom: '2rem' }}>Enrollment by Course</h3>
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {reportData?.enrollmentData.map((d, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 600 }}>{d.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{d.students} Students</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((d.students / 50) * 100, 100)}%`, background: '#10b981' }}></div>
                    </div>
                  </div>
                ))}
             </div>
          </div>

          {/* Attendance Rate Dial */}
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
             <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Global Attendance Rate</h3>
             <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#10b981" strokeWidth="10" strokeDasharray="283" strokeDashoffset={283 - (283 * (reportData?.attendanceRate || 0)) / 100} style={{ transition: 'stroke-dashoffset 2s ease-out' }} />
                </svg>
                <div style={{ position: 'absolute', fontSize: '1.75rem', fontWeight: 800 }}>{(reportData?.attendanceRate || 0).toFixed(1)}%</div>
             </div>
             <p style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Average presence across all active batches.</p>
          </div>

        </div>
      )}

      {activeTab === 'messages' && session?.user && (
        <ChatWindow currentUserId={(session.user as any).id} />
      )}
      {showDelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-card" style={{ width: '400px', padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
            <h3 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Delete Fee Record?</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>This action cannot be undone. The student's fee record will be permanently removed.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                onClick={() => setShowDelModal(false)} 
                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button 
                onClick={deleteFee} 
                disabled={isDeleting}
                style={{ flex: 1, padding: '0.75rem', borderRadius: '12px', background: '#ef4444', border: 'none', color: '#fff', fontWeight: 700, cursor: isDeleting ? 'not-allowed' : 'pointer' }}
              >
                {isDeleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {showProfileModal && editingProfile && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '2rem' }}>
          <div className="glass-card" style={{ width: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '2.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
               <h2 style={{ fontSize: '1.8rem', margin: 0 }}>Student Profile Editor</h2>
               <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <form onSubmit={saveProfile} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
               <div className="input-group">
                 <label>Father's Name</label>
                 <input type="text" value={editingProfile.fatherName || ''} onChange={e => setEditingProfile({...editingProfile, fatherName: e.target.value})} placeholder="Full Name" />
               </div>
               <div className="input-group">
                 <label>Monthly Fee (Base ₹)</label>
                 <input type="number" value={editingProfile.baseFee || ''} onChange={e => setEditingProfile({...editingProfile, baseFee: parseFloat(e.target.value)})} placeholder="e.g. 2500" />
               </div>
               <div className="input-group">
                 <label>Class / Grade</label>
                 <select 
                   value={editingProfile.className || ''} 
                   onChange={e => setEditingProfile({...editingProfile, className: e.target.value})}
                   style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: '#fff' }}
                 >
                   <option value="">Select Class...</option>
                   {["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th", "11th (Sci)", "11th (Com)", "12th (Sci)", "12th (Com)"].map(c => (
                     <option key={c} value={c}>{c}</option>
                   ))}
                 </select>
               </div>
               <div className="input-group">
                 <label>Batch Name</label>
                 <select 
                   value={editingProfile.batch || ''} 
                   onChange={e => setEditingProfile({...editingProfile, batch: e.target.value})}
                   style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: '#fff' }}
                 >
                   <option value="">Select Batch...</option>
                   {batches.map(b => (
                     <option key={b.id} value={b.name}>{b.name}</option>
                   ))}
                 </select>
               </div>
               <div className="input-group">
                 <label>School Name</label>
                 <input type="text" value={editingProfile.school || ''} onChange={e => setEditingProfile({...editingProfile, school: e.target.value})} placeholder="e.g. KV School" />
               </div>
               <div className="input-group">
                 <label>Phone Number</label>
                 <input type="text" value={editingProfile.phone || ''} onChange={e => setEditingProfile({...editingProfile, phone: e.target.value})} placeholder="+91 ..." />
               </div>
               <div className="input-group" style={{ gridColumn: 'span 2' }}>
                 <label>Residential Address</label>
                 <textarea 
                   value={editingProfile.address || ''} 
                   onChange={e => setEditingProfile({...editingProfile, address: e.target.value})} 
                   placeholder="Street, City, Pin"
                   style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: '#fff', minHeight: '80px' }}
                 />
               </div>
               
               <div style={{ gridColumn: 'span 2', display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                 <button type="button" onClick={() => setShowProfileModal(false)} style={{ flex: 1, padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                 <button type="submit" className="btn-primary" disabled={isSavingProfile} style={{ flex: 2, padding: '1rem' }}>
                    {isSavingProfile ? 'Saving Changes...' : 'Save Student Profile'}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}
      {showBatchEditModal && editingBatch && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '2rem' }}>
          <div className="glass-card" style={{ width: '1000px', maxHeight: '95vh', overflowY: 'auto', padding: '3rem', position: 'relative', border: '1px solid var(--primary)' }}>
            <button onClick={() => setShowBatchEditModal(false)} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', border: 'none', color: '#ef4444', width: '40px', height: '40px', borderRadius: '50%', fontSize: '1.5rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>

            <div style={{ marginBottom: '2.5rem' }}>
               <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>Batch Control Center</h2>
               <p style={{ color: 'var(--text-muted)' }}>Configuring <strong>{editingBatch.name}</strong> • {editingBatch.course?.name}</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '3rem' }}>
              
              {/* ── LEFT COLUMN: INFO & ROSTER ───────────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                
                <section>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⚙️ General Configuration</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="input-group">
                      <label>Batch Name</label>
                      <input type="text" value={editingBatch.name} onChange={e => setEditingBatch({...editingBatch, name: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Class</label>
                      <select value={editingBatch.className || ''} onChange={e => setEditingBatch({...editingBatch, className: e.target.value})}>
                        {["6th", "7th", "8th", "9th", "10th", "11th Sci", "11th Com", "12th Sci", "12th Com"].map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <div className="input-group">
                      <label>Subjects</label>
                      <input type="text" value={editingBatch.subjects || ''} onChange={e => setEditingBatch({...editingBatch, subjects: e.target.value})} />
                    </div>
                    <div className="input-group">
                      <label>Default Fee (₹)</label>
                      <input type="number" value={editingBatch.defaultFee || 0} onChange={e => setEditingBatch({...editingBatch, defaultFee: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>👨‍🏫 Teaching Staff</h3>
                  <div style={{ maxHeight: '150px', overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    {allTeachers.map(t => (
                      <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <input 
                          type="checkbox" 
                          checked={editingBatch.teachers?.some((te:any) => te.id === t.id)}
                          onChange={e => {
                            const checked = e.target.checked;
                            const newTeachers = checked ? [...(editingBatch.teachers || []), t] : editingBatch.teachers.filter((te:any) => te.id !== t.id);
                            setEditingBatch({...editingBatch, teachers: newTeachers});
                          }}
                        />
                        <span style={{ fontSize: '0.95rem', fontWeight: 600 }}>{t.name}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({t.username})</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>🎓 Student Roster ({editingBatch.students?.length || 0})</h3>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '16px', border: '1px solid var(--border)' }}>
                    {directoryUsers.filter(u => u.role === 'STUDENT').map(s => (
                      <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <input 
                          type="checkbox" 
                          checked={editingBatch.students?.some((st:any) => st.id === s.id)}
                          onChange={e => {
                            const checked = e.target.checked;
                            const newStudents = checked ? [...(editingBatch.students || []), s] : editingBatch.students.filter((st:any) => st.id !== s.id);
                            setEditingBatch({...editingBatch, students: newStudents});
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.name}</span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{s.username}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </section>
              </div>

              {/* ── RIGHT COLUMN: SCHEDULES & BILLING ────────── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
                
                <section>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>⏰ Weekly Timings</h3>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '20px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <select value={newSchedule.dayOfWeek} onChange={e => setNewSchedule({...newSchedule, dayOfWeek: e.target.value})}>
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((d, i) => <option key={i} value={i+1}>{d}</option>)}
                      </select>
                      <input type="text" placeholder="Room (e.g. Hall A)" value={newSchedule.room} onChange={e => setNewSchedule({...newSchedule, room: e.target.value})} />
                      <input type="time" value={newSchedule.startTime} onChange={e => setNewSchedule({...newSchedule, startTime: e.target.value})} />
                      <input type="time" value={newSchedule.endTime} onChange={e => setNewSchedule({...newSchedule, endTime: e.target.value})} />
                    </div>
                    <button 
                      onClick={async () => {
                        const res = await fetch(`/api/admin/batches/${editingBatch.id}/schedules`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(newSchedule)
                        });
                        if (res.ok) {
                          const data = await res.json();
                          setEditingBatch({...editingBatch, schedules: [...(editingBatch.schedules || []), data.schedule]});
                          setNewSchedule({ dayOfWeek: '1', startTime: '16:00', endTime: '17:00', room: '' });
                          fetchBatches();
                        }
                      }}
                      className="btn-secondary" 
                      style={{ width: '100%', padding: '0.75rem', fontSize: '0.85rem' }}
                    >
                      + Add Time Slot
                    </button>

                    <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Current Schedule</div>
                      {editingBatch.schedules && editingBatch.schedules.length > 0 ? (
                        [...editingBatch.schedules].sort((a:any, b:any) => parseInt(a.dayOfWeek) - parseInt(b.dayOfWeek)).map((s:any) => (
                          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                              <div style={{ width: '45px', textAlign: 'center', fontWeight: 800, color: 'var(--primary)', background: 'rgba(99, 102, 241, 0.1)', padding: '4px', borderRadius: '6px' }}>
                                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][s.dayOfWeek-1]}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 700 }}>{s.startTime} - {s.endTime}</span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Room: {s.room || 'TBA'}</span>
                              </div>
                            </div>
                            <button 
                              onClick={async () => {
                                const res = await fetch(`/api/admin/batches/${editingBatch.id}/schedules?id=${s.id}`, { method: 'DELETE' });
                                if (res.ok) {
                                  setEditingBatch({...editingBatch, schedules: editingBatch.schedules.filter((x:any) => x.id !== s.id)});
                                  fetchBatches();
                                }
                              }}
                              style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'none', borderRadius: '6px', width: '28px', height: '28px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}
                            >
                              🗑
                            </button>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.85rem', border: '1px dashed var(--border)' }}>
                          No timings added yet. Use the form above to add slots.
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>💸 Batch Billing</h3>
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', padding: '1.5rem', borderRadius: '20px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
                      One-click assign a fee of <strong>₹{editingBatch.defaultFee || 0}</strong> to all <strong>{editingBatch.students?.length || 0}</strong> students in this batch.
                    </p>
                    <button 
                      onClick={async () => {
                        if (!confirm(`Assign ₹${editingBatch.defaultFee} fee to all students for ${new Date().toLocaleString('default', { month: 'long' })}?`)) return;
                        const billingMonth = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
                        const dueDate = new Date();
                        dueDate.setDate(12); // standard 12th due date

                        for (const student of editingBatch.students) {
                          await fetch('/api/admin/finances', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              studentUsername: student.username,
                              amount: editingBatch.defaultFee,
                              title: `${editingBatch.name} - Monthly Fee`,
                              billingMonth,
                              dueDate: dueDate.toISOString().split('T')[0]
                            })
                          });
                        }
                        alert('Batch billing completed successfully!');
                        fetchFees();
                      }}
                      className="btn-primary" 
                      style={{ width: '100%', background: 'var(--secondary)', border: 'none' }}
                    >
                      🚀 Assign Monthly Fee to All
                    </button>
                  </div>
                </section>
              </div>
            </div>

            <div style={{ marginTop: '4rem', display: 'flex', gap: '1.5rem' }}>
              <button 
                onClick={async () => {
                  setIsUpdatingBatch(true);
                  try {
                    const res = await fetch('/api/admin/batches', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        id: editingBatch.id,
                        name: editingBatch.name,
                        courseId: editingBatch.courseId,
                        className: editingBatch.className,
                        subjects: editingBatch.subjects,
                        defaultFee: editingBatch.defaultFee,
                        teacherUsernames: editingBatch.teachers.map((t:any) => t.username),
                        studentUsernames: editingBatch.students.map((s:any) => s.username)
                      })
                    });
                    if (res.ok) {
                      setShowBatchEditModal(false);
                      fetchBatches();
                    }
                  } catch (e) {} finally { setIsUpdatingBatch(false); }
                }}
                className="btn-primary"
                disabled={isUpdatingBatch}
                style={{ flex: 1, padding: '1.25rem', fontSize: '1.1rem' }}
              >
                {isUpdatingBatch ? 'Updating Batch Center...' : 'Save All Configurations'}
              </button>
              
              <button 
                onClick={async () => {
                  if (!confirm('Are you sure? This will delete the batch and all schedules.')) return;
                  const res = await fetch(`/api/admin/batches?id=${editingBatch.id}`, { method: 'DELETE' });
                  if (res.ok) {
                    setShowBatchEditModal(false);
                    fetchBatches();
                  }
                }}
                className="btn-secondary"
                style={{ padding: '0 2rem', color: '#ef4444', border: '1px solid #ef4444' }}
              >
                Delete Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
