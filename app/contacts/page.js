"use client";

import { useEffect, useState } from "react";
import supabase from "@/lib/supabase";
import CheckLogin from "../components/CheckLogin";
import ContactForm from "../components/ContactForm";

export default function ContactsPage() {
  return (
    <CheckLogin>
      <Contacts />
    </CheckLogin>
  );
}

function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState("");

  async function loadContacts() {
    const { data } = await supabase.from("contacts").select("*").order("name");
    setContacts(data || []);
  }

  useEffect(() => {
    loadContacts();
  }, []);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(c) {
    setEditing(c);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function deleteContact(c) {
    if (!confirm("Delete " + c.name + "?")) return;
    setError("");

    const { error } = await supabase.from("contacts").delete().eq("id", c.id);
    if (error) {
      setError("Can not delete. This contact is used in a deal, meeting or activity.");
      return;
    }
    loadContacts();
  }

  // search by name, email, phone or organization
  const s = search.toLowerCase();
  const list = contacts.filter((c) =>
    (c.name || "").toLowerCase().includes(s) ||
    (c.email || "").toLowerCase().includes(s) ||
    (c.phone || "").includes(s) ||
    (c.organization || "").toLowerCase().includes(s)
  );

  return (
    <div>
      <h1>Contacts</h1>
      <p className="subtitle">People and companies we work with</p>

      {showForm ? (
        <ContactForm
          key={editing ? editing.id : "new"}
          contact={editing}
          onSaved={() => { closeForm(); loadContacts(); }}
          onCancel={closeForm}
        />
      ) : (
        <button onClick={openNew}>+ Add Contact</button>
      )}

      <p>
        <input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </p>

      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Organization / Website</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((c) => (
            <tr key={c.id}>
              <td>{c.contact_type}</td>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{c.phone}</td>
              <td>{c.contact_type === "company" ? c.website : c.organization}</td>
              <td>
                <button className="btn-grey" onClick={() => openEdit(c)}>Edit</button>{" "}
                <button className="btn-red" onClick={() => deleteContact(c)}>Delete</button>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan="6">No contacts found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
