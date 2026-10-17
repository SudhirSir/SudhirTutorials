"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";

interface StorefrontProps {
  onGoToLibrary?: () => void;
}

export function Storefront({ onGoToLibrary }: StorefrontProps = {}) {
  const { data: session } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [purchasedItemIds, setPurchasedItemIds] = useState<string[]>([]);
  const [pendingItemIds, setPendingItemIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulated Payment gateway state
  const [activePaymentItem, setActivePaymentItem] = useState<any>(null);
  const [paymentTxId, setPaymentTxId] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/store");
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        if (data.purchasedItemIds) {
          setPurchasedItemIds(data.purchasedItemIds);
        }
        if (data.pendingItemIds) {
          setPendingItemIds(data.pendingItemIds);
        }
      }
    } catch (e) {
      console.error("Failed to fetch store items:", e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleBuy = useCallback(
    (item: any) => {
      if (!session) {
        window.location.href = "/store-login";
        return;
      }
      setActivePaymentItem(item);
      setPaymentTxId("");
      setPaymentSuccess(false);
      setIsPaying(false);
    },
    [session]
  );

  const handleSimulatedPaymentSubmit = useCallback(async () => {
    if (!activePaymentItem || !paymentTxId.trim()) return;
    setIsPaying(true);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: activePaymentItem.id,
          transactionId: paymentTxId.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        setPaymentSuccess(true);
        setPendingItemIds((prev) => [...prev, activePaymentItem.id]);
      } else {
        alert(data.error || "Payment verification failed.");
      }
    } catch (e) {
      console.error("Checkout error:", e);
      alert("Network error during payment verification.");
    } finally {
      setIsPaying(false);
    }
  }, [activePaymentItem, paymentTxId]);

  const purchasedSet = useMemo(() => new Set(purchasedItemIds), [purchasedItemIds]);
  const pendingSet = useMemo(() => new Set(pendingItemIds), [pendingItemIds]);

  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [items]);

  if (loading) {
    return <Spinner center size="lg" />;
  }

  return (
    <section id="storefront" className="storefront-section" style={{ padding: "2.25rem 6%", zIndex: 2 }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <Badge variant="info">OFFICIAL STORE</Badge>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 800, margin: "0.5rem 0 0.5rem 0", color: "var(--text-heading)" }}>
            Study Materials & Online Test Series
          </h2>
          <p style={{ color: "var(--text-muted)", maxWidth: "600px", margin: "0 auto", fontSize: "1.05rem" }}>
            Unlock hand-crafted notes, detailed PDFs, and exam-grade online test series evaluated automatically.
          </p>

          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.85rem", marginTop: "1.25rem", flexWrap: "wrap" }}>
            {!session ? (
              <Link
                href="/store-login"
                id="st-store-login-btn"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.65rem 1.4rem",
                  borderRadius: "100px",
                  background: "var(--hp-gradient-btn, linear-gradient(135deg, #2563eb, #1d4ed8))",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                  transition: "transform 0.2s, box-shadow 0.2s"
                }}
              >
                🛍️ Login / Sign Up to ST Store →
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (onGoToLibrary) {
                      onGoToLibrary();
                    } else {
                      router.push("/dashboard/store?tab=purchases");
                    }
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.65rem 1.4rem",
                    borderRadius: "100px",
                    background: "var(--hp-gradient-btn, linear-gradient(135deg, #2563eb, #1d4ed8))",
                    color: "#ffffff",
                    fontWeight: 800,
                    fontSize: "0.95rem",
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                  }}
                >
                  📚 My ST Store Library ({purchasedItemIds.length}) →
                </button>
                <Link
                  href="/store-login"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.4rem",
                    padding: "0.55rem 1rem",
                    borderRadius: "100px",
                    background: "var(--surface-light, rgba(255, 255, 255, 0.08))",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    textDecoration: "none",
                  }}
                >
                  Switch ST Store Account
                </Link>
              </>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {uniqueItems.map((item) => {
            const isPurchased = purchasedSet.has(item.id);
            const isPending = pendingSet.has(item.id);

            return (
              <Card key={item.id} variant="glass" interactive style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <Badge variant={item.type === "NOTES" ? "info" : item.type === "MOCK_TEST" ? "success" : "warning"}>
                      {item.type === "NOTES" ? "📄 Notes PDF" : item.type === "MOCK_TEST" ? "🎯 Chapter Mock Test" : "📝 Test Series"}
                    </Badge>
                    {isPurchased ? (
                      <Badge variant="success">Access Unlocked</Badge>
                    ) : isPending ? (
                      <Badge variant="warning">⏳ Verification Pending</Badge>
                    ) : null}
                  </div>

                  <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 0.5rem 0", color: "var(--text-heading)" }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", margin: "0 0 1.25rem 0", lineHeight: 1.5 }}>
                    {item.description || "Comprehensive preparation material designed by expert faculty."}
                  </p>
                </div>

                <div style={{ paddingTop: "1rem", borderTop: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>PRICE</span>
                    <span style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--primary)" }}>
                      {item.price === 0 ? "FREE" : `₹${item.price}`}
                    </span>
                  </div>

                  {isPurchased ? (
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => {
                        if (item.type === "MOCK_TEST") {
                          const testId = item.id.replace(/^mocktest-/, "");
                          router.push(`/dashboard/student/mock-test/${testId}`);
                        } else if (item.type === "NOTES" && item.fileUrl) {
                          window.open(item.fileUrl, "_blank");
                        } else if (onGoToLibrary) {
                          onGoToLibrary();
                        } else {
                          router.push("/dashboard/store?tab=purchases");
                        }
                      }}
                    >
                      {item.type === "MOCK_TEST" ? "📝 Start Mock Test →" : item.type === "NOTES" && item.fileUrl ? "📄 Open Notes PDF ↗" : "Go to Library →"}
                    </Button>
                  ) : isPending ? (
                    <Button
                      variant="secondary"
                      size="md"
                      disabled
                      style={{ opacity: 0.85, cursor: "not-allowed", border: "1px solid rgba(234, 179, 8, 0.4)", color: "#eab308" }}
                      title="Payment verification under review by Admin"
                    >
                      ⏳ Pending Approval
                    </Button>
                  ) : (
                    <Button variant="primary" size="md" onClick={() => handleBuy(item)}>
                      Buy Now
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Payment Gateway Modal */}
      <Modal
        isOpen={!!activePaymentItem}
        onClose={() => {
          setActivePaymentItem(null);
          setPaymentTxId("");
          setPaymentSuccess(false);
        }}
        maxWidth="680px"
        title={
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", paddingRight: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem", color: "#3b82f6", fontWeight: 900, letterSpacing: "-0.5px" }}>
                Razorpay <span style={{ color: "#fff", fontSize: "0.68rem", fontWeight: 700, background: "#3b82f6", padding: "2px 6px", borderRadius: "4px", marginLeft: "4px" }}>SECURE</span>
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", color: "#10b981", fontWeight: 600 }}>
              <span>🔒 PCI-DSS Compliant</span>
            </div>
          </div>
        }
      >
        {paymentSuccess ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0.5rem" }}>
            <div style={{ fontSize: "3.2rem", marginBottom: "0.75rem" }}>⏳</div>
            <h3 style={{ fontSize: "1.35rem", fontWeight: 800, marginBottom: "0.5rem", color: "var(--text-heading)" }}>
              Payment Reference Submitted!
            </h3>
            <p style={{ fontSize: "0.95rem", color: "var(--text-muted)", maxWidth: "480px", margin: "0 auto 1.25rem", lineHeight: 1.5 }}>
              Your transaction reference <strong style={{ color: "var(--primary)" }}>{paymentTxId}</strong> for <strong>{activePaymentItem?.title}</strong> has been recorded and submitted for Admin verification.
            </p>

            <div style={{
              background: "rgba(234, 179, 8, 0.1)",
              border: "1px solid rgba(234, 179, 8, 0.3)",
              borderRadius: "14px",
              padding: "1rem 1.25rem",
              color: "#eab308",
              fontSize: "0.85rem",
              fontWeight: 600,
              maxWidth: "520px",
              margin: "0 auto 1.75rem",
              textAlign: "left",
              lineHeight: 1.5
            }}>
              🔒 <strong>Verification Pending:</strong> Item access is currently locked. The institute admin will review your reference ID in the Store Manager ledger. Once verified, access will be immediately unlocked in your personal library and you will receive a notification.
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setActivePaymentItem(null);
                  if (onGoToLibrary) {
                    onGoToLibrary();
                  } else {
                    router.push("/dashboard/store?tab=purchases");
                  }
                }}
              >
                📚 View in My Purchases
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => {
                  setActivePaymentItem(null);
                  setPaymentSuccess(false);
                  setPaymentTxId("");
                }}
              >
                Continue Browsing Store
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem", minHeight: "340px" }}>
            {/* Left Panel: Item & Institute Summary */}
            <div style={{
              background: "var(--card-bg-alt, rgba(255, 255, 255, 0.03))",
              padding: "1.5rem",
              borderRadius: "16px",
              border: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ color: "var(--primary)", fontWeight: 800, fontSize: "0.65rem", letterSpacing: "1.5px", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                  COACHING INSTITUTE
                </div>
                <h3 style={{ fontSize: "1.15rem", margin: 0, fontWeight: 700, color: "var(--text)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
                  <img src="/logo.png" alt="Logo" style={{ width: "22px", height: "22px", objectFit: "contain", borderRadius: "4px" }} />
                  <span style={{ color: "#ef4444", fontWeight: 800 }}>SUDHIR</span> <span style={{ color: "#2563eb", fontWeight: 800 }}>TUTORIALS</span>
                </h3>

                <div style={{
                  background: "var(--surface-light, rgba(255, 255, 255, 0.05))",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "1rem",
                  marginBottom: "1.25rem"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
                    <Badge variant={activePaymentItem?.type === "NOTES" ? "info" : activePaymentItem?.type === "MOCK_TEST" ? "success" : "warning"}>
                      {activePaymentItem?.type === "NOTES" ? "📄 Notes PDF" : activePaymentItem?.type === "MOCK_TEST" ? "🎯 Mock Test" : "📝 Test Series"}
                    </Badge>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {activePaymentItem?.className ? `Class ${activePaymentItem.className}` : ""}
                    </span>
                  </div>
                  <div style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-heading)", marginBottom: "0.4rem", lineHeight: 1.3 }}>
                    {activePaymentItem?.title}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                    {activePaymentItem?.description || "Official learning material evaluated by institute faculty."}
                  </div>
                </div>

                <div style={{
                  background: "rgba(59, 130, 246, 0.08)",
                  border: "1px solid rgba(59, 130, 246, 0.25)",
                  borderRadius: "12px",
                  padding: "0.85rem 1rem",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <span style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Payable</span>
                  <span style={{ fontSize: "1.5rem", fontWeight: 900, color: "#3b82f6" }}>
                    ₹{activePaymentItem?.price}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: "1rem", marginTop: "1.5rem" }}>
                <div><strong style={{ color: "var(--text)" }}>Student:</strong> {session?.user?.name || (session?.user as any)?.username || "Student User"}</div>
                <div style={{ marginTop: "2px" }}><strong style={{ color: "var(--text)" }}>Email:</strong> {(session?.user as any)?.email || "student@sudhirtutorials.com"}</div>
              </div>
            </div>

            {/* Right Panel: Official Razorpay Gateway + Step 1 & Step 2 */}
            <div style={{
              padding: "0.5rem 0.25rem",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between"
            }}>
              <div>
                <h4 style={{ margin: "0 0 0.4rem 0", fontSize: "1.15rem", fontWeight: 700, color: "var(--text)" }}>
                  Official Razorpay Gateway
                </h4>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: "1.25rem", lineHeight: "1.4" }}>
                  Please pay <strong style={{ color: "var(--text)" }}>₹{activePaymentItem?.price}</strong> securely via Razorpay or any UPI app, then enter the reference ID below.
                </p>

                {/* Step 1: Complete Payment */}
                <div style={{ marginBottom: "1.25rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 800, textTransform: "uppercase", display: "block", marginBottom: "0.5rem" }}>
                    Step 1: Complete Payment
                  </span>
                  <a
                    href="https://razorpay.me/@sudhiir"
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.65rem",
                      width: "100%",
                      padding: "1rem",
                      borderRadius: "14px",
                      background: "linear-gradient(135deg, #0070f3, #00df00)",
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: "0.98rem",
                      textDecoration: "none",
                      boxShadow: "0 4px 18px rgba(0, 112, 243, 0.4)",
                      transition: "all 0.25s ease",
                      textAlign: "center",
                      letterSpacing: "0.3px",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow = "0 6px 24px rgba(0, 223, 0, 0.5)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "0 4px 18px rgba(0, 112, 243, 0.4)";
                    }}
                  >
                    🔒 Click to Pay Securely (Razorpay / UPI) ↗
                  </a>
                </div>

                {/* Step 2: Submit Verification Reference */}
                <div>
                  <span style={{ fontSize: "0.75rem", color: "#3b82f6", fontWeight: 800, textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>
                    Step 2: Submit Verification Reference
                  </span>
                  <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "0.5rem", lineHeight: 1.4 }}>
                    After successful payment, enter your payment transaction ID or UPI Reference No:
                  </p>
                  <Input
                    placeholder="e.g. pay_N23sd9fX87 or UPI Txn Ref No"
                    value={paymentTxId}
                    onChange={(e) => setPaymentTxId(e.target.value)}
                    disabled={isPaying}
                    helperText="Admin will verify this reference before granting full item access."
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
                <button
                  type="button"
                  disabled={isPaying}
                  onClick={() => {
                    setActivePaymentItem(null);
                    setPaymentTxId("");
                  }}
                  style={{
                    flex: 1,
                    padding: "0.85rem",
                    borderRadius: "12px",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    color: "#ef4444",
                    cursor: isPaying ? "not-allowed" : "pointer",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    transition: "all 0.2s"
                  }}
                >
                  Cancel
                </button>

                <Button
                  variant="primary"
                  size="md"
                  isLoading={isPaying}
                  disabled={!paymentTxId.trim() || isPaying}
                  onClick={handleSimulatedPaymentSubmit}
                  style={{ flex: 2, padding: "0.85rem" }}
                >
                  Confirm & Submit Details
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default Storefront;
