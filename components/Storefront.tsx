"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import Card from "./ui/Card";
import Input from "./ui/Input";
import Badge from "./ui/Badge";
import Spinner from "./ui/Spinner";

export function Storefront() {
  const { data: session } = useSession();
  const [items, setItems] = useState<any[]>([]);
  const [purchasedItemIds, setPurchasedItemIds] = useState<string[]>([]);
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
        setItems(data.items);
        if (data.purchasedItemIds) {
          setPurchasedItemIds(data.purchasedItemIds);
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
        setPurchasedItemIds((prev) => [...prev, activePaymentItem.id]);
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

  if (loading) {
    return <Spinner center size="lg" />;
  }

  return (
    <section id="storefront" className="storefront-section" style={{ padding: "4rem 6%", zIndex: 2 }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <Badge variant="info">OFFICIAL STORE</Badge>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 800, margin: "0.5rem 0 1rem 0", color: "var(--text-heading)" }}>
            Study Materials & Online Test Series
          </h2>
          <p style={{ color: "var(--text-muted)", maxWidth: "600px", margin: "0 auto", fontSize: "1.05rem" }}>
            Unlock hand-crafted notes, detailed PDFs, and exam-grade online test series evaluated automatically.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
          {items.map((item) => {
            const isPurchased = purchasedSet.has(item.id);

            return (
              <Card key={item.id} variant="glass" interactive style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <Badge variant={item.type === "NOTES" ? "info" : "warning"}>
                      {item.type === "NOTES" ? "📄 Notes PDF" : "📝 Test Series"}
                    </Badge>
                    {isPurchased && <Badge variant="success">Access Unlocked</Badge>}
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
                      variant="secondary"
                      size="md"
                      onClick={() => {
                        window.location.href = "/dashboard/store";
                      }}
                    >
                      Go to Library
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
        onClose={() => setActivePaymentItem(null)}
        title={paymentSuccess ? "🎉 Payment Successful!" : `Secure Checkout - ${activePaymentItem?.title || ""}`}
      >
        {paymentSuccess ? (
          <div style={{ textAlign: "center", padding: "1rem 0" }}>
            <p style={{ fontSize: "1.1rem", marginBottom: "1.5rem" }}>
              Your purchase has been verified and added to your personal store library.
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={() => {
                window.location.href = "/dashboard/store";
              }}
            >
              Open My Library
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <Card style={{ textAlign: "center", padding: "1rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>TOTAL PAYABLE</span>
              <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "var(--primary)", marginTop: "0.2rem" }}>
                ₹{activePaymentItem?.price}
              </div>
            </Card>

            <Input
              label="Enter Payment Reference / Transaction ID"
              placeholder="e.g. UPI Ref No, TXN12345678"
              value={paymentTxId}
              onChange={(e) => setPaymentTxId(e.target.value)}
              helperText="Enter transaction ID from your UPI/Bank app to verify instantly."
            />

            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isPaying}
              disabled={!paymentTxId.trim()}
              onClick={handleSimulatedPaymentSubmit}
            >
              Verify & Complete Order
            </Button>
          </div>
        )}
      </Modal>
    </section>
  );
}

export default Storefront;
