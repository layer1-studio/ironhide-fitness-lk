import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// Router paths (match routes defined in App.tsx)
const ATTENDANCE_ROUTE = "/admin/staff/attendance";


const ATT_STATUSES = ["present", "late", "absent", "off"] as const;
type AttendanceStatus = typeof ATT_STATUSES[number];

interface StaffMember {
  id: string;
  name: string;
  initials: string;
  role: string;
  email: string;
  phone: string;
  joinDate: string;
  employeeId: string;
  active: boolean;
  salary: number;
}

interface AttendanceRecord {
  staffId: string;
  date: string;
  status: AttendanceStatus;
  checkIn?: string;
  checkOut?: string;
}

interface NewStaffInput {
  name: string;
  role: string;
  email: string;
  phone: string;
  joinDate: string;
  salary: string | number;
}


import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { getStaffMembers, addStaffMember, updateStaffMember } from "../../lib/memberService";

const STAFF_KEY = "ironhide.staff"; // kept for compatibility fallback
const ATTENDANCE_KEY = "ironhide.attendance";

async function loadStaff(): Promise<StaffMember[]> {
  try {
    const docs = await getStaffMembers();
    const mapped = docs.map((d) => ({
      id: d.id,
      name: d.fullName,
      initials: initialsOf(d.fullName),
      role: d.role || "",
      email: d.email || "",
      phone: d.phone || "",
      joinDate: d.createdAt ? new Date(d.createdAt).toISOString().slice(0, 10) : todayStr(),
      employeeId: "EMP-" + d.id.slice(-6),
      active: d.status === "active",
      salary: (d as any).salary || 0,
    }));

    // Migrate any local fallback staff into Firestore to ensure all staff are saved
    try {
      const raw = localStorage.getItem(STAFF_KEY);
      if (raw) {
        const local: StaffMember[] = JSON.parse(raw);
        for (const l of local) {
          const exists = mapped.some((m) => (m.email && l.email && m.email === l.email) || m.name === l.name);
          if (!exists) {
            const payload: any = {
              fullName: l.name,
              role: l.role || "Staff",
              email: l.email || "",
              phone: l.phone || "",
              department: "General",
              status: l.active ? "active" : "inactive",
              salary: l.salary || 0,
              joinDate: l.joinDate || todayStr(),
            };
            try {
              const newId = await addStaffMember(payload);
              mapped.push({
                id: newId,
                name: payload.fullName,
                initials: initialsOf(payload.fullName),
                role: payload.role,
                email: payload.email,
                phone: payload.phone,
                joinDate: payload.joinDate,
                employeeId: "EMP-" + newId.slice(-6),
                active: payload.status === "active",
                salary: payload.salary || 0,
              });
            } catch (e) {
              console.error("failed to migrate local staff", e);
            }
          }
        }
        try {
          localStorage.removeItem(STAFF_KEY);
        } catch {}
      }
    } catch (e) {
      console.error("staff migration check failed", e);
    }

    return mapped;
  } catch (e) {
    try {
      const raw = localStorage.getItem(STAFF_KEY);
      return raw ? (JSON.parse(raw) as StaffMember[]) : [];
    } catch {
      return [];
    }
  }
}

async function loadAttendance(): Promise<AttendanceRecord[]> {
  try {
    const ref = collection(db, "staff_attendance");
    const snap = await getDocs(ref);
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const status = String(data.status || "absent") as AttendanceStatus;
      return {
        staffId: String(data.staffId || ""),
        date: String(data.date || ""),
        status: data.note === "late" ? "late" : status,
        checkIn: String(data.checkIn || "") || undefined,
        checkOut: String(data.checkOut || "") || undefined,
      };
    });
  } catch (e) {
    try {
      const raw = localStorage.getItem(ATTENDANCE_KEY);
      return raw ? (JSON.parse(raw) as AttendanceRecord[]) : [];
    } catch {
      return [];
    }
  }
}

// attendance saving handled elsewhere (kept in AttendancePage)

/* ───────────────────────── helpers ───────────────────────── */
const todayStr = () => new Date().toISOString().slice(0, 10);

function initialsOf(name: string) {
  return name.trim().split(/\s+/).map((w) => w[0]).join("").toUpperCase().slice(0, 2);
}
function fmtDate(d: string, opts?: Intl.DateTimeFormatOptions) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-GB", opts || { day: "2-digit", month: "short", year: "numeric" });
}
function fmtShort(d: string) {
  const dt = new Date(d + "T00:00:00");
  const t = new Date(todayStr() + "T00:00:00");
  const diff = Math.round((t.getTime() - dt.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}


const Icon = ({ path, className = "" }: { path: string; className?: string }) => (
  <svg
    className={`icon ${className}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    dangerouslySetInnerHTML={{ __html: path }}
  />
);
const ICON = {
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
  phone: '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  shieldCheck: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
  ban: '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  userCog: '<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a4 4 0 0 1 4-4h3"/><circle cx="18" cy="18" r="3"/><path d="M18 14.5v.6M18 20.9v.6M14.5 18h.6M20.9 18h.6M15.5 15.5l.4.4M20.1 20.1l.4.4M20.5 15.5l-.4.4M15.9 20.1l-.4.4"/>',
};


const Avatar = ({ initials, size = "sm" }: { initials: string; size?: "sm" | "md" | "lg" }) => (
  <div className={`avatar avatar-${size}`}>{initials}</div>
);
// Department removed — no badge
const ActiveBadge = ({ active }: { active: boolean }) =>
  active ? (
    <span className="badge badge-active">
      <span className="dot" style={{ background: "var(--emerald)" }} />
      Active
    </span>
  ) : (
    <span className="badge badge-inactive">
      <span className="dot" style={{ background: "var(--muted)" }} />
      Inactive
    </span>
  );

function AddStaffModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (data: NewStaffInput) => void;
}) {
  const [error, setError] = useState("");
  const [form, setForm] = useState<NewStaffInput>({
    name: "",
    role: "",
    email: "",
    phone: "",
    joinDate: todayStr(),
    salary: "",
  });

  const set = (k: keyof NewStaffInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.role || !form.email) {
      setError("Please fill in name, role, and email.");
      return;
    }
    onAdd(form);
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-head">
          <div>
            <h2 className="modal-title disp">Add Staff Member</h2>
            <div className="modal-desc">Fill in the details to register a new staff member</div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <Icon path={ICON.x} />
          </button>
        </div>
        <div className="modal-body">
          <form onSubmit={submit}>
            {error && <div className="form-error">{error}</div>}
            <div className="form-grid">
              <div className="field">
                <label>Full Name *</label>
                <input placeholder="e.g. Roshan Perera" value={form.name} onChange={set("name")} required />
              </div>
              <div className="field">
                <label>Role / Position *</label>
                <input placeholder="e.g. Personal Trainer" value={form.role} onChange={set("role")} required />
              </div>
            </div>
            <div className="form-grid">
              <div className="field">
                <label>Join Date</label>
                <input type="date" value={form.joinDate} onChange={set("joinDate")} />
              </div>
            </div>
            <div className="field">
              <label>Email Address *</label>
              <input type="email" placeholder="name@ironhide.lk" value={form.email} onChange={set("email")} required />
            </div>
            <div className="field">
              <label>Phone</label>
              <input placeholder="+94 77 000 0000" value={form.phone} onChange={set("phone")} />
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <Icon path={ICON.plus} /> Add Staff Member
              </button>
              <button type="button" className="btn btn-ghost" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function StaffDetailModal({
  staff,
  attendance,
  onClose,
  onToggleActive,
}: {
  staff: StaffMember;
  attendance: AttendanceRecord[];
  onClose: () => void;
  onToggleActive: (id: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 7); // YYYY-MM
  });
  const [monthly, setMonthly] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    const [y, m] = month.split("-").map(Number);
    const from = `${month}-01`;
    const lastDay = new Date(y, m, 0).toISOString().slice(0, 10);
    const filtered = attendance
      .filter((a) => a.staffId === staff.id && a.date >= from && a.date <= lastDay)
      .sort((a, b) => a.date.localeCompare(b.date));
    setMonthly(filtered);
  }, [month, staff.id, attendance]);

  const myAtt = attendance.filter((a) => a.staffId === staff.id).sort((a, b) => b.date.localeCompare(a.date));
  const present = myAtt.filter((a) => a.status === "present" || a.status === "late").length;
  const absent = myAtt.filter((a) => a.status === "absent").length;

  const monthStatusMap = new Map(monthly.map((record) => [record.date, record.status] as [string, AttendanceStatus]));
  const [year, monthIndex] = month.split("-").map(Number);
  const firstDayOfMonth = new Date(year, monthIndex - 1, 1).getDay();
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const calendarCells = Array.from({ length: firstDayOfMonth + daysInMonth }, (_, index) => {
    if (index < firstDayOfMonth) return null;
    const day = index - firstDayOfMonth + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    return { day, date, status: monthStatusMap.get(date) };
  });

  const items: [string, string][] = [
    ["Email", staff.email],
    ["Phone", staff.phone || "—"],
    ["Join Date", fmtDate(staff.joinDate)],
    ["Monthly Salary", staff.salary ? "Rs. " + staff.salary.toLocaleString() : "—"],
    ["Days Present", present + " days"],
    ["Days Absent", absent + " days"],
  ];

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-head">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Avatar initials={staff.initials} size="lg" />
            <div>
              <h2 className="modal-title">{staff.name}</h2>
              <div className="modal-desc mono">
                {staff.employeeId} &middot; {staff.role}
              </div>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <Icon path={ICON.x} />
          </button>
        </div>
        <div className="modal-body">
          <div className="detail-badges">
            <ActiveBadge active={staff.active} />
          </div>
          <div className="detail-grid">
            {items.map(([label, value]) => (
              <div className="detail-item" key={label}>
                <div className="detail-label">{label}</div>
                <div className="detail-value">{value}</div>
              </div>
            ))}
          </div>
          {myAtt.length ? (
            <>
              <div className="recent-label">Recent Attendance</div>
              {myAtt.slice(0, 6).map((a, i) => (
                <div className="recent-row" key={i}>
                  <span className="recent-date">{fmtShort(a.date)}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {(a.checkIn || a.checkOut) && (
                      <span className="recent-times">
                        {a.checkIn || "—"} → {a.checkOut || "—"}
                      </span>
                    )}
                    <span className={`badge att-${a.status}`}>{a.status.charAt(0).toUpperCase() + a.status.slice(1)}</span>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div style={{ color: "var(--muted-soft)", fontSize: 12.5 }}>No attendance recorded yet.</div>
          )}
          <div style={{ marginTop: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <h3 style={{ margin: 0 }}>Monthly Attendance</h3>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <label style={{ color: "var(--muted)", fontSize: 13, margin: 0 }}>Month</label>
                <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
              </div>
            </div>
            <div className="calendar-grid">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label) => (
                <div key={label} className="calendar-header-cell">{label}</div>
              ))}
              {calendarCells.map((cell, index) => (
                <div key={index} className={`calendar-cell ${cell ? cell.status || 'empty' : 'empty'}`}>
                  {cell ? (
                    <>
                      <span className="calendar-day">{cell.day}</span>
                      {cell.status && <span className={`calendar-status dot-${cell.status}`} />}
                    </>
                  ) : null}
                </div>
              ))}
            </div>
            <div className="calendar-legend">
              <span><span className="legend-dot present" /> Present</span>
              <span><span className="legend-dot late" /> Late</span>
              <span><span className="legend-dot absent" /> Absent</span>
              <span><span className="legend-dot off" /> Off</span>
            </div>
          </div>
          <button
            className={`toggle-active-btn ${staff.active ? "btn-danger-outline" : "btn-emerald-outline"}`}
            style={{ borderColor: staff.active ? "rgba(240,86,74,0.3)" : "rgba(52,211,153,0.3)" }}
            onClick={() => onToggleActive(staff.id)}
          >
            {staff.active ? (
              <>
                <Icon path={ICON.ban} /> Deactivate Staff
              </>
            ) : (
              <>
                <Icon path={ICON.shieldCheck} /> Reactivate Staff
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


export default function StaffRosterPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewStaffId, setViewStaffId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [staffResult, attendanceResult] = await Promise.allSettled([loadStaff(), loadAttendance()]);

        if (!active) return;

        setStaff(staffResult.status === "fulfilled" ? staffResult.value : []);
        setAttendance(attendanceResult.status === "fulfilled" ? attendanceResult.value : []);
      } catch (error) {
        console.error("Failed to load staff roster data", error);
        if (active) {
          setStaff([]);
          setAttendance([]);
        }
      } finally {
        if (active) setLoaded(true);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const addStaff = async (data: NewStaffInput) => {
    // Persist to canonical gym_staff collection via memberService
    const payload: any = {
      fullName: data.name.trim(),
      role: data.role.trim(),
      email: data.email.trim(),
      phone: data.phone.trim(),
      department: "General",
      status: "active",
      salary: Number(data.salary) || 0,
      joinDate: data.joinDate || todayStr(),
    };
    try {
      const newId = await addStaffMember(payload);
      const member: StaffMember = {
        id: newId,
        name: payload.fullName,
        initials: initialsOf(payload.fullName),
        role: payload.role,
        email: payload.email,
        phone: payload.phone,
        joinDate: payload.joinDate,
        employeeId: "EMP-" + newId.slice(-6),
        active: true,
        salary: payload.salary || 0,
      };
      setStaff((s) => [...s, member]);
      setShowAddModal(false);
    } catch (e) {
      console.error("addStaff failed", e);
    }
  };

  const toggleActive = async (staffId: string) => {
    const next = staff.map((s) => (s.id === staffId ? { ...s, active: !s.active } : s));
    setStaff(next);
    const target = next.find((s) => s.id === staffId);
    if (target) {
      try {
        await updateStaffMember(staffId, { status: target.active ? "active" : "inactive" });
      } catch (e) {
        console.error("toggleActive failed", e);
      }
    }
  };

  const activeStaff = staff.filter((s) => s.active);
  const q = search.toLowerCase();
  const filtered = staff.filter((s) => !q || s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q));
  const viewStaff = viewStaffId ? staff.find((s) => s.id === viewStaffId) || null : null;

  if (!loaded) {
    return (
      <>
        <Style />
        <div id="app">
          <div style={{ padding: 80, textAlign: "center", color: "var(--muted-soft)" }}>Loading staff portal…</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Style />
      <div id="app">
        <div className="header-row">
          <div>
            <div className="brand-eyebrow">
              <span className="bar" />
              IRONHIDE OPERATIONS
            </div>
            <h1 className="page-title disp">Staff Roster</h1>
            <div className="page-sub">
              <Icon path={ICON.userCog} />
              {activeStaff.length} active &middot; {staff.length} total employees
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
            <Icon path={ICON.plus} /> Add Staff Member
          </button>
        </div>

        <div className="kpi-grid">
          <div className="kpi kpi-hero">
            <span className="kpi-label">Active Staff</span>
            <span className="kpi-value disp">{activeStaff.length}</span>
            <span className="kpi-sub">{staff.length} total registered</span>
          </div>
          <div className="kpi kpi-plain">
            <span className="kpi-label">Roles</span>
            <span className="kpi-value disp" style={{ color: "var(--sky)" }}>
              {new Set(staff.map((s) => s.role)).size}
            </span>
            <span className="kpi-sub">Distinct job titles</span>
          </div>
          <div className="kpi kpi-plain">
            <span className="kpi-label">Inactive</span>
            <span className="kpi-value disp" style={{ color: "var(--muted)" }}>
              {staff.length - activeStaff.length}
            </span>
            <span className="kpi-sub">Deactivated staff</span>
          </div>
        </div>

        <div className="panel">
          <div className="tabs">
            <button className="tab-btn active">
              <Icon path={ICON.users} /> Staff Roster
            </button>
            <Link to={ATTENDANCE_ROUTE} className="tab-btn">
              <Icon path={ICON.calendar} /> Daily Attendance
            </Link>
          </div>

          {staff.length === 0 ? (
            <>
              <div className="search-row">
                <Icon path={ICON.search} />
                <input type="text" placeholder="Search by name or role..." disabled style={{ opacity: 0.4 }} />
              </div>
              <div className="empty-panel">
                <Icon path={ICON.users} />
                <div className="empty-title">No staff registered yet</div>
                <div>Add your first team member to start building your roster.</div>
                <button className="btn btn-primary" onClick={() => setShowAddModal(true)} style={{ margin: "16px auto 0" }}>
                  <Icon path={ICON.plus} /> Add Staff Member
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="search-row">
                <Icon path={ICON.search} />
                <input
                  type="text"
                  placeholder="Search by name or role..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button className="clear-btn" onClick={() => setSearch("")}>
                    <Icon path={ICON.x} />
                  </button>
                )}
              </div>
              <div style={{ overflowX: "auto" }}>
                <table>
                  <thead>
                    <tr>
                      {["Employee", "Role", "Contact", "Join Date", "Status", "Actions"].map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr className="empty-row">
                        <td colSpan={6}>
                          <div className="empty-title">No matches</div>
                          Try a different search term.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((s) => (
                        <tr key={s.id}>
                          <td>
                            <div className="emp-cell">
                              <Avatar initials={s.initials} />
                              <div>
                                <div className="emp-name">{s.name}</div>
                                <div className="emp-id mono">{s.employeeId}</div>
                              </div>
                            </div>
                          </td>
                          <td>{s.role}</td>
                          <td>
                            <div className="contact-line">
                              <Icon path={ICON.mail} />
                              {s.email}
                            </div>
                            {s.phone && (
                              <div className="contact-line">
                                <Icon path={ICON.phone} />
                                {s.phone}
                              </div>
                            )}
                          </td>
                          <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--muted)" }}>{fmtDate(s.joinDate)}</td>
                          <td>
                            <ActiveBadge active={s.active} />
                          </td>
                          <td>
                            <button className="view-btn" onClick={() => setViewStaffId(s.id)}>
                              <Icon path={ICON.eye} /> View
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {showAddModal && <AddStaffModal onClose={() => setShowAddModal(false)} onAdd={addStaff} />}
      {viewStaff && (
        <StaffDetailModal staff={viewStaff} attendance={attendance} onClose={() => setViewStaffId(null)} onToggleActive={toggleActive} />
      )}
    </>
  );
}

function Style() {
  return (
    <style>{`
:root{
  --bg:#101013; --card:#18181d; --card-raised:#1e1e25; --border:#2a2a33; --border-soft:#232329;
  --foreground:#f2f2f5; --muted:#8c8c97; --muted-soft:#6b6b76; --primary:#e2452f; --primary-soft:rgba(226,69,47,0.12);
  --emerald:#34d399; --emerald-soft:rgba(52,211,153,0.12); --amber:#f5b942; --amber-soft:rgba(245,185,66,0.12);
  --red:#f0564a; --red-soft:rgba(240,86,74,0.12); --sky:#4fb8e8; --sky-soft:rgba(79,184,232,0.12);
  --violet:#a78bfa; --violet-soft:rgba(167,139,250,0.12); --slate:#9aa1ac; --slate-soft:rgba(154,161,172,0.12);
}
*{box-sizing:border-box;}
#app{max-width:1180px; margin:0 auto; padding:28px 20px 60px; font-family:'Inter',sans-serif; color:var(--foreground); background:var(--bg);}
.disp{font-family:'Barlow Condensed',sans-serif; letter-spacing:0.01em;}
.mono{font-family:'JetBrains Mono',monospace;}
.header-row{display:flex; align-items:flex-end; justify-content:space-between; gap:16px; flex-wrap:wrap; margin-bottom:22px;}
.brand-eyebrow{display:flex; align-items:center; gap:8px; color:var(--primary); font-size:11px; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; margin-bottom:6px;}
.brand-eyebrow .bar{width:16px; height:2px; background:var(--primary); display:inline-block;}
h1.page-title{font-size:34px; font-weight:800; text-transform:uppercase; margin:0; line-height:1;}
.page-sub{color:var(--muted); font-size:13px; margin-top:6px; display:flex; align-items:center; gap:6px;}
.btn{display:inline-flex; align-items:center; gap:8px; border:none; cursor:pointer; font-weight:700; font-size:13.5px; border-radius:10px; padding:11px 18px; transition:background .15s, border-color .15s, opacity .15s;}
.btn-primary{background:var(--primary); color:#fff;}
.btn-primary:hover{background:#ca3a26;}
.btn-ghost{background:var(--card-raised); color:var(--foreground); border:1px solid var(--border);}
.btn-ghost:hover{background:#25252d;}
.btn-danger-outline{background:var(--red-soft); color:var(--red); border:1px solid rgba(240,86,74,0.35);}
.btn-danger-outline:hover{background:rgba(240,86,74,0.2);}
.btn-emerald-outline{background:var(--emerald-soft); color:var(--emerald); border:1px solid rgba(52,211,153,0.35);}
.btn-emerald-outline:hover{background:rgba(52,211,153,0.2);}
.icon{width:15px; height:15px; flex-shrink:0;}
.kpi-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:22px;}
@media(max-width:820px){.kpi-grid{grid-template-columns:repeat(2,1fr);}}
.kpi{border-radius:14px; padding:16px 18px; display:flex; flex-direction:column; gap:6px; border:1px solid var(--border);}
.kpi-hero{background:linear-gradient(145deg,var(--primary),#b5321f); border-color:transparent;}
.kpi-plain{background:var(--card);}
.kpi-label{font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.14em;}
.kpi-hero .kpi-label{color:rgba(255,255,255,0.65);}
.kpi-plain .kpi-label{color:var(--muted);}
.kpi-value{font-family:'Barlow Condensed',sans-serif; font-weight:800; font-size:34px; line-height:1;}
.kpi-hero .kpi-value{color:#fff;}
.kpi-sub{font-size:11.5px;}
.kpi-hero .kpi-sub{color:rgba(255,255,255,0.55);}
.kpi-plain .kpi-sub{color:var(--muted-soft);}
.panel{background:var(--card); border:1px solid var(--border); border-radius:14px; overflow:hidden;}
.tabs{display:flex; border-bottom:1px solid var(--border);}
.tab-btn{display:flex; align-items:center; gap:8px; padding:14px 22px; font-size:13.5px; font-weight:700; background:none; border:none; border-bottom:2px solid transparent; color:var(--muted); cursor:pointer;}
.tab-btn.active{color:var(--primary); border-bottom-color:var(--primary);}
.tab-btn{text-decoration:none;}
.tab-btn:hover:not(.active){color:var(--foreground);}
.search-row{display:flex; align-items:center; gap:10px; padding:13px 18px; border-bottom:1px solid var(--border);}
.search-row input{flex:1; background:transparent; border:none; outline:none; color:var(--foreground); font-size:13.5px;}
.search-row input::placeholder{color:var(--muted-soft);}
.search-row svg{color:var(--muted-soft); flex-shrink:0;}
.clear-btn{background:none; border:none; color:var(--muted-soft); cursor:pointer; display:flex;}
.clear-btn:hover{color:var(--foreground);}
table{width:100%; border-collapse:collapse; font-size:13.5px;}
thead th{text-align:left; padding:11px 16px; font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.12em; color:var(--muted-soft); border-bottom:1px solid var(--border);}
tbody tr{border-bottom:1px solid var(--border-soft); transition:background .12s;}
tbody tr:last-child{border-bottom:none;}
tbody tr:hover{background:rgba(255,255,255,0.02);}
td{padding:12px 16px; vertical-align:middle;}
.emp-cell{display:flex; align-items:center; gap:10px;}
.emp-name{font-weight:600; color:var(--foreground); line-height:1.25;}
.emp-id{font-size:11px; color:var(--muted-soft);}
.contact-line{display:flex; align-items:center; gap:6px; font-size:11.5px; color:var(--muted);}
.contact-line svg{width:11px; height:11px; flex-shrink:0;}
.salary{font-weight:600;}
.empty-row td{padding:56px 16px; text-align:center; color:var(--muted-soft); font-size:13.5px;}
.empty-row .empty-title{font-weight:700; color:var(--muted); font-size:14.5px; margin-bottom:4px;}
.avatar{border-radius:50%; background:linear-gradient(145deg,#2c2c36,#1c1c22); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; font-weight:700; color:var(--foreground); flex-shrink:0; font-family:'Barlow Condensed',sans-serif;}
.avatar-sm{width:32px; height:32px; font-size:12px;}
.avatar-md{width:40px; height:40px; font-size:14px;}
.avatar-lg{width:52px; height:52px; font-size:18px;}
.badge{display:inline-flex; align-items:center; gap:6px; padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; border:1px solid transparent; white-space:nowrap;}
.dot{width:6px; height:6px; border-radius:50%; display:inline-block;}
.badge-active{color:var(--emerald); background:var(--emerald-soft); border-color:rgba(52,211,153,0.25);}
.badge-inactive{color:var(--muted); background:rgba(255,255,255,0.04); border-color:var(--border);}
.dept-Training{color:var(--sky); background:var(--sky-soft); border-color:rgba(79,184,232,0.25);}
.dept-Reception{color:var(--violet); background:var(--violet-soft); border-color:rgba(167,139,250,0.25);}
.dept-Management{color:var(--amber); background:var(--amber-soft); border-color:rgba(245,185,66,0.25);}
.dept-Maintenance{color:var(--slate); background:var(--slate-soft); border-color:rgba(154,161,172,0.25);}
.dept-Nutrition{color:var(--emerald); background:var(--emerald-soft); border-color:rgba(52,211,153,0.25);}
.att-present{color:var(--emerald); background:var(--emerald-soft); border-color:rgba(52,211,153,0.3);}
.att-late{color:var(--amber); background:var(--amber-soft); border-color:rgba(245,185,66,0.3);}
.att-absent{color:var(--red); background:var(--red-soft); border-color:rgba(240,86,74,0.3);}
.att-off{color:var(--muted); background:rgba(255,255,255,0.05); border-color:var(--border);}
.view-btn{display:inline-flex; align-items:center; gap:6px; padding:7px 12px; border-radius:8px; font-size:12px; font-weight:700; background:var(--card-raised); border:1px solid var(--border); color:var(--foreground); cursor:pointer;}
.view-btn:hover{background:#26262e; border-color:rgba(226,69,47,0.35);}
.modal-overlay{position:fixed; inset:0; background:rgba(6,6,8,0.72); backdrop-filter:blur(3px); z-index:50; display:flex; align-items:center; justify-content:center; padding:16px;}
.modal-box{background:var(--card); border:1px solid var(--border); border-radius:16px; width:100%; max-width:520px; max-height:90vh; overflow-y:auto; box-shadow:0 30px 70px rgba(0,0,0,0.5);}
.modal-head{display:flex; align-items:flex-start; justify-content:space-between; padding:18px 22px; border-bottom:1px solid var(--border);}
.modal-title{font-weight:700; font-size:16px; margin:0;}
.modal-desc{font-size:12px; color:var(--muted); margin-top:3px;}
.modal-close{background:none; border:none; color:var(--muted); cursor:pointer; display:flex; padding:2px;}
.modal-close:hover{color:var(--foreground);}
.modal-body{padding:20px 22px;}
.form-grid{display:grid; grid-template-columns:1fr 1fr; gap:14px;}
.field{display:flex; flex-direction:column; gap:6px; margin-bottom:14px;}
.field label{font-size:11.5px; font-weight:700; color:var(--muted); text-transform:uppercase; letter-spacing:0.06em;}
.field input, .field select{background:var(--card-raised); border:1px solid var(--border); border-radius:9px; padding:10px 12px; color:var(--foreground); font-size:13.5px; outline:none;}
.field input:focus, .field select:focus{border-color:rgba(226,69,47,0.5);}
.field input::placeholder{color:var(--muted-soft);}
.form-actions{display:flex; gap:10px; margin-top:4px;}
.form-actions .btn{flex:1; justify-content:center; padding:12px;}
.form-actions .btn-ghost{flex:0 0 auto; padding:12px 20px;}
.form-error{font-size:12px; color:var(--red); margin:-6px 0 12px;}
.detail-badges{display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:18px;}
.detail-grid{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:20px;}
.calendar-grid{display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:6px; background:var(--card-raised); border:1px solid var(--border); border-radius:14px; padding:12px;}
.calendar-header-cell{font-size:11px; font-weight:700; color:var(--muted); text-align:center;}
.calendar-cell{min-height:56px; border-radius:12px; background:rgba(255,255,255,0.03); padding:10px; display:flex; flex-direction:column; justify-content:flex-start; align-items:flex-start; border:1px solid transparent;}
.calendar-cell.empty{background:transparent; border:none;}
.calendar-cell.present{background:rgba(52,211,153,0.14); border-color:rgba(52,211,153,0.18);}
.calendar-cell.late{background:rgba(245,185,66,0.14); border-color:rgba(245,185,66,0.18);}
.calendar-cell.absent{background:rgba(240,86,74,0.14); border-color:rgba(240,86,74,0.18);}
.calendar-cell.off{background:rgba(148,163,184,0.12); border-color:rgba(154,161,172,0.18);}
.calendar-day{font-size:13px; font-weight:700;}
.calendar-status{width:10px; height:10px; border-radius:999px; margin-top:8px;}
.dot-present{background:var(--emerald);}
.dot-late{background:var(--amber);}
.dot-absent{background:var(--red);}
.dot-off{background:var(--muted);}
.calendar-legend{display:flex; flex-wrap:wrap; gap:12px; margin-top:12px; font-size:12px; color:var(--muted);}
.legend-dot{display:inline-block; width:10px; height:10px; border-radius:999px; margin-right:6px; vertical-align:middle;}
.legend-dot.present{background:var(--emerald);}
.legend-dot.late{background:var(--amber);}
.legend-dot.absent{background:var(--red);}
.legend-dot.off{background:var(--muted);}
.detail-item{background:var(--card-raised); border-radius:10px; padding:11px 14px;}
.detail-label{font-size:10.5px; color:var(--muted-soft); text-transform:uppercase; letter-spacing:0.08em; margin-bottom:3px;}
.detail-value{font-weight:600; font-size:13.5px;}
.recent-label{font-size:10.5px; font-weight:700; color:var(--muted-soft); text-transform:uppercase; letter-spacing:0.14em; margin-bottom:10px;}
.recent-row{display:flex; align-items:center; justify-content:space-between; padding:9px 0; border-bottom:1px solid var(--border-soft);}
.recent-row:last-child{border-bottom:none;}
.recent-date{font-size:13px;}
.recent-times{font-size:11.5px; color:var(--muted-soft); font-family:'JetBrains Mono',monospace;}
.toggle-active-btn{width:100%; margin-top:18px; padding:11px; border-radius:11px; font-size:13.5px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; cursor:pointer; border:1px solid;}
    `}</style>
  );
}