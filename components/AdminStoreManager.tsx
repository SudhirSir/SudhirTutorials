"use client";

import { useState, useEffect } from 'react';

export function AdminStoreManager() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'sales' | 'customers'>('inventory');
  const [items, setItems] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [type, setType] = useState('NOTES');
  const [price, setPrice] = useState('');
  const [className, setClassName] = useState('');
  const [board, setBoard] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  
  // Test specific
  const [totalTests, setTotalTests] = useState('1');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [totalMarks, setTotalMarks] = useState('100');

  // Test Builder
  const [managingSeriesItem, setManagingSeriesItem] = useState<any>(null);
  const [managingTest, setManagingTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState('0');
  const [marks, setMarks] = useState('1');
  const [explanation, setExplanation] = useState('');

  // Customer Edit/Delete state
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [savingCust, setSavingCust] = useState(false);
  const [deletingCust, setDeletingCust] = useState(false);
  const [custError, setCustError] = useState('');

  const handleSelectCustomer = (cust: any) => {
    setSelectedCustomer(cust);
    setCustName(cust.name || '');
    setCustEmail(cust.studentProfile?.email || '');
    setCustPhone(cust.studentProfile?.phone || '');
    setCustError('');
  };

  const handleSaveCustomer = async () => {
    if (!custName.trim()) {
      setCustError('Name is required');
      return;
    }
    if (custPhone && !/^\d{10}$/.test(custPhone)) {
      setCustError('Phone number must be exactly 10 digits');
      return;
    }

    setSavingCust(true);
    setCustError('');
    try {
      const res = await fetch(`/api/admin/students/${selectedCustomer.username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: custName,
          email: custEmail || null,
          phone: custPhone || null
        })
      });
      if (res.ok) {
        await fetchCustomers();
        setSelectedCustomer(null);
      } else {
        const err = await res.json();
        setCustError(err.error || 'Failed to save customer');
      }
    } catch (e: any) {
      setCustError(e.message || 'Error saving changes');
    } finally {
      setSavingCust(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!confirm('Are you sure you want to permanently delete this storefront customer account? This will cascade delete all their purchases, test submissions, and profile details.')) {
      return;
    }

    setDeletingCust(true);
    setCustError('');
    try {
      const res = await fetch(`/api/admin/students/${selectedCustomer.username}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchCustomers();
        setSelectedCustomer(null);
      } else {
        const err = await res.json();
        setCustError(err.error || 'Failed to delete customer');
      }
    } catch (e: any) {
      setCustError(e.message || 'Error deleting customer');
    } finally {
      setDeletingCust(false);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchSales();
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/admin/store/sales?mode=customers');
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/store');
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
    fetchCustomers();
  };

  const fetchSales = async () => {
    try {
      const res = await fetch('/api/admin/store/sales');
      if (res.ok) {
        const data = await res.json();
        setSales(data.purchases);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadingFile(true);
    let finalFileUrl = fileUrl;

    if (type === 'NOTES' && selectedFile) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      try {
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        if (uploadRes.ok) {
          const data = await uploadRes.json();
          finalFileUrl = data.fileUrl;
        } else {
          const errData = await uploadRes.json().catch(() => ({}));
          alert(errData.error || 'Failed to upload file');
          setUploadingFile(false);
          return;
        }
      } catch (err) {
        console.error(err);
        alert('Error uploading file');
        setUploadingFile(false);
        return;
      }
    }

    try {
      const payload: any = {
        title, type, price: parseFloat(price), className, board, description, fileUrl: finalFileUrl, isPublished,
        durationMinutes, totalMarks, totalTests
      };
      
      const url = editingItem ? `/api/admin/store?id=${editingItem.id}` : '/api/admin/store';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setIsFormOpen(false);
        setEditingItem(null);
        resetForm();
        setUploadingFile(false);
        fetchItems();
      } else {
        alert('Failed to save item');
        setUploadingFile(false);
      }
    } catch (err) {
      console.error(err);
      setUploadingFile(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this store item?')) return;
    try {
      const res = await fetch(`/api/admin/store?id=${id}`, { method: 'DELETE' });
      if (res.ok) fetchItems();
    } catch (e) { console.error(e); }
  };

  const resetForm = () => {
    setTitle(''); setType('NOTES'); setPrice(''); setClassName(''); setBoard('');
    setDescription(''); setFileUrl(''); setSelectedFile(null); setIsPublished(false);
    setDurationMinutes('60'); setTotalMarks('100'); setTotalTests('1');
  };

  const openEdit = (item: any) => {
    setEditingItem(item);
    setTitle(item.title);
    setType(item.type);
    setPrice(item.price.toString());
    setClassName(item.className || '');
    setBoard(item.board || '');
    setDescription(item.description || '');
    setFileUrl(item.fileUrl || '');
    setSelectedFile(null);
    setIsPublished(item.isPublished);
    if (item.type === 'TEST_SERIES' && item.onlineTests?.[0]) {
      setDurationMinutes(item.onlineTests[0].durationMinutes.toString());
      setTotalMarks(item.onlineTests[0].totalMarks.toString());
    }
    setIsFormOpen(true);
  };

  // Test Builder logic
  const loadTestQuestions = async (testId: string) => {
    try {
      const res = await fetch(`/api/admin/store/test?testId=${testId}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions);
      }
    } catch (e) { console.error(e); }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingTest) return;
    try {
      const res = await fetch('/api/admin/store/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          onlineTestId: managingTest.id,
          questionText,
          options,
          correctOption,
          marks,
          explanation
        })
      });
      if (res.ok) {
        setQuestionText('');
        setOptions(['', '', '', '']);
        setCorrectOption('0');
        setExplanation('');
        loadTestQuestions(managingTest.id);
        fetchItems(); // refresh counts
      } else {
        alert('Failed to add question');
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteQuestion = async (qId: string) => {
    try {
      const res = await fetch(`/api/admin/store/test?id=${qId}`, { method: 'DELETE' });
      if (res.ok && managingTest) {
        loadTestQuestions(managingTest.id);
        fetchItems();
      }
    } catch (e) { console.error(e); }
  };

  if (managingTest) {
    return (
      <div className="glass-card" style={{ padding: '2rem' }}>
        <button onClick={() => setManagingTest(null)} style={{ marginBottom: '1rem', background: 'transparent', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>
          ← Back
        </button>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Test Builder: {managingTest.title}</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Add Question</h3>
            <form onSubmit={handleAddQuestion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="input-group">
                <label>Question Text</label>
                <textarea required value={questionText} onChange={e => setQuestionText(e.target.value)} rows={3} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', display: 'block' }}>Options</label>
                {options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input type="radio" name="correctOpt" checked={correctOption === i.toString()} onChange={() => setCorrectOption(i.toString())} />
                    <input type="text" required placeholder={`Option ${i+1}`} value={opt} onChange={e => {
                      const newOpts = [...options];
                      newOpts[i] = e.target.value;
                      setOptions(newOpts);
                    }} style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
                  </div>
                ))}
              </div>
              <div className="input-group">
                <label>Marks for this Question</label>
                <input type="number" required value={marks} onChange={e => setMarks(e.target.value)} />
              </div>
              <div className="input-group">
                <label>Explanation (Optional, shown if wrong)</label>
                <textarea value={explanation} onChange={e => setExplanation(e.target.value)} rows={2} placeholder="Explain why the correct answer is right..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--input-bg)', color: 'var(--text)' }} />
              </div>
              <button type="submit" className="btn-primary">Add Question</button>
            </form>
          </div>

          <div className="glass-card" style={{ padding: '1.5rem', maxHeight: '600px', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '1rem' }}>Existing Questions ({questions.length})</h3>
            {questions.map((q, idx) => (
              <div key={q.id} style={{ background: 'rgba(0,0,0,0.1)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <strong style={{ fontSize: '1.05rem' }}>Q{idx + 1}. {q.questionText}</strong>
                  <button onClick={() => handleDeleteQuestion(q.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem' }}>🗑</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
                  {JSON.parse(q.options).map((opt: string, i: number) => (
                    <div key={i} style={{ padding: '0.5rem', background: q.correctOption === i ? 'rgba(16,185,129,0.2)' : 'var(--input-bg)', border: q.correctOption === i ? '1px solid #10b981' : '1px solid var(--border)', borderRadius: '6px' }}>
                      {opt} {q.correctOption === i && '✓'}
                    </div>
                  ))}
                </div>
                {q.explanation && <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}><em>Explanation: {q.explanation}</em></div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (managingSeriesItem) {
    return (
      <div className="glass-card" style={{ padding: '2rem' }}>
        <button onClick={() => setManagingSeriesItem(null)} style={{ marginBottom: '1rem', background: 'transparent', border: '1px solid var(--border)', padding: '0.5rem 1rem', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer' }}>
          ← Back to Store Manager
        </button>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Tests in Series: {managingSeriesItem.title}</h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Manage the questions inside each test belonging to this series.</p>
        
        <div style={{ display: 'grid', gap: '1rem' }}>
          {managingSeriesItem.onlineTests?.map((t: any) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '1rem', borderRadius: '12px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '1.1rem' }}>{t.title}</h4>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  {t.durationMinutes} mins • {t.totalMarks} marks • {t._count?.questions || 0} Questions
                </div>
              </div>
              <button 
                onClick={() => {
                  setManagingTest(t);
                  loadTestQuestions(t.id);
                }} 
                className="btn-primary" 
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: 'none', fontWeight: 600 }}
              >
                Manage Questions
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>E-Commerce Store Manager</h2>
          <p style={{ color: 'var(--text-muted)' }}>Publish premium Notes and Test Series to the storefront.</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', background: 'var(--glass-bg)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <button 
              onClick={() => setActiveTab('inventory')}
              style={{ padding: '0.6rem 1.25rem', background: activeTab === 'inventory' ? 'var(--primary)' : 'transparent', color: activeTab === 'inventory' ? '#fff' : 'var(--text)', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
              Inventory
            </button>
            <button 
              onClick={() => setActiveTab('sales')}
              style={{ padding: '0.6rem 1.25rem', background: activeTab === 'sales' ? 'var(--primary)' : 'transparent', color: activeTab === 'sales' ? '#fff' : 'var(--text)', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
              Sales & Purchases
            </button>
            <button 
              onClick={() => setActiveTab('customers')}
              style={{ padding: '0.6rem 1.25rem', background: activeTab === 'customers' ? 'var(--primary)' : 'transparent', color: activeTab === 'customers' ? '#fff' : 'var(--text)', border: 'none', fontWeight: 700, cursor: 'pointer' }}
            >
              Store Customers
            </button>
          </div>
          {activeTab === 'inventory' && (
            <button className="btn-primary" onClick={() => { resetForm(); setEditingItem(null); setIsFormOpen(!isFormOpen); }}>
              {isFormOpen ? 'Close Form' : '+ Add New Item'}
            </button>
          )}
        </div>
      </div>

      {activeTab === 'sales' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Sales History</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Date</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Student Name</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Item Purchased</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Payment ID</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>{new Date(sale.purchasedAt).toLocaleDateString()}</td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{sale.student?.name}</td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                      <div>{sale.storeItem?.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{sale.storeItem?.type} • {sale.storeItem?.className}</div>
                    </td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>{sale.razorpayPaymentId || 'N/A'}</td>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>₹{sale.amountPaid}</td>
                  </tr>
                ))}
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No sales recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'customers' && (
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Registered Storefront Customers</h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Date Joined</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Name</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Username</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Contact</th>
                  <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right' }}>Total Spent</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => {
                  const totalSpent = cust.storePurchases?.reduce((sum: number, p: any) => sum + (p.amount || 0), 0) || 0;
                  return (
                    <tr 
                      key={cust.id} 
                      onClick={() => handleSelectCustomer(cust)}
                      style={{ cursor: 'pointer', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>{new Date(cust.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>{cust.name || 'N/A'}</td>
                      <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontFamily: 'monospace', fontSize: '0.85rem' }}>{cust.username}</td>
                      <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                        <div>{cust.studentProfile?.email}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{cust.studentProfile?.phone || 'No phone'}</div>
                      </td>
                      <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 800, color: 'var(--primary)' }}>₹{totalSpent}</td>
                    </tr>
                  );
                })}
                {customers.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No storefront customers registered yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'inventory' && isFormOpen && (
        <div className="glass-card" style={{ padding: '2rem', animation: 'fadeIn 0.3s' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>{editingItem ? 'Edit Store Item' : 'Create Store Item'}</h3>
          <form onSubmit={handleSaveItem} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="input-group">
              <label>Title</label>
              <input type="text" required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Complete Physics Notes" />
            </div>
            <div className="input-group">
              <label>Type</label>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden', padding: '3px', height: '48px', alignItems: 'center' }}>
                <button
                  type="button"
                  disabled={!!editingItem}
                  onClick={() => setType('NOTES')}
                  style={{
                    flex: 1,
                    height: '100%',
                    padding: '0.5rem',
                    background: type === 'NOTES' ? 'var(--primary)' : 'transparent',
                    color: type === 'NOTES' ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: editingItem ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '0.9rem'
                  }}
                >
                  Notes (PDF)
                </button>
                <button
                  type="button"
                  disabled={!!editingItem}
                  onClick={() => setType('TEST_SERIES')}
                  style={{
                    flex: 1,
                    height: '100%',
                    padding: '0.5rem',
                    background: type === 'TEST_SERIES' ? 'var(--primary)' : 'transparent',
                    color: type === 'TEST_SERIES' ? '#fff' : 'var(--text-muted)',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    cursor: editingItem ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    fontSize: '0.9rem'
                  }}
                >
                  Test Series
                </button>
              </div>
            </div>
            <div className="input-group">
              <label>Price (₹)</label>
              <input type="number" required value={price} onChange={e => setPrice(e.target.value)} placeholder="e.g. 499" />
            </div>
            <div className="input-group">
              <label>Class/Grade</label>
              <input type="text" value={className} onChange={e => setClassName(e.target.value)} placeholder="e.g. 12th" />
            </div>
            <div className="input-group">
              <label>Board</label>
              <input type="text" value={board} onChange={e => setBoard(e.target.value)} placeholder="e.g. CBSE" />
            </div>
            {type === 'NOTES' && (
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Upload Notes PDF</label>
                {fileUrl && !selectedFile && (
                  <div style={{ marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                    Current File: <a href={fileUrl} target="_blank" style={{ color: 'var(--primary)' }}>{fileUrl}</a>
                  </div>
                )}
                <input type="file" accept=".pdf" onChange={e => {
                  if (e.target.files && e.target.files[0]) {
                    setSelectedFile(e.target.files[0]);
                  }
                }} required={!fileUrl} />
              </div>
            )}
            {type === 'TEST_SERIES' && (
              <>
                {!editingItem && (
                  <div className="input-group">
                    <label>Total Number of Tests in Series</label>
                    <input type="number" required value={totalTests} onChange={e => setTotalTests(e.target.value)} min="1" max="50" />
                  </div>
                )}
                <div className="input-group">
                  <label>Default Test Duration (Minutes)</label>
                  <input type="number" required value={durationMinutes} onChange={e => setDurationMinutes(e.target.value)} />
                </div>
                <div className="input-group">
                  <label>Total Marks</label>
                  <input type="number" required value={totalMarks} onChange={e => setTotalMarks(e.target.value)} />
                </div>
                <div style={{ gridColumn: '1 / -1', background: 'rgba(59, 130, 246, 0.1)', border: '1px dashed rgba(59, 130, 246, 0.4)', padding: '1rem', borderRadius: '8px', color: '#3b82f6', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  <strong>ℹ️ How to add MCQ questions:</strong> After you click "Create Item" below, you will see this series in your inventory list. Click the blue <strong>"Manage Tests"</strong> button there to add questions to each specific test.
                </div>
              </>
            )}
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label>Description</label>
              <textarea rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this include?" style={{ width: '100%', padding: '0.85rem', borderRadius: '12px', background: 'var(--input-bg)', color: 'var(--text)', border: '1px solid var(--border)' }} />
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1', flexDirection: 'row', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} id="publishCheck" style={{ width: '1.2rem', height: '1.2rem' }} />
              <label htmlFor="publishCheck" style={{ margin: 0, cursor: 'pointer' }}>Publish to Storefront immediately</label>
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <button type="submit" className="btn-primary" disabled={uploadingFile} style={{ width: '100%', padding: '1rem', fontSize: '1.1rem' }}>
                {uploadingFile ? 'Uploading...' : (editingItem ? 'Update Item' : 'Create Item')}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'inventory' && (loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem', width: '30px', height: '30px', border: '3px solid rgba(255,255,255,0.1)', borderTop: '3px solid var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div>Loading store items...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {items.map(item => (
            <div key={item.id} className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', position: 'relative' }}>
              <div style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 800, background: item.isPublished ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: item.isPublished ? '#10b981' : '#fbbf24' }}>
                {item.isPublished ? 'PUBLISHED' : 'DRAFT'}
              </div>
              <h3 style={{ fontSize: '1.2rem', marginRight: '4rem', marginBottom: '0.25rem' }}>{item.title}</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>{item.className} • {item.board}</div>
              
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>₹{item.price}</div>
              
              <div style={{ padding: '0.5rem', background: 'var(--input-bg)', borderRadius: '8px', fontSize: '0.8rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem' }}>{item.type === 'NOTES' ? '📄' : '📝'}</span>
                {item.type === 'NOTES' ? 'Study Notes (PDF/Link)' : `Online Test Series`}
              </div>

              {item.type === 'TEST_SERIES' && item.onlineTests && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  {item.onlineTests.length} Tests in Series
                </div>
              )}

              <div style={{ marginTop: 'auto', display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => openEdit(item)} style={{ flex: 1, padding: '0.6rem', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                <button onClick={() => handleDelete(item.id)} style={{ padding: '0.6rem', background: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }}>🗑</button>
              </div>
              {item.type === 'TEST_SERIES' && item.onlineTests && (
                <button 
                  onClick={() => {
                    setManagingSeriesItem(item);
                  }} 
                  className="btn-primary" 
                  style={{ marginTop: '0.5rem', width: '100%', padding: '0.75rem', borderRadius: '8px', border: 'none', fontWeight: 600 }}
                >
                  Manage Tests
                </button>
              )}
            </div>
          ))}
          {items.length === 0 && <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '2rem' }}>No store items found.</div>}
        </div>
      ))}
      {selectedCustomer && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', borderRadius: '24px', background: 'rgba(20, 20, 25, 0.95)', border: '1px solid var(--glass-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', animation: 'scaleUp 0.3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Customer Profile & Settings</h3>
              <button onClick={() => setSelectedCustomer(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '1.5rem', cursor: 'pointer', padding: '4px' }}>&times;</button>
            </div>
            
            {custError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1rem', fontSize: '0.9rem' }}>
                {custError}
              </div>
            )}
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Username (Read Only)</label>
                <input type="text" readOnly value={selectedCustomer.username} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'not-allowed', fontFamily: 'monospace' }} />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Name</label>
                <input type="text" value={custName} onChange={e => setCustName(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} placeholder="Enter name" />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email</label>
                <input type="email" value={custEmail} onChange={e => setCustEmail(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} placeholder="email@example.com" />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Phone Number (10 digits)</label>
                <input type="text" value={custPhone} onChange={e => setCustPhone(e.target.value)} style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text)' }} placeholder="10-digit number" />
              </div>

              <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid var(--border)', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span>Joined Date:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{new Date(selectedCustomer.createdAt).toLocaleDateString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Purchases:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{selectedCustomer.storePurchases?.length || 0}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button 
                  onClick={handleDeleteCustomer}
                  disabled={deletingCust}
                  style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: 'none', background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontWeight: 700, cursor: 'pointer', flex: 1 }}
                >
                  {deletingCust ? 'Deleting...' : 'Delete Account'}
                </button>
                
                <button 
                  onClick={handleSaveCustomer}
                  disabled={savingCust}
                  style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', border: 'none', background: 'var(--primary)', color: '#fff', fontWeight: 700, cursor: 'pointer', flex: 1 }}
                >
                  {savingCust ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
