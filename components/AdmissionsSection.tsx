import { useState, useEffect } from 'react';

interface AdmissionApplication {
  id: string;
  appNumber: string;
  name: string;
  fatherName: string;
  phone: string;
  email: string | null;
  address: string;
  className: string;
  board: string;
  program: string;
  dob: string;
  message?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

interface AdmissionsSectionProps {
  setActiveTab: (tab: string) => void;
  setUserSubTab: (subTab: 'DIRECTORY' | 'CREATE') => void;
  setNewUserRole: (role: 'STUDENT' | 'TEACHER' | 'ADMIN') => void;
  setNewUserName: (name: string) => void;
  setNewStudentClass: (cls: string) => void;
  setNewStudentBoard: (board: string) => void;
  setNewStudentFatherName: (fatherName: string) => void;
  setNewStudentPhone: (phone: string) => void;
  setNewStudentEmail: (email: string) => void;
  setNewStudentAddress: (address: string) => void;
  setNewStudentDob: (dob: string) => void;
}

export function AdmissionsSection({
  setActiveTab,
  setUserSubTab,
  setNewUserRole,
  setNewUserName,
  setNewStudentClass,
  setNewStudentBoard,
  setNewStudentFatherName,
  setNewStudentPhone,
  setNewStudentEmail,
  setNewStudentAddress,
  setNewStudentDob
}: AdmissionsSectionProps) {
  const [applications, setApplications] = useState<AdmissionApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch('/api/admin/admissions');
      const data = await res.json();
      if (res.ok) {
        setApplications(data.applications || []);
      } else {
        setError(data.error || 'Failed to fetch applications');
      }
    } catch (err) {
      setError('Connection error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const handleUpdateStatus = async (id: string, status: 'APPROVED' | 'REJECTED', appData?: AdmissionApplication) => {
    try {
      const res = await fetch('/api/admin/admissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });
      const data = await res.json();
      if (res.ok) {
        setApplications(prev => prev.map(app => app.id === id ? { ...app, status } : app));
        if (selectedApp && selectedApp.id === id) {
          setSelectedApp(prev => prev ? { ...prev, status } : null);
        }

        if (status === 'APPROVED' && appData) {
          // Prefill parent create user state
          setNewUserRole('STUDENT');
          setNewUserName(appData.name);
          setNewStudentClass(appData.className);
          setNewStudentBoard(appData.board);
          setNewStudentFatherName(appData.fatherName);
          setNewStudentPhone(appData.phone);
          setNewStudentEmail(appData.email || '');
          setNewStudentAddress(appData.address);
          setNewStudentDob(appData.dob);

          // Redirect to user creation page
          setActiveTab('users');
          setUserSubTab('CREATE');
        }
      } else {
        alert(data.error || 'Failed to update application status');
      }
    } catch (err) {
      alert('Failed to update status due to network error');
    }
  };

  const filteredApps = applications.filter(app => {
    const matchesFilter = filter === 'ALL' || app.status === filter;
    const matchesSearch = 
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.appNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phone.includes(searchTerm) ||
      app.className.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header Banner */}
      <div className="glass-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(99,102,241,0.05) 100%)', border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🏫 Student Admission Inquiries
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.5rem', maxWidth: '750px', lineHeight: '1.5' }}>
          Manage incoming enrollment inquiries from the public website. Review prospective student records, filter by grade/board, and instantly convert approved inquiries into student profiles with auto-generated registration details.
        </p>
      </div>

      {error && (
        <div style={{ padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: selectedApp ? '3fr 2fr' : '1fr', gap: '2rem', transition: 'all 0.3s ease' }}>
        
        {/* Inquiry List */}
        <div className="glass-card" style={{ padding: '2rem' }}>
          {/* Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--input-bg)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: filter === tab ? '#ef4444' : 'transparent',
                    color: filter === tab ? '#fff' : 'var(--text-muted)',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Search */}
            <input 
              type="text" 
              placeholder="Search by name, app#, phone, class..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{
                maxWidth: '300px',
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                background: 'var(--input-bg)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                fontSize: '0.85rem'
              }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              🌀 Fetching admissions record...
            </div>
          ) : filteredApps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              No inquiries found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>App No.</th>
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>Applicant Name</th>
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>Applied For</th>
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>Contact</th>
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>Status</th>
                    <th style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApps.map(app => (
                    <tr 
                      key={app.id} 
                      onClick={() => setSelectedApp(app)}
                      style={{ 
                        borderBottom: '1px solid var(--border)', 
                        cursor: 'pointer',
                        background: selectedApp?.id === app.id ? 'rgba(239, 68, 68, 0.04)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 800, color: '#ef4444' }}>
                        {app.appNumber}
                      </td>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 600 }}>
                        {app.name}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        {app.className} ({app.board})
                      </td>
                      <td style={{ padding: '1rem 0.5rem', color: 'var(--text-muted)' }}>
                        {app.phone}
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span style={{
                          padding: '0.25rem 0.6rem',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          background: app.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.1)' : app.status === 'REJECTED' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: app.status === 'APPROVED' ? '#10b981' : app.status === 'REJECTED' ? '#ef4444' : '#f59e0b'
                        }}>
                          {app.status}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setSelectedApp(app)}
                          style={{
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)',
                            color: 'var(--text)',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            marginRight: '0.5rem'
                          }}
                        >
                          Details
                        </button>
                        {app.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'APPROVED', app)}
                              style={{
                                background: '#ef4444',
                                border: 'none',
                                color: '#fff',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                marginRight: '0.5rem'
                              }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(app.id, 'REJECTED')}
                              style={{
                                background: 'rgba(239, 68, 68, 0.1)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                color: '#ef4444',
                                padding: '0.35rem 0.75rem',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.8rem',
                                fontWeight: 700
                              }}
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Details Panel */}
        {selectedApp && (
          <div className="glass-card animate-scale-up" style={{ padding: '2rem', height: 'fit-content', position: 'sticky', top: '2rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Application Details</h3>
              <button 
                onClick={() => setSelectedApp(null)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Application No</span>
                <strong style={{ color: '#ef4444' }}>{selectedApp.appNumber}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status</span>
                <span style={{
                  fontWeight: 700,
                  color: selectedApp.status === 'APPROVED' ? '#10b981' : selectedApp.status === 'REJECTED' ? '#ef4444' : '#f59e0b'
                }}>{selectedApp.status}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Student Name</span>
                <strong>{selectedApp.name}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Father's Name</span>
                <strong>{selectedApp.fatherName}</strong>
              </div>
              {selectedApp.message && (
                <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Message / Query</span>
                  <strong style={{ marginTop: '0.25rem', whiteSpace: 'pre-wrap' }}>{selectedApp.message}</strong>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Date of Birth</span>
                <strong>{selectedApp.dob}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Contact Phone</span>
                <strong>{selectedApp.phone}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Email Address</span>
                <strong>{selectedApp.email || 'N/A'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Class / Grade</span>
                <strong>{selectedApp.className}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Board</span>
                <strong>{selectedApp.board}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Academic Program</span>
                <strong>{selectedApp.program}</strong>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Residential Address</span>
                <span style={{ lineHeight: 1.4 }}>{selectedApp.address}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Applied On</span>
                <strong>{new Date(selectedApp.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })}</strong>
              </div>
            </div>

            {selectedApp.status === 'PENDING' && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button
                  onClick={() => handleUpdateStatus(selectedApp.id, 'APPROVED', selectedApp)}
                  style={{
                    flex: 1,
                    background: '#ef4444',
                    border: 'none',
                    color: '#fff',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 700
                  }}
                >
                  ✅ Approve & Register
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedApp.id, 'REJECTED')}
                  style={{
                    flex: 1,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#ef4444',
                    padding: '0.75rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    fontWeight: 700
                  }}
                >
                  ❌ Reject Inquiry
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
