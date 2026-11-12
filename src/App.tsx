import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Download,
  Flame,
  ListTodo,
  Plus,
  Repeat2,
  Sparkles,
  Target,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

type Page = "today" | "week" | "goals" | "insights";
type TaskStatus = "pending" | "done" | "missed";
type Priority = "Low" | "Medium" | "High";

type TaskTemplate = {
  id: string;
  title: string;
  priority: Priority;
  category: string;
  repeatDaily: boolean;
  createdDate: string;
};

type TaskEntry = {
  id: string;
  templateId: string;
  title: string;
  date: string;
  priority: Priority;
  category: string;
  status: TaskStatus;
};

type Goal = {
  id: string;
  title: string;
  targetDate: string;
  progress: number;
  createdDate: string;
};

type StoredData = {
  templates: TaskTemplate[];
  entries: TaskEntry[];
  goals: Goal[];
};

const STORAGE_KEY = "meplanner-local-v1";
const emptyData: StoredData = { templates: [], entries: [], goals: [] };

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function shiftDateKey(key: string, amount: number) {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
}

function loadData(): StoredData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyData;
    const parsed = JSON.parse(raw) as Partial<StoredData>;
    return {
      templates: Array.isArray(parsed.templates) ? parsed.templates : [],
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
      goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    };
  } catch {
    return emptyData;
  }
}

// Create a fresh entry for every calendar day for each active daily template.
// Earlier dates are kept, so completion history remains available for analytics.
function addMissingDailyEntries(data: StoredData): StoredData {
  const today = dateKey(new Date());
  const entries = [...data.entries];
  const existing = new Set(entries.map((entry) => `${entry.templateId}:${entry.date}`));

  for (const template of data.templates) {
    if (!template.repeatDaily) continue;

    let cursor = template.createdDate;
    while (cursor <= today) {
      const key = `${template.id}:${cursor}`;
      if (!existing.has(key)) {
        entries.push({
          id: makeId(),
          templateId: template.id,
          title: template.title,
          date: cursor,
          priority: template.priority,
          category: template.category,
          status: "pending",
        });
        existing.add(key);
      }
      cursor = shiftDateKey(cursor, 1);
    }
  }

  return { ...data, entries };
}

function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatShortDate(key: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
  }).format(dateFromKey(key));
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const navItems: { id: Page; label: string; icon: typeof CalendarDays }[] = [
  { id: "today", label: "Today", icon: ListTodo },
  { id: "week", label: "Weekly plan", icon: CalendarRange },
  { id: "goals", label: "Goals", icon: Target },
  { id: "insights", label: "Insights", icon: BarChart3 },
];

export default function App() {
  const today = dateKey(new Date());
  const [data, setData] = useState<StoredData>(() => addMissingDailyEntries(loadData()));
  const [page, setPage] = useState<Page>("today");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskPriority, setTaskPriority] = useState<Priority>("Medium");
  const [taskCategory, setTaskCategory] = useState("Personal");
  const [repeatDaily, setRepeatDaily] = useState(true);
  const [goalTitle, setGoalTitle] = useState("");
  const [goalDate, setGoalDate] = useState(shiftDateKey(today, 30));
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    const handleInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    window.addEventListener("beforeinstallprompt", handleInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleInstall);
  }, []);

  const todayEntries = useMemo(
    () => data.entries.filter((entry) => entry.date === today),
    [data.entries, today]
  );

  const doneCount = todayEntries.filter((entry) => entry.status === "done").length;
  const missedCount = todayEntries.filter((entry) => entry.status === "missed").length;
  const pendingCount = todayEntries.filter((entry) => entry.status === "pending").length;
  const progress = todayEntries.length ? Math.round((doneCount / todayEntries.length) * 100) : 0;

  const orderedTodayEntries = useMemo(() => {
    const order: Record<TaskStatus, number> = { pending: 0, done: 1, missed: 2 };
    return [...todayEntries].sort((a, b) => order[a.status] - order[b.status]);
  }, [todayEntries]);

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = taskTitle.trim();
    if (!title) return;

    const template: TaskTemplate = {
      id: makeId(),
      title,
      priority: taskPriority,
      category: taskCategory,
      repeatDaily,
      createdDate: today,
    };
    const entry: TaskEntry = {
      id: makeId(),
      templateId: template.id,
      title,
      date: today,
      priority: taskPriority,
      category: taskCategory,
      status: "pending",
    };

    setData((current) => ({
      ...current,
      templates: [...current.templates, template],
      entries: [...current.entries, entry],
    }));
    setTaskTitle("");
    setTaskPriority("Medium");
    setTaskCategory("Personal");
    setRepeatDaily(true);
    setShowTaskForm(false);
  }

  function changeStatus(entryId: string, status: TaskStatus) {
    setData((current) => ({
      ...current,
      entries: current.entries.map((entry) =>
        entry.id === entryId
          ? { ...entry, status: entry.status === status ? "pending" : status }
          : entry
      ),
    }));
  }

  function deleteTask(templateId: string) {
    setData((current) => ({
      ...current,
      templates: current.templates.filter((template) => template.id !== templateId),
      entries: current.entries.filter((entry) => entry.templateId !== templateId),
    }));
  }

  function addGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = goalTitle.trim();
    if (!title) return;
    const goal: Goal = {
      id: makeId(),
      title,
      targetDate: goalDate,
      progress: 0,
      createdDate: today,
    };
    setData((current) => ({ ...current, goals: [...current.goals, goal] }));
    setGoalTitle("");
    setGoalDate(shiftDateKey(today, 30));
    setShowGoalForm(false);
  }

  function updateGoalProgress(goalId: string, progressValue: number) {
    setData((current) => ({
      ...current,
      goals: current.goals.map((goal) =>
        goal.id === goalId ? { ...goal, progress: progressValue } : goal
      ),
    }));
  }

  function deleteGoal(goalId: string) {
    setData((current) => ({
      ...current,
      goals: current.goals.filter((goal) => goal.id !== goalId),
    }));
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  const pageTitle = {
    today: "Today",
    week: "Weekly plan",
    goals: "Long-term goals",
    insights: "Your insights",
  }[page];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MePlanner</div>
            <div className="brand-caption">PERSONAL WORKSPACE</div>
          </div>
        </div>

        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={`nav-item ${page === item.id ? "active" : ""}`}
                onClick={() => setPage(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {page === item.id && <ChevronRight className="nav-chevron" size={15} />}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <div className="note-icon"><Sparkles size={17} /></div>
          <div>
            <strong>Small steps add up.</strong>
            <p>Keep showing up for the things that matter.</p>
          </div>
        </div>
        {installPrompt && (
          <button className="install-button" onClick={installApp}>
            <Download size={16} /> Install MePlanner
          </button>
        )}
        <div className="local-status"><span /> Saved on this device</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="mobile-brand">
            <div className="brand-mark small">M</div>
            <strong>MePlanner</strong>
          </div>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} />{pageTitle}</div>
          <div className="topbar-right">
            {installPrompt && <button className="top-install-button" onClick={installApp}><Download size={14} /> Install</button>}
            <span className="today-pill"><CalendarDays size={14} /> {formatShortDate(today)}</span>
            <div className="avatar">M</div>
          </div>
        </header>

        <div className="content-wrap">
          {page === "today" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">{formatLongDate(new Date())}</div>
                  <h1>{getGreeting()}, <span>let's make today count.</span></h1>
                  <p>A little progress every day leads to big results.</p>
                </div>
                <button className="primary-button" onClick={() => setShowTaskForm(true)}>
                  <Plus size={18} /> Add a task
                </button>
              </section>

              <section className="overview-grid">
                <div className="progress-card">
                  <div className="progress-card-top">
                    <div>
                      <div className="card-kicker">DAILY PROGRESS</div>
                      <h2>Your day at a glance</h2>
                      <p>{todayEntries.length === 0 ? "Add your first task to get started." : `${doneCount} of ${todayEntries.length} tasks completed today.`}</p>
                    </div>
                    <div className="progress-ring" style={{ background: `conic-gradient(#ff8126 ${progress * 3.6}deg, #303030 0deg)` }}>
                      <div className="progress-ring-inner">
                        <strong>{progress}%</strong>
                        <span>done</span>
                      </div>
                    </div>
                  </div>
                  <div className="progress-track"><div style={{ width: `${progress}%` }} /></div>
                  <div className="progress-foot"><span>Keep your momentum going</span><span>{doneCount}/{todayEntries.length}</span></div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon orange"><ListTodo size={19} /></div>
                  <span className="stat-label">TOTAL TASKS</span>
                  <strong>{todayEntries.length}</strong>
                  <small>Planned for today</small>
                </div>
                <div className="stat-card">
                  <div className="stat-icon green"><CheckCircle2 size={19} /></div>
                  <span className="stat-label">COMPLETED</span>
                  <strong>{doneCount}</strong>
                  <small>Tasks checked off</small>
                </div>
                <div className="stat-card">
                  <div className="stat-icon muted"><Clock3 size={19} /></div>
                  <span className="stat-label">REMAINING</span>
                  <strong>{pendingCount}</strong>
                  <small>{missedCount} marked as missed</small>
                </div>
              </section>

              <section className="tasks-panel">
                <div className="section-heading">
                  <div>
                    <div className="card-kicker">YOUR CHECKLIST</div>
                    <h2>Today's tasks <span className="count-badge">{todayEntries.length}</span></h2>
                  </div>
                  <button className="text-button" onClick={() => setShowTaskForm(true)}><Plus size={16} /> New task</button>
                </div>

                {orderedTodayEntries.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon"><CalendarCheck size={25} /></div>
                    <h3>Your day is a blank canvas.</h3>
                    <p>Add a task and start building your daily momentum.</p>
                    <button className="secondary-button" onClick={() => setShowTaskForm(true)}><Plus size={16} /> Create your first task</button>
                  </div>
                ) : (
                  <div className="task-list">
                    {orderedTodayEntries.map((entry) => (
                      <article className={`task-row ${entry.status}`} key={entry.id}>
                        <div className="task-status-dot">
                          {entry.status === "done" ? <CheckCircle2 size={19} /> : entry.status === "missed" ? <XCircle size={19} /> : <Circle size={19} />}
                        </div>
                        <div className="task-main">
                          <div className={`task-title ${entry.status === "done" ? "completed" : ""}`}>{entry.title}</div>
                          <div className="task-meta">
                            <span>{entry.category}</span>
                            <span className={`priority ${entry.priority.toLowerCase()}`}>{entry.priority}</span>
                            {data.templates.find((template) => template.id === entry.templateId)?.repeatDaily && (
                              <span className="repeat-label"><Repeat2 size={12} /> Daily</span>
                            )}
                          </div>
                        </div>
                        <div className="task-actions">
                          <button
                            className={`status-button done-button ${entry.status === "done" ? "selected" : ""}`}
                            onClick={() => changeStatus(entry.id, "done")}
                            aria-label={`Mark ${entry.title} as completed`}
                            title="Mark completed"
                          ><Check size={17} /></button>
                          <button
                            className={`status-button missed-button ${entry.status === "missed" ? "selected" : ""}`}
                            onClick={() => changeStatus(entry.id, "missed")}
                            aria-label={`Mark ${entry.title} as missed`}
                            title="Mark missed"
                          ><X size={17} /></button>
                          <button
                            className="delete-button"
                            onClick={() => deleteTask(entry.templateId)}
                            aria-label={`Delete ${entry.title}`}
                            title="Delete task"
                          ><Trash2 size={15} /></button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
                <div className="task-legend">
                  <span><i className="legend-dot done-dot" /> Completed</span>
                  <span><i className="legend-dot pending-dot" /> Pending</span>
                  <span><i className="legend-dot missed-dot" /> Missed</span>
                </div>
              </section>

              <section className="bottom-tip">
                <div className="tip-symbol"><Flame size={19} /></div>
                <div><strong>Consistency over intensity.</strong><p>You don't have to do everything today. Just keep moving forward.</p></div>
                <ArrowUpRight size={18} className="tip-arrow" />
              </section>
            </>
          )}

          {page === "week" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">YOUR RECENT ACTIVITY</div>
                  <h1>One week, <span>one step at a time.</span></h1>
                  <p>A simple view of how consistently you've been showing up.</p>
                </div>
              </section>
              <section className="analytics-card">
                <div className="section-heading">
                  <div><div className="card-kicker">LAST 7 DAYS</div><h2>Weekly completion</h2></div>
                  <span className="chart-tag">Daily tasks</span>
                </div>
                <div className="week-chart">
                  {Array.from({ length: 7 }, (_, index) => {
                    const key = shiftDateKey(today, index - 6);
                    const dayEntries = data.entries.filter((entry) => entry.date === key);
                    const completed = dayEntries.filter((entry) => entry.status === "done").length;
                    const percentValue = dayEntries.length ? Math.round((completed / dayEntries.length) * 100) : 0;
                    const label = new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(dateFromKey(key));
                    return (
                      <div className="week-bar-column" key={key}>
                        <span className="bar-value">{dayEntries.length ? `${percentValue}%` : "—"}</span>
                        <div className="week-bar-track"><div className="week-bar-fill" style={{ height: `${Math.max(percentValue, dayEntries.length ? 5 : 0)}%` }} /></div>
                        <span className="bar-day">{label}</span>
                        <span className="bar-date">{dateFromKey(key).getDate()}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="chart-footnote">Only tasks recorded on each date are included. Empty days are shown without a score.</div>
              </section>
              <div className="summary-grid">
                <div className="summary-card"><span>Tasks planned</span><strong>{data.entries.filter((entry) => entry.date >= shiftDateKey(today, -6) && entry.date <= today).length}</strong></div>
                <div className="summary-card"><span>Tasks completed</span><strong className="positive">{data.entries.filter((entry) => entry.date >= shiftDateKey(today, -6) && entry.date <= today && entry.status === "done").length}</strong></div>
                <div className="summary-card"><span>Tasks missed</span><strong className="negative">{data.entries.filter((entry) => entry.date >= shiftDateKey(today, -6) && entry.date <= today && entry.status === "missed").length}</strong></div>
              </div>
              <div className="info-banner"><Sparkles size={18} /><span>Your daily tasks repeat automatically. Each day has its own separate completion record.</span></div>
            </>
          )}

          {page === "goals" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">THINK BEYOND TODAY</div>
                  <h1>Big goals, <span>small actions.</span></h1>
                  <p>Keep your longer-term ambitions visible and moving forward.</p>
                </div>
                <button className="primary-button" onClick={() => setShowGoalForm(true)}><Plus size={18} /> Add a goal</button>
              </section>
              {data.goals.length === 0 ? (
                <div className="empty-state large-empty">
                  <div className="empty-icon"><Target size={26} /></div>
                  <h3>What are you working towards?</h3>
                  <p>Create a long-term goal, choose a target date and update its progress as you go.</p>
                  <button className="secondary-button" onClick={() => setShowGoalForm(true)}><Plus size={16} /> Create your first goal</button>
                </div>
              ) : (
                <div className="goal-grid">
                  {data.goals.map((goal) => (
                    <article className="goal-card" key={goal.id}>
                      <div className="goal-card-top"><div className="goal-icon"><Target size={19} /></div><button className="delete-button" onClick={() => deleteGoal(goal.id)} aria-label="Delete goal"><Trash2 size={15} /></button></div>
                      <h3>{goal.title}</h3>
                      <p className="goal-date">Target · {formatLongDate(dateFromKey(goal.targetDate))}</p>
                      <div className="goal-progress-row"><span>Progress</span><strong>{goal.progress}%</strong></div>
                      <div className="progress-track"><div style={{ width: `${goal.progress}%` }} /></div>
                      <label className="goal-slider-label" htmlFor={`goal-${goal.id}`}>Update progress</label>
                      <input id={`goal-${goal.id}`} className="goal-slider" type="range" min="0" max="100" step="5" value={goal.progress} onChange={(event) => updateGoalProgress(goal.id, Number(event.target.value))} />
                    </article>
                  ))}
                </div>
              )}
            </>
          )}

          {page === "insights" && (
            <>
              <section className="page-heading">
                <div>
                  <div className="eyebrow">LOOK BACK. MOVE FORWARD.</div>
                  <h1>Your progress, <span>in perspective.</span></h1>
                  <p>Monthly activity based on the tasks you've tracked.</p>
                </div>
              </section>
              <section className="analytics-card">
                <div className="section-heading">
                  <div><div className="card-kicker">LAST 30 DAYS</div><h2>Monthly activity</h2></div>
                  <span className="chart-tag">30-day view</span>
                </div>
                <div className="month-chart">
                  {Array.from({ length: 30 }, (_, index) => {
                    const key = shiftDateKey(today, index - 29);
                    const dayEntries = data.entries.filter((entry) => entry.date === key);
                    const completed = dayEntries.filter((entry) => entry.status === "done").length;
                    const percentValue = dayEntries.length ? Math.round((completed / dayEntries.length) * 100) : 0;
                    return <div className="month-bar-wrap" key={key} title={`${formatShortDate(key)}: ${completed}/${dayEntries.length} completed`}><div className="month-bar" style={{ height: `${Math.max(percentValue, dayEntries.length ? 5 : 0)}%` }} /></div>;
                  })}
                </div>
                <div className="month-axis"><span>{formatShortDate(shiftDateKey(today, -29))}</span><span>{formatShortDate(today)}</span></div>
                <div className="chart-footnote">Each bar represents one day. Hover or tap a bar to see its completion rate.</div>
              </section>
              <div className="summary-grid">
                <div className="summary-card"><span>Tracked tasks</span><strong>{data.entries.filter((entry) => entry.date >= shiftDateKey(today, -29) && entry.date <= today).length}</strong></div>
                <div className="summary-card"><span>Completed</span><strong className="positive">{data.entries.filter((entry) => entry.date >= shiftDateKey(today, -29) && entry.date <= today && entry.status === "done").length}</strong></div>
                <div className="summary-card"><span>Goals in progress</span><strong>{data.goals.filter((goal) => goal.progress < 100).length}</strong></div>
              </div>
              <div className="info-banner"><BarChart3 size={18} /><span>Insights are calculated from your saved task history. Keep tracking tasks to build a more useful picture.</span></div>
            </>
          )}
          <footer className="footer-note">MePlanner <span>·</span> Your plans stay on this device.</footer>
        </div>
      </main>

      {showTaskForm && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowTaskForm(false)}>
          <form className="modal-card" onSubmit={addTask}>
            <div className="modal-heading"><div><div className="card-kicker">NEW TASK</div><h2>Make it happen.</h2></div><button type="button" className="modal-close" onClick={() => setShowTaskForm(false)} aria-label="Close"><X size={19} /></button></div>
            <label className="field-label" htmlFor="task-title">Task name</label>
            <input id="task-title" className="text-input" autoFocus value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} placeholder="e.g. Study C programming" maxLength={90} required />
            <div className="form-row">
              <div><label className="field-label" htmlFor="task-category">Category</label><select id="task-category" className="text-input" value={taskCategory} onChange={(event) => setTaskCategory(event.target.value)}><option>Personal</option><option>Study</option><option>Work</option><option>Health</option><option>Other</option></select></div>
              <div><label className="field-label" htmlFor="task-priority">Priority</label><select id="task-priority" className="text-input" value={taskPriority} onChange={(event) => setTaskPriority(event.target.value as Priority)}><option>Low</option><option>Medium</option><option>High</option></select></div>
            </div>
            <label className="repeat-toggle"><input type="checkbox" checked={repeatDaily} onChange={(event) => setRepeatDaily(event.target.checked)} /><span className="toggle-ui" /><span><strong>Repeat every day</strong><small>A fresh task will appear each day, with its own history.</small></span><Repeat2 size={18} /></label>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowTaskForm(false)}>Cancel</button><button type="submit" className="primary-button" disabled={!taskTitle.trim()}><Plus size={17} /> Add task</button></div>
          </form>
        </div>
      )}

      {showGoalForm && (
        <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setShowGoalForm(false)}>
          <form className="modal-card" onSubmit={addGoal}>
            <div className="modal-heading"><div><div className="card-kicker">NEW GOAL</div><h2>Think bigger.</h2></div><button type="button" className="modal-close" onClick={() => setShowGoalForm(false)} aria-label="Close"><X size={19} /></button></div>
            <label className="field-label" htmlFor="goal-title">What do you want to achieve?</label>
            <input id="goal-title" className="text-input" autoFocus value={goalTitle} onChange={(event) => setGoalTitle(event.target.value)} placeholder="e.g. Finish my portfolio website" maxLength={90} required />
            <label className="field-label" htmlFor="goal-date">Target date</label>
            <input id="goal-date" className="text-input" type="date" min={today} value={goalDate} onChange={(event) => setGoalDate(event.target.value)} required />
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowGoalForm(false)}>Cancel</button><button type="submit" className="primary-button" disabled={!goalTitle.trim()}><Plus size={17} /> Create goal</button></div>
          </form>
        </div>
      )}
    </div>
  );
}