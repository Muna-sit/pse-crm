"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import CheckLogin from "../components/CheckLogin";

export default function MeetingsPage() {
  return (
    <CheckLogin>
      <Meetings />
    </CheckLogin>
  );
}

function Meetings() {
  const [meetings, setMeetings] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function loadMeetings() {
    const { data } = await supabase
      .from("meetings")
      .select("*, contact:contacts(name, email, phone, organization), deal:deals(deal_name)")
      .order("meeting_time", { ascending: false });
    setMeetings(data || []);
  }

  useEffect(() => {
    loadMeetings();
  }, []);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(m) {
    setEditing(m);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function markDone(m) {
    await supabase.from("meetings").update({ status: "done" }).eq("id", m.id);
    loadMeetings();
  }

  async function deleteMeeting(m) {
    if (!confirm("Delete this meeting?")) return;

    const { error } = await supabase.from("meetings").delete().eq("id", m.id);
    if (error) {
      alert("Can not delete. This meeting is used in an activity.");
      return;
    }
    loadMeetings();
  }

  const list = statusFilter ? meetings.filter((m) => m.status === statusFilter) : meetings;

  return (
    <div>
      <h1>Meetings</h1>
      <p className="subtitle">Scheduled and completed meetings</p>

      {showForm ? (
        <MeetingForm
          key={editing ? editing.id : "new"}
          meeting={editing}
          onSaved={() => { closeForm(); loadMeetings(); }}
          onCancel={closeForm}
        />
      ) : (
        <button onClick={openNew}>+ Add Meeting</button>
      )}

      <p>
        Status:{" "}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All</option>
          <option value="scheduled">Scheduled</option>
          <option value="done">Done</option>
        </select>
      </p>

      <table>
        <thead>
          <tr>
            <th>Date / Time</th>
            <th>Contact</th>
            <th>Organization</th>
            <th>Email / Phone</th>
            <th>Deal</th>
            <th>Status</th>
            <th>Description</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((m) => (
            <tr key={m.id}>
              <td>{new Date(m.meeting_time).toLocaleString()}</td>
              <td>{m.contact?.name}</td>
              <td>{m.contact?.organization}</td>
              <td>{m.contact?.email} {m.contact?.phone}</td>
              <td>{m.deal?.deal_name}</td>
              <td>{m.status}</td>
              <td>{m.description}</td>
              <td>
                {m.status === "scheduled" && (
                  <button onClick={() => markDone(m)}>Mark Done</button>
                )}{" "}
                <button className="btn-grey" onClick={() => openEdit(m)}>Edit</button>{" "}
                <button className="btn-red" onClick={() => deleteMeeting(m)}>Delete</button>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan="8">No meetings found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


// add / edit a meeting
function MeetingForm({ meeting, onSaved, onCancel }) {
  const [form, setForm] = useState(meeting || { status: "scheduled" });
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [error, setError] = useState("");

  // load lists for the dropdowns
  useEffect(() => {
    async function loadLists() {
      const c = await supabase.from("contacts").select("id, name").order("name");
      const d = await supabase.from("deals").select("id, deal_name").order("deal_name");
      setContacts(c.data || []);
      setDeals(d.data || []);
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
      contact_id: form.contact_id || null,
      deal_id: form.deal_id || null,
      meeting_time: form.meeting_time,
      status: form.status,
      description: form.description || null,
    };

    let result;
    if (meeting) {
      result = await supabase.from("meetings").update(data).eq("id", meeting.id);
    } else {
      const { data: login } = await supabase.auth.getUser();
      data.created_by = login.user.id;
      result = await supabase.from("meetings").insert(data);
    }

    if (result.error) {
      setError(result.error.message);
      return;
    }

    onSaved();
  }

  return (
    <form onSubmit={save} className="form-box">
      <h3>{meeting ? "Edit Meeting" : "New Meeting"}</h3>

      <p>
        Contact<br />
        <select name="contact_id" value={form.contact_id || ""} onChange={change}>
          <option value="">-- select --</option>
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
        Date and Time *<br />
        <input
          name="meeting_time"
          type="datetime-local"
          value={form.meeting_time ? form.meeting_time.slice(0, 16) : ""}
          onChange={change}
          required
        />
      </p>

      <p>
        Status<br />
        <select name="status" value={form.status} onChange={change}>
          <option value="scheduled">Scheduled</option>
          <option value="done">Done</option>
        </select>
      </p>

      <p>
        Description<br />
        <textarea name="description" rows="4" value={form.description || ""} onChange={change} />
      </p>

      {error && <p className="error">{error}</p>}

      <button type="submit">Save</button>{" "}
      <button type="button" className="btn-grey" onClick={onCancel}>Cancel</button>
    </form>
  );
}
