"use client";

import { useEffect, useState } from "react";
import supabase, { getPeople } from "@/lib/supabase";

export const activityTypes = [
  "Task",
  "Email",
  "Call",
  "Meeting",
  "Event",
  "Campaign",
  "Proposal",
  "Visit",
  "Stewardship",
  "Donor Engagement",
  "General",
];

// add / edit an activity
export default function ActivityForm({ activity, onSaved, onCancel }) {
  const [form, setForm] = useState(activity || { activity_type: "Task", status: "pending" });
  const [people, setPeople] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [error, setError] = useState("");

  // load lists for the dropdowns
  useEffect(() => {
    async function loadLists() {
      const p = await getPeople();
      const c = await supabase.from("contacts").select("id, name").order("name");
      const d = await supabase.from("deals").select("id, deal_name").order("deal_name");
      const m = await supabase.from("meetings").select("id, meeting_time, contact:contacts(name)").order("meeting_time", { ascending: false });
      setPeople(p);
      setContacts(c.data || []);
      setDeals(d.data || []);
      setMeetings(m.data || []);

      // new activity: owner is the logged in user
      if (!activity) {
        const { data: login } = await supabase.auth.getUser();
        setForm((f) => ({ ...f, owner_id: login.user.id }));
      }
    }
    loadLists();
  }, []);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function save(e) {
    e.preventDefault();
    setError("");

    const data = {
      activity_type: form.activity_type,
      owner_id: form.owner_id || null,
      contact_id: form.contact_id || null,
      deal_id: form.deal_id || null,
      meeting_id: form.meeting_id || null,
      activity_date: form.activity_date || null,
      status: form.status,
      notes: form.notes || null,
    };

    let result;
    if (activity) {
      result = await supabase.from("activities").update(data).eq("id", activity.id);
    } else {
      result = await supabase.from("activities").insert(data);
    }

    if (result.error) {
      setError(result.error.message);
      return;
    }

    onSaved();
  }

  return (
    <form onSubmit={save} className="form-box">
      <h3>{activity ? "Edit Activity" : "New Activity"}</h3>

      <p>
        Type<br />
        <select name="activity_type" value={form.activity_type} onChange={change}>
          {activityTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </p>

      <p>
        Owner<br />
        <select name="owner_id" value={form.owner_id || ""} onChange={change}>
          <option value="">-- select --</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </p>

      <p>
        Contact (optional)<br />
        <select name="contact_id" value={form.contact_id || ""} onChange={change}>
          <option value="">-- none --</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </p>

      <p>
        Deal (optional)<br />
        <select name="deal_id" value={form.deal_id || ""} onChange={change}>
          <option value="">-- none --</option>
          {deals.map((d) => (
            <option key={d.id} value={d.id}>{d.deal_name}</option>
          ))}
        </select>
      </p>

      <p>
        Meeting (optional)<br />
        <select name="meeting_id" value={form.meeting_id || ""} onChange={change}>
          <option value="">-- none --</option>
          {meetings.map((m) => (
            <option key={m.id} value={m.id}>
              {new Date(m.meeting_time).toLocaleDateString()} - {m.contact?.name}
            </option>
          ))}
        </select>
      </p>

      <p>
        Date and Time<br />
        <input
          name="activity_date"
          type="datetime-local"
          value={form.activity_date ? form.activity_date.slice(0, 16) : ""}
          onChange={change}
        />
      </p>

      <p>
        Status<br />
        <select name="status" value={form.status} onChange={change}>
          <option value="pending">Pending</option>
          <option value="done">Done</option>
        </select>
      </p>

      <p>
        Notes<br />
        <textarea name="notes" rows="4" value={form.notes || ""} onChange={change} />
      </p>

      {error && <p className="error">{error}</p>}

      <button type="submit">Save</button>{" "}
      <button type="button" className="btn-grey" onClick={onCancel}>Cancel</button>
    </form>
  );
}
