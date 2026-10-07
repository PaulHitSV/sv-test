import type { ReactNode } from 'react';
export function Stat({
  label,
  value,
  detail,
  progress,
  tip,
}: {
  label: string;
  tip?: string;
  value: ReactNode;
  detail?: ReactNode;
  progress?: number;
}) {
  return (
    <article className="stat-card">
      <div className="stat-label">
        {tip ? (
          <span className="has-tip" tabIndex={0} data-tip={tip}>
            {label}
          </span>
        ) : (
          label
        )}
      </div>
      <div className="stat-value">{value}</div>
      {progress !== undefined ? (
        <div className="stat-progress">
          <span className="meter">
            <i style={{ width: `${progress}%` }} />
          </span>
          <strong>{progress}%</strong>
        </div>
      ) : (
        detail && <div className="stat-detail">{detail}</div>
      )}
    </article>
  );
}
