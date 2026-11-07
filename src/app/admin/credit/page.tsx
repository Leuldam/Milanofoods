"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Banknote, Plus, Search, X } from "lucide-react";
import { AdminTableLoading } from "@/components/admin/admin-loading";
import { getAdminErrorMessage } from "@/lib/admin-error";

type CreditCustomer = {
  id: string;
  name: string;
  phone: string;
  company: string | null;
  balance: number;
};

type CreditProduct = {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  reservedStock: number;
  availableStock: number;
};

type CreditTransaction = {
  id: string;
  type: "CREDIT" | "REPAYMENT";
  amount: number | string;
  notes: string | null;
  recordedBy: string | null;
  createdAt: string;
  customer: Pick<CreditCustomer, "id" | "name" | "phone" | "company">;
  items: Array<{
    id: string;
    productName: string;
    productSku: string;
    quantity: number;
    lineTotal: number | string;
  }>;
};

type CreditItemInput = { productId: string; quantity: number };

export default function AdminCreditBookPage() {
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [products, setProducts] = useState<CreditProduct[]>([]);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [canRecordCreditSales, setCanRecordCreditSales] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<"CREDIT" | "REPAYMENT">("CREDIT");
  const [customerId, setCustomerId] = useState("");
  const [items, setItems] = useState<CreditItemInput[]>([{ productId: "", quantity: 1 }]);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/admin/credit", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load the credit book.");
      setCustomers(data.customers);
      setProducts(data.products);
      setTransactions(data.transactions);
      setCanManage(Boolean(data.canManage));
      setCanRecordCreditSales(Boolean(data.canRecordCreditSales));
    } catch (loadError) {
      setLoadError(getAdminErrorMessage(loadError, "Failed to load the credit book."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const outstandingTotal = useMemo(
    () => customers.reduce((total, customer) => total + customer.balance, 0),
    [customers],
  );
  const filteredCustomers = customers.filter((customer) =>
    `${customer.name} ${customer.phone} ${customer.company || ""}`.toLowerCase().includes(search.toLowerCase()),
  );
  const selectedCustomer = customers.find((customer) => customer.id === customerId);
  const creditTotal = items.reduce((total, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return total + (product ? product.price * item.quantity : 0);
  }, 0);

  const openForm = (type: "CREDIT" | "REPAYMENT", target?: CreditCustomer) => {
    setTransactionType(type);
    setCustomerId(target?.id || "");
    setItems([{ productId: "", quantity: 1 }]);
    setAmount("");
    setNotes("");
    setError("");
    setModalOpen(true);
  };

  const updateCreditItem = (index: number, patch: Partial<CreditItemInput>) => {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/admin/credit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: transactionType,
          customerId,
          amount: transactionType === "REPAYMENT" ? Number(amount) : undefined,
          items: transactionType === "CREDIT" ? items : undefined,
          notes,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to record transaction.");
      setSuccess(transactionType === "CREDIT"
        ? `Credit sale recorded for ${selectedCustomer?.name || "customer"}; stock was updated.`
        : `Repayment recorded for ${selectedCustomer?.name || "customer"}.`);
      setModalOpen(false);
      await loadData();
    } catch (submitError) {
      setError(getAdminErrorMessage(submitError, "Failed to record transaction."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-credit-book">
      <div className="admin-workflow-header">
        <div>
          <h1 className="admin-workflow-title">Customer Credit Book</h1>
          <p className="admin-workflow-description">Record products taken on credit and track repayments against each customer balance.</p>
        </div>
        {canManage && (
          <div className="admin-credit-actions">
            <button type="button" className="admin-workflow-button is-secondary" onClick={() => openForm("REPAYMENT")}>
              <Banknote size={15} /> Record Repayment
            </button>
            {canRecordCreditSales && <button type="button" className="admin-workflow-button" onClick={() => openForm("CREDIT")}>
              <Plus size={15} /> Record Credit Sale
            </button>}
          </div>
        )}
      </div>

      <div className="admin-credit-summary">
        <div className="admin-credit-summary-icon"><Banknote size={19} /></div>
        <div>
          <span>Total outstanding credit</span>
          <strong>{loading ? "Loading…" : loadError ? "Unavailable" : `ETB ${outstandingTotal.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}</strong>
        </div>
      </div>

      {success && <div className="admin-workflow-notice is-success" role="status">{success}</div>}
      {loadError && <div className="admin-workflow-notice is-error" role="alert">{loadError}</div>}
      {error && !modalOpen && <div className="admin-workflow-notice is-error" role="alert">{error}</div>}

      <section className="admin-workflow-panel">
        <div className="admin-workflow-panel-heading">
          <div>
            <h2>Customer Balances</h2>
            <p>Outstanding credit in this book; order payment balances are tracked separately.</p>
          </div>
          <label className="admin-workflow-search">
            <Search size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer or phone" />
          </label>
        </div>

        <div className="admin-workflow-desktop-table">
          <table>
            <thead><tr><th>Customer</th><th>Phone</th><th>Company</th><th>Outstanding</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? <AdminTableLoading colSpan={5} label="Loading credit balances..." /> : loadError ? (
                <tr><td colSpan={5} className="admin-workflow-empty">Credit balances could not be loaded.</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={5} className="admin-workflow-empty">No customers found.</td></tr>
              ) : filteredCustomers.map((customer) => (
                <tr key={customer.id}>
                  <td><strong>{customer.name}</strong></td>
                  <td>{customer.phone}</td>
                  <td>{customer.company || "—"}</td>
                  <td className="admin-credit-balance">ETB {customer.balance.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td>{canManage && <button className="admin-workflow-small-button" onClick={() => openForm("REPAYMENT", customer)}>Add repayment</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-workflow-mobile-list">
          {loading ? <div className="admin-workflow-loading">Loading customer balances…</div> : loadError ? (
            <div className="admin-workflow-empty">Credit balances could not be loaded.</div>
          ) : filteredCustomers.length === 0 ? (
            <div className="admin-workflow-empty">No customers found.</div>
          ) : filteredCustomers.map((customer) => (
            <article key={customer.id} className="admin-credit-customer-card">
              <div><strong>{customer.name}</strong><span>{customer.company || customer.phone}</span></div>
              <b>ETB {customer.balance.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
              {canManage && <button className="admin-workflow-small-button" onClick={() => openForm("REPAYMENT", customer)}>Record repayment</button>}
            </article>
          ))}
        </div>
      </section>

      <section className="admin-workflow-panel">
        <div className="admin-workflow-panel-heading">
          <div><h2>Recent Credit Activity</h2><p>Latest 100 credit sales and customer repayments.</p></div>
        </div>
        <div className="admin-workflow-desktop-table">
          <table>
            <thead><tr><th>Date</th><th>Customer</th><th>Activity</th><th>Products / Notes</th><th>Amount</th></tr></thead>
            <tbody>
              {loading ? <AdminTableLoading colSpan={5} label="Loading credit activity..." /> : loadError ? (
                <tr><td colSpan={5} className="admin-workflow-empty">Credit activity could not be loaded.</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={5} className="admin-workflow-empty">No credit activity recorded yet.</td></tr>
              ) : transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{new Date(transaction.createdAt).toLocaleString()}</td>
                  <td><strong>{transaction.customer.name}</strong><small>{transaction.customer.phone}</small></td>
                  <td><span className={`admin-credit-type ${transaction.type === "CREDIT" ? "is-credit" : "is-repayment"}`}>{transaction.type === "CREDIT" ? "Credit sale" : "Repayment"}</span></td>
                  <td>{transaction.items.length ? transaction.items.map((item) => `${item.productName} × ${item.quantity}`).join(", ") : transaction.notes || "—"}</td>
                  <td className={transaction.type === "CREDIT" ? "admin-credit-balance" : "admin-credit-repayment"}>{transaction.type === "CREDIT" ? "+" : "−"}ETB {Number(transaction.amount).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="admin-workflow-mobile-list">
          {loading ? <div className="admin-workflow-loading">Loading credit activity…</div> : loadError ? (
            <div className="admin-workflow-empty">Credit activity could not be loaded.</div>
          ) : transactions.length === 0 ? (
            <div className="admin-workflow-empty">No credit activity recorded yet.</div>
          ) : transactions.map((transaction) => (
            <article key={transaction.id} className="admin-credit-activity-card">
              <div><strong>{transaction.customer.name}</strong><span>{new Date(transaction.createdAt).toLocaleDateString()} · {transaction.type === "CREDIT" ? "Credit sale" : "Repayment"}</span></div>
              <b className={transaction.type === "CREDIT" ? "admin-credit-balance" : "admin-credit-repayment"}>{transaction.type === "CREDIT" ? "+" : "−"}ETB {Number(transaction.amount).toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
              {(transaction.items.length > 0 || transaction.notes) && <p>{transaction.items.length ? transaction.items.map((item) => `${item.productName} × ${item.quantity}`).join(", ") : transaction.notes}</p>}
            </article>
          ))}
        </div>
      </section>

      {modalOpen && (
        <div className="admin-workflow-modal" role="presentation">
          <button type="button" className="admin-workflow-backdrop" aria-label="Close dialog" onClick={() => setModalOpen(false)} />
          <section className="admin-workflow-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-credit-dialog-title">
            <header>
              <h2 id="admin-credit-dialog-title">{transactionType === "CREDIT" ? "Record Credit Sale" : "Record Repayment"}</h2>
              <button type="button" aria-label="Close" onClick={() => setModalOpen(false)}><X size={19} /></button>
            </header>
            {error && <div className="admin-workflow-notice is-error" role="alert">{error}</div>}
            <form onSubmit={handleSubmit}>
              <label>Customer *
                <select required value={customerId} onChange={(event) => setCustomerId(event.target.value)}>
                  <option value="">Select a customer</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name} · {customer.phone}</option>)}
                </select>
              </label>
              {transactionType === "CREDIT" ? (
                <div className="admin-credit-form-items">
                  <div className="admin-credit-form-items-heading"><strong>Products taken on credit</strong><button type="button" onClick={() => setItems((current) => [...current, { productId: "", quantity: 1 }])}>Add item</button></div>
                  {items.map((item, index) => {
                    const product = products.find((candidate) => candidate.id === item.productId);
                    return (
                      <div className="admin-credit-form-item" key={index}>
                        <label>Product
                          <select required value={item.productId} onChange={(event) => updateCreditItem(index, { productId: event.target.value })}>
                            <option value="">Choose product</option>
                            {products.map((candidate) => <option key={candidate.id} value={candidate.id} disabled={candidate.availableStock < 1}>{candidate.name} · {candidate.availableStock} available</option>)}
                          </select>
                        </label>
                        <label>Qty
                          <input type="number" min="1" step="1" max={product?.availableStock || undefined} required value={item.quantity} onChange={(event) => updateCreditItem(index, { quantity: Number(event.target.value) })} />
                        </label>
                        {items.length > 1 && <button type="button" className="admin-credit-remove-item" aria-label="Remove item" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button>}
                      </div>
                    );
                  })}
                  <div className="admin-credit-form-total"><span>Credit added</span><strong>ETB {creditTotal.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></div>
                </div>
              ) : (
                <label>Repayment amount (ETB) *
                  <input type="number" min="0.01" step="0.01" max={selectedCustomer?.balance || undefined} required value={amount} onChange={(event) => setAmount(event.target.value)} />
                  {selectedCustomer && <small>Outstanding: ETB {selectedCustomer.balance.toLocaleString("en-ET", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</small>}
                </label>
              )}
              <label>Note (optional)
                <input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={transactionType === "CREDIT" ? "Optional details about the credit sale" : "Payment reference or note"} />
              </label>
              <footer>
                <button type="button" className="admin-workflow-button is-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="admin-workflow-button" disabled={submitting || !customerId}>
                  {submitting ? "Saving…" : transactionType === "CREDIT" ? "Record Credit & Deduct Stock" : "Record Repayment"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
