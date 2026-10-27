"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell,
} from "recharts";
import supabase, { cached, clearCache, getStages, getPeople } from "@/lib/supabase";
import CheckLogin from "./components/CheckLogin";
import Icon, { Avatar } from "./components/Icon";
import { activityTypes } from "./components/ActivityForm";

export default function Home() {
  return (
    <CheckLogin>
      <Dashboard />
    </CheckLogin>
  );
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad(n) {
  return String(n).padStart(2, "0");
}

function money(n) {
  return Math.round(n || 0).toLocaleString();
}

function percentNum(target, achieved) {
  if (!target) return 0;
  return Math.round((achieved / target) * 100);
}

// achieved / unachieved / overachieved as a small badge
function Status({ target, achieved }) {
  if (!target) return <span className="muted">-</span>;
  if (achieved > target) return <span className="badge badge-green">Overachieved</span>;
  if (achieved === target) return <span className="badge badge-grey">Achieved</span>;
  return <span className="badge badge-red">Unachieved</span>;
}

// small progress bar for target %
function Progress({ target, achieved }) {
  if (!target) return <span className="muted">-</span>;
  const p = percentNum(target, achieved);
  return (
    <div className="progress">
      <div className="bar-bg">
        <div className={p > 100 ? "bar-fill green" : "bar-fill"} style={{ width: Math.min(p, 100) + "%" }} />
      </div>
      <span>{p}%</span>
    </div>
  );
}

function Card({ label, number, icon, color, children }) {
  return (
    <div className="card">
      <div className="card-top">
        <div className="card-label">{label}</div>
        <span className={"card-icon " + color}>
          <Icon name={icon} size={16} />
        </span>
      </div>
      <div className="card-number">{number}</div>
      <div className="card-sub">{children}</div>
    </div>
  );
}

function Member({ name }) {
  return (
    <span className="member">
      <Avatar name={name} />
      {name}
    </span>
  );
}

function Dashboard() {
  const now = new Date();
  const thisYear = now.getFullYear();
  const [tab, setTab] = useState("money");
  const [year, setYear] = useState(thisYear);
  const [periodType, setPeriodType] = useState("quarter");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [quarter, setQuarter] = useState(Math.ceil((now.getMonth() + 1) / 3));

  const [people, setPeople] = useState([]);
  const [stages, setStages] = useState([]);
  const [deals, setDeals] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [activities, setActivities] = useState([]);
  const [targets, setTargets] = useState([]);

  // load everything (cached for 60 seconds)
  async function loadAll() {
    setPeople(await getPeople());
    setStages(await getStages());

    const data = await cached("dashboard", 60, async () => {
      const d = await supabase.from("deals").select("*, stage:stages(name)");
      const m = await supabase.from("meetings").select("*");
      const a = await supabase.from("activities").select("*");
      return { deals: d.data || [], meetings: m.data || [], activities: a.data || [] };
    });
    setDeals(data.deals);
    setMeetings(data.meetings);
    setActivities(data.activities);
  }

  async function loadTargets() {
    const data = await cached("targets-" + year, 60, async () => {
      const { data } = await supabase.from("targets").select("*").eq("year", year);
      return data || [];
    });
    setTargets(data);
  }

  useEffect(() => {
    loadAll();
  }, []);

  // targets change with year
  useEffect(() => {
    loadTargets();
  }, [year]);

  // load fresh data now
  function refresh() {
    clearCache("dashboard");
    clearCache("targets-" + year);
    clearCache("people");
    clearCache("stages");
    loadAll();
    loadTargets();
  }

  // start and end date of selected period (end is not included)
  let start, end, periodName;
  if (periodType === "month") {
    start = year + "-" + pad(month) + "-01";
    end = month === 12 ? year + 1 + "-01-01" : year + "-" + pad(month + 1) + "-01";
    periodName = months[month - 1] + " " + year;
  } else if (periodType === "quarter") {
    start = year + "-" + pad((quarter - 1) * 3 + 1) + "-01";
    end = quarter === 4 ? year + 1 + "-01-01" : year + "-" + pad(quarter * 3 + 1) + "-01";
    periodName = "Q" + quarter + " " + year;
  } else {
    start = year + "-01-01";
    end = year + 1 + "-01-01";
    periodName = "Year " + year;
  }

  function inPeriod(date) {
    if (!date) return false;
    const d = date.slice(0, 10);
    return d >= start && d < end;
  }

  // ---------- targets for the period ----------
  const yearlyRow = targets.find((t) => !t.quarter && !t.user_id && !t.vertical);
  const yearlyTarget = yearlyRow ? Number(yearlyRow.amount) : 0;

  function quarterTarget(q, userId) {
    const row = targets.find((t) => t.quarter === q && !t.vertical && (userId ? t.user_id === userId : !t.user_id));
    return row ? Number(row.amount) : 0;
  }

  // target of the team (no userId) or one member
  function periodTarget(userId) {
    if (periodType === "year") {
      return [1, 2, 3, 4].reduce((sum, q) => sum + quarterTarget(q, userId), 0);
    }
    if (periodType === "quarter") {
      return quarterTarget(quarter, userId);
    }
    // month = quarter target / 3
    return quarterTarget(Math.ceil(month / 3), userId) / 3;
  }

  const teamTarget = periodTarget(null);

  function verticalTarget(v) {
    const row = targets.find((t) => t.vertical === v);
    if (!row || !yearlyTarget) return 0;
    return (Number(row.amount) / yearlyTarget) * teamTarget;
  }

  // ---------- achieved = won deals in this period ----------
  const wonDeals = deals.filter((d) => d.stage?.name === "Won" && inPeriod(d.expected_closing));

  function sumActual(list) {
    return list.reduce((sum, d) => sum + (Number(d.actual_amount) || 0), 0);
  }

  const teamAchieved = sumActual(wonDeals);
  const cashAchieved = sumActual(wonDeals.filter((d) => d.contribution_type === "cash"));
  const inKindAchieved = sumActual(wonDeals.filter((d) => d.contribution_type === "in-kind"));

  // ---------- work in this period ----------
  const periodDeals = deals.filter((d) => inPeriod(d.created_at));
  const periodMeetings = meetings.filter((m) => inPeriod(m.meeting_time));
  const periodActivities = activities.filter((a) => inPeriod(a.activity_date));
  const meetingsDone = periodMeetings.filter((m) => m.status === "done").length;
  const activitiesDone = periodActivities.filter((a) => a.status === "done").length;

  // ---------- chart data ----------
  const stageData = stages.map((s) => {
    const list = deals.filter((d) => d.stage_id === s.id);
    const value = list.reduce((sum, d) => sum + (Number(d.expected_amount) || 0), 0);
    return { name: s.name, deals: list.length, value: value };
  });

  const typeData = activityTypes.map((t) => ({
    name: t,
    count: periodActivities.filter((a) => a.activity_type === t).length,
  }));

  const cashData = [
    { name: "Cash", value: cashAchieved },
    { name: "In-Kind", value: inKindAchieved },
  ];
  const pieColors = ["#ea580c", "#fdba74"];

  // year dropdown: 2 years back and 2 years ahead
  const yearList = [thisYear - 2, thisYear - 1, thisYear, thisYear + 1, thisYear + 2];

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1>Dashboard</h1>
          <p className="subtitle">Performance overview for {periodName}</p>
        </div>

        <div className="dash-filters">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {yearList.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={periodType} onChange={(e) => setPeriodType(e.target.value)}>
            <option value="month">Month</option>
            <option value="quarter">Quarter</option>
            <option value="year">Full Year</option>
          </select>
          {periodType === "month" && (
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
              {months.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          )}
          {periodType === "quarter" && (
            <select value={quarter} onChange={(e) => setQuarter(Number(e.target.value))}>
              <option value={1}>Q1</option>
              <option value={2}>Q2</option>
              <option value={3}>Q3</option>
              <option value={4}>Q4</option>
            </select>
          )}
          <button className="btn-grey" onClick={refresh}>Refresh</button>
        </div>
      </div>

      <div className="tabs">
        <span className={tab === "money" ? "tab active" : "tab"} onClick={() => setTab("money")}>Fundraising</span>
        <span className={tab === "work" ? "tab active" : "tab"} onClick={() => setTab("work")}>Team Work</span>
      </div>

      {/* ================= MONEY TAB ================= */}
      {tab === "money" && (
        <>
          <div className="cards">
            <Card label="Team Target" number={money(teamTarget)} icon="targets" color="orange">
              {periodName}
            </Card>
            <Card label="Achieved" number={money(teamAchieved)} icon="money" color="green">
              <Progress target={teamTarget} achieved={teamAchieved} />
            </Card>
          </div>

          <div className="section">
            <h3>Target vs Achievement</h3>
            {!teamTarget && (
              <p className="empty-note">
                No targets set for {periodName}. <Link href="/targets">Set targets</Link>
              </p>
            )}
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th className="num">Target</th>
                  <th className="num">Achieved</th>
                  <th className="num">Difference</th>
                  <th style={{ width: 170 }}>Progress</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const t = periodTarget(p.id);
                  const a = sumActual(wonDeals.filter((d) => d.focal_person === p.id));
                  return (
                    <tr key={p.id}>
                      <td><Member name={p.name} /></td>
                      <td className="num">{money(t)}</td>
                      <td className="num">{money(a)}</td>
                      <td className="num">{money(a - t)}</td>
                      <td><Progress target={t} achieved={a} /></td>
                      <td><Status target={t} achieved={a} /></td>
                    </tr>
                  );
                })}
                <tr className="total-row">
                  <td>Team Total</td>
                  <td className="num">{money(teamTarget)}</td>
                  <td className="num">{money(teamAchieved)}</td>
                  <td className="num">{money(teamAchieved - teamTarget)}</td>
                  <td><Progress target={teamTarget} achieved={teamAchieved} /></td>
                  <td><Status target={teamTarget} achieved={teamAchieved} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid-2">
            <div className="section">
              <h3>Verticals</h3>
              <table>
                <thead>
                  <tr>
                    <th>Vertical</th>
                    <th className="num">Target</th>
                    <th className="num">Achieved</th>
                    <th style={{ width: 140 }}>Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {["DSP", "VBD", "Project"].map((v) => {
                    const t = verticalTarget(v);
                    const a = sumActual(wonDeals.filter((d) => d.vertical === v));
                    return (
                      <tr key={v}>
                        <td>{v}</td>
                        <td className="num">{money(t)}</td>
                        <td className="num">{money(a)}</td>
                        <td><Progress target={t} achieved={a} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="section">
              <h3>Cash vs In-Kind <span className="muted">(received)</span></h3>
              {teamAchieved === 0 ? (
                <p className="empty-note">No money received in {periodName} yet.</p>
              ) : (
                <div className="pie-box">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={cashData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={2}>
                        {cashData.map((c, i) => (
                          <Cell key={c.name} fill={pieColors[i]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => money(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="legend">
                    {cashData.map((c, i) => (
                      <div key={c.name}>
                        <span className="dot" style={{ background: pieColors[i] }} />
                        {c.name}
                        <b>{money(c.value)}</b>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="section">
            <h3>Pipeline by Stage <span className="muted">(all deals)</span></h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stageData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ebe3" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#78716c" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#a8a29e" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "#fdfaf6" }}
                  formatter={(v, n, item) => [v + " deals (" + money(item.payload.value) + ")", "Pipeline"]}
                />
                <Bar dataKey="deals" fill="#fdba74" radius={[4, 4, 0, 0]} maxBarSize={45} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ================= WORK TAB ================= */}
      {tab === "work" && (
        <>
          <div className="cards">
            <Card label="Leads" number={periodDeals.length} icon="userplus" color="orange">
              new deals
            </Card>
            <Card label="Meetings" number={periodMeetings.length} icon="meetings" color="blue">
              {meetingsDone} done
            </Card>
            <Card label="Activities" number={periodActivities.length} icon="pulse" color="purple">
              {activitiesDone} done
            </Card>
          </div>

          <div className="section">
            <h3>Work by Team Member</h3>
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th className="num">Leads</th>
                  <th className="num">Meetings Scheduled</th>
                  <th className="num">Meetings Done</th>
                  <th className="num">Activities</th>
                  <th className="num">Activities Done</th>
                </tr>
              </thead>
              <tbody>
                {people.map((p) => {
                  const myMeetings = periodMeetings.filter((m) => m.created_by === p.id);
                  const myActivities = periodActivities.filter((a) => a.owner_id === p.id);
                  return (
                    <tr key={p.id}>
                      <td><Member name={p.name} /></td>
                      <td className="num">{periodDeals.filter((d) => d.focal_person === p.id).length}</td>
                      <td className="num">{myMeetings.filter((m) => m.status === "scheduled").length}</td>
                      <td className="num">{myMeetings.filter((m) => m.status === "done").length}</td>
                      <td className="num">{myActivities.length}</td>
                      <td className="num">{myActivities.filter((a) => a.status === "done").length}</td>
                    </tr>
                  );
                })}
                <tr className="total-row">
                  <td>Team Total</td>
                  <td className="num">{periodDeals.length}</td>
                  <td className="num">{periodMeetings.length - meetingsDone}</td>
                  <td className="num">{meetingsDone}</td>
                  <td className="num">{periodActivities.length}</td>
                  <td className="num">{activitiesDone}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="section">
            <h3>Activities by Type</h3>
            {periodActivities.length === 0 ? (
              <p className="empty-note">No activities in {periodName} yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0ebe3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#a8a29e" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: "#78716c" }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "#fdfaf6" }} />
                  <Bar dataKey="count" name="Activities" fill="#fdba74" radius={[0, 4, 4, 0]} maxBarSize={18} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
