"use client";

import { useState } from "react";
import supabase from "@/lib/supabase";

// add / edit a contact
// also used inside the deal form
export default function ContactForm({ contact, onSaved, onCancel }) {
  const [form, setForm] = useState(contact || { contact_type: "individual" });
  const [error, setError] = useState("");

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function save(e) {
    e.preventDefault();
    setError("");

    if (!form.email && !form.phone) {
      setError("Please give email or phone");
      return;
    }

    // empty boxes are saved as null
    const data = {
      contact_type: form.contact_type,
      name: form.name,
      email: form.email || null,
      phone: form.phone || null,
      designation: form.designation || null,
      organization: form.organization || null,
      website: form.website || null,
      industry: form.industry || null,
      notes: form.notes || null,
    };

    let result;
    if (contact) {
      result = await supabase.from("contacts").update(data).eq("id", contact.id).select().single();
    } else {
      const { data: login } = await supabase.auth.getUser();
      data.created_by = login.user.id;
      result = await supabase.from("contacts").insert(data).select().single();
    }

    if (result.error) {
      if (result.error.code === "23505") {
        setError("A contact with this email or phone already exists");
      } else {
        setError(result.error.message);
      }
      return;
    }

    onSaved(result.data);
  }

  return (
    <form onSubmit={save} className="form-box">
      <h3>{contact ? "Edit Contact" : "New Contact"}</h3>

      <p>
        Type<br />
        <select name="contact_type" value={form.contact_type} onChange={change}>
          <option value="individual">Individual</option>
          <option value="company">Company</option>
        </select>
      </p>

      <p>
        {form.contact_type === "company" ? "Company Name" : "Contact Name"} *<br />
        <input name="name" value={form.name || ""} onChange={change} required />
      </p>

      <p>
        Email<br />
        <input name="email" type="email" value={form.email || ""} onChange={change} />
      </p>

      <p>
        Phone<br />
        <input name="phone" value={form.phone || ""} onChange={change} />
      </p>

      {form.contact_type === "individual" && (
        <>
          <p>
            Designation<br />
            <input name="designation" value={form.designation || ""} onChange={change} />
          </p>
          <p>
            Organization<br />
            <input name="organization" value={form.organization || ""} onChange={change} />
          </p>
        </>
      )}

      {form.contact_type === "company" && (
        <>
          <p>
            Website<br />
            <input name="website" value={form.website || ""} onChange={change} />
          </p>
          <p>
            Industry<br />
            <input name="industry" value={form.industry || ""} onChange={change} />
          </p>
        </>
      )}

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
