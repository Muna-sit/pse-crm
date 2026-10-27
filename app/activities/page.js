"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import CheckLogin from "../components/CheckLogin";
import ActivityForm, { activityTypes } from "../components/ActivityForm";

export default function ActivitiesPage() {
  return (
    <CheckLogin>
      <Activities />
    </CheckLogin>
  );
}

function Activities() {
  const [activities, setActivities] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function loadActivities() {
    const { data } = await supabase
      .from("activities")
      .select("*, owner:profiles(name), contact:contacts(name), deal:deals(deal_name)")
      .order("activity_date", { ascending: false });
    setActivities(data || []);
  }

  useEffect(() => {
    loadActivities();
  }, []);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(a) {
    setEditing(a);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function deleteActivity(a) {
    if (!confirm("Delete this activity?")) return;
    await supabase.from("activities").delete().eq("id", a.id);
    loadActivities();
  }

  const list = typeFilter ? activities.filter((a) => a.activity_type === typeFilter) : activities;

  return (
    <div>
      <h1>Activities</h1>
      <p className="subtitle">Calls, visits, events and other daily work</p>

      {showForm ? (
        <ActivityForm
          key={editing ? editing.id : "new"}
          activity={editing}
          onSaved={() => { closeForm(); loadActivities(); }}
          onCancel={closeForm}
        />
      ) : (
        <button onClick={openNew}>+ Add Activity</button>
      )}

      <p>
        Type:{" "}
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All</option>
          {activityTypes.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </p>

      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>Owner</th>
            <th>Contact</th>
            <th>Deal</th>
            <th>Status</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((a) => (
            <tr key={a.id}>
              <td>{a.activity_date ? new Date(a.activity_date).toLocaleString() : ""}</td>
              <td>{a.activity_type}</td>
              <td>{a.owner?.name}</td>
              <td>{a.contact?.name}</td>
              <td>{a.deal?.deal_name}</td>
              <td>{a.status}</td>
              <td>{a.notes}</td>
              <td>
                <button className="btn-grey" onClick={() => openEdit(a)}>Edit</button>{" "}
                <button className="btn-red" onClick={() => deleteActivity(a)}>Delete</button>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan="8">No activities found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
