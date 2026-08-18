"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import Card from "./ui/Card";
import Input, { Select, Textarea } from "./ui/Input";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";
import Tabs from "./ui/Tabs";

export function AdminStoreManager() {
  const [activeTab, setActiveTab] = useState<"inventory" | "sales" | "customers">("inventory");
  const [items, setItems] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [type, setType] = useState("NOTES");
  const [price, setPrice] = useState("");
  const [className, setClassName] = useState("");
  const [board, setBoard] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [isPublished, setIsPublished] = useState(false);

  // Test specific
  const [totalTests, setTotalTests] = useState("1");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [totalMarks, setTotalMarks] = useState("100");

  // Test Builder
  const [managingSeriesItem, setManagingSeriesItem] = useState<any>(null);
  const [managingTest, setManagingTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState("0");
  const [marks, setMarks] = useState("1");
  const [explanation, setExplanation] = useState("");

  // Customer Edit/Delete state
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [custName, setCustName] = useState("");
  const [custEmail, setCustEmail] = useState("");
  const [custPhone, setCustPhone] = useState("");
  const [savingCust, setSavingCust] = useState(false);
  const [deletingCust, setDeletingCust] = useState(false);
  const [custError, setCustError] = useState("");

  // --- Callbacks ---

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/store/sales?mode=customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers);
      }
    } catch (e) {
      console.error("Error fetching customers:", e);
    }
  }, []);

  const fetchSales = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/store/sales");
      if (res.ok) {
        const data = await res.json();
        setSales(data.purchases);
      }
    } catch (e) {
      console.error("Error fetching sales:", e);
    }
  }, []);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/store");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items);
      }
    } catch (e) {
      console.error("Error fetching items:", e);
    }
    setLoading(false);
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchItems();
    fetchSales();
  }, [fetchItems, fetchSales]);

  const handleSelectCustomer = useCallback((cust: any) => {
    setSelectedCustomer(cust);
    setCustName(cust.name || "");
    setCustEmail(cust.studentProfile?.email || "");
    setCustPhone(cust.studentProfile?.phone || "");
    setCustError("");
  }, []);

  const handleSaveCustomer = useCallback(async () => {
    if (!custName.trim()) {
      setCustError("Name is required");
      return;
    }
    if (custPhone && !/^\d{10}$/.test(custPhone)) {
      setCustError("Phone number must be exactly 10 digits");
      return;
    }

    setSavingCust(true);
    setCustError("");
    try {
      const res = await fetch(`/api/admin/students/${selectedCustomer.username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
        setCustError(err.error || "Failed to save customer");
      }
    } catch (e: any) {
      setCustError(e.message || "Error saving changes");
    } finally {
      setSavingCust(false);
    }
  }, [selectedCustomer, custName, custEmail, custPhone, fetchCustomers]);

  const handleDeleteCustomer = useCallback(async () => {
    if (
      !confirm(
        "Are you sure you want to permanently delete this storefront customer account? This will cascade delete all their purchases, test submissions, and profile details."
      )
    ) {
      return;
    }

    setDeletingCust(true);
    setCustError("");
    try {
      const res = await fetch(`/api/admin/students/${selectedCustomer.username}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await fetchCustomers();
        setSelectedCustomer(null);
      } else {
        const err = await res.json();
        setCustError(err.error || "Failed to delete customer");
      }
    } catch (e: any) {
      setCustError(e.message || "Error deleting customer");
    } finally {
      setDeletingCust(false);
    }
  }, [selectedCustomer, fetchCustomers]);

  const resetForm = useCallback(() => {
    setTitle("");
    setType("NOTES");
    setPrice("");
    setClassName("");
    setBoard("");
    setDescription("");
    setFileUrl("");
    setSelectedFile(null);
    setIsPublished(false);
    setDurationMinutes("60");
    setTotalMarks("100");
    setTotalTests("1");
  }, []);

  const handleSaveItem = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setUploadingFile(true);
      let finalFileUrl = fileUrl;

      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        try {
          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData
          });
          if (uploadRes.ok) {
            const data = await uploadRes.json();
            finalFileUrl = data.fileUrl;
          } else {
            const errData = await uploadRes.json().catch(() => ({}));
            alert(errData.error || "Failed to upload file");
            setUploadingFile(false);
            return;
          }
        } catch (err) {
          console.error(err);
          alert("Error uploading file");
          setUploadingFile(false);
          return;
        }
      }

      try {
        const payload: any = {
          title,
          type,
          price: parseFloat(price),
          className,
          board,
          description,
          fileUrl: finalFileUrl,
          isPublished,
          durationMinutes,
          totalMarks,
          totalTests
        };

        const url = editingItem
          ? `/api/admin/store?id=${editingItem.id}`
          : "/api/admin/store";
        const method = editingItem ? "PUT" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          setIsFormOpen(false);
          setEditingItem(null);
          resetForm();
          setUploadingFile(false);
          fetchItems();
        } else {
          alert("Failed to save item");
          setUploadingFile(false);
        }
      } catch (err) {
        console.error(err);
        setUploadingFile(false);
      }
    },
    [
      fileUrl,
      type,
      selectedFile,
      title,
      price,
      className,
      board,
      description,
      isPublished,
      durationMinutes,
      totalMarks,
      totalTests,
      editingItem,
      resetForm,
      fetchItems
    ]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Are you sure you want to delete this store item?")) return;
      try {
        const res = await fetch(`/api/admin/store?id=${id}`, { method: "DELETE" });
        if (res.ok) fetchItems();
      } catch (e) {
        console.error(e);
      }
    },
    [fetchItems]
  );

  const openEdit = useCallback((item: any) => {
    setEditingItem(item);
    setTitle(item.title);
    setType(item.type);
    setPrice(item.price.toString());
    setClassName(item.className || "");
    setBoard(item.board || "");
    setDescription(item.description || "");
    setFileUrl(item.fileUrl || "");
    setSelectedFile(null);
    setIsPublished(item.isPublished);
    if (item.type === "TEST_SERIES" && item.onlineTests?.[0]) {
      setDurationMinutes(item.onlineTests[0].durationMinutes.toString());
      setTotalMarks(item.onlineTests[0].totalMarks.toString());
    }
    setIsFormOpen(true);
  }, []);

  const loadTestQuestions = useCallback(async (testId: string) => {
    try {
      const res = await fetch(`/api/admin/store/test?testId=${testId}`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data.questions);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const handleAddQuestion = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!managingTest) return;
      try {
        const res = await fetch("/api/admin/store/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
          setQuestionText("");
          setOptions(["", "", "", ""]);
          setCorrectOption("0");
          setExplanation("");
          loadTestQuestions(managingTest.id);
          fetchItems();
        } else {
          alert("Failed to add question");
        }
      } catch (e) {
        console.error(e);
      }
    },
    [managingTest, questionText, options, correctOption, marks, explanation, loadTestQuestions, fetchItems]
  );

  const handleDeleteQuestion = useCallback(
    async (qId: string) => {
      try {
        const res = await fetch(`/api/admin/store/test?id=${qId}`, { method: "DELETE" });
        if (res.ok && managingTest) {
          loadTestQuestions(managingTest.id);
          fetchItems();
        }
      } catch (e) {
        console.error(e);
      }
    },
    [managingTest, loadTestQuestions, fetchItems]
  );

  // --- Memoized Derived Metrics ---

  const totalRevenue = useMemo(() => {
    return sales.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
  }, [sales]);

  const tabList = useMemo(
    () => [
      { id: "inventory", label: "Inventory / Items", count: items.length },
      { id: "sales", label: "Sales & Revenue", count: sales.length },
      { id: "customers", label: "Store Customers", count: customers.length }
    ],
    [items.length, sales.length, customers.length]
  );

  if (loading && items.length === 0) {
    return <Spinner center size="lg" />;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Top Header Bar */}
      <Card variant="glass">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 800, margin: 0, color: "var(--text-heading)" }}>
              🛍️ Store Manager
            </h2>
            <p style={{ margin: "0.25rem 0 0 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Manage notes, test series, storefront customers, and check sales analytics.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ 
              padding: "0.35rem 0.85rem", 
              textAlign: "center", 
              background: "rgba(34, 197, 94, 0.08)", 
              border: "1px solid rgba(34, 197, 94, 0.2)", 
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem"
            }}>
              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Total Revenue:</span>
              <span style={{ fontSize: "0.95rem", fontWeight: 800, color: "#22c55e" }}>₹{totalRevenue.toLocaleString()}</span>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon="➕"
              onClick={() => {
                resetForm();
                setEditingItem(null);
                setIsFormOpen(true);
              }}
              style={{ padding: "0.35rem 0.85rem", fontSize: "0.8rem" }}
            >
              Add Item
            </Button>
          </div>
        </div>
      </Card>

      {/* Tabs Navigation */}
      <Tabs
        tabs={tabList}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as any)}
      />

      {/* Tab 1: Inventory */}
      {activeTab === "inventory" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
          {items.map((item) => (
            <Card key={item.id} variant="glass" interactive>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <Badge variant={item.type === "NOTES" ? "info" : "warning"}>
                  {item.type === "NOTES" ? "📄 Notes PDF" : "📝 Test Series"}
                </Badge>
                <Badge variant={item.isPublished ? "success" : "neutral"}>
                  {item.isPublished ? "Published" : "Draft"}
                </Badge>
              </div>

              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "var(--text-heading)" }}>
                {item.title}
              </h3>
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", margin: "0 0 1rem 0", minHeight: "2.5rem" }}>
                {item.description || "No description provided."}
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "0.75rem", borderTop: "1px solid var(--border)" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>PRICE</span>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--primary)" }}>
                    {item.price === 0 ? "FREE" : `₹${item.price}`}
                  </span>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {item.type === "TEST_SERIES" && item.onlineTests?.[0] && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setManagingSeriesItem(item);
                        setManagingTest(item.onlineTests[0]);
                        loadTestQuestions(item.onlineTests[0].id);
                      }}
                    >
                      Build Test ({item.onlineTests[0].questions?.length || 0} Qs)
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => handleDelete(item.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Tab 2: Sales */}
      {activeTab === "sales" && (
        <Card variant="glass">
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem" }}>Purchases & Sales Ledger</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.75rem" }}>User</th>
                  <th style={{ padding: "0.75rem" }}>Item</th>
                  <th style={{ padding: "0.75rem" }}>Amount</th>
                  <th style={{ padding: "0.75rem" }}>Date</th>
                  <th style={{ padding: "0.75rem" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.75rem", fontWeight: 600 }}>{sale.user?.name || sale.user?.username || "Unknown User"}</td>
                    <td style={{ padding: "0.75rem" }}>{sale.storeItem?.title || "Store Item"}</td>
                    <td style={{ padding: "0.75rem", fontWeight: 700, color: "#22c55e" }}>₹{sale.amountPaid}</td>
                    <td style={{ padding: "0.75rem", color: "var(--text-muted)" }}>{new Date(sale.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "0.75rem" }}><Badge variant="success">Completed</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Tab 3: Customers */}
      {activeTab === "customers" && (
        <Card variant="glass">
          <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "1rem" }}>Storefront Registered Users</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "0.75rem" }}>Name</th>
                  <th style={{ padding: "0.75rem" }}>Username / ID</th>
                  <th style={{ padding: "0.75rem" }}>Email</th>
                  <th style={{ padding: "0.75rem" }}>Phone</th>
                  <th style={{ padding: "0.75rem" }}>Purchases</th>
                  <th style={{ padding: "0.75rem" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((cust) => (
                  <tr key={cust.id} style={{ borderBottom: "1px solid var(--border)" }}>
                    <td style={{ padding: "0.75rem", fontWeight: 600 }}>{cust.name}</td>
                    <td style={{ padding: "0.75rem", color: "var(--text-muted)" }}>{cust.username}</td>
                    <td style={{ padding: "0.75rem" }}>{cust.studentProfile?.email || "N/A"}</td>
                    <td style={{ padding: "0.75rem" }}>{cust.studentProfile?.phone || "N/A"}</td>
                    <td style={{ padding: "0.75rem" }}><Badge variant="info">{cust._count?.storePurchases || 0} Items</Badge></td>
                    <td style={{ padding: "0.75rem" }}>
                      <Button variant="outline" size="sm" onClick={() => handleSelectCustomer(cust)}>
                        Manage Profile
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Item Form Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingItem ? "Edit Item" : "Create Item"}
      >
        <form onSubmit={handleSaveItem} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Select
              label="Item Type"
              value={type}
              onChange={(e) => setType(e.target.value)}
              options={[
                { label: "📄 PDF Notes", value: "NOTES" },
                { label: "📝 Online Test Series", value: "TEST_SERIES" }
              ]}
            />
            <Input label="Price (₹)" type="number" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>

          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />

          <div>
            <label className="input-label" style={{ marginBottom: "0.4rem", display: "block", fontWeight: 700 }}>
              Upload PDF File {type === "TEST_SERIES" ? "(Optional Test Paper / Notes PDF)" : "(Notes PDF)"}
            </label>
            <input type="file" accept=".pdf" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} style={{ width: '100%', padding: '0.5rem 0' }} />
            {fileUrl && (
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '0.35rem', fontWeight: 600 }}>
                ✓ PDF File Attached {fileUrl.startsWith('data:') ? '(Embedded File)' : `(${fileUrl})`}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="checkbox" id="pubCheck" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
            <label htmlFor="pubCheck" style={{ fontWeight: 600 }}>Publish Item in Store</label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", marginTop: "1rem" }}>
            <Button type="button" variant="ghost" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={uploadingFile}>
              Save Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* Customer Profile Modal */}
      <Modal
        isOpen={!!selectedCustomer}
        onClose={() => setSelectedCustomer(null)}
        title="Manage Customer Account"
      >
        {selectedCustomer && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {custError && <div style={{ color: "#ef4444", fontWeight: 600 }}>⚠️ {custError}</div>}
            <Input label="Customer Name" value={custName} onChange={(e) => setCustName(e.target.value)} />
            <Input label="Email Address" value={custEmail} onChange={(e) => setCustEmail(e.target.value)} />
            <Input label="Phone Number" value={custPhone} onChange={(e) => setCustPhone(e.target.value)} maxLength={10} />

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "1rem" }}>
              <Button variant="danger" isLoading={deletingCust} onClick={handleDeleteCustomer}>
                Delete Account
              </Button>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <Button variant="ghost" onClick={() => setSelectedCustomer(null)}>Cancel</Button>
                <Button variant="primary" isLoading={savingCust} onClick={handleSaveCustomer}>Save Changes</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Test Builder Modal */}
      <Modal
        isOpen={!!managingSeriesItem}
        onClose={() => setManagingSeriesItem(null)}
        title={`Test Questions Builder (${managingTest?.title || ""})`}
        maxWidth="800px"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Question Add Form */}
          <Card variant="standard">
            <h4 style={{ margin: "0 0 1rem 0", fontWeight: 700 }}>Add Question</h4>
            <form onSubmit={handleAddQuestion} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <Textarea label="Question Statement" value={questionText} onChange={(e) => setQuestionText(e.target.value)} required rows={2} />
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {options.map((opt, idx) => (
                  <Input
                    key={idx}
                    label={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[idx] = e.target.value;
                      setOptions(newOpts);
                    }}
                    required
                  />
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <Select
                  label="Correct Option"
                  value={correctOption}
                  onChange={(e) => setCorrectOption(e.target.value)}
                  options={[
                    { label: "Option 1", value: "0" },
                    { label: "Option 2", value: "1" },
                    { label: "Option 3", value: "2" },
                    { label: "Option 4", value: "3" }
                  ]}
                />
                <Input label="Marks" type="number" value={marks} onChange={(e) => setMarks(e.target.value)} required />
              </div>

              <Input label="Explanation (Optional)" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
              <Button type="submit" variant="secondary" size="md">Add Question</Button>
            </form>
          </Card>

          {/* Existing Questions List */}
          <div>
            <h4 style={{ margin: "0 0 0.75rem 0", fontWeight: 700 }}>Questions ({questions.length})</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {questions.map((q, idx) => (
                <Card key={q.id} style={{ padding: "1rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontWeight: 700 }}>Q{idx + 1}: {q.questionText}</div>
                    <Button variant="danger" size="sm" onClick={() => handleDeleteQuestion(q.id)}>Remove</Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default AdminStoreManager;
