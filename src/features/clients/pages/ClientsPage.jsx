import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Cake,
  Mail,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2
} from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate } from '../../../utils/dates';
import { navigate } from '../../../app/routing';
import { setSupportFocusThread } from '../../support/utils/supportFormat';

const emptyClient = () => ({
  id: '',
  name: '',
  email: '',
  phone: '',
  country: '',
  birthday: '',
  notes: ''
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

function formatBirthday(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    }
  }
  return raw;
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
  const [selectedId, setSelectedId] = useState('');
  const [mobileDetail, setMobileDetail] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState(emptyClient);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = clients.filter((client) => {
      if (!needle) return true;
      return [client.name, client.email, client.phone, client.country, client.birthday, client.notes]
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
      if (mobileDetail) setMobileDetail(false);
      return;
    }
    if (selectedId && !filtered.some((client) => client.id === selectedId)) {
      setSelectedId('');
      setMobileDetail(false);
    }
  }, [filtered, selectedId, mobileDetail]);

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

  const openClient = (clientId) => {
    setSelectedId(clientId);
    setMobileDetail(true);
  };

  const closeMobileDetail = () => {
    setMobileDetail(false);
  };

  const saveClient = () => {
    if (!draft.name.trim()) return;
    const next = {
      ...draft,
      id: draft.id || `client-${Date.now()}`,
      name: draft.name.trim(),
      email: String(draft.email || '').trim(),
      phone: String(draft.phone || '').trim(),
      country: String(draft.country || '').trim(),
      birthday: String(draft.birthday || '').trim(),
      notes: String(draft.notes || '').trim()
    };
    upsertClient(next);
    setSelectedId(next.id);
    setMobileDetail(true);
    setDraftOpen(false);
    setDraft(emptyClient());
  };

  const openMessage = (client) => {
    const thread = startThreadFromClient(client);
    if (thread?.id) setSupportFocusThread(thread.id);
    navigate('/dashboard/communications');
  };

  const openEdit = (client = null) => {
    setDraft(client ? { ...emptyClient(), ...client } : emptyClient());
    setDraftOpen(true);
  };

  return (
    <div className={`bb-clients${mobileDetail && selected ? ' is-mobile-detail' : ''}`}>
      <header className="bb-clients-header">
        <div className="bb-clients-header-copy">
          <div className="bb-page-title-wrap">
            <div className="bb-page-header-glow" aria-hidden="true" />
            <h1 className="bb-page-title bb-clients-title">Clients</h1>
          </div>
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
          <button type="button" className="bb-primary-btn" onClick={() => openEdit()}>
            <Plus size={16} /> Add client
          </button>
        </div>
      </header>

      <section className="bb-clients-board" aria-label="Client phonebook">
        <div className="bb-clients-board-inner">
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
                          onClick={() => openClient(client.id)}
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
                <div className="bb-clients-sheet-bar">
                  <button
                    type="button"
                    className="bb-clients-back"
                    onClick={closeMobileDetail}
                  >
                    <ArrowLeft size={16} strokeWidth={2.2} />
                    Contacts
                  </button>
                </div>

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
                      onClick={() => openEdit(selected)}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      className="bb-clients-action is-danger"
                      onClick={() => {
                        removeClient(selected.id);
                        setSelectedId('');
                        setMobileDetail(false);
                      }}
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
                  <div className="bb-clients-field">
                    <p className="bb-clients-field-label">Birthday</p>
                    <p className="bb-clients-field-value">
                      {selected.birthday ? (
                        <span className="bb-clients-birthday">
                          <Cake size={13} aria-hidden="true" />
                          {formatBirthday(selected.birthday)}
                        </span>
                      ) : (
                        '—'
                      )}
                    </p>
                  </div>
                  {selected.notes ? (
                    <div className="bb-clients-field">
                      <p className="bb-clients-field-label">Notes</p>
                      <p className="bb-clients-field-value bb-clients-field-value--notes">
                        {selected.notes}
                      </p>
                    </div>
                  ) : null}
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
            <div className="bb-clients-sheet bb-clients-sheet--empty">
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
              <label className="bb-clients-modal-field">
                <span>Name</span>
                <input
                  placeholder="Full name"
                  value={draft.name}
                  onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
                  autoFocus
                />
              </label>
              <label className="bb-clients-modal-field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={draft.email}
                  onChange={(event) => setDraft((prev) => ({ ...prev, email: event.target.value }))}
                />
              </label>
              <label className="bb-clients-modal-field">
                <span>Phone</span>
                <input
                  type="tel"
                  placeholder="+27 …"
                  value={draft.phone}
                  onChange={(event) => setDraft((prev) => ({ ...prev, phone: event.target.value }))}
                />
              </label>
              <label className="bb-clients-modal-field">
                <span>Country</span>
                <input
                  placeholder="Country"
                  value={draft.country}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, country: event.target.value }))
                  }
                />
              </label>
              <label className="bb-clients-modal-field">
                <span>Birthday</span>
                <input
                  type="date"
                  value={draft.birthday || ''}
                  onChange={(event) =>
                    setDraft((prev) => ({ ...prev, birthday: event.target.value }))
                  }
                />
              </label>
              <label className="bb-clients-modal-field">
                <span>Notes</span>
                <textarea
                  rows={3}
                  placeholder="Preferences, allergies, reminders…"
                  value={draft.notes || ''}
                  onChange={(event) => setDraft((prev) => ({ ...prev, notes: event.target.value }))}
                />
              </label>
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
