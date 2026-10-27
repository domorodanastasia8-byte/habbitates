"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity, BookOpen, CalendarDays, Check, ChevronLeft, ChevronRight,
  CircleEllipsis, Download, Home, Languages, Leaf, Medal, MessageCircle,
  Settings, Share2, Sparkles, Upload, X, Bell, Cloud, CloudOff, Heart, NotebookPen,
} from "lucide-react";

type Status = "done" | "gentle" | "missed";
type HabitId = "move" | "read" | "english" | "content" | "food";
type DayRecord = Partial<Record<HabitId, Status>>;
type JournalEntry = {
  mood?: number;
  feeling?: string;
  insight?: string;
  proud?: string;
  difficult?: string;
};
type ChallengeState = {
  version: 1;
  startDate: string;
  records: Record<string, DayRecord>;
  journal: Record<string, JournalEntry>;
  reminder: { enabled: boolean; time: string };
  updatedAt: number;
};

const HABITS: Array<{ id: HabitId; name: string; short: string; hint: string; gentle: string; Icon: typeof Activity }> = [
  { id: "move", name: "Движение", short: "Движение", hint: "20+ минут движения", gentle: "Разминка, прогулка или восстановление", Icon: Activity },
  { id: "read", name: "Чтение", short: "Чтение", hint: "Минимум 15 минут", gentle: "Хотя бы 2 страницы", Icon: BookOpen },
  { id: "english", name: "Английский", short: "English", hint: "10 минут практики", gentle: "5 новых слов или одна песня", Icon: Languages },
  { id: "content", name: "Контент в блог", short: "Блог", hint: "Пост, сторис или reels", gentle: "Черновик или одна идея", Icon: MessageCircle },
  { id: "food", name: "Бережное питание", short: "Питание", hint: "С заботой о теле", gentle: "Один осознанный приём пищи", Icon: Leaf },
];
const MILESTONES = [7, 14, 30, 50, 75, 100];
const STORAGE_KEY = "sto-dney-k-sebe-v1";

function iso(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}
function fromIso(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}
function addDays(value: string, days: number) {
  const date = fromIso(value); date.setDate(date.getDate() + days); return iso(date);
}
function diffDays(a: string, b: string) {
  return Math.round((fromIso(a).getTime() - fromIso(b).getTime()) / 86400000);
}
function dayLabel(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", weekday: "long" }).format(fromIso(value));
}
function shortDate(value: string) {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(fromIso(value));
}
function initialState(): ChallengeState {
  return { version: 1, startDate: iso(), records: {}, journal: {}, reminder: { enabled: false, time: "20:30" }, updatedAt: Date.now() };
}
function normalizeState(value?: Partial<ChallengeState> | null): ChallengeState {
  return { ...initialState(), ...value, records: value?.records || {}, journal: value?.journal || {}, reminder: { ...initialState().reminder, ...(value?.reminder || {}) } };
}
function loadLocal(): ChallengeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : initialState();
  } catch { return initialState(); }
}

export default function ChallengeApp({ cloudEnabled, standaloneAuth = false }: { cloudEnabled: boolean; standaloneAuth?: boolean }) {
  const [state, setState] = useState<ChallengeState | null>(null);
  const [tab, setTab] = useState<"today" | "calendar" | "journal" | "progress" | "settings">("today");
  const [selectedDate, setSelectedDate] = useState(iso());
  const [sync, setSync] = useState<"loading" | "saved" | "offline">("loading");
  const [motivation, setMotivation] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [calendarPage, setCalendarPage] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const importedInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const local = loadLocal();
    setState(local);
    setSelectedDate(iso() < local.startDate ? local.startDate : iso());
    if (!cloudEnabled) { setSync("offline"); return; }
    fetch("/api/state").then(async response => {
      if (!response.ok) throw new Error();
      const data = await response.json() as { state?: Partial<ChallengeState> | null; updatedAt?: number };
      const remoteUpdatedAt = Number(data.updatedAt) || 0;
      if (data.state && remoteUpdatedAt > local.updatedAt) {
        const normalized = normalizeState(data.state);
        setState(normalized); localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      }
      setSync("saved");
    }).catch(() => setSync("offline"));
  }, [cloudEnabled]);

  useEffect(() => {
    if (!state) return;
    const yesterday = addDays(iso(), -1);
    if (diffDays(yesterday, state.startDate) < 0) return;
    const record = state.records[yesterday] || {};
    const skipped = HABITS.filter(h => !record[h.id] || record[h.id] === "missed");
    const seenKey = `gentle-popup-${yesterday}`;
    if (skipped.length && !sessionStorage.getItem(seenKey)) {
      setTimeout(() => setMotivation(`Вчера получилось не всё, и это нормально. Сегодня не нужно навёрстывать. Выбери один маленький шаг и продолжай с заботой о себе.`), 500);
      sessionStorage.setItem(seenKey, "1");
    }
  }, [state?.startDate]);

  const persist = useCallback((next: ChallengeState) => {
    const stamped = { ...next, updatedAt: Date.now() };
    setState(stamped);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
    setSync(cloudEnabled ? "loading" : "offline");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (cloudEnabled) saveTimer.current = setTimeout(() => {
      fetch("/api/state", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ state: stamped, updatedAt: stamped.updatedAt }) })
        .then(r => { if (!r.ok) throw new Error(); setSync("saved"); })
        .catch(() => setSync("offline"));
    }, 500);
  }, [cloudEnabled]);

  useEffect(() => {
    if (!state?.reminder.enabled) return;
    const check = async () => {
      const now = new Date();
      const today = iso(now);
      const hhmm = now.toTimeString().slice(0, 5);
      const reminderKey = `reminded-${today}`;
      const incomplete = HABITS.some(h => !state.records[today]?.[h.id]);
      if (hhmm >= state.reminder.time && incomplete && !localStorage.getItem(reminderKey)) {
        localStorage.setItem(reminderKey, "1");
        const body = "Если есть силы, выбери один маленький шаг. Облегчённый день тоже считается 💛";
        if (Notification.permission === "granted") {
          const reg = await navigator.serviceWorker?.ready;
          reg?.active?.postMessage({ type: "REMIND", title: "Мягкое напоминание", body });
        } else setToast(body);
      }
    };
    check(); const id = setInterval(check, 30000); return () => clearInterval(id);
  }, [state?.reminder, state?.records]);

  if (!state) return <main className="loading-screen"><span className="spinner"/><p>Готовим ваше пространство…</p></main>;

  const today = iso();
  const currentDay = Math.min(100, Math.max(1, diffDays(today, state.startDate) + 1));
  const selectedDay = diffDays(selectedDate, state.startDate) + 1;
  const selectedRecord = state.records[selectedDate] || {};
  const selectedComplete = HABITS.filter(h => selectedRecord[h.id] === "done" || selectedRecord[h.id] === "gentle").length;

  function setStatus(habit: HabitId, status: Status) {
    const record = { ...(state!.records[selectedDate] || {}) };
    record[habit] = status;
    persist({ ...state!, records: { ...state!.records, [selectedDate]: record } });
    if (status === "gentle") setToast("Бережный шаг засчитан. Устойчивость важнее идеальности.");
  }

  function setJournal(field: keyof JournalEntry, value: string | number) {
    const entry = { ...(state!.journal[selectedDate] || {}), [field]: value };
    persist({ ...state!, journal: { ...state!.journal, [selectedDate]: entry } });
  }

  function chooseDate(date: string) {
    setSelectedDate(date); setTab("today"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const nav = [
    { id: "today" as const, label: "Сегодня", Icon: Home },
    { id: "calendar" as const, label: "Календарь", Icon: CalendarDays },
    { id: "journal" as const, label: "Дневник", Icon: NotebookPen },
    { id: "progress" as const, label: "Прогресс", Icon: Medal },
    { id: "settings" as const, label: "Настройки", Icon: Settings },
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">✦</span><div><strong>100 дней к себе</strong><small>бережно · каждый день</small></div></div>
        <div className={`sync-state ${sync}`} title={sync === "saved" ? "Сохранено в облаке" : "Локальная копия сохранена"}>
          {sync === "saved" ? <Cloud size={16}/> : <CloudOff size={16}/>}<span>{sync === "loading" ? "сохраняем" : sync === "saved" ? "сохранено" : "офлайн"}</span>
        </div>
      </header>

      <main className="main-content">
        {tab === "today" && <>
          <section className="hero-card">
            <div>
              <p className="eyebrow">{selectedDate === today ? "Твой день · твой темп" : dayLabel(selectedDate)}</p>
              <h1>{selectedDate === today ? "Как ты сегодня?" : `День ${selectedDay}`}</h1>
              <p>{selectedDate === today ? "Не гонись за идеалом. Выбери темп, который поддержит тебя." : "Можно спокойно изменить любую отметку. Путь не обязан быть идеальным."}</p>
            </div>
            <div className="day-ring" style={{ "--progress": `${selectedComplete * 20 * 3.6}deg` } as React.CSSProperties}>
              <span><b>{selectedComplete}</b><small>из 5</small></span>
            </div>
          </section>

          <div className="date-switcher">
            <button aria-label="Предыдущий день" onClick={() => chooseDate(addDays(selectedDate, -1))} disabled={selectedDay <= 1}><ChevronLeft/></button>
            <button className="date-pill" onClick={() => setTab("calendar")}><CalendarDays size={16}/>{selectedDate === today ? "Сегодня" : shortDate(selectedDate)} · день {selectedDay}</button>
            <button aria-label="Следующий день" onClick={() => chooseDate(addDays(selectedDate, 1))} disabled={selectedDay >= 100 || selectedDate >= today}><ChevronRight/></button>
          </div>

          <section className="habit-list" aria-label="Ежедневные привычки">
            {HABITS.map(({ id, name, hint, gentle, Icon }, index) => {
              const value = selectedRecord[id];
              return <article className={`habit-card ${value || "empty"}`} key={id}>
                <div className="habit-icon"><Icon size={21}/></div>
                <div className="habit-copy"><span className="habit-number">0{index + 1}</span><h2>{name}</h2><p>{value === "gentle" ? gentle : hint}</p></div>
                <div className="status-options" role="group" aria-label={`Статус: ${name}`}>
                  <button className={value === "done" ? "active" : ""} onClick={() => setStatus(id, "done")} aria-label="Выполнено"><Check/></button>
                  <button className={value === "gentle" ? "active" : ""} onClick={() => setStatus(id, "gentle")} aria-label="Облегчённый день"><CircleEllipsis/></button>
                  <button className={value === "missed" ? "active" : ""} onClick={() => setStatus(id, "missed")} aria-label="Не выполнено"><X/></button>
                </div>
              </article>;
            })}
          </section>
          <button className="diary-teaser" onClick={() => { setTab("journal"); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
            <span className="journal-icon"><NotebookPen/></span>
            <span><small>Личный дневник</small><strong>{state.journal[selectedDate] ? "Продолжить запись этого дня" : "Сохранить мысли и чувства этого дня"}</strong></span>
            <ChevronRight/>
          </button>
          <aside className="kind-note"><Sparkles size={18}/><p><strong>На сегодня достаточно.</strong> Облегчённый день не лазейка, а часть устойчивого пути.</p></aside>
        </>}

        {tab === "calendar" && <CalendarView state={state} page={calendarPage} setPage={setCalendarPage} today={today} chooseDate={chooseDate}/>} 
        {tab === "journal" && <JournalView state={state} selectedDate={selectedDate} setSelectedDate={setSelectedDate} setJournal={setJournal} today={today} setToast={setToast}/>} 
        {tab === "progress" && <ProgressView state={state} currentDay={currentDay}/>} 
        {tab === "settings" && <SettingsView state={state} persist={persist} importedInput={importedInput} setToast={setToast} standaloneAuth={standaloneAuth}/>}
      </main>

      <nav className="bottom-nav" aria-label="Основная навигация">
        {nav.map(({ id, label, Icon }) => <button key={id} className={tab === id ? "active" : ""} onClick={() => { setTab(id); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Icon/><span>{label}</span></button>)}
      </nav>

      {motivation && <div className="modal-backdrop" role="presentation" onClick={() => setMotivation(null)}><section className="motivation-modal" role="dialog" aria-modal="true" aria-labelledby="motivation-title" onClick={e => e.stopPropagation()}><button className="modal-close" onClick={() => setMotivation(null)} aria-label="Закрыть"><X/></button><div className="big-spark">✦</div><p className="eyebrow">Мягкое возвращение</p><h2 id="motivation-title">Один пропуск ничего не отменяет</h2><p>{motivation}</p><button className="primary-button" onClick={() => setMotivation(null)}>Продолжить сегодня</button></section></div>}
      {toast && <div className="toast" role="status" onClick={() => setToast(null)}>{toast}</div>}
    </div>
  );
}

const MOODS = [
  { value: 1, emoji: "😣", label: "тяжело" },
  { value: 2, emoji: "😕", label: "не очень" },
  { value: 3, emoji: "😌", label: "спокойно" },
  { value: 4, emoji: "🙂", label: "хорошо" },
  { value: 5, emoji: "✨", label: "прекрасно" },
];

function JournalCard({ entry, onChange }: { entry: JournalEntry; onChange: (field: keyof JournalEntry, value: string | number) => void }) {
  return <article className="journal-page" aria-labelledby="journal-title">
    <div className="journal-heading">
      <span className="journal-icon"><NotebookPen/></span>
      <div><p className="eyebrow">Вечерняя пауза</p><h2 id="journal-title">Несколько слов о сегодняшнем дне</h2><p>Не анализируй идеально. Запиши первое, что приходит.</p></div>
    </div>
    <fieldset className="mood-picker">
      <legend>Как ты себя чувствовала?</legend>
      <div>{MOODS.map(mood => <button key={mood.value} type="button" className={entry.mood === mood.value ? "active" : ""} onClick={() => onChange("mood", mood.value)} aria-pressed={entry.mood === mood.value} aria-label={mood.label}><span>{mood.emoji}</span><small>{mood.label}</small></button>)}</div>
    </fieldset>
    <div className="journal-fields">
      <label><span>Как ты себя чувствовала сегодня?</span><textarea rows={2} placeholder="Что происходило внутри, без оценки…" value={entry.feeling || ""} onChange={e => onChange("feeling", e.target.value)}/></label>
      <label><span>Инсайт дня</span><textarea rows={2} placeholder="Что ты сегодня поняла или заметила?" value={entry.insight || ""} onChange={e => onChange("insight", e.target.value)}/></label>
      <label><span>За что можно себя похвалить?</span><textarea rows={2} placeholder="Даже за самый маленький шаг…" value={entry.proud || ""} onChange={e => onChange("proud", e.target.value)}/></label>
      <label><span>Что разочаровало или разозлило?</span><textarea rows={2} placeholder="Здесь можно быть честной…" value={entry.difficult || ""} onChange={e => onChange("difficult", e.target.value)}/></label>
    </div>
    <div className="journal-footer"><Heart/><span>Твои ответы сохраняются автоматически и остаются личными.</span></div>
  </article>;
}

function hasJournalContent(entry?: JournalEntry) {
  return Boolean(entry && (entry.mood || entry.feeling?.trim() || entry.insight?.trim() || entry.proud?.trim() || entry.difficult?.trim()));
}

function JournalView({ state, selectedDate, setSelectedDate, setJournal, today, setToast }: {
  state: ChallengeState;
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  setJournal: (field: keyof JournalEntry, value: string | number) => void;
  today: string;
  setToast: (message: string) => void;
}) {
  const selectedDay = diffDays(selectedDate, state.startDate) + 1;
  const entries = Object.entries(state.journal)
    .filter(([, entry]) => hasJournalContent(entry))
    .sort(([a], [b]) => b.localeCompare(a));
  const moodFor = (entry: JournalEntry) => MOODS.find(m => m.value === entry.mood)?.emoji || "✦";

  function exportJournal(format: "txt" | "json") {
    const ordered = [...entries].reverse();
    const content = format === "json"
      ? JSON.stringify({ title: "100 дней к себе. Личный дневник", exportedAt: new Date().toISOString(), entries: Object.fromEntries(ordered) }, null, 2)
      : ordered.map(([date, entry]) => [
          `${dayLabel(date)} · день ${diffDays(date, state.startDate) + 1}`,
          `Настроение: ${MOODS.find(m => m.value === entry.mood)?.label || "не отмечено"}`,
          entry.feeling ? `Как я себя чувствовала: ${entry.feeling}` : "",
          entry.insight ? `Инсайт дня: ${entry.insight}` : "",
          entry.proud ? `За что хвалю себя: ${entry.proud}` : "",
          entry.difficult ? `Что разочаровало или разозлило: ${entry.difficult}` : "",
        ].filter(Boolean).join("\n")).join("\n\n---\n\n");
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = `lichny-dnevnik-${iso()}.${format}`; a.click(); URL.revokeObjectURL(a.href);
    setToast(format === "json" ? "Архив дневника экспортирован" : "Читаемая копия дневника скачана");
  }

  return <section className="page-section diary-section">
    <div className="diary-cover-heading">
      <div><p className="eyebrow">Личное пространство</p><h1>Мой дневник</h1><p>Место, где можно услышать себя без оценки и правильных ответов.</p></div>
      <div className="diary-export"><button onClick={() => exportJournal("txt")}><Download/>Текст</button><button onClick={() => exportJournal("json")}><Download/>JSON</button></div>
    </div>
    <div className="diary-date-switcher">
      <button aria-label="Предыдущая запись" onClick={() => setSelectedDate(addDays(selectedDate, -1))} disabled={selectedDay <= 1}><ChevronLeft/></button>
      <div><small>Страница {selectedDay} из 100</small><strong>{dayLabel(selectedDate)}</strong></div>
      <button aria-label="Следующая запись" onClick={() => setSelectedDate(addDays(selectedDate, 1))} disabled={selectedDay >= 100 || selectedDate >= today}><ChevronRight/></button>
    </div>
    <div className="diary-book">
      <div className="paper-date"><span>{String(fromIso(selectedDate).getDate()).padStart(2, "0")}</span><div><b>{new Intl.DateTimeFormat("ru-RU", { month: "long" }).format(fromIso(selectedDate))}</b><small>{fromIso(selectedDate).getFullYear()}</small></div></div>
      <JournalCard entry={state.journal[selectedDate] || {}} onChange={setJournal}/>
    </div>
    <section className="journal-archive">
      <div className="archive-heading"><div><p className="eyebrow">Память дневника</p><h2>Мои записи</h2></div><span>{entries.length} {entries.length === 1 ? "запись" : entries.length < 5 ? "записи" : "записей"}</span></div>
      {entries.length ? <div className="archive-list">{entries.map(([date, entry]) => {
        const excerpt = entry.insight || entry.feeling || entry.proud || entry.difficult || "Запись настроения";
        return <button key={date} className={date === selectedDate ? "active" : ""} onClick={() => { setSelectedDate(date); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span className="archive-mood">{moodFor(entry)}</span><span><strong>{shortDate(date)} · день {diffDays(date, state.startDate) + 1}</strong><small>{excerpt}</small></span><ChevronRight/></button>;
      })}</div> : <div className="empty-journal"><NotebookPen/><p><strong>Первая страница ждёт тебя.</strong><br/>Начни с настроения или одной короткой мысли.</p></div>}
    </section>
    <aside className="kind-note"><Cloud size={18}/><p>Записи сохраняются автоматически в облаке и на этом устройстве. Экспорт «Текст» удобен для чтения, JSON подходит для резервной копии.</p></aside>
  </section>;
}

function CalendarView({ state, page, setPage, today, chooseDate }: { state: ChallengeState; page: number; setPage: (n: number) => void; today: string; chooseDate: (d: string) => void }) {
  const start = page * 25 + 1;
  return <section className="page-section">
    <div className="section-heading"><div><p className="eyebrow">Весь путь</p><h1>Календарь 100 дней</h1><p>Нажми на любой прошедший день, чтобы посмотреть или изменить отметки.</p></div><div className="legend"><span className="dot done"/>выполнено <span className="dot gentle"/>бережно <span className="dot missed"/>пропуск</div></div>
    <div className="calendar-card">
      <div className="calendar-grid">
        {Array.from({ length: 25 }, (_, i) => start + i).map(day => {
          const date = addDays(state.startDate, day - 1); const record = state.records[date] || {};
          const values = HABITS.map(h => record[h.id]);
          const kind = values.some(v => v === "missed") ? "missed" : values.every(v => v === "done") ? "done" : values.some(v => v === "done" || v === "gentle") ? "gentle" : "empty";
          const disabled = date > today;
          return <button key={day} disabled={disabled} className={`calendar-day ${kind} ${date === today ? "today" : ""}`} onClick={() => chooseDate(date)}><span>{day}</span><small>{shortDate(date)}</small></button>;
        })}
      </div>
      <div className="calendar-pages"><button disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft/>Раньше</button><span>{start}-{start + 24} дни</span><button disabled={page === 3} onClick={() => setPage(page + 1)}>Дальше<ChevronRight/></button></div>
    </div>
    <aside className="kind-note"><CalendarDays size={18}/><p>Пустые прошлые дни ничего не отменяют. Можно отметить их сейчас или просто продолжить с сегодняшнего дня.</p></aside>
  </section>;
}

function ProgressView({ state, currentDay }: { state: ChallengeState; currentDay: number }) {
  const elapsed = Math.max(1, Math.min(100, currentDay));
  const stats = HABITS.map(h => {
    let done = 0, gentle = 0, missed = 0;
    for (let i = 0; i < elapsed; i++) { const v = state.records[addDays(state.startDate, i)]?.[h.id]; if (v === "done") done++; else if (v === "gentle") gentle++; else if (v === "missed") missed++; }
    return { ...h, done, gentle, missed, rate: Math.round(((done + gentle) / elapsed) * 100) };
  });
  const last7 = Array.from({ length: Math.min(7, elapsed) }, (_, i) => addDays(state.startDate, elapsed - 1 - i));
  const weekDone = last7.reduce((sum, d) => sum + HABITS.filter(h => ["done", "gentle"].includes(state.records[d]?.[h.id] || "")).length, 0);
  const weekTotal = last7.length * 5;
  return <section className="page-section">
    <div className="section-heading"><div><p className="eyebrow">День {currentDay} из 100</p><h1>Твой прогресс</h1><p>Смотрим не на идеальность, а на то, как много раз ты выбрала себя.</p></div><div className="overall-score"><strong>{Math.round(stats.reduce((s, x) => s + x.rate, 0) / 5)}%</strong><span>общий ритм</span></div></div>
    <div className="week-card"><div><p className="eyebrow">Последние 7 дней</p><h2>{weekDone} бережных шагов из {weekTotal}</h2></div><div className="week-circles">{last7.reverse().map(d => { const count = HABITS.filter(h => ["done", "gentle"].includes(state.records[d]?.[h.id] || "")).length; return <span key={d} title={`${shortDate(d)}: ${count} из 5`} style={{ "--level": `${count / 5}` } as React.CSSProperties}>{fromIso(d).getDate()}</span>; })}</div></div>
    <div className="progress-list">{stats.map(({ id, name, Icon, rate, done, gentle }) => <article key={id}><div className="progress-title"><span className="habit-icon"><Icon/></span><div><h2>{name}</h2><p>{done} полных · {gentle} бережных</p></div><strong>{rate}%</strong></div><div className="progress-track"><span style={{ width: `${rate}%` }}/></div></article>)}</div>
    <section className="milestones"><div className="section-mini"><Medal/><div><h2>Вехи пути</h2><p>Каждая помогает заметить, как далеко ты уже прошла.</p></div></div><div className="milestone-row">{MILESTONES.map(n => <div key={n} className={currentDay >= n ? "unlocked" : ""}><span>{currentDay >= n ? "✦" : n}</span><small>{n} дней</small></div>)}</div></section>
  </section>;
}

function SettingsView({ state, persist, importedInput, setToast, standaloneAuth }: { state: ChallengeState; persist: (s: ChallengeState) => void; importedInput: React.RefObject<HTMLInputElement | null>; setToast: (s: string) => void; standaloneAuth: boolean }) {
  async function toggleReminder(enabled: boolean) {
    if (enabled && "Notification" in window && Notification.permission === "default") await Notification.requestPermission();
    persist({ ...state, reminder: { ...state.reminder, enabled } });
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `100-dney-${iso()}.json`; a.click(); URL.revokeObjectURL(a.href); setToast("Резервная копия скачана");
  }
  function importData(file?: File) {
    if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const parsed = JSON.parse(String(reader.result)); if (parsed.version !== 1 || !parsed.records) throw new Error(); persist({ ...normalizeState(parsed), updatedAt: Date.now() }); setToast("Данные восстановлены"); } catch { setToast("Не удалось прочитать этот файл"); } }; reader.readAsText(file);
  }
  return <section className="page-section settings-page">
    <div className="section-heading"><div><p className="eyebrow">Твой ритм</p><h1>Настройки</h1><p>Настрой приложение так, чтобы оно поддерживало, а не давило.</p></div></div>
    <div className="settings-card"><div className="setting-row"><div><h2>Дата старта</h2><p>Дни пересчитаются от выбранной даты.</p></div><input type="date" value={state.startDate} onChange={e => persist({ ...state, startDate: e.target.value })}/></div></div>
    <div className="settings-card"><div className="setting-row"><div className="setting-title"><span className="habit-icon"><Bell/></span><div><h2>Мягкое напоминание</h2><p>Браузерное уведомление, если к вечеру остались пункты.</p></div></div><label className="switch"><input type="checkbox" checked={state.reminder.enabled} onChange={e => toggleReminder(e.target.checked)}/><span/></label></div>{state.reminder.enabled && <div className="reminder-time"><label>Напомнить после</label><input type="time" value={state.reminder.time} onChange={e => persist({ ...state, reminder: { ...state.reminder, time: e.target.value } })}/><p><strong>Важно:</strong> это не серверный push. Уведомление сработает, пока приложение открыто или активно в фоне; iPhone может останавливать его. Для настоящих push нужен отдельный push‑сервис.</p></div>}</div>
    <div className="settings-card"><div className="setting-row"><div><h2>Резервная копия</h2><p>Скачай данные или перенеси их на другое устройство.</p></div></div><div className="backup-actions"><button onClick={exportData}><Download/>Экспорт</button><button onClick={() => importedInput.current?.click()}><Upload/>Импорт</button><input ref={importedInput} hidden type="file" accept="application/json" onChange={e => importData(e.target.files?.[0])}/></div></div>
    <div className="settings-card install-card"><Share2/><div><h2>Добавить на экран телефона</h2><p><b>iPhone:</b> Safari → «Поделиться» → «На экран Домой».<br/><b>Android:</b> Chrome → меню ⋮ → «Установить приложение».</p></div></div>
    {standaloneAuth ? <div className="settings-card"><div className="setting-row"><div><h2>Безопасность</h2><p>Выйди из дневника на чужом или общем устройстве.</p></div><form action="/api/auth/logout" method="post"><button className="logout-button" type="submit">Выйти</button></form></div></div> : null}
    <aside className="kind-note"><Cloud size={18}/><p>Отметки сохраняются в облаке после входа и дополнительно остаются на этом устройстве для офлайн‑работы. Экспорт создаёт независимую страховочную копию.</p></aside>
  </section>;
}
