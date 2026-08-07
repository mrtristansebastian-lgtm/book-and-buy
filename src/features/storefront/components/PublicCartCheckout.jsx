import { useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../PublicCartContext';
import { formatCents } from '../../../utils/products';
import { formatServicePrice, formatServiceDuration, getServiceDurationMinutes } from '../../../utils/services';
import { getPublicPaymentOptions } from '../../../utils/payments';
import { getDaySlots } from '../../../utils/availability';
import { buildMonthGrid, formatDisplayDate, toDateKey } from '../../../utils/dates';
import { createPublicProductOrder } from '../../../utils/orders';
import { buildBookingCalendarUrl } from '../../../shared/firebase/integrations';
import { isFirebaseConfigured } from '../../../shared/firebase/client';
import { firebaseCallables } from '../../../shared/firebase/callables';

function ServiceSlotPicker({ item, bookings, workspace, services, onSlot }) {
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const monthDays = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const service = useMemo(
    () => (services || []).find((row) => row.id === item.serviceId),
    [services, item.serviceId]
  );
  const slots = useMemo(
    () =>
      getDaySlots({
        dateKey: item.dateKey,
        bookings,
        serviceId: item.serviceId,
        openTime: workspace.availabilityRules?.businessOpenTime,
        closeTime: workspace.availabilityRules?.businessCloseTime,
        services,
        durationMinutes: service ? undefined : 60
      }),
    [
      item.dateKey,
      item.serviceId,
      bookings,
      workspace.availabilityRules,
      services,
      service
    ]
  );

  return (
    <div className="bb-public-cart-slot grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="bb-ghost-btn"
          onClick={() =>
            setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
          }
        >
          Prev
        </button>
        <strong className="text-sm">
          {monthAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </strong>
        <button
          type="button"
          className="bb-ghost-btn"
          onClick={() =>
            setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
          }
        >
          Next
        </button>
      </div>
      <div className="bb-public-cal-grid grid grid-cols-7 gap-2">
        {monthDays.map((day) => {
          const key = toDateKey(day);
          const inMonth = day.getMonth() === monthAnchor.getMonth();
          const available =
            key >= toDateKey(new Date()) &&
            getDaySlots({
              dateKey: key,
              bookings,
              serviceId: item.serviceId,
              openTime: workspace.availabilityRules?.businessOpenTime,
              closeTime: workspace.availabilityRules?.businessCloseTime,
              services
            }).length > 0;
          return (
            <button
              key={key + String(day)}
              type="button"
              disabled={!available}
              className={`rounded-xl py-3 text-sm font-semibold ${
                item.dateKey === key
                  ? 'bb-primary-btn'
                  : available
                    ? 'bb-ghost-btn'
                    : 'opacity-35 bg-transparent border-0'
              } ${inMonth ? '' : 'opacity-40'}`}
              onClick={() => onSlot({ dateKey: key, time: '' })}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      {item.dateKey ? (
        <div className="grid gap-2">
          <h3 className="bb-page-title text-lg m-0">
            Times on {formatDisplayDate(item.dateKey)}
          </h3>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <button
                key={slot.time}
                type="button"
                className={item.time === slot.time ? 'bb-primary-btn' : 'bb-ghost-btn'}
                onClick={() => onSlot({ dateKey: item.dateKey, time: slot.time })}
              >
                {slot.time}
              </button>
            ))}
            {slots.length === 0 ? (
              <p className="bb-muted m-0 text-sm">No times on this day.</p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="bb-muted m-0 text-sm">Pick a date for {item.name}.</p>
      )}
    </div>
  );
}

/**
 * Shared Book + Buy cart checkout (products and/or services with slot pickers).
 */
export function PublicCartCheckout({
  catalogWorkspace,
  workspaceName,
  publicMode = false,
  onBack
}) {
  const ctx = useWorkspace();
  const cart = usePublicCart();
  const workspace = catalogWorkspace || ctx.workspace;
  const bookings =
    catalogWorkspace && catalogWorkspace !== ctx.workspace
      ? catalogWorkspace.bookings || []
      : ctx.bookings;
  const services = workspace.services || ctx.services || [];
  const paymentGateways = workspace.paymentGateways || ctx.paymentGateways;
  const paymentOptions = useMemo(
    () => getPublicPaymentOptions({ paymentGateways }).options,
    [paymentGateways]
  );
  const [paymentMethod, setPaymentMethod] = useState(
    () => paymentOptions[0]?.gatewayType || 'cash'
  );
  const [details, setDetails] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientNote: ''
  });
  const [submitNote, setSubmitNote] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const sameOwnerContext =
    !publicMode ||
    workspace.slug === ctx.workspace.slug ||
    (workspace.ownerId && workspace.ownerId === ctx.workspace.ownerId);

  const canSubmit =
    cart.items.length > 0 &&
    details.clientName.trim() &&
    cart.allServicesSlotted &&
    !submitting;

  const submitBooking = async (item) => {
    const service = services.find((row) => row.id === item.serviceId);
    const payload = {
      serviceId: item.serviceId,
      serviceName: item.name,
      scheduleType: item.scheduleType,
      date: item.dateKey,
      dateKey: item.dateKey,
      time: item.time,
      durationMinutes: service ? getServiceDurationMinutes(service) : 60,
      clientName: details.clientName.trim(),
      clientEmail: details.clientEmail.trim(),
      clientPhone: details.clientPhone.trim(),
      clientNote: details.clientNote.trim(),
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod,
      source: 'public',
      workspaceSlug: workspace.slug,
      workspaceName: workspaceName || workspace.brandName
    };

    if (publicMode && isFirebaseConfigured() && workspace.slug) {
      try {
        const remote = await firebaseCallables.createPublicBookingRequest({
          slug: workspace.slug,
          ...payload
        });
        return { ...payload, id: remote?.id || `bk-${Date.now()}`, ...(remote || {}) };
      } catch {
        /* fall through */
      }
    }
    if (sameOwnerContext) {
      return ctx.addBooking(payload);
    }
    return { ...payload, id: `bk-local-${Date.now()}`, localOnly: true };
  };

  const submitProducts = async (productItems) => {
    if (!productItems.length) return null;

    if (publicMode && isFirebaseConfigured() && workspace.slug) {
      try {
        const remote = await firebaseCallables.createPublicProductOrder({
          slug: workspace.slug,
          items: productItems,
          client: details,
          paymentMethod
        });
        if (remote && typeof remote === 'object') return remote;
      } catch {
        /* fall through */
      }
    }

    if (sameOwnerContext) {
      return ctx.placeProductOrder({
        items: productItems,
        client: details,
        paymentMethod
      });
    }

    return createPublicProductOrder({
      workspaceSlug: workspace.slug,
      workspaceName: workspaceName || workspace.brandName,
      items: productItems,
      client: details,
      paymentMethod
    });
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setSubmitNote('');
    const notes = [];
    let order = null;
    const bookingsCreated = [];
    const hadProducts = cart.productItems.length > 0;
    const hadServices = cart.serviceItems.length > 0;
    const productSnapshot = [...cart.productItems];
    const serviceSnapshot = [...cart.serviceItems];

    try {
      if (hadProducts) {
        order = await submitProducts(productSnapshot);
        if (!order) notes.push('Product order could not be placed.');
        else if (!sameOwnerContext && !(publicMode && isFirebaseConfigured() && workspace.slug)) {
          notes.push(
            'Order saved on this device. Deploy order Functions so the owner receives live orders.'
          );
        }
      }

      for (const item of serviceSnapshot) {
        try {
          const booking = await submitBooking(item);
          if (booking?.localOnly) {
            notes.push(
              'Booking saved on this device. Deploy booking Functions so the owner receives live requests.'
            );
          }
          bookingsCreated.push(booking);
        } catch {
          notes.push(`Could not request ${item.name}.`);
        }
      }

      const productsOk = !hadProducts || Boolean(order);
      const servicesOk = !hadServices || bookingsCreated.length === serviceSnapshot.length;

      if (productsOk && servicesOk) {
        cart.clear();
        setResult({ order, bookings: bookingsCreated });
      } else if (order || bookingsCreated.length) {
        notes.push('Part of your cart went through — check the summary below.');
        setResult({ order, bookings: bookingsCreated, partial: true });
        if (order) {
          for (const item of productSnapshot) cart.removeItem(item.lineKey);
        }
        for (const booking of bookingsCreated) {
          if (booking?.serviceId) cart.removeItem(`service:${booking.serviceId}`);
        }
      } else {
        notes.push('Nothing could be submitted. Try again.');
      }

      setSubmitNote([...new Set(notes.filter(Boolean))].join(' '));
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    const firstBooking = result.bookings?.[0];
    const calendarService = firstBooking
      ? services.find((row) => row.id === firstBooking.serviceId)
      : null;
    const calendarUrl = firstBooking
      ? buildBookingCalendarUrl({
          serviceName: firstBooking.serviceName,
          brandName: workspaceName || workspace.brandName,
          dateKey: firstBooking.dateKey,
          time: firstBooking.time,
          durationMinutes: calendarService
            ? getServiceDurationMinutes(calendarService)
            : 60,
          address: workspace.website?.address || '',
          note: firstBooking.clientNote || ''
        })
      : '';

    return (
      <div className="grid gap-5 max-w-2xl">
        <div className="grid gap-3">
          <h2 className="bb-page-title text-3xl m-0">
            {result.partial ? 'Partly submitted' : 'Request received'}
          </h2>
          {result.order ? (
            <p className="bb-muted m-0">
              Product order total {formatCents(result.order.amountInCents, result.order.currency)} via{' '}
              {result.order.paymentMethod}.
            </p>
          ) : null}
          {result.bookings?.map((booking) => (
            <p key={booking.id} className="bb-muted m-0">
              {booking.serviceName} on {formatDisplayDate(booking.dateKey)} at {booking.time}.
            </p>
          ))}
          <p className="bb-muted m-0">
            {workspaceName || workspace.brandName} will confirm.
          </p>
          {submitNote ? <p className="bb-muted m-0 text-sm">{submitNote}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {calendarUrl ? (
            <a className="bb-ghost-btn" href={calendarUrl} target="_blank" rel="noreferrer">
              Add to Google Calendar
            </a>
          ) : null}
          <button
            type="button"
            className="bb-primary-btn"
            onClick={() => {
              setResult(null);
              setSubmitNote('');
              setDetails({ clientName: '', clientEmail: '', clientPhone: '', clientNote: '' });
              onBack?.();
            }}
          >
            Continue browsing
          </button>
        </div>
      </div>
    );
  }

  if (!cart.items.length) {
    return (
      <div className="bb-public-empty grid gap-3 content-start text-left max-w-2xl">
        <p className="bb-muted m-0">Your cart is empty.</p>
        <p className="bb-muted m-0 text-sm">
          Add services from Book or products from Buy. Quote-based products stay request-only.
        </p>
        <button type="button" className="bb-primary-btn justify-self-start" onClick={onBack}>
          Continue browsing
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-5 max-w-2xl">
      <div className="grid gap-3">
        {cart.items.map((item) => (
          <article
            key={item.lineKey}
            className="bb-public-product-card bb-public-cart-row p-4 grid sm:grid-cols-[72px_1fr_auto] gap-3 items-center"
          >
            <div className="h-16 rounded-lg overflow-hidden bg-black/5">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
              ) : null}
            </div>
            <div className="grid gap-1 min-w-0">
              <p className="bb-public-service-meta m-0">
                {item.kind === 'service' ? 'Booking' : 'Product'}
              </p>
              <strong>{item.name}</strong>
              {item.kind === 'service' ? (
                <p className="bb-muted m-0 text-sm">
                  {item.dateKey && item.time
                    ? `${formatDisplayDate(item.dateKey)} · ${item.time}`
                    : 'Choose a date and time below'}
                  {item.duration
                    ? ` · ${formatServiceDuration(item.duration)}`
                    : ''}
                </p>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="bb-ghost-btn px-3 py-1"
                    onClick={() => cart.setQuantity(item.lineKey, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span>{item.quantity}</span>
                  <button
                    type="button"
                    className="bb-ghost-btn px-3 py-1"
                    onClick={() => cart.setQuantity(item.lineKey, item.quantity + 1)}
                  >
                    +
                  </button>
                </div>
              )}
            </div>
            <div className="grid gap-2 justify-items-end">
              <div className="font-semibold">
                {item.kind === 'service' && item.unitPriceCents === 0
                  ? item.priceLabel || formatServicePrice({ priceType: 'quote' })
                  : formatCents(item.unitPriceCents * item.quantity, item.currency)}
              </div>
              <button
                type="button"
                className="bb-ghost-btn px-3 py-1 text-xs"
                onClick={() => cart.removeItem(item.lineKey)}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>

      {cart.hasServices
        ? cart.serviceItems.map((item) => (
            <div key={`slot-${item.lineKey}`} className="bb-public-product-card p-4 grid gap-3">
              <h3 className="bb-page-title text-xl m-0">Schedule · {item.name}</h3>
              <ServiceSlotPicker
                item={item}
                bookings={bookings}
                workspace={workspace}
                services={services}
                onSlot={(slot) => cart.updateServiceSlot(item.lineKey, slot)}
              />
            </div>
          ))
        : null}

      <div className="bb-public-product-card p-5 grid gap-3">
        <div className="flex justify-between font-semibold">
          <span>Subtotal</span>
          <span>{formatCents(cart.subtotalCents, cart.currency)}</span>
        </div>
        <input
          className="native-control-input px-4"
          placeholder="Your name"
          value={details.clientName}
          onChange={(event) =>
            setDetails((prev) => ({ ...prev, clientName: event.target.value }))
          }
        />
        <input
          className="native-control-input px-4"
          placeholder="Email"
          value={details.clientEmail}
          onChange={(event) =>
            setDetails((prev) => ({ ...prev, clientEmail: event.target.value }))
          }
        />
        <input
          className="native-control-input px-4"
          placeholder="Phone"
          value={details.clientPhone}
          onChange={(event) =>
            setDetails((prev) => ({ ...prev, clientPhone: event.target.value }))
          }
        />
        <textarea
          className="native-control-input px-4 py-3"
          rows={2}
          placeholder="Note (optional)"
          value={details.clientNote}
          onChange={(event) =>
            setDetails((prev) => ({ ...prev, clientNote: event.target.value }))
          }
        />
        <div className="grid gap-2">
          <span className="text-sm font-semibold">Payment method</span>
          <div className="bb-segment flex-wrap">
            {(paymentOptions.length
              ? paymentOptions
              : [{ gatewayType: 'cash', name: 'Cash' }]
            ).map((method) => (
              <button
                key={method.gatewayType || method.id}
                type="button"
                aria-pressed={paymentMethod === (method.gatewayType || method.id)}
                onClick={() => setPaymentMethod(method.gatewayType || method.id)}
              >
                {method.name}
              </button>
            ))}
          </div>
          {(() => {
            const selected =
              paymentOptions.find((option) => option.gatewayType === paymentMethod) || null;
            if (selected?.instructions) {
              return <p className="bb-muted m-0 text-xs">{selected.instructions}</p>;
            }
            if (['stripe', 'paystack', 'card'].includes(paymentMethod)) {
              return (
                <p className="bb-muted m-0 text-xs">
                  Card checkout via {selected?.name || paymentMethod}. The studio confirms the
                  order; online capture lands with Firebase payments.
                </p>
              );
            }
            if (paymentMethod === 'manual_eft') {
              return (
                <p className="bb-muted m-0 text-xs">
                  Pay by EFT using the studio’s bank details. Mark as paid after transfer.
                </p>
              );
            }
            return (
              <p className="bb-muted m-0 text-xs">
                Pay in cash when you collect or at the studio.
              </p>
            );
          })()}
        </div>
        {submitNote ? <p className="bb-muted m-0 text-sm">{submitNote}</p> : null}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="bb-ghost-btn" onClick={onBack}>
            Keep browsing
          </button>
          <button
            type="button"
            className="bb-primary-btn"
            disabled={!canSubmit}
            onClick={submit}
          >
            {cart.hasServices && cart.hasProducts
              ? 'Place order & request'
              : cart.hasServices
                ? 'Request booking'
                : 'Place order'}
          </button>
        </div>
      </div>
    </div>
  );
}

