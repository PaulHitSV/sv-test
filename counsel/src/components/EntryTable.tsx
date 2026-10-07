import { Pencil, Trash2 } from 'lucide-react';
import { duration, initials, localDate, shortDate, totals } from '../model';
import type { Client, Entry } from '../model';
export function EntryTable({
  entries,
  clients,
  readOnly,
  onEdit,
  onDelete,
}: {
  entries: Entry[];
  clients: Client[];
  readOnly: boolean;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}) {
  const dates = [...new Set(entries.map((e) => e.date))];
  return (
    <div className="entry-groups">
      {dates.map((date) => (
        <section className="day-group" key={date}>
          <div className="day-heading">
            <span>
              {shortDate(date, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              {date === localDate() && <span className="today-tag">Today</span>}
            </span>
            <strong>
              {duration(totals(entries.filter((e) => e.date === date)).total)}
            </strong>
          </div>
          <div className="table-wrap">
            <table>
              <thead className="sr-only">
                <tr>
                  <th>Client / description</th>
                  <th>Team member</th>
                  <th>Billing</th>
                  <th>Review</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries
                  .filter((e) => e.date === date)
                  .map((entry) => {
                    const client = clients.find(
                      (c) => c.id === entry.clientId,
                    )!;
                    return (
                      <tr key={entry.id}>
                        <td className="client-cell">
                          <div className="entry-client">
                            <span
                              className="client-mark"
                              style={{ background: client.color }}
                            />
                            <div>
                              <strong>{client.name}</strong>
                              <span>
                                {entry.description || 'No description added'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="member-col">
                          <span className="member-cell">
                            <span className="tiny-avatar">
                              {initials(entry.employee)}
                            </span>
                            {entry.employee}
                          </span>
                        </td>
                        <td className="tag-col">
                          <span
                            className={`tag ${entry.billable ? 'billable' : ''}`}
                          >
                            {entry.billable ? 'Billable' : 'Non-billable'}
                          </span>
                        </td>
                        <td className="review-col">
                          <span
                            className={`review-text ${entry.reviewed ? 'done' : ''}`}
                          >
                            {entry.reviewed ? 'Reviewed' : 'In review'}
                          </span>
                        </td>
                        <td className="duration-cell">
                          {duration(entry.minutes)}
                        </td>
                        <td className="actions-cell">
                          <div className="row-actions">
                            <button
                              className="icon-button"
                              aria-label={`Edit ${client.name}: ${entry.description || 'time entry'}`}
                              data-tip="Edit entry"
                              onClick={() => onEdit(entry)}
                              disabled={readOnly}
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              className="icon-button delete-button"
                              aria-label={`Delete ${client.name}: ${entry.description || 'time entry'}`}
                              data-tip="Delete entry"
                              onClick={() => onDelete(entry)}
                              disabled={readOnly}
                            >
                              <Trash2 size={15} />
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
      ))}
    </div>
  );
}
