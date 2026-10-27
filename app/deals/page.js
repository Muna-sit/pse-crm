"use client";

import { useEffect, useState } from "react";
import supabase, { getStages, getPeople } from "@/lib/supabase";
import CheckLogin from "../components/CheckLogin";
import ContactForm from "../components/ContactForm";

export default function DealsPage() {
  return (
    <CheckLogin>
      <Deals />
    </CheckLogin>
  );
}

function Deals() {
  const [deals, setDeals] = useState([]);
  const [stages, setStages] = useState([]);
  const [stageFilter, setStageFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  async function loadDeals() {
    const { data } = await supabase
      .from("deals")
      .select("*, contact:contacts!deals_contact_id_fkey(name), stage:stages(name), person:profiles(name)")
      .order("created_at", { ascending: false });
    setDeals(data || []);
  }

  async function loadStages() {
    setStages(await getStages());
  }

  useEffect(() => {
    loadDeals();
    loadStages();
  }, []);

  function openNew() {
    setEditing(null);
    setShowForm(true);
  }

  function openEdit(d) {
    setEditing(d);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditing(null);
  }

  async function deleteDeal(d) {
    if (!confirm("Delete " + d.deal_name + "?")) return;

    const { error } = await supabase.from("deals").delete().eq("id", d.id);
    if (error) {
      alert("Can not delete. This deal is used in a meeting or activity.");
      return;
    }
    loadDeals();
  }

  const list = stageFilter ? deals.filter((d) => d.stage_id == stageFilter) : deals;

  return (
    <div>
      <h1>Deals</h1>
      <p className="subtitle">Funding opportunities and their stages</p>

      {showForm ? (
        <DealForm
          key={editing ? editing.id : "new"}
          deal={editing}
          onSaved={() => { closeForm(); loadDeals(); }}
          onCancel={closeForm}
        />
      ) : (
        <button onClick={openNew}>+ Add Deal</button>
      )}

      <p>
        Stage:{" "}
        <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
          <option value="">All</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </p>

      <table>
        <thead>
          <tr>
            <th>Deal</th>
            <th>Contact</th>
            <th>Stage</th>
            <th>Type</th>
            <th>Category</th>
            <th>Expected</th>
            <th>Received</th>
            <th>Focal Person</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((d) => (
            <tr key={d.id}>
              <td>{d.deal_name}</td>
              <td>{d.contact?.name}</td>
              <td>{d.stage?.name}</td>
              <td>{d.contribution_type}</td>
              <td>{d.category}</td>
              <td>{d.expected_amount} {d.expected_amount ? d.currency : ""}</td>
              <td>{d.actual_amount} {d.actual_amount ? d.currency : ""}</td>
              <td>{d.person?.name}</td>
              <td>
                <button className="btn-grey" onClick={() => openEdit(d)}>Edit</button>{" "}
                <button className="btn-red" onClick={() => deleteDeal(d)}>Delete</button>
              </td>
            </tr>
          ))}
          {list.length === 0 && (
            <tr>
              <td colSpan="9">No deals found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}


// add / edit a deal
function DealForm({ deal, onSaved, onCancel }) {
  const [form, setForm] = useState(deal || { currency: "BDT" });
  const [stages, setStages] = useState([]);
  const [people, setPeople] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [showNewContact, setShowNewContact] = useState(false);
  const [error, setError] = useState("");

  // load lists for the dropdowns
  useEffect(() => {
    async function loadLists() {
      const s = await getStages();
      const p = await getPeople();
      const c = await supabase.from("contacts").select("id, name").order("name");
      setStages(s);
      setPeople(p);
      setContacts(c.data || []);

      // new deal starts at first stage
      if (!deal && s.length > 0) {
        setForm((f) => ({ ...f, stage_id: s[0].id }));
      }
    }
    loadLists();
  }, []);

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  // new contact made from inside the deal form
  function contactAdded(c) {
    setContacts([...contacts, c]);
    setForm({ ...form, contact_id: c.id });
    setShowNewContact(false);
  }

  async function save(e) {
    e.preventDefault();
    setError("");

    // empty boxes are saved as null
    const data = {
      deal_name: form.deal_name,
      focal_person: form.focal_person || null,
      contact_id: form.contact_id || null,
      second_contact_id: form.second_contact_id || null,
      stage_id: form.stage_id || null,
      contribution_type: form.contribution_type || null,
      category: form.category || null,
      vertical: form.vertical || null,
      expected_amount: form.expected_amount || null,
      actual_amount: form.actual_amount || null,
      currency: "BDT",
      payment_interval: "Monthly",
      expected_closing: form.expected_closing || null,
      country: form.country || null,
      description: form.description || null,
      operational_budget: form.operational_budget || null,
      notes: form.notes || null,
    };

    let result;
    if (deal) {
      result = await supabase.from("deals").update(data).eq("id", deal.id);
    } else {
      result = await supabase.from("deals").insert(data);
    }

    if (result.error) {
      setError(result.error.message);
      return;
    }

    onSaved();
  }

  return (
    <div>
      {showNewContact && (
        <ContactForm onSaved={contactAdded} onCancel={() => setShowNewContact(false)} />
      )}

      <form onSubmit={save} className="form-box">
        <h3>{deal ? "Edit Deal" : "New Deal"}</h3>

        <p>
          Deal Name *<br />
          <input name="deal_name" value={form.deal_name || ""} onChange={change} required />
        </p>

        <p>
          Focal Person<br />
          <select name="focal_person" value={form.focal_person || ""} onChange={change}>
            <option value="">-- select --</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </p>

        <p>
          Stage<br />
          <select name="stage_id" value={form.stage_id || ""} onChange={change}>
            {stages.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </p>

        <p>
          Contribution Type<br />
          <select name="contribution_type" value={form.contribution_type || ""} onChange={change}>
            <option value="">-- select --</option>
            <option value="cash">Cash</option>
            <option value="in-kind">In-Kind</option>
          </select>
        </p>

        <p>
          Category<br />
          <select name="category" value={form.category || ""} onChange={change}>
            <option value="">-- select --</option>
            <option>DSP</option>
            <option>SAC</option>
            <option>Disaster Campaign</option>
            <option>Project</option>
            <option>Event & Campaign</option>
            <option>General</option>
          </select>
        </p>

        <p>
          Vertical<br />
          <select name="vertical" value={form.vertical || ""} onChange={change}>
            <option value="">-- select --</option>
            <option>DSP</option>
            <option>VBD</option>
            <option>Project</option>
          </select>
        </p>

        <p>
          Contact{" "}
          <button type="button" onClick={() => setShowNewContact(true)}>+ New Contact</button>
          <br />
          <select name="contact_id" value={form.contact_id || ""} onChange={change}>
            <option value="">-- select --</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </p>

        <p>
          Second Contact (optional)<br />
          <select name="second_contact_id" value={form.second_contact_id || ""} onChange={change}>
            <option value="">-- none --</option>
            {contacts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </p>

        <p>
          Expected Amount<br />
          <input name="expected_amount" type="number" value={form.expected_amount || ""} onChange={change} />
        </p>

        <p>
          Actual Amount (received)<br />
          <input name="actual_amount" type="number" value={form.actual_amount || ""} onChange={change} />
        </p>

        <p>Currency: Taka (BDT)</p>

        <p>Payment Interval: Monthly</p>

        <p>
          Expected Closing<br />
          <input name="expected_closing" type="date" value={form.expected_closing || ""} onChange={change} />
        </p>

        <p>
          Country<br />
          <input name="country" value={form.country || ""} onChange={change} />
        </p>

        <p>
          Operational Budget (optional)<br />
          <input name="operational_budget" type="number" value={form.operational_budget || ""} onChange={change} />
        </p>

        <p>
          Description<br />
          <textarea name="description" rows="3" value={form.description || ""} onChange={change} />
        </p>

        <p>
          Notes (paste Google Drive links here)<br />
          <textarea name="notes" rows="4" value={form.notes || ""} onChange={change} />
        </p>

        {error && <p className="error">{error}</p>}

        <button type="submit">Save</button>{" "}
        <button type="button" className="btn-grey" onClick={onCancel}>Cancel</button>
      </form>
    </div>
  );
}
