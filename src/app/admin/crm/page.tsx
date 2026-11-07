"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Activity, ArrowRight, CalendarClock, CalendarDays, Plus, Search, X } from "lucide-react";
import { getAdminErrorMessage } from "@/lib/admin-error";

const STAGES = [
  { value: "LEAD", label: "New leads", color: "#2563EB" },
  { value: "QUALIFIED", label: "Qualified", color: "#7C3AED" },
  { value: "PROPOSAL", label: "Proposal", color: "#C0841A" },
  { value: "NEGOTIATION", label: "Negotiation", color: "#EA580C" },
  { value: "CUSTOMER", label: "Customers", color: "#15803D" },
  { value: "LOST", label: "Closed / lost", color: "#64748B" },
] as const;

const ACTIVITY_TYPES = [
  { value: "CALL", label: "Call" },
  { value: "EMAIL", label: "Email" },
  { value: "MEETING", label: "Meeting" },
  { value: "NOTE", label: "Note" },
  { value: "FOLLOW_UP", label: "Follow-up" },
] as const;

const ACTIVITY_LABELS: Record<string, string> = {
  STAGE_CHANGE: "Stage change",
  ...Object.fromEntries(ACTIVITY_TYPES.map(({ value, label }) => [value, label])),
};

type CrmActivity = {
  id: string;
  type: string;
  summary: string;
  followUpAt: string | null;
  createdBy: string | null;
  createdAt: string;
};

type CrmContact = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  company: string | null;
  customerType: string;
  crmStage: (typeof STAGES)[number]["value"];
  crmLeadSource: string | null;
  assignedTo: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  _count: { orders: number };
  crmActivities: CrmActivity[];
};

type CrmResponse = { canManage: boolean; customers: CrmContact[]; error?: string };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function isFollowUpDue(value: string | null) {
  if (!value) return false;
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(value) <= endOfToday;
}

function localDateToIso(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isoToLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

export default function AdminCrmPage() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [selectedContact, setSelectedContact] = useState<CrmContact | null>(null);
  const [addingLead, setAddingLead] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "", company: "", email: "", crmLeadSource: "", assignedTo: "", nextFollowUpAt: "" });
  const [activityForm, setActivityForm] = useState({ type: "CALL", summary: "", followUpAt: "" });
  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    email: "",
    company: "",
    crmLeadSource: "",
    assignedTo: "",
    nextFollowUpAt: "",
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/crm", { cache: "no-store" });
      if (response.status === 401 || response.status === 403) {
        window.location.href = "/admin/login";
        return;
      }
      const result = await response.json() as CrmResponse;
      if (!response.ok) throw new Error(result.error || "Failed to load CRM.");
      setContacts(result.customers);
      setCanManage(result.canManage);
      setSelectedContact((current) => current ? result.customers.find((contact) => contact.id === current.id) || null : null);
    } catch (reason) {
      setError(getAdminErrorMessage(reason, "Failed to load the CRM pipeline."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) =>
      [contact.name, contact.phone, contact.company || "", contact.crmLeadSource || ""]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [contacts, search]);

  const openLeadsCount = contacts.filter((contact) => !["CUSTOMER", "LOST"].includes(contact.crmStage)).length;
  const dueFollowUps = contacts.filter((contact) => isFollowUpDue(contact.nextFollowUpAt)).length;
  const qualifiedCount = contacts.filter((contact) => ["QUALIFIED", "PROPOSAL", "NEGOTIATION"].includes(contact.crmStage)).length;

  async function createLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_lead", ...leadForm, nextFollowUpAt: localDateToIso(leadForm.nextFollowUpAt) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to create lead.");
      setLeadForm({ name: "", phone: "", company: "", email: "", crmLeadSource: "", assignedTo: "", nextFollowUpAt: "" });
      setAddingLead(false);
      await loadData();
    } catch (reason) {
      setError(getAdminErrorMessage(reason, "Failed to create lead."));
    } finally {
      setSaving(false);
    }
  }

  async function updateStage(contact: CrmContact, crmStage: string) {
    setError("");
    try {
      const response = await fetch("/api/admin/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: contact.id, crmStage }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update pipeline stage.");
      await loadData();
    } catch (reason) {
      setError(getAdminErrorMessage(reason, "Failed to update pipeline stage."));
    }
  }

  async function addActivity(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/crm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add_activity",
          customerId: selectedContact.id,
          ...activityForm,
          followUpAt: localDateToIso(activityForm.followUpAt),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save activity.");
      setActivityForm({ type: "CALL", summary: "", followUpAt: "" });
      await loadData();
    } catch (reason) {
      setError(getAdminErrorMessage(reason, "Failed to save CRM activity."));
    } finally {
      setSaving(false);
    }
  }

  function startEditingContact(contact: CrmContact) {
    setContactForm({
      name: contact.name,
      phone: contact.phone,
      email: contact.email || "",
      company: contact.company || "",
      crmLeadSource: contact.crmLeadSource || "",
      assignedTo: contact.assignedTo || "",
      nextFollowUpAt: isoToLocalDateTime(contact.nextFollowUpAt),
    });
    setEditingContact(true);
    setError("");
  }

  async function saveContact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedContact) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/admin/crm", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_contact",
          customerId: selectedContact.id,
          ...contactForm,
          nextFollowUpAt: localDateToIso(contactForm.nextFollowUpAt),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to update contact.");
      setEditingContact(false);
      await loadData();
    } catch (reason) {
      setError(getAdminErrorMessage(reason, "Failed to update CRM contact."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="admin-crm-page">
      <header className="admin-crm-header">
        <div>
          <div className="admin-crm-eyebrow"><Activity size={14} /> CUSTOMER RELATIONSHIPS</div>
          <h1>Sales pipeline</h1>
          <p>Manage prospects, customer conversations, and the next step for every relationship.</p>
        </div>
        {canManage && (
          <button type="button" className="admin-workflow-button" onClick={() => { setError(""); setAddingLead(true); }}>
            <Plus size={16} /> Add lead
          </button>
        )}
      </header>

      <div className="admin-crm-summary">
        <div><span>Open opportunities</span><strong>{openLeadsCount}</strong><small>Leads through negotiation</small></div>
        <div><span>Follow-ups due</span><strong className={dueFollowUps ? "is-due" : ""}>{dueFollowUps}</strong><small>Scheduled today or overdue</small></div>
        <div><span>Qualified pipeline</span><strong>{qualifiedCount}</strong><small>Qualified, proposal, or negotiation</small></div>
        <div><span>Customer accounts</span><strong>{contacts.filter((contact) => contact.crmStage === "CUSTOMER").length}</strong><small>Won and ongoing relationships</small></div>
      </div>

      {error && <div className="admin-workflow-notice is-error" role="alert">{error}</div>}

      <div className="admin-crm-toolbar">
        <label className="admin-crm-search">
          <Search size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search contacts, businesses, phone, or lead source" />
        </label>
        <span>{filteredContacts.length} {filteredContacts.length === 1 ? "contact" : "contacts"}</span>
      </div>

      <div className="admin-crm-board" aria-label="Sales pipeline stages">
        {STAGES.map((stage) => {
          const stageContacts = filteredContacts.filter((contact) => contact.crmStage === stage.value);
          return (
            <section className="admin-crm-column" key={stage.value}>
              <header>
                <span className="admin-crm-stage-dot" style={{ background: stage.color }} />
                <h2>{stage.label}</h2>
                <span className="admin-crm-stage-count">{stageContacts.length}</span>
              </header>
              {loading ? (
                <div className="admin-crm-loading" role="status">Loading contacts...</div>
              ) : stageContacts.length === 0 ? (
                <div className="admin-crm-empty">No contacts in this stage</div>
              ) : stageContacts.map((contact) => (
                <article className="admin-crm-card" key={contact.id}>
                  <button type="button" className="admin-crm-card-main" onClick={() => { setEditingContact(false); setSelectedContact(contact); setError(""); }}>
                    <strong>{contact.name}</strong>
                    <span>{contact.company || contact.customerType}</span>
                    <span className="admin-crm-card-phone">{contact.phone}</span>
                  </button>
                  <div className="admin-crm-card-meta">
                    <span>{contact._count.orders} {contact._count.orders === 1 ? "order" : "orders"}</span>
                    {contact.crmLeadSource && <span>{contact.crmLeadSource}</span>}
                    {contact.assignedTo && <span>Owner: {contact.assignedTo}</span>}
                  </div>
                  {contact.nextFollowUpAt && (
                    <div className={`admin-crm-follow-up${isFollowUpDue(contact.nextFollowUpAt) ? " is-due" : ""}`}>
                      <CalendarClock size={13} /> {isFollowUpDue(contact.nextFollowUpAt) ? "Due " : ""}{formatDate(contact.nextFollowUpAt)}
                    </div>
                  )}
                  {canManage && (
                    <label className="admin-crm-stage-select">
                      <span>Move to</span>
                      <select value={contact.crmStage} onChange={(event) => void updateStage(contact, event.target.value)}>
                        {STAGES.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
                      </select>
                      <ArrowRight size={13} />
                    </label>
                  )}
                </article>
              ))}
            </section>
          );
        })}
      </div>

      {addingLead && (
        <div className="admin-workflow-modal" role="presentation">
          <button type="button" className="admin-workflow-backdrop" aria-label="Close lead form" onClick={() => setAddingLead(false)} />
          <section className="admin-workflow-dialog admin-crm-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-crm-lead-title">
            <header><div><h2 id="admin-crm-lead-title">Add a lead</h2><p>Create a prospect and set its first follow-up.</p></div><button type="button" aria-label="Close" onClick={() => setAddingLead(false)}><X size={19} /></button></header>
            {error && <div className="admin-workflow-notice is-error" role="alert">{error}</div>}
            <form className="admin-crm-form" onSubmit={createLead}>
              <label>Contact name *<input required maxLength={120} value={leadForm.name} onChange={(event) => setLeadForm({ ...leadForm, name: event.target.value })} /></label>
              <label>Phone number *<input required type="tel" maxLength={40} value={leadForm.phone} onChange={(event) => setLeadForm({ ...leadForm, phone: event.target.value })} /></label>
              <label>Business / company<input maxLength={160} value={leadForm.company} onChange={(event) => setLeadForm({ ...leadForm, company: event.target.value })} /></label>
              <label>Email<input type="email" maxLength={254} value={leadForm.email} onChange={(event) => setLeadForm({ ...leadForm, email: event.target.value })} /></label>
              <label>Lead source<input maxLength={100} placeholder="Referral, website, event..." value={leadForm.crmLeadSource} onChange={(event) => setLeadForm({ ...leadForm, crmLeadSource: event.target.value })} /></label>
              <label>Assigned to<input maxLength={120} placeholder="Owner or staff name" value={leadForm.assignedTo} onChange={(event) => setLeadForm({ ...leadForm, assignedTo: event.target.value })} /></label>
              <label>First follow-up<input type="datetime-local" value={leadForm.nextFollowUpAt} onChange={(event) => setLeadForm({ ...leadForm, nextFollowUpAt: event.target.value })} /></label>
              <div className="admin-crm-form-actions"><button type="button" className="admin-workflow-button is-secondary" onClick={() => setAddingLead(false)}>Cancel</button><button type="submit" className="admin-workflow-button" disabled={saving}>{saving ? "Saving..." : "Create lead"}</button></div>
            </form>
          </section>
        </div>
      )}

      {selectedContact && (
        <div className="admin-workflow-modal" role="presentation">
          <button type="button" className="admin-workflow-backdrop" aria-label="Close contact details" onClick={() => { setEditingContact(false); setSelectedContact(null); }} />
          <section className="admin-workflow-dialog admin-crm-dialog admin-crm-contact-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-crm-contact-title">
            <header>
              <div><h2 id="admin-crm-contact-title">{selectedContact.name}</h2><p>{selectedContact.company || selectedContact.customerType} · Added {formatDate(selectedContact.createdAt)}</p></div>
              <div className="admin-crm-dialog-actions">
                {canManage && <button type="button" className="admin-crm-edit-button" onClick={() => startEditingContact(selectedContact)}>Edit contact</button>}
                <button type="button" aria-label="Close" onClick={() => { setEditingContact(false); setSelectedContact(null); }}><X size={19} /></button>
              </div>
            </header>
            {error && <div className="admin-workflow-notice is-error" role="alert">{error}</div>}
            <div className="admin-crm-contact-links"><a href={`tel:${selectedContact.phone}`}>{selectedContact.phone}</a>{selectedContact.email && <a href={`mailto:${selectedContact.email}`}>{selectedContact.email}</a>}</div>
            {editingContact && canManage && (
              <form className="admin-crm-form admin-crm-edit-form" onSubmit={saveContact}>
                <h3>Edit contact details</h3>
                <label>Name *<input required maxLength={120} value={contactForm.name} onChange={(event) => setContactForm({ ...contactForm, name: event.target.value })} /></label>
                <label>Phone *<input required type="tel" maxLength={40} value={contactForm.phone} onChange={(event) => setContactForm({ ...contactForm, phone: event.target.value })} /></label>
                <label>Business / company<input maxLength={160} value={contactForm.company} onChange={(event) => setContactForm({ ...contactForm, company: event.target.value })} /></label>
                <label>Email<input type="email" maxLength={254} value={contactForm.email} onChange={(event) => setContactForm({ ...contactForm, email: event.target.value })} /></label>
                <label>Lead source<input maxLength={100} value={contactForm.crmLeadSource} onChange={(event) => setContactForm({ ...contactForm, crmLeadSource: event.target.value })} /></label>
                <label>Assigned to<input maxLength={120} value={contactForm.assignedTo} onChange={(event) => setContactForm({ ...contactForm, assignedTo: event.target.value })} /></label>
                <label>Next follow-up<input type="datetime-local" value={contactForm.nextFollowUpAt} onChange={(event) => setContactForm({ ...contactForm, nextFollowUpAt: event.target.value })} /></label>
                <div className="admin-crm-form-actions">
                  <button type="button" className="admin-workflow-button is-secondary" onClick={() => setEditingContact(false)}>Cancel</button>
                  <button type="submit" className="admin-workflow-button" disabled={saving}>{saving ? "Saving..." : "Save contact"}</button>
                </div>
              </form>
            )}
            {canManage && (
              <form className="admin-crm-form admin-crm-activity-form" onSubmit={addActivity}>
                <h3>Log an interaction</h3>
                <label>Type<select value={activityForm.type} onChange={(event) => setActivityForm({ ...activityForm, type: event.target.value })}>{ACTIVITY_TYPES.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}</select></label>
                <label>Summary *<textarea required maxLength={2000} rows={3} value={activityForm.summary} onChange={(event) => setActivityForm({ ...activityForm, summary: event.target.value })} placeholder="What was discussed, agreed, or requested?" /></label>
                <label>Schedule next follow-up<input type="datetime-local" value={activityForm.followUpAt} onChange={(event) => setActivityForm({ ...activityForm, followUpAt: event.target.value })} /></label>
                <button type="submit" className="admin-workflow-button" disabled={saving}>{saving ? "Saving..." : "Save interaction"}</button>
              </form>
            )}
            <div className="admin-crm-activity-list">
              <h3><CalendarDays size={16} /> Interaction history</h3>
              {selectedContact.crmActivities.length ? selectedContact.crmActivities.map((activity) => (
                <article key={activity.id}>
                  <span className="admin-crm-activity-type">{ACTIVITY_LABELS[activity.type] || activity.type}</span>
                  <time>{formatDate(activity.createdAt)}{activity.createdBy ? ` · ${activity.createdBy}` : ""}</time>
                  <p>{activity.summary}</p>
                  {activity.followUpAt && <small><CalendarClock size={12} /> Follow-up: {formatDate(activity.followUpAt)}</small>}
                </article>
              )) : <p className="admin-crm-empty">No interactions logged yet.</p>}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}