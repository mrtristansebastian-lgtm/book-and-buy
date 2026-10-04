import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Cake, CalendarDays, Package, Mail, Pencil, Phone, Search, Star, Trash2, User, Users } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { formatDisplayDate } from '../../../utils/dates';
import { navigate } from '../../../app/routing';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { setSupportFocusThread } from '../../support/utils/supportFormat';
import { useDialogFocus } from '../../../shared/ui/useDialogFocus';
import { DateField } from '../../../shared/ui/DateField';

const emptyClient = () => ({
  id: '',
  name: '',
  email: '',
  phone: '',
  country: '',
  birthday: '',
  notes: ''
});

const CLIENT_FILTERS = [
  { id: 'all', label: 'All', Icon: Users },
  { id: 'regulars', label: 'Regulars', Icon: Star },
  { id: 'first', label: 'First time', Icon: User }
];

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

function clientMatchKey(client) {
  return {
    id: String(client?.id || ''),
    email: String(client?.email || '').toLowerCase(),
    name: String(client?.name || '').toLowerCase()
  };
}

function recordMatchesClient(record, key) {
  const email = String(record?.clientEmail || '').toLowerCase();
  const name = String(record?.clientName || '').toLowerCase();
  const id = String(record?.clientId || '');
  return (
    (key.id && id && id === key.id) ||
    (key.email && email && email === key.email) ||
    (key.name && name && name === key.name)
  );
}

function visitCountForClient(client, bookings, orders) {
  const key = clientMatchKey(client);
  const bookingHits = (bookings || []).filter((booking) => recordMatchesClient(booking, key)).length;
  const orderHits = (orders || []).filter((order) => recordMatchesClient(order, key)).length;
  return bookingHits + orderHits;
}

/** Tier used for filters + row tags. */
function clientTier(visitCount) {
  const regular = visitCount >= 2;
  const returning = visitCount >= 2;
  const first = visitCount <= 1;
  return { regular, returning, first, visitCount };
}

function tagsForTiers(tiers) {
  const tags = [];
  if (tiers.regular) tags.push({ id: 'regular', label: 'Regular' });
  if (tiers.returning) tags.push({ id: 'returning', label: 'Returning' });
  if (tiers.first) tags.push({ id: 'new', label: 'New' });
  return tags;
}

export function ClientsPage({ fileClient = null, onEditorOpenChange, onReturnToChat }) {
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
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [mobileDetail, setMobileDetail] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState(emptyClient);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  useEffect(() => { setDeleteConfirm(false); }, [selectedId, fileClient?.id]);
  const editorRef = useRef(null);
  useDialogFocus(editorRef, draftOpen, () => setDraftOpen(false));
  useEffect(() => { onEditorOpenChange?.(draftOpen); }, [draftOpen, onEditorOpenChange]);

  const tiersById = useMemo(() => {
    const map = new Map();
    for (const client of clients) {
      map.set(client.id, clientTier(visitCountForClient(client, bookings, orders)));
    }
    return map;
  }, [clients, bookings, orders]);

  const filterCounts = useMemo(() => {
    let regulars = 0;
    let first = 0;
    for (const client of clients) {
      const tiers = tiersById.get(client.id) || clientTier(0);
      if (tiers.regular) regulars += 1;
      if (tiers.first) first += 1;
    }
    return { all: clients.length, regulars, first };
  }, [clients, tiersById]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = clients.filter((client) => {
      const tiers = tiersById.get(client.id) || clientTier(0);
      if (filter === 'regulars' && !tiers.regular) return false;
      if (filter === 'first' && !tiers.first) return false;
      if (!needle) return true;
      return [client.name, client.email, client.phone, client.country, client.birthday, client.notes]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
    return [...list].sort((a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' })
    );
  }, [clients, query, filter, tiersById]);

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

  const selected = fileClient
    ? clients.find((client) => client.id === fileClient.id || (fileClient.email && client.email?.toLowerCase() === fileClient.email.toLowerCase())) || fileClient
    : filtered.find((client) => client.id === selectedId) || null;

  const history = useMemo(() => {
    if (!selected) return { bookings: [], orders: [] };
    const key = clientMatchKey(selected);
    return {
      bookings: bookings.filter(
        (booking) =>
          recordMatchesClient(booking, key)
      ),
      orders: orders.filter(
        (order) =>
          recordMatchesClient(order, key)
      )
    };
  }, [selected, bookings, orders]);

  const openClient = (clientId) => {
    setSelectedId(clientId);
    setMobileDetail(true);
  };

  const closeMobileDetail = () => {
    setMobileDetail(false);
    setSelectedId('');
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
    onReturnToChat?.();
    navigate('/dashboard/communications');
  };

  const openEdit = (client = null) => {
    setDraft(client ? { ...emptyClient(), ...client } : emptyClient());
    setDraftOpen(true);
  };

  return (
    <div className={`bb-clients${fileClient ? ' is-embedded-file' : ''}${mobileDetail && selected ? ' is-mobile-detail' : ''}`}>
      <header className="bb-clients-header">
        <div className="bb-clients-header-copy">
          <div className="bb-page-title-wrap">
            <PageBackButton />
            <span className="bb-page-title-main">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title bb-clients-title">Client book</h1>
            </span>
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
          <Button action="addClient" variant="primary" type="button" className="bb-page-action" onClick={() => openEdit()}>

            Add client
          </Button>
        </div>
      </header>

      <section className="bb-clients-board" aria-label="Client phonebook">
        <div className="bb-clients-board-inner">
          <aside className="bb-clients-directory">
            <div className="bb-clients-directory-head">
              <div className="bb-clients-chips" role="toolbar" aria-label="Client filters">
                {CLIENT_FILTERS.map(({ id, label }) => {
                  const active = filter === id;
                  const count = filterCounts[id] ?? 0;
                  return (
                    <FilterChip
                      key={id}
                      type="button"
                      className={`bb-clients-chip bb-support-filter-chip${active ? ' is-active' : ''}`}
                      selected={active}
                      count={count}
                      onClick={() => setFilter(id)}
                    >
                      <span>{label}</span>
                    </FilterChip>
                  );
                })}
              </div>
            </div>
            <div className="bb-clients-directory-scroll">
              {filtered.length === 0 ? (
                <div className="bb-clients-directory-empty">
                  <p>
                    {clients.length === 0
                      ? 'No clients yet. Add your first contact.'
                      : 'No clients match that filter.'}
                  </p>
                </div>
              ) : (
                letterGroups.map((group) => (
                  <div key={group.letter}>
                    <p className="bb-clients-letter">{group.letter}</p>
                    {group.items.map((client) => {
                      const active = selected?.id === client.id;
                      const tiers = tiersById.get(client.id) || clientTier(0);
                      const tags = tagsForTiers(tiers);
                      const meta = [client.phone, client.country].filter(Boolean).join(' / ');
                      return (
                        <button
                          key={client.id}
                          type="button"
                          className={`bb-clients-row${active ? ' is-active' : ''}`}
                          aria-label={`Open client file for ${client.name}`}
                          aria-pressed={active}
                          onClick={() => openClient(client.id)}
                        >
                          <span className="bb-clients-avatar" aria-hidden="true">
                            {client.photoUrl || client.avatarUrl ? <img src={client.photoUrl || client.avatarUrl} alt="" /> : clientInitials(client.name)}
                          </span>
                          <span className="bb-clients-row-copy">
                            <strong className="bb-clients-row-name">{client.name}</strong>
                            <span className="bb-clients-row-meta">
                              {meta || client.email || 'No contact details'}
                            </span>
                            {tags.length ? (
                              <span className="bb-clients-tags">
                                {tags.map((tag) => (
                                  <span
                                    key={tag.id}
                                    className={`bb-clients-tag is-${tag.id}`}
                                  >
                                    {tag.label}
                                  </span>
                                ))}
                              </span>
                            ) : null}
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
                  <Button action="back" variant="secondary"
                    type="button"
                    className="bb-clients-back"
                    onClick={closeMobileDetail}
                  >

                    All clients
                  </Button>
                </div>

                <div className="bb-clients-sheet-hero">
                  <div className="bb-clients-sheet-identity">
                    <span className="bb-clients-sheet-avatar" aria-hidden="true">
                      {selected.photoUrl || selected.avatarUrl ? <img src={selected.photoUrl || selected.avatarUrl} alt="" /> : clientInitials(selected.name)}
                    </span>
                    <div>
                      <h2 className="bb-clients-sheet-name">{selected.name}</h2>
                      <p className="bb-clients-sheet-sub">
                        {selected.country || 'Client'}
                        {history.bookings.length || history.orders.length
                          ? ` · ${history.bookings.length + history.orders.length} ${history.bookings.length + history.orders.length === 1 ? 'record' : 'records'}`
                          : ''}
                      </p>
                      {tagsForTiers(tiersById.get(selected.id) || clientTier(0)).length ? (
                        <span className="bb-clients-tags">
                          {tagsForTiers(tiersById.get(selected.id) || clientTier(0)).map((tag) => (
                            <span key={tag.id} className={`bb-clients-tag is-${tag.id}`}>
                              {tag.label}
                            </span>
                          ))}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="bb-clients-actions">
                    <Button action="chat" variant="secondary"
                      type="button"
                      className="bb-clients-action"
                      onClick={() => openMessage(selected)}
                    >
                       Message
                    </Button>
                    <Button action="edit" variant="secondary"
                      type="button"
                      className="bb-clients-action"
                      onClick={() => openEdit(selected)}
                    >
                       Edit
                    </Button>
                    <button
                      type="button"
                      className="bb-clients-action is-danger bb-clients-delete-icon"
                      aria-label="Delete client file"
                      title="Delete client file"
                      onClick={() => setDeleteConfirm(true)}
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {deleteConfirm && <section className="bb-clients-delete-confirm" role="alert" aria-label="Confirm client file deletion">
                  <div><strong>Delete {selected.name}'s client file?</strong><p>This removes their saved contact details and notes. Booking and order history will be kept.</p></div>
                  <div><Button action="cancel" variant="secondary" type="button" className="bb-clients-action" onClick={() => setDeleteConfirm(false)}>Keep file</Button><Button action="delete" variant="destructive" type="button" className="bb-clients-action is-danger" onClick={() => { removeClient(selected.id); setDeleteConfirm(false); onReturnToChat?.(); setSelectedId(''); setMobileDetail(false); }}>Delete file</Button></div>
                </section>}

                <div className="bb-clients-file-summary" aria-label="Client activity summary">
                  <div><strong>{history.bookings.length}</strong><span>Bookings</span></div>
                  <div><strong>{history.orders.length}</strong><span>Orders</span></div>
                  <div><strong>{history.bookings.filter((booking) => booking.status === 'pending').length}</strong><span>Pending bookings</span></div>
                </div>
                <div className="bb-clients-profile-grid">
                <section className="bb-clients-contact-section" aria-label="Contact details">
                <div className="bb-clients-section-heading"><User size={18} aria-hidden="true" /><div><h3 className="bb-clients-history-title">Contact details</h3><p>How to reach your client</p></div></div>
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
                </div>
                </section>
                <section className="bb-clients-notes" aria-label="Client notes">
                  <div className="bb-clients-section-heading"><FileText size={18} aria-hidden="true" /><div><h3 className="bb-clients-history-title">Client notes</h3><p>Preferences and helpful context</p></div><button type="button" className="bb-clients-action" aria-label="Edit client notes" title="Edit notes" onClick={() => openEdit(selected)}><Pencil size={15} aria-hidden="true" /></button></div>
                  <p className={selected.notes ? 'bb-clients-field-value--notes' : 'bb-clients-history-empty'}>{selected.notes || 'No notes yet. Use Edit to add preferences or helpful reminders.'}</p>
                </section>
                </div>

                <section className="bb-clients-history" aria-label="Bookings">
                  <div className="bb-clients-section-heading"><CalendarDays size={18} aria-hidden="true" /><h3 className="bb-clients-history-title">Bookings <span>{history.bookings.length}</span></h3></div>
                  {history.bookings.length === 0 ? (
                    <p className="bb-clients-history-empty">No bookings yet.</p>
                  ) : (
                    <div className="bb-clients-history-list">
                      {history.bookings.map((booking) => (
                        <div key={booking.id} className="bb-clients-history-item">
                          <div>
                            <strong>{booking.serviceName || 'Booking'}</strong>
                            <span>
                              {formatDisplayDate(booking.dateKey || booking.date)} · {booking.time}
                            </span>
                          </div>
                          <StatusBadge className="bb-clients-record-status" status={booking.status} label={booking.status || 'Unknown status'} />
                          <Button action="chat" variant="secondary"
                            type="button"
                            className="bb-clients-action"
                            onClick={() => {
                              const thread = startThreadFromBooking(booking);
                              if (thread?.id) setSupportFocusThread(thread.id);
                              onReturnToChat?.();
                              navigate('/dashboard/communications');
                            }}
                          >
                            Message
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="bb-clients-history" aria-label="Orders">
                  <div className="bb-clients-section-heading"><Package size={18} aria-hidden="true" /><h3 className="bb-clients-history-title">Orders <span>{history.orders.length}</span></h3></div>
                  {history.orders.length === 0 ? (
                    <p className="bb-clients-history-empty">No orders yet.</p>
                  ) : (
                    <div className="bb-clients-history-list">
                      {history.orders.map((order) => (
                        <div key={order.id} className="bb-clients-history-item is-order">
                          <div>
                            {(order.items || []).map((item) => item.name).join(', ') || 'Order'}
                          </div>
                          <StatusBadge className="bb-clients-record-status" status={order.status} label={order.status || 'Unknown status'} />
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
            ref={editorRef}
            tabIndex={-1}
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
              <div className="bb-clients-modal-field">
                <DateField
                  label="Birthday"
                  placeholder="Choose birthday"
                  value={draft.birthday || ''}
                  onChange={(birthday) =>
                    setDraft((prev) => ({ ...prev, birthday }))
                  }
                />
              </div>
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
              <Button action="cancel" variant="secondary" type="button" className="bb-ghost-btn" onClick={() => setDraftOpen(false)}>
                Cancel
              </Button>
              <Button action="save" variant="primary" type="button" className="bb-primary-btn" onClick={saveClient}>
                Save client
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
