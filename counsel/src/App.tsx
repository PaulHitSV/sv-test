import { useEffect, useRef, useState } from 'react';
import {
  ArrowDownToLine,
  ArrowRight,
  BriefcaseBusiness,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  HelpCircle,
  Moon,
  MoreHorizontal,
  Plus,
  Repeat2,
  Search,
  ShieldCheck,
  Sun,
  Upload,
  X,
} from 'lucide-react';
import {
  addDays,
  csv,
  decodeData,
  download,
  duration,
  EMPLOYEE,
  initials,
  localDate,
  sampleData,
  shortDate,
  STORAGE_KEY,
  totals,
  weekStart,
} from './model';
import type { Client, Data, Entry } from './model';
import { useStore } from './useStore';
import { useTheme } from './useTheme';
import { Modal } from './components/Modal';
import { EntryForm } from './components/EntryForm';
import type { EntryTemplate } from './components/EntryForm';
import { Sidebar } from './components/Sidebar';
import type { Page } from './components/Sidebar';
import { ClientForm } from './components/ClientForm';
import { Stat } from './components/Stat';
import { Select } from './components/Select';
import { DatePicker } from './components/DatePicker';
import { TooltipLayer } from './components/Tooltip';
import { defaultReviewView, ReviewPage } from './components/ReviewPage';
import { saveEntry, selectWeek } from './review';
import { useSlidingIndicator } from './useSlidingIndicator';
import type { ReviewFilters, UndoRecord } from './review';
import pilotWorkspace from './fixtures/pilot-workspace.json';
import { EntryTable } from './components/EntryTable';
type Toast = { text: string; undo?: () => void };
const PAGE_TITLES: Record<Page, string> = {
  entries: 'Time entries',
  review: 'Weekly review',
  reports: 'Reports',
  clients: 'Clients',
};
const latestWeek = (data: Data) =>
  weekStart(
    data.entries
      .map((e) => e.date)
      .sort()
      .at(-1) ?? localDate(),
  );
export default function App() {
  const { data, save, error: storageError } = useStore();
  const { theme, toggleTheme } = useTheme();
  const [page, setPage] = useState<Page>('entries');
  const [week, setWeek] = useState(weekStart(localDate()));
  const [range, setRange] = useState('week');
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');
  const [billing, setBilling] = useState('all');
  // Review filters and the last review action live here so they survive
  // moving between pages during the Friday close.
  const [reviewView, setReviewView] = useState<ReviewFilters>(() =>
    defaultReviewView(latestWeek(data)),
  );
  const [reviewOperation, setReviewOperation] = useState<UndoRecord | null>(
    null,
  );
  const [entryModal, setEntryModal] = useState<Entry | 'new' | null>(null);
  const [template, setTemplate] = useState<EntryTemplate | undefined>();
  const [clientModal, setClientModal] = useState<Client | 'new' | null>(null);
  const [utilityModal, setUtilityModal] = useState<'help' | 'backup' | null>(
    null,
  );
  const [deleting, setDeleting] = useState<Entry | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [pendingRestore, setPendingRestore] = useState<Data | null>(null);
  const [utilityError, setUtilityError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  const rangeThumb = useSlidingIndicator<HTMLDivElement>(`${page}|${range}`);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), toast.undo ? 12000 : 5000);
    return () => clearTimeout(t);
  }, [toast]);
  const end = addDays(week, 6);
  const inPeriod = data.entries.filter(
    (e) => range === 'all' || (e.date >= week && e.date <= end),
  );
  const filtered = inPeriod
    .filter(
      (e) =>
        (clientFilter === 'all' || e.clientId === clientFilter) &&
        (billing === 'all' || e.billable === (billing === 'billable')) &&
        `${e.description} ${data.clients.find((c) => c.id === e.clientId)?.name ?? ''} ${e.employee}`
          .toLowerCase()
          .includes(search.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const summary = totals(filtered);
  const periodSummary = totals(inPeriod);
  const chartSource = page === 'reports' ? inPeriod : filtered;
  const dayTotals = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(week, i);
    return { date, ...totals(chartSource.filter((e) => e.date === date)) };
  });
  const maxDay = Math.max(240, ...dayTotals.map((d) => d.total));
  const weekLabel = `${shortDate(week)} – ${shortDate(end, { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const reviewCount = selectWeek(data.entries, reviewView.week).filter(
    (e) => !e.reviewed,
  ).length;
  const today = localDate();
  const lastOwn = data.entries
    .filter((e) => e.employee === EMPLOYEE && e.date < today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .at(-1);
  const repeatLabel = !lastOwn
    ? 'Repeat yesterday'
    : lastOwn.date === addDays(today, -1)
      ? 'Repeat yesterday'
      : `Repeat ${shortDate(lastOwn.date, { weekday: 'short', day: 'numeric', month: 'short' })}`;
  function openNewEntry(from?: EntryTemplate) {
    setTemplate(from);
    setEntryModal('new');
  }
  function exportCsv() {
    download(
      csv(filtered, data.clients),
      `counsel-time-${range === 'all' ? 'all' : week}.csv`,
      'text/csv;charset=utf-8',
    );
    setToast({
      text: `Exported ${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}.`,
    });
  }
  function loadSample() {
    try {
      save(sampleData());
      setWeek(weekStart(localDate()));
      setToast({ text: 'Sample workspace loaded. All records are fictional.' });
    } catch (e) {
      setToast({ text: (e as Error).message });
    }
  }
  function backup() {
    download(
      JSON.stringify(data, null, 2),
      `counsel-backup-${localDate()}.json`,
      'application/json',
    );
    setToast({ text: 'Backup downloaded.' });
  }
  function openBackup() {
    setUtilityError('');
    setUtilityModal('backup');
  }
  const periodToolbar = (
    <div className="period-toolbar">
      <div className="segmented" ref={rangeThumb.ref}>
        <span
          className={rangeThumb.className}
          style={rangeThumb.style}
          aria-hidden="true"
        />
        <button
          className={range === 'week' ? 'selected' : ''}
          aria-pressed={range === 'week'}
          onClick={() => setRange('week')}
        >
          Week
        </button>
        <button
          className={range === 'all' ? 'selected' : ''}
          aria-pressed={range === 'all'}
          onClick={() => setRange('all')}
        >
          All time
        </button>
      </div>
      {range === 'week' && (
        <div className="week-selector">
          <button
            className="icon-button"
            aria-label="Previous week"
            data-tip="Previous week"
            onClick={() => setWeek(addDays(week, -7))}
          >
            <ChevronLeft size={16} />
          </button>
          <DatePicker
            mode="week"
            label="Week"
            value={week}
            onChange={setWeek}
          />
          <button
            className="icon-button"
            aria-label="Next week"
            data-tip="Next week"
            onClick={() => setWeek(addDays(week, 7))}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      {range === 'week' && week !== weekStart(localDate()) && (
        <button
          className="button secondary"
          onClick={() => setWeek(weekStart(localDate()))}
        >
          This week
        </button>
      )}
    </div>
  );
  const weekChart = (
    <section className="panel week-chart" aria-label="Weekly activity">
      <div className="chart-head">
        <h2>Time by day</h2>
        <div className="chart-legend">
          <span>
            <i className="billable-dot" />
            Billable
          </span>
          <span>
            <i />
            Non-billable
          </span>
        </div>
      </div>
      <div className="chart-days">
        {dayTotals.map((d) => (
          <div
            className={`chart-day ${d.date === today ? 'today' : ''}`}
            key={d.date}
            data-tip={`${shortDate(d.date, { weekday: 'short', day: 'numeric', month: 'short' })} · ${d.total ? `${duration(d.billable)} billable · ${duration(d.nonBillable)} non-billable` : 'no time logged'}`}
            role="img"
            aria-label={`${shortDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}: ${duration(d.billable)} billable, ${duration(d.nonBillable)} non-billable`}
          >
            <span className="day-name">
              {shortDate(d.date, { weekday: 'short' })}{' '}
              {shortDate(d.date, { day: 'numeric' })}
            </span>
            <div className="bar-track">
              <div
                className="bar-stack"
                style={{ height: `${(d.total / maxDay) * 100}%` }}
              >
                <div
                  className="bar-nonbillable"
                  style={{ flexGrow: d.nonBillable }}
                />
                <div
                  className="bar-billable"
                  style={{ flexGrow: d.billable }}
                />
              </div>
            </div>
            <span className="bar-total">
              {d.total ? duration(d.total) : '—'}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
  return (
    <div className="app-shell">
      <Sidebar
        page={page}
        setPage={setPage}
        onBackup={openBackup}
        onHelp={() => setUtilityModal('help')}
        reviewCount={reviewCount}
        storageOk={!storageError}
      />
      <div className="main-shell">
        <header className="topbar">
          <div className="crumbs">
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={13} aria-hidden="true" />
            <span>{PAGE_TITLES[page]}</span>
          </div>
          <div className="topbar-tools">
            <button
              className="icon-button"
              aria-label={
                theme === 'dark'
                  ? 'Switch to light theme'
                  : 'Switch to dark theme'
              }
              data-tip={theme === 'dark' ? 'Light theme' : 'Dark theme'}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button
              className="icon-button"
              aria-label="Manage data"
              data-tip="Data & backups"
              onClick={openBackup}
            >
              <Database size={16} />
            </button>
            <button
              className="icon-button"
              aria-label="Help"
              data-tip="Help"
              onClick={() => setUtilityModal('help')}
            >
              <HelpCircle size={16} />
            </button>
          </div>
        </header>
        <main>
          {storageError && (
            <div className="storage-error" role="alert">
              {storageError}
              <button className="text-button" onClick={openBackup}>
                Manage data <ArrowRight size={15} />
              </button>
            </div>
          )}
          {page === 'review' ? (
            <ReviewPage
              data={data}
              save={save}
              onEdit={setEntryModal}
              readOnly={!!storageError}
              view={reviewView}
              setView={setReviewView}
              operation={reviewOperation}
              setOperation={setReviewOperation}
            />
          ) : page === 'entries' ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {range === 'all' ? 'All time' : weekLabel}
                  </span>
                  <h1>Time entries</h1>
                </div>
                <div className="heading-actions">
                  <button
                    className="button secondary"
                    disabled={!!storageError || !lastOwn}
                    onClick={() => lastOwn && openNewEntry(lastOwn)}
                  >
                    <Repeat2 size={16} />
                    {repeatLabel}
                  </button>
                  <button
                    className="button primary"
                    onClick={() => openNewEntry()}
                    disabled={!!storageError}
                  >
                    <Plus size={16} />
                    Log time
                  </button>
                </div>
              </div>
              <div className="toolbar-row">
                {periodToolbar}
                <button
                  className="button secondary"
                  onClick={exportCsv}
                  disabled={!filtered.length}
                >
                  <ArrowDownToLine size={16} />
                  Export CSV
                </button>
              </div>
              <section className="stats" aria-label="Time summary">
                <Stat
                  label="Total time"
                  value={duration(summary.total)}
                  detail={`${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'}`}
                />
                <Stat
                  label="Billable time"
                  value={duration(summary.billable)}
                  progress={summary.utilization}
                />
                <Stat
                  label="Non-billable time"
                  value={duration(summary.nonBillable)}
                  detail="Internal and relationship work"
                />
                <Stat
                  label="Awaiting review"
                  value={
                    <>
                      {filtered.filter((e) => !e.reviewed).length}
                      <small> of {filtered.length}</small>
                    </>
                  }
                  detail={
                    <button
                      className="text-button"
                      onClick={() => setPage('review')}
                    >
                      Open weekly review <ArrowRight size={14} />
                    </button>
                  }
                />
              </section>
              {range === 'week' && weekChart}
              <section className="panel entries-panel">
                <div className="filters">
                  <label className="search-field">
                    <Search size={16} aria-hidden="true" />
                    <input
                      aria-label="Search entries"
                      placeholder="Search clients, descriptions, people…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                      <button
                        className="icon-button"
                        aria-label="Clear search"
                        data-tip="Clear search"
                        onClick={() => setSearch('')}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </label>
                  <Select
                    label="Filter by client"
                    value={clientFilter}
                    onChange={setClientFilter}
                    options={[
                      { value: 'all', label: 'All clients' },
                      ...data.clients.map((c) => ({
                        value: c.id,
                        label: c.name,
                        color: c.color,
                      })),
                    ]}
                  />
                  <Select
                    label="Filter by billability"
                    value={billing}
                    onChange={setBilling}
                    options={[
                      { value: 'all', label: 'All billability' },
                      { value: 'billable', label: 'Billable' },
                      { value: 'non-billable', label: 'Non-billable' },
                    ]}
                  />
                </div>
                {!filtered.length ? (
                  <div className="empty-state">
                    <span className="empty-icon">
                      <Clock3 size={20} />
                    </span>
                    <h3>
                      {data.entries.length
                        ? 'No entries in this view.'
                        : 'No time logged yet.'}
                    </h3>
                    <p>
                      {data.entries.length
                        ? 'Try another week or adjust your filters.'
                        : 'Log your first entry, or open the pilot workspace from Data & backups.'}
                    </p>
                    <div className="empty-actions">
                      <button
                        className="button primary"
                        disabled={!!storageError}
                        onClick={() => openNewEntry()}
                      >
                        <Plus size={16} />
                        {data.entries.length
                          ? 'Log time'
                          : 'Log your first time entry'}
                      </button>
                      {!data.entries.length && !data.clients.length && (
                        <button
                          className="button secondary"
                          disabled={!!storageError}
                          onClick={loadSample}
                        >
                          Load a sample workspace
                        </button>
                      )}
                      {!!data.entries.length && (
                        <button
                          className="button secondary"
                          onClick={() => {
                            setRange('all');
                            setSearch('');
                            setClientFilter('all');
                            setBilling('all');
                          }}
                        >
                          Show all entries
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <EntryTable
                    entries={filtered}
                    clients={data.clients}
                    readOnly={!!storageError}
                    onEdit={setEntryModal}
                    onDelete={setDeleting}
                  />
                )}
                {!!filtered.length && (
                  <div className="table-footer">
                    <span>
                      {filtered.length}{' '}
                      {filtered.length === 1 ? 'entry' : 'entries'} ·{' '}
                      {range === 'all' ? 'All time' : weekLabel}
                    </span>
                    <span>
                      Total <strong>{duration(summary.total)}</strong>
                    </span>
                  </div>
                )}
              </section>
            </>
          ) : page === 'reports' ? (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {range === 'all' ? 'All time' : weekLabel}
                  </span>
                  <h1>Reports</h1>
                </div>
              </div>
              <div className="toolbar-row">{periodToolbar}</div>
              <section className="stats" aria-label="Report summary">
                <Stat
                  label="Total time"
                  value={duration(periodSummary.total)}
                  detail={`${inPeriod.length} ${inPeriod.length === 1 ? 'entry' : 'entries'}`}
                />
                <Stat
                  label="Billable"
                  value={duration(periodSummary.billable)}
                  progress={periodSummary.utilization}
                />
                <Stat
                  label="Non-billable"
                  value={duration(periodSummary.nonBillable)}
                  detail="Internal and relationship work"
                />
                <Stat
                  label="Ready for billing"
                  tip="Billable time on entries that have been reviewed"
                  value={duration(
                    totals(inPeriod.filter((e) => e.reviewed)).billable,
                  )}
                  detail={`${inPeriod.filter((e) => e.reviewed).length} of ${inPeriod.length} reviewed`}
                />
              </section>
              {!inPeriod.length ? (
                <section className="panel empty-state">
                  <span className="empty-icon">
                    <Clock3 size={20} />
                  </span>
                  <h3>No time in this period.</h3>
                  <p>Choose another week or switch to all time.</p>
                </section>
              ) : (
                <>
                  <div className="report-grid">
                    {range === 'week' && weekChart}
                    <section className="panel report-clients">
                      <div className="chart-head">
                        <h2>Time by client</h2>
                      </div>
                      <div className="report-list">
                        {data.clients
                          .map((client) => ({
                            client,
                            ...totals(
                              inPeriod.filter((e) => e.clientId === client.id),
                            ),
                          }))
                          .filter((c) => c.total)
                          .sort((a, b) => b.total - a.total)
                          .map((c) => (
                            <div className="report-row" key={c.client.id}>
                              <div className="report-label">
                                <i style={{ background: c.client.color }} />
                                <strong>{c.client.name}</strong>
                                <span className="report-share">
                                  {Math.round(
                                    (c.total / periodSummary.total) * 100,
                                  )}
                                  %
                                </span>
                                <span className="report-billable">
                                  {duration(c.billable)} billable
                                </span>
                                <span className="report-hours">
                                  {duration(c.total)}
                                </span>
                              </div>
                              <div
                                className="report-meter"
                                role="img"
                                aria-label={`${duration(c.billable)} billable, ${duration(c.nonBillable)} non-billable`}
                              >
                                <i
                                  style={{
                                    width: `${(c.billable / periodSummary.total) * 100}%`,
                                    background: c.client.color,
                                  }}
                                />
                                <i
                                  className="nb"
                                  style={{
                                    width: `${(c.nonBillable / periodSummary.total) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          ))}
                      </div>
                    </section>
                  </div>
                  <section className="panel" aria-label="Time by team member">
                    <div className="chart-head padded">
                      <h2>Team</h2>
                    </div>
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Person</th>
                            <th className="num-col">Time</th>
                            <th className="num-col">Billable</th>
                            <th>Billable ratio</th>
                            <th className="num-col">Entries</th>
                            <th>Review</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[...new Set(inPeriod.map((e) => e.employee))]
                            .sort()
                            .map((person) => {
                              const mine = inPeriod.filter(
                                (e) => e.employee === person,
                              );
                              const t = totals(mine);
                              const done = mine.filter(
                                (e) => e.reviewed,
                              ).length;
                              return (
                                <tr key={person}>
                                  <td>
                                    <span className="member-cell">
                                      <span className="tiny-avatar">
                                        {initials(person)}
                                      </span>
                                      {person}
                                    </span>
                                  </td>
                                  <td className="num-col strong">
                                    {duration(t.total)}
                                  </td>
                                  <td className="num-col">
                                    {duration(t.billable)}
                                  </td>
                                  <td>
                                    <span className="ratio">
                                      <span className="meter">
                                        <i
                                          style={{ width: `${t.utilization}%` }}
                                        />
                                      </span>
                                      {t.utilization}%
                                    </span>
                                  </td>
                                  <td className="num-col">{mine.length}</td>
                                  <td>
                                    <span
                                      className={`review-text ${done === mine.length ? 'done' : ''}`}
                                    >
                                      {done} of {mine.length} reviewed
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}
            </>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <span className="eyebrow">
                    {data.clients.length}{' '}
                    {data.clients.length === 1 ? 'client' : 'clients'} ·
                    all-time totals
                  </span>
                  <h1>Clients</h1>
                </div>
                <div className="heading-actions">
                  <button
                    className="button primary"
                    onClick={() => setClientModal('new')}
                    disabled={!!storageError}
                  >
                    <Plus size={16} />
                    Add client
                  </button>
                </div>
              </div>
              {!data.clients.length ? (
                <section className="panel empty-state">
                  <span className="empty-icon">
                    <BriefcaseBusiness size={20} />
                  </span>
                  <h3>No clients yet.</h3>
                  <p>
                    Add your first client. You can also create clients while
                    logging time.
                  </p>
                  <div className="empty-actions">
                    <button
                      className="button primary"
                      onClick={() => setClientModal('new')}
                      disabled={!!storageError}
                    >
                      <Plus size={16} />
                      Add a client
                    </button>
                  </div>
                </section>
              ) : (
                <section className="panel" aria-label="Client list">
                  <div className="table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Client</th>
                          <th className="num-col">Time</th>
                          <th>Billable share</th>
                          <th className="num-col">Entries</th>
                          <th>Review</th>
                          <th>
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.clients.map((client) => {
                          const mine = data.entries.filter(
                            (e) => e.clientId === client.id,
                          );
                          const t = totals(mine);
                          const open = mine.filter((e) => !e.reviewed).length;
                          return (
                            <tr key={client.id}>
                              <td>
                                <span className="client-name-cell">
                                  <span
                                    className="client-badge"
                                    style={{ background: client.color }}
                                    aria-hidden="true"
                                  >
                                    {initials(client.name)}
                                  </span>
                                  <h2>{client.name}</h2>
                                </span>
                              </td>
                              <td className="num-col strong">
                                {duration(t.total)}
                              </td>
                              <td>
                                <span className="ratio">
                                  <span className="meter">
                                    <i
                                      style={{
                                        width: `${t.utilization}%`,
                                        background: client.color,
                                      }}
                                    />
                                  </span>
                                  {t.utilization}%
                                </span>
                              </td>
                              <td className="num-col">{mine.length}</td>
                              <td>
                                <span
                                  className={`pill ${open ? 'warn' : 'ok'}`}
                                >
                                  {mine.length
                                    ? open
                                      ? `${open} to check`
                                      : 'All reviewed'
                                    : 'No entries'}
                                </span>
                              </td>
                              <td>
                                <div className="row-actions">
                                  <button
                                    className="text-button"
                                    onClick={() => {
                                      setClientFilter(client.id);
                                      setRange('all');
                                      setBilling('all');
                                      setSearch('');
                                      setPage('entries');
                                    }}
                                  >
                                    View entries
                                  </button>
                                  <button
                                    className="icon-button"
                                    aria-label={`Edit client ${client.name}`}
                                    data-tip="Edit client"
                                    onClick={() => setClientModal(client)}
                                    disabled={!!storageError}
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
      {entryModal && (
        <EntryForm
          entry={entryModal === 'new' ? undefined : entryModal}
          template={entryModal === 'new' ? template : undefined}
          clients={data.clients}
          onClose={() => {
            setEntryModal(null);
            setTemplate(undefined);
          }}
          onSave={(entry, client) => {
            save(
              saveEntry(
                data,
                entry,
                client,
                entryModal === 'new' ? undefined : entryModal,
              ),
            );
            setEntryModal(null);
            setTemplate(undefined);
            if (page !== 'review') {
              setWeek(weekStart(entry.date));
              setRange('week');
              setClientFilter('all');
              setBilling('all');
              setSearch('');
            }
            setToast({
              text:
                entryModal === 'new'
                  ? 'Time entry saved.'
                  : 'Time entry updated.',
            });
          }}
        />
      )}
      {clientModal && (
        <ClientForm
          client={clientModal === 'new' ? undefined : clientModal}
          clients={data.clients}
          onClose={() => setClientModal(null)}
          onSave={(client) => {
            save({
              ...data,
              clients:
                clientModal === 'new'
                  ? [...data.clients, client]
                  : data.clients.map((c) => (c.id === client.id ? client : c)),
            });
            setClientModal(null);
            setToast({
              text: clientModal === 'new' ? 'Client added.' : 'Client updated.',
            });
          }}
        />
      )}
      {deleting && (
        <Modal
          title="Delete this entry?"
          subtitle={`${duration(deleting.minutes)} · ${shortDate(deleting.date)} · ${data.clients.find((c) => c.id === deleting.clientId)?.name}`}
          onClose={() => setDeleting(null)}
        >
          <p className="modal-copy">
            This entry will be removed from your time records. You can undo this
            immediately after deleting.
          </p>
          <div className="modal-footer">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Keep entry
            </button>
            <button
              className="button danger"
              onClick={() => {
                try {
                  const removed = deleting;
                  save({
                    ...data,
                    entries: data.entries.filter((e) => e.id !== removed.id),
                  });
                  setDeleting(null);
                  setToast({
                    text: 'Time entry deleted.',
                    undo: () => {
                      try {
                        const current = decodeData(
                          localStorage.getItem(STORAGE_KEY) ??
                            JSON.stringify(data),
                        );
                        if (
                          !current.clients.some(
                            (c) => c.id === removed.clientId,
                          )
                        )
                          throw new Error(
                            'The original client no longer exists.',
                          );
                        if (!current.entries.some((e) => e.id === removed.id))
                          save({
                            ...current,
                            entries: [...current.entries, removed],
                          });
                        setToast({ text: 'Entry restored.' });
                      } catch (e) {
                        setToast({ text: (e as Error).message });
                      }
                    },
                  });
                } catch (e) {
                  setToast({ text: (e as Error).message });
                }
              }}
            >
              Delete entry
            </button>
          </div>
        </Modal>
      )}
      {utilityModal === 'help' && (
        <Modal
          title="Help"
          subtitle="How Counsel works."
          onClose={() => setUtilityModal(null)}
        >
          <div className="help-content">
            <h3>Capture your time</h3>
            <p>
              Choose a date and client, enter hours and minutes, and mark the
              entry billable or non-billable. Use Repeat to start from your most
              recent day.
            </p>
            <h3>Weekly review</h3>
            <p>
              Filter by client, person or status. Totals and Export view always
              match the rows in view. Selected rows are the only ones an action
              changes; changing filters clears the selection. Correcting a
              reviewed entry returns it to review.
            </p>
            <h3>Keep a copy</h3>
            <p>
              Your records stay in this browser on this device. Use Data &
              backups to download a backup and restore it later. Clearing
              browser data removes these records.
            </p>
            <div className="help-note">
              <ShieldCheck size={18} />
              <p>
                This is a local assessment workspace with a mock profile. There
                is no login, cloud sync, or server. Use fictional data when
                evaluating.
              </p>
            </div>
          </div>
        </Modal>
      )}
      {utilityModal === 'backup' && (
        <Modal
          title="Data & backups"
          subtitle="Back up your workspace or move it to another browser."
          onClose={() => {
            setUtilityModal(null);
            setPendingRestore(null);
          }}
        >
          <div className="backup-content">
            <div className="backup-summary">
              <Database size={20} />
              <div>
                <strong>
                  {data.entries.length} entries · {data.clients.length} clients
                </strong>
                <span>Stored locally in this browser</span>
              </div>
            </div>
            <button
              className="backup-option"
              onClick={() => {
                setPendingRestore(decodeData(JSON.stringify(pilotWorkspace)));
                setUtilityError('');
              }}
            >
              <BriefcaseBusiness size={20} />
              <div>
                <strong>Open pilot workspace</strong>
                <span>
                  Load the fictional Morgan & Partners review workspace
                </span>
              </div>
              <ArrowRight size={16} />
            </button>
            <button
              className="backup-option"
              onClick={backup}
              disabled={!!storageError}
            >
              <ArrowDownToLine size={20} />
              <div>
                <strong>Download a backup</strong>
                <span>All entries and clients, in a restorable JSON file</span>
              </div>
              <ArrowRight size={16} />
            </button>
            {storageError && (
              <button
                className="backup-option"
                onClick={() => {
                  try {
                    download(
                      localStorage.getItem(STORAGE_KEY) ?? '',
                      'counsel-original-data.txt',
                      'text/plain',
                    );
                  } catch {
                    setUtilityError('Browser storage is unavailable.');
                  }
                }}
              >
                <ArrowDownToLine size={20} />
                <div>
                  <strong>Download original data</strong>
                  <span>Preserve the unreadable data before restoring</span>
                </div>
              </button>
            )}
            <button
              className="backup-option"
              onClick={() => fileInput.current?.click()}
            >
              <Upload size={20} />
              <div>
                <strong>Restore a backup</strong>
                <span>Choose a Counsel JSON backup file</span>
              </div>
              <ArrowRight size={16} />
            </button>
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              aria-label="Backup file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                try {
                  if (file.size > 10_000_000)
                    throw new Error('Choose a backup smaller than 10 MB.');
                  setPendingRestore(decodeData(await file.text()));
                  setUtilityError('');
                } catch (err) {
                  setUtilityError((err as Error).message);
                  setPendingRestore(null);
                }
              }}
            />
            {utilityError && (
              <p className="form-error" role="alert">
                {utilityError}
              </p>
            )}
            {pendingRestore && (
              <div className="restore-confirm">
                <h3>Replace this workspace?</h3>
                <p>
                  This backup contains {pendingRestore.entries.length} entries
                  and {pendingRestore.clients.length} clients. Restoring
                  replaces all current records. Download a backup first if you
                  want to keep them.
                </p>
                <div>
                  <button
                    className="button secondary small"
                    onClick={() => setPendingRestore(null)}
                  >
                    Cancel
                  </button>
                  <button
                    className="button primary small"
                    onClick={() => {
                      try {
                        save(pendingRestore, true);
                        setPendingRestore(null);
                        setUtilityModal(null);
                        setPage('entries');
                        const latest = latestWeek(pendingRestore);
                        setWeek(latest);
                        setReviewView(defaultReviewView(latest));
                        setReviewOperation(null);
                        setClientFilter('all');
                        setToast({ text: 'Workspace restored from backup.' });
                      } catch (e) {
                        setUtilityError((e as Error).message);
                      }
                    }}
                  >
                    Replace and restore
                  </button>
                </div>
              </div>
            )}
            <p className="privacy-note">
              <ShieldCheck size={15} />
              No data is sent to a server. Keep backups somewhere safe.
            </p>
          </div>
        </Modal>
      )}
      <TooltipLayer />
      {toast && (
        <div className="toast" role="status">
          <span className="toast-icon">
            <Check size={14} />
          </span>
          <span>{toast.text}</span>
          {toast.undo && <button onClick={toast.undo}>Undo</button>}
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            data-tip="Dismiss"
            onClick={() => setToast(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
