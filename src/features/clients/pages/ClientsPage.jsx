import { useEffect, useMemo, useState } from 'react';
import { Mail, MessageSquare, Pencil, Phone, Plus, Search, Trash2 } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate } from '../../../utils/dates';
import { navigate } from '../../../app/routing';
import { setSupportFocusThread } from '../../support/utils/supportFormat';

const emptyClient = () => ({
  id: '',
  name: '',
  email: '',
  phone: '',
  country: ''
});

function clientInitials(name = '') {
  const parts = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

function letterForName(name = '') {
  const ch = String(name).trim().charAt(0).toUpperCase();
  return ch >= 'A' && ch <= 'Z' ? ch : '#';
}

export function ClientsPage() {
  const {
    clients,
    bookings,
    orders,
    upsertClient,
    removeClient,
    startThreadFromBooking,
    startThreadFromClient
  } = useWorkspace();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(clients[0]?.id || '');
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState(emptyClient);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = clients.filter((client) => {
      if (!needle) return true;
      return [client.name, client.email, client.phone, client.country]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
    return [...list].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
    );
  }, [clients, query]);

  const letterGroups = useMemo(() => {
    const groups = [];
    const map = new Map();
    for (const client of filtered) {
      const letter = letterForName(client.name);
      if (!map.has(letter)) {
        const group = { letter, items: [] };
        map.set(letter, group);
        groups.push(group);
      }
      map.get(letter).items.push(client);
    }
    return groups;
  }, [filtered]);

  useEffect(() => {
    if (!filtered.length) {
      if (selectedId) setSelectedId('');
      return;
    }
    if (!filtered.some((client) => client.id === selectedId)) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((client) => client.id === selectedId) || null;

  const history = useMemo(() => {
    if (!selected) return { bookings: [], orders: [] };
    const email = String(selected.email || '').toLowerCase();
    const name = String(selected.name || '').toLowerCase();
    return {
      bookings: bookings.filter(
        (booking) =>
          String(booking.clientEmail || '').toLowerCase() === email ||
          String(booking.clientName || '').toLowerCase() === name
      ),
      orders: orders.filter(
        (order) =>
          String(order.clientEmail || '').toLowerCase() === email ||
          String(order.clientName || '').toLowerCase() === name
      )
    };
  }, [selected, bookings, orders]);

  const saveClient = () => {
    if (!draft.name.trim()) return;
    const next = { ...draft, id: draft.id || `client-${Date.now()}` };
    upsertClient(next);
    setSelectedId(next.id);
    setDraftOpen(false);
    setDraft(emptyClient());
  };

  const openMessage = (client) => {
    const thread = startThreadFromClient(client);
    if (thread?.id) setSupportFocusThread(thread.id);
    navigate('/dashboard/communications');
  };

  return (
    <div className="bb-clients">
      <header className="bb-clients-header">
        <div className="bb-clients-header-copy">
          <p className="bb-clients-eyebrow">Directory</p>
          <h1 className="bb-clients-title">Clients</h1>
          <p className="bb-clients-lede">Your phonebook for people who book and buy.</p>
        </div>
        <div className="bb-clients-tools">
          <label className="bb-clients-search bb-search-field">
            <Search size={15} className="bb-search-field-icon" aria-hidden="true" />
            <input
              type="search"
              className="native-search-input"
              placeholder="Search clients"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-label="Search clients"
            />
          </label>
          <button
            type="button"
            className="bb-primary-btn"
            onClick={() => {
              setDraft(emptyClient());
              setDraftOpen(true);
            }}
          >
            <Plus size={16} /> Add client
          </button>
        </div>
      </header>

      <section className="bb-clients-bezel" aria-label="Client phonebook">
        <div className="bb-clients-bezel-inner">
          <aside className="bb-clients-directory">
            <div className="bb-clients-directory-head">
              <p className="bb-clients-directory-label">Contacts</p>
              <p className="bb-clients-directory-count">
                {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
              </p>
            </div>
            <div className="bb-clients-directory-scroll">
              {filtered.length === 0 ? (
                <div className="bb-clients-directory-empty">
                  <p>
                    {clients.length === 0
                      ? 'No clients yet. Add your first contact.'
                      : 'No clients match that search.'}
                  </p>
                </div>
              ) : (
                letterGroups.map((group) => (
                  <div key={group.letter}>
                    <p className="bb-clients-letter">{group.letter}</p>
                    {group.items.map((client) => {
                      const active = selected?.id === client.id;
                      return (
                        <button
                          key={client.id}
                          type="button"
                          className={`bb-clients-row${active ? ' is-active' : ''}`}
                          onClick={() => setSelectedId(client.id)}
                          aria-current={active ? 'true' : undefined}
                        >
                          <span className="bb-clients-avatar" aria-hidden="true">
                            {clientInitials(client.name)}
                          </span>
                          <span className="bb-clients-row-copy">
                            <strong className="bb-clients-row-name">{client.name}</strong>
                            <span className="bb-clients-row-meta">
                              {client.email || client.phone || 'No contact details'}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </aside>

          {selected ? (
            <div className="bb-clients-sheet" key={selected.id}>
              <div className="bb-clients-sheet-scroll">
                <div className="bb-clients-sheet-hero">
                  <div className="bb-clients-sheet-identity">
                    <span className="bb-clients-sheet-avatar" aria-hidden="true">
                      {clientInitials(selected.name)}
                    </span>
                    <div>
                      <h2 className="bb-clients-sheet-name">{selected.name}</h2>
                      <p className="bb-clients-sheet-sub">
                        {selected.country || 'Client'}
                        {history.bookings.length || history.orders.length
                          ? ` · ${history.bookings.length + history.orders.length} records`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className="bb-clients-actions">
                    <button
                      type="button"
                      className="bb-clients-action"
                      onClick={() => openMessage(selected)}
                    >
                      <MessageSquare size={14} /> Message
                    </button>
                    <button
                      type="button"
                      className="bb-clients-action"
                      onClick={() => {
                        setDraft(selected);
                        setDraftOpen(true);
                      }}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      className="bb-clients-action is-danger"
                      onClick={() => removeClient(selected.id)}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                </div>

                <div className="bb-clients-fields">
                  <div className="bb-clients-field">
                    <p className="bb-clients-field-label">Email</p>
                    <p className="bb-clients-field-value">
                      {selected.email ? (
                        <a href={`mailto:${selected.email}`}>
                          <Mail size={13} aria-hidden="true" />
                          {selected.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </p>
                  </div>
                  <div className="bb-clients-field">
                    <p className="bb-clients-field-label">Phone</p>
                    <p className="bb-clients-field-value">
                      {selected.phone ? (
                        <a href={`tel:${selected.phone.replace(/\s+/g, '')}`}>
                          <Phone size={13} aria-hidden="true" />
                          {selected.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </p>
                  </div>
                  <div className="bb-clients-field">
                    <p className="bb-clients-field-label">Country</p>
                    <p className="bb-clients-field-value">{selected.country || '—'}</p>
                  </div>
                </div>

                <section className="bb-clients-history" aria-label="Bookings">
                  <h3 className="bb-clients-history-title">Bookings</h3>
                  {history.bookings.length === 0 ? (
                    <p className="bb-clients-history-empty">No bookings yet.</p>
                  ) : (
                    <div className="bb-clients-history-list">
                      {history.bookings.map((booking) => (
                        <div key={booking.id} className="bb-clients-history-item">
                          <div>
                            {booking.serviceName}
                            <span>
                              {' '}
                              · {formatDisplayDate(booking.dateKey || booking.date)} · {booking.time}{' '}
                              · {booking.status}
                            </span>
                          </div>
                          <button
                            type="button"
                            className="bb-clients-action"
                            onClick={() => {
                              const thread = startThreadFromBooking(booking);
                              if (thread?.id) setSupportFocusThread(thread.id);
                              navigate('/dashboard/communications');
                            }}
                          >
                            Message
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="bb-clients-history" aria-label="Orders">
                  <h3 className="bb-clients-history-title">Orders</h3>
                  {history.orders.length === 0 ? (
                    <p className="bb-clients-history-empty">No orders yet.</p>
                  ) : (
                    <div className="bb-clients-history-list">
                      {history.orders.map((order) => (
                        <div key={order.id} className="bb-clients-history-item">
                          <div>
                            {(order.items || []).map((item) => item.name).join(', ') || 'Order'}
                            <span> · {order.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </div>
          ) : (
            <div className="bb-clients-sheet">
              <div className="bb-clients-sheet-empty">
                <strong>No contact selected</strong>
                <p className="bb-clients-history-empty">
                  {clients.length === 0
                    ? 'Add a client to start your directory.'
                    : 'Pick someone from the list, or clear your search.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {draftOpen ? (
        <div
          className="bb-clients-modal-overlay"
          onClick={() => setDraftOpen(false)}
          role="presentation"
        >
          <div
            className="bb-clients-modal"
            role="dialog"
            aria-modal="true"
            aria-label={draft.id ? 'Edit client' : 'New client'}
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="bb-clients-modal-title">{draft.id ? 'Edit client' : 'New client'}</h2>
            <div className="bb-clients-modal-fields">
              <input
                placeholder="Name"
                value={draft.name}
                onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                autoFocus
              />
              <input
                placeholder="Email"
                value={draft.email}
                onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
              />
              <input
                placeholder="Phone"
                value={draft.phone}
                onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
              />
              <input
                placeholder="Country"
                value={draft.country}
                onChange={(event) => setDraft((prev) => ({ ...prev, country: event.target.value }))}
              />
            </div>
            <div className="bb-clients-modal-actions">
              <button type="button" className="bb-ghost-btn" onClick={() => setDraftOpen(false)}>
                Cancel
              </button>
              <button type="button" className="bb-primary-btn" onClick={saveClient}>
                Save client
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
