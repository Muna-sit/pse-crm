"use client";

import { useEffect, useState } from "react";
import supabase, { getPeople } from "@/lib/supabase";
import CheckLogin from "../components/CheckLogin";

export default function TargetsPage() {
  return (
    <CheckLogin>
      <Targets />
    </CheckLogin>
  );
}

const quarters = [1, 2, 3, 4];
const verticals = ["DSP", "VBD", "Project"];

function Targets() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [people, setPeople] = useState([]);
  const [isManager, setIsManager] = useState(false);

  const [yearly, setYearly] = useState("");
  const [qAmounts, setQAmounts] = useState({});   // { 1: 100, 2: 200 ... }
  const [memberAmounts, setMemberAmounts] = useState({}); // { userId: { 1: 50, 2: 60 ... } }
  const [vPercent, setVPercent] = useState({});   // { DSP: 50, VBD: 30, Project: 20 }
  const [locked, setLocked] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // check if logged in user is manager + load team list
  useEffect(() => {
    async function loadUser() {
      const { data: login } = await supabase.auth.getUser();
      const { data: me } = await supabase.from("profiles").select("role").eq("id", login.user.id).single();
      setIsManager(me && me.role === "manager");

      setPeople(await getPeople());
    }
    loadUser();
  }, []);

  // load targets when year changes
  useEffect(() => {
    loadTargets();
  }, [year]);

  async function loadTargets() {
    setError("");
    setMessage("");

    const { data } = await supabase.from("targets").select("*").eq("year", year);
    const rows = data || [];

    let y = "";
    const q = {};
    const m = {};
    const v = {};
    let isLocked = false;

    rows.forEach((r) => {
      if (r.locked) isLocked = true;

      if (r.vertical) {
        v[r.vertical] = r.amount; // amount for now, changed to % below
      } else if (r.user_id) {
        if (!m[r.user_id]) m[r.user_id] = {};
        m[r.user_id][r.quarter] = r.amount;
      } else if (r.quarter) {
        q[r.quarter] = r.amount;
      } else {
        y = r.amount;
      }
    });

    // vertical amount -> percent
    verticals.forEach((name) => {
      if (v[name] && y) v[name] = Math.round((v[name] / y) * 10000) / 100;
    });

    setYearly(y);
    setQAmounts(q);
    setMemberAmounts(m);
    setVPercent(v);
    setLocked(isLocked);
  }

  function setMember(userId, quarter, value) {
    setMemberAmounts({
      ...memberAmounts,
      [userId]: { ...memberAmounts[userId], [quarter]: value },
    });
  }

  // totals
  const yearlyNum = Number(yearly) || 0;
  const qTotal = quarters.reduce((sum, q) => sum + (Number(qAmounts[q]) || 0), 0);
  const vTotal = verticals.reduce((sum, v) => sum + (Number(vPercent[v]) || 0), 0);

  function memberTotal(q) {
    return people.reduce((sum, p) => sum + (Number(memberAmounts[p.id]?.[q]) || 0), 0);
  }

  // save everything for this year
  // simple way: delete old rows for the year, then add new rows
  async function save(lockIt) {
    setError("");
    setMessage("");

    if (!yearlyNum) {
      setError("Please enter the yearly target");
      return;
    }
    if (qTotal !== yearlyNum) {
      setError("Q1 + Q2 + Q3 + Q4 must be equal to the yearly target");
      return;
    }
    if (vTotal !== 100) {
      setError("Vertical percentages must add up to 100");
      return;
    }

    const rows = [];

    rows.push({ year, amount: yearlyNum });

    quarters.forEach((q) => {
      rows.push({ year, quarter: q, amount: Number(qAmounts[q]) || 0 });
    });

    people.forEach((p) => {
      quarters.forEach((q) => {
        const amt = Number(memberAmounts[p.id]?.[q]) || 0;
        if (amt) rows.push({ year, quarter: q, user_id: p.id, amount: amt });
      });
    });

    verticals.forEach((v) => {
      const pct = Number(vPercent[v]) || 0;
      if (pct) rows.push({ year, vertical: v, amount: (yearlyNum * pct) / 100 });
    });

    rows.forEach((r) => (r.locked = lockIt));

    const del = await supabase.from("targets").delete().eq("year", year);
    if (del.error) {
      setError(del.error.message);
      return;
    }

    const ins = await supabase.from("targets").insert(rows);
    if (ins.error) {
      setError(ins.error.message);
      return;
    }

    setMessage(lockIt ? "Saved and locked" : "Saved");
    loadTargets();
  }

  function lockTargets() {
    if (!confirm("After locking, targets for " + year + " can not be changed. Continue?")) return;
    save(true);
  }

  const canEdit = isManager && !locked;

  return (
    <div>
      <h1>Targets</h1>
      <p className="subtitle">Yearly and quarterly fundraising targets</p>

      <p>
        Year:{" "}
        <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 80 }} />
        {locked && <b> (Locked)</b>}
        {!isManager && <i> - only managers can edit targets</i>}
      </p>

      <h3>1. Yearly Target (Team)</h3>
      <input type="number" value={yearly} onChange={(e) => setYearly(e.target.value)} disabled={!canEdit} />

      <h3>2. Quarterly Targets</h3>
      <table style={{ width: "auto" }}>
        <thead>
          <tr>
            {quarters.map((q) => <th key={q}>Q{q}</th>)}
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {quarters.map((q) => (
              <td key={q}>
                <input
                  type="number"
                  value={qAmounts[q] || ""}
                  onChange={(e) => setQAmounts({ ...qAmounts, [q]: e.target.value })}
                  disabled={!canEdit}
                  style={{ width: 100 }}
                />
              </td>
            ))}
            <td>{qTotal}</td>
          </tr>
        </tbody>
      </table>
      {yearlyNum > 0 && qTotal !== yearlyNum && (
        <p className="error">Quarter total ({qTotal}) is not equal to yearly target ({yearlyNum})</p>
      )}

      <h3>3. Team Member Targets</h3>
      <table style={{ width: "auto" }}>
        <thead>
          <tr>
            <th>Member</th>
            {quarters.map((q) => <th key={q}>Q{q}</th>)}
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              {quarters.map((q) => (
                <td key={q}>
                  <input
                    type="number"
                    value={memberAmounts[p.id]?.[q] || ""}
                    onChange={(e) => setMember(p.id, q, e.target.value)}
                    disabled={!canEdit}
                    style={{ width: 100 }}
                  />
                </td>
              ))}
            </tr>
          ))}
          <tr>
            <td><b>Total</b></td>
            {quarters.map((q) => (
              <td key={q}>
                {memberTotal(q)}
                {memberTotal(q) !== (Number(qAmounts[q]) || 0) && <span className="error"> (Q{q} is {Number(qAmounts[q]) || 0})</span>}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <h3>4. Vertical Targets (% of yearly)</h3>
      <table style={{ width: "auto" }}>
        <thead>
          <tr>
            <th>Vertical</th>
            <th>%</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {verticals.map((v) => (
            <tr key={v}>
              <td>{v}</td>
              <td>
                <input
                  type="number"
                  value={vPercent[v] || ""}
                  onChange={(e) => setVPercent({ ...vPercent, [v]: e.target.value })}
                  disabled={!canEdit}
                  style={{ width: 70 }}
                />
              </td>
              <td>{(yearlyNum * (Number(vPercent[v]) || 0)) / 100}</td>
            </tr>
          ))}
          <tr>
            <td><b>Total</b></td>
            <td>{vTotal}%</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <br />
      {error && <p className="error">{error}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}

      {canEdit && (
        <p>
          <button onClick={() => save(false)}>Save</button>{" "}
          <button onClick={lockTargets}>Save and Lock</button>
        </p>
      )}
    </div>
  );
}
