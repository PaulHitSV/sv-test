import {
  BriefcaseBusiness,
  ChartNoAxesColumnIncreasing,
  ChevronsUpDown,
  Clock3,
  Database,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';
import { EMPLOYEE } from '../model';
export type Page = 'entries' | 'review' | 'reports' | 'clients';
export function Sidebar({
  page,
  setPage,
  onBackup,
  onHelp,
  reviewCount,
  storageOk,
}: {
  page: Page;
  setPage: (page: Page) => void;
  onBackup: () => void;
  onHelp: () => void;
  reviewCount: number;
  storageOk: boolean;
}) {
  const items = [
    { id: 'entries', label: 'Time entries', icon: Clock3 },
    { id: 'review', label: 'Weekly review', icon: ShieldCheck },
    { id: 'reports', label: 'Reports', icon: ChartNoAxesColumnIncreasing },
    { id: 'clients', label: 'Clients', icon: BriefcaseBusiness },
  ] as const;
  return (
    <aside className="sidebar">
      <a
        className="brand"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          setPage('entries');
        }}
        aria-label="Counsel home"
      >
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <rect width="28" height="28" rx="7" className="brand-tile" />
          <path
            d="M18.5 10.2a5.2 5.2 0 1 0 0 7.6"
            fill="none"
            className="brand-c"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          <circle cx="20" cy="14" r="1.6" className="brand-dot" />
        </svg>
        Counsel
      </a>
      <div className="workspace-label">
        <span className="workspace-badge">MP</span>
        <span>
          <strong>Morgan & Partners</strong>
          <span>Pilot workspace</span>
        </span>
        <ChevronsUpDown size={15} aria-hidden="true" />
      </div>
      <nav aria-label="Main navigation">
        {items.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${page === item.id ? 'active' : ''}`}
            aria-current={page === item.id ? 'page' : undefined}
            onClick={() => setPage(item.id)}
          >
            <item.icon size={18} aria-hidden="true" />
            <span className="nav-label">{item.label}</span>
            {item.id === 'review' && reviewCount > 0 && (
              <span
                className="nav-count"
                aria-label={`${reviewCount} to review`}
              >
                {reviewCount}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="nav-section">
        <span className="nav-caption">Workspace</span>
        <button className="nav-item" onClick={onBackup}>
          <Database size={18} aria-hidden="true" />
          <span className="nav-label">Data & backups</span>
        </button>
        <button className="nav-item" onClick={onHelp}>
          <HelpCircle size={18} aria-hidden="true" />
          <span className="nav-label">Help</span>
        </button>
      </div>
      <div className="sidebar-bottom">
        <div className={`saved-note ${storageOk ? '' : 'warning'}`}>
          <i aria-hidden="true" />
          {storageOk ? 'Saved on this device' : 'Storage needs attention'}
        </div>
        <div className="profile">
          <span className="avatar" aria-hidden="true">
            AM
          </span>
          <span>
            <strong>{EMPLOYEE}</strong>
            <span>Associate · Local profile</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
