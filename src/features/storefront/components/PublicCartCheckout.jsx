import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  Sparkles
} from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { usePublicCart } from '../PublicCartContext';
import { PublicServiceSlotSheet } from '../../booking/components/PublicServiceSlotSheet';
import { formatCents } from '../../../utils/products';
import {
  findServiceVariant,
  formatServiceDuration,
  formatServicePrice,
  formatServiceSessionLabel,
  getServiceDurationMinutes,
  getServiceOpenSpots,
  getServiceUnitPriceCents
} from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import { getPublicPaymentOptions, ONLINE_GATEWAYS } from '../../../utils/payments';
import { formatDisplayDate, toDateKey } from '../../../utils/dates';
import { createPublicProductOrder } from '../../../utils/orders';
import { buildBookingCalendarUrl } from '../../../shared/firebase/integrations';
import { isFirebaseConfigured } from '../../../shared/firebase/client';
import { serviceLineKey } from '../hooks/useCart';
import { firebaseCallables } from '../../../shared/firebase/callables';
import { APP_ID } from '../../../config/appConfig';
import { navigate, publicPagePath } from '../../../app/routing';

function readCheckoutReturnParams() {
  const hash = window.location.hash || '';
  const hashQuery = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const fromHash = new URLSearchParams(hashQuery);
  const fromSearch = new URLSearchParams(window.location.search || '');
  const get = (key) => fromHash.get(key) || fromSearch.get(key) || '';
  return {
    paid: get('paid'),
    cancelled: get('cancelled'),
    attemptId: get('attemptId'),
    gateway: get('gateway'),
    session_id: get('session_id'),
    token: get('token'),
    reference: get('reference')
  };
}

function buildReturnUrls(slug, page = 'buy') {
  const base = `${window.location.origin}${window.location.pathname || '/'}`;
  const path = publicPagePath(slug, page);
  return {
    successUrl: `${base}#${path}?paid=1`,
    cancelUrl: `${base}#${path}?cancelled=1`
  };
}

function formatCheckoutReference(id, fallbackIndex = 842) {
  const year = new Date().getFullYear();
  const raw = String(id || '')
    .replace(/\D+/g, '')
    .slice(-4);
  const suffix = raw.padStart(4, '0') || String(fallbackIndex).padStart(4, '0');
  return `BAB-${year}-${suffix}`;
}

function resolveFlowCopy({ hasServices, hasProducts }) {
  if (hasServices && hasProducts) {
    return {
      reviewEyebrow: 'Your cart',
      reviewTitle: 'Review cart.',
      reviewLede:
        'Check your items, dates, and times before checkout. You can edit the selection if anything looks off.',
      summaryTitle: 'Cart summary',
      detailsLede:
        'Request the booking and order first. If payment is needed, the next step will take care of it cleanly.',
      noteLabel: 'Note',
      emailUpdatesBody: 'Updates to the email entered above.',
      detailsCta: 'Place order & request',
      successTitle: 'Order placed.',
      successLede:
        'We have your order and booking request. Manage updates, shipping, and messages in one place.',
      processTitle: 'Order processing',
      processBody:
        'We will confirm stock and slots, follow up if needed, and share shipping or booking updates.',
      companionEyebrow: 'Your order companion',
      companionTitle: 'Manage this order',
      companionBody:
        'Keep shipping updates, messages, and booking details together. Use the same email and we will link it automatically.'
    };
  }
  if (hasProducts) {
    return {
      reviewEyebrow: 'Your order',
      reviewTitle: 'Review order.',
      reviewLede:
        'Check your products and quantities before checkout. You can edit the selection if anything looks off.',
      summaryTitle: 'Order summary',
      detailsLede:
        'Place the order first. If payment is needed, the next step will take care of it cleanly.',
      noteLabel: 'Order note',
      emailUpdatesBody: 'Order and shipping updates to the email entered above.',
      detailsCta: 'Place order',
      successTitle: 'Order placed.',
      successLede: 'We have your order and will prepare it shortly.',
      processTitle: 'Shipping updates',
      processBody:
        'We will confirm the order, prepare fulfilment, and share shipping updates as it moves.',
      companionEyebrow: 'Your order companion',
      companionTitle: 'Manage this order',
      companionBody:
        'Keep shipping updates, messages, and order details together. Use the same email and we will link it automatically.'
    };
  }
  return {
    reviewEyebrow: 'Your booking',
    reviewTitle: 'Review booking.',
    reviewLede:
      'Check your service, date, and time before checkout. You can edit the booking if anything looks off.',
    summaryTitle: 'Booking summary',
    detailsLede:
      'Request the booking first. If payment is needed, the next step will take care of it cleanly.',
    noteLabel: 'Booking note',
    emailUpdatesBody: 'Booking updates to the email entered above.',
    detailsCta: 'Request booking',
    successTitle: 'Request sent.',
    successLede: 'We have your request and will review the booking details shortly.',
    processTitle: 'Business review',
    processBody:
      'We will confirm the slot, follow up if needed, or help adjust the booking.',
    companionEyebrow: 'Your booking companion',
    companionTitle: 'Track this booking',
    companionBody:
      'Keep updates, messages, and booking details together. Use the same email and we will link it automatically.'
  };
}

function CheckoutField({ label, optional = false, children, className = '' }) {
  return (
    <label className={`bb-checkout-field${className ? ` ${className}` : ''}`}>
      <span className="bb-checkout-field__head">
        <span className="bb-checkout-field__label">{label}</span>
        {optional ? <span className="bb-checkout-field__optional">optional</span> : null}
      </span>
      {children}
    </label>
  );
}

function buildSummaryRows(cart) {
  const rows = [];
  cart.items.forEach((item) => {
    if (item.kind === 'service') {
      rows.push({
        key: `${item.lineKey}-service`,
        icon: Sparkles,
        label: 'Service',
        value: item.name
      });
      if (item.isSpot) {
        rows.push({
          key: `${item.lineKey}-session`,
          icon: CalendarDays,
          label: 'Session',
          value:
            item.sessionLabel ||
            formatServiceSessionLabel({
              sessionStartDate: item.sessionStartDate || item.dateKey,
              sessionStartTime: item.sessionStartTime || item.time,
              sessionEndDate: item.sessionEndDate,
              sessionEndTime: item.sessionEndTime
            }) ||
            'Programme seat'
        });
      } else {
        rows.push({
          key: `${item.lineKey}-date`,
          icon: CalendarDays,
          label: 'Date',
          value: item.dateKey ? formatDisplayDate(item.dateKey) : 'Choose a date'
        });
        rows.push({
          key: `${item.lineKey}-time`,
          icon: Clock3,
          label: 'Time',
          value: item.time || 'Choose a time'
        });
      }
      return;
    }
    rows.push({
      key: `${item.lineKey}-product`,
      icon: Sparkles,
      label: 'Product',
      value: item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name
    });
  });
  return rows;
}

/**
 * Shared Book + Buy cart checkout (products and/or services with slot pickers).
 * Steps: review → details → success.
 */
export function PublicCartCheckout({
  catalogWorkspace,
  workspaceName,
  publicMode = false,
  onBack,
  forceStep = '',
  previewResult = null,
  lockedPreview = false
}) {
  const ctx = useWorkspace();
  const cart = usePublicCart();
  const workspace = catalogWorkspace || ctx.workspace;
  const bookings =
    (catalogWorkspace && catalogWorkspace !== ctx.workspace
      ? catalogWorkspace.bookings
      : ctx.bookings) || [];
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
    clientNote: '',
    country: '',
    birthday: '',
    emailUpdates: true
  });
  const [submitNote, setSubmitNote] = useState('');
  const [result, setResult] = useState(() => previewResult || null);
  const [submitting, setSubmitting] = useState(false);
  const [returnState, setReturnState] = useState(null);
  const [slotEditItem, setSlotEditItem] = useState(null);
  const [step, setStep] = useState(() => {
    if (forceStep === 'details' || forceStep === 'success' || forceStep === 'review') {
      return forceStep;
    }
    return 'review';
  });

  useEffect(() => {
    if (forceStep === 'details' || forceStep === 'success' || forceStep === 'review') {
      setStep(forceStep);
    }
  }, [forceStep]);

  useEffect(() => {
    if (previewResult) setResult(previewResult);
  }, [previewResult]);

  useEffect(() => {
    const params = readCheckoutReturnParams();
    if (!params.paid && !params.cancelled) return undefined;
    let cancelled = false;

    const run = async () => {
      if (params.cancelled) {
        setReturnState({ kind: 'cancelled' });
        return;
      }
      if (!params.attemptId || !isFirebaseConfigured()) {
        setReturnState({
          kind: 'paid_local',
          note: 'Payment return received. Confirm in Finance if the studio uses cloud payments.'
        });
        return;
      }
      setReturnState({ kind: 'confirming' });
      try {
        const confirmed = await firebaseCallables.confirmPaymentReturn({
          appId: APP_ID,
          slug: workspace.slug,
          attemptId: params.attemptId,
          gatewayType: params.gateway || undefined,
          providerRef: params.session_id || params.token || params.reference || undefined,
          session_id: params.session_id || undefined,
          token: params.token || undefined,
          reference: params.reference || undefined
        });
        if (cancelled) return;
        setReturnState({
          kind: confirmed?.paid ? 'paid' : 'pending',
          note: confirmed?.reason || ''
        });
      } catch (error) {
        if (cancelled) return;
        setReturnState({
          kind: 'error',
          note: error?.message || 'Could not confirm payment yet.'
        });
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [workspace.slug]);

  const sameOwnerContext =
    !publicMode ||
    workspace.slug === ctx.workspace.slug ||
    (workspace.ownerId && workspace.ownerId === ctx.workspace.ownerId);

  const hasServices = cart.hasServices || Boolean(result?.bookings?.length);
  const hasProducts = cart.hasProducts || Boolean(result?.order);
  const copy = resolveFlowCopy({
    hasServices: hasServices || (!hasProducts && cart.items.length === 0),
    hasProducts
  });
  const summaryRows = useMemo(() => buildSummaryRows(cart), [cart]);
  const canContinueDetails = cart.items.length > 0 && cart.allServicesSlotted;
  const canSubmit =
    cart.items.length > 0 &&
    details.clientName.trim() &&
    cart.allServicesSlotted &&
    !submitting;

  const chargeNow = ONLINE_GATEWAYS.includes(paymentMethod);
  const paymentHint = (() => {
    const selected =
      paymentOptions.find((option) => option.gatewayType === paymentMethod) || null;
    if (!chargeNow) return 'No payment is taken now.';
    if (selected?.instructions) return selected.instructions;
    return `You will finish payment on ${selected?.name || paymentMethod}'s secure page.`;
  })();

  const submitBooking = async (item) => {
    const service = services.find((row) => row.id === item.serviceId);
    const variant =
      item.variantId && service
        ? findServiceVariant(service, item.variantId)
        : null;
    const isSpot =
      item.isSpot || getServiceScheduleType(service || item) === 'class_session';
    const dateKey = isSpot
      ? service?.sessionStartDate || item.dateKey
      : item.dateKey;
    const time = isSpot
      ? service?.sessionStartTime || item.time
      : item.time;
    const payload = {
      serviceId: item.serviceId,
      serviceName: item.name,
      variantId: item.variantId || '',
      variantName: item.variantName || variant?.name || '',
      scheduleType: item.scheduleType || service?.scheduleType,
      date: dateKey,
      dateKey,
      time,
      sessionEndDate: isSpot ? service?.sessionEndDate || item.sessionEndDate || '' : '',
      sessionEndTime: isSpot ? service?.sessionEndTime || item.sessionEndTime || '' : '',
      durationMinutes: service
        ? getServiceDurationMinutes(service, variant)
        : item.durationMinutes || 60,
      clientName: details.clientName.trim(),
      clientEmail: details.clientEmail.trim(),
      clientPhone: details.clientPhone.trim(),
      clientNote: details.clientNote.trim(),
      clientCountry: details.country.trim(),
      clientBirthday: details.birthday.trim(),
      emailUpdates: Boolean(details.emailUpdates),
      status: 'pending',
      paymentStatus: 'unpaid',
      paymentMethod,
      amountInCents: (() => {
        if (item.unitPriceCents != null) return Math.round(Number(item.unitPriceCents) || 0);
        if (service) return getServiceUnitPriceCents(service, variant);
        const price = Number(service?.price ?? item.price);
        if (Number.isFinite(price) && price > 50) return Math.round(price);
        if (Number.isFinite(price)) return Math.round(price * 100);
        return 0;
      })(),
      currency: workspace.currency || item.currency || 'R',
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
    if (lockedPreview) return;
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

        const online = ONLINE_GATEWAYS.includes(paymentMethod);
        if (online && publicMode && isFirebaseConfigured() && workspace.slug) {
          const { successUrl, cancelUrl } = buildReturnUrls(
            workspace.slug,
            hadProducts ? 'buy' : 'book'
          );
          const paySource = order
            ? { sourceType: 'order', sourceId: order.id }
            : bookingsCreated[0]
              ? { sourceType: 'booking', sourceId: bookingsCreated[0].id }
              : null;

          if (paySource?.sourceId) {
            try {
              const initiated = await firebaseCallables.initiatePayment({
                appId: APP_ID,
                slug: workspace.slug,
                gatewayType: paymentMethod,
                sourceType: paySource.sourceType,
                sourceId: paySource.sourceId,
                customerEmail: details.clientEmail.trim(),
                customerName: details.clientName.trim(),
                successUrl,
                cancelUrl
              });
              if (initiated?.redirectUrl) {
                window.location.assign(initiated.redirectUrl);
                return;
              }
              notes.push(
                initiated?.reason ||
                  'Online payment could not start — request saved as unpaid.'
              );
            } catch (error) {
              notes.push(
                error?.message ||
                  'Online payment could not start — request saved as unpaid. Try again or choose EFT/cash.'
              );
            }
          }
        } else if (online && !isFirebaseConfigured()) {
          notes.push(
            'Online card/PayPal checkout needs Firebase payments. Request saved unpaid — connect gateways when cloud is enabled.'
          );
        }

        setResult({ order, bookings: bookingsCreated });
        setStep('success');
      } else if (order || bookingsCreated.length) {
        notes.push('Part of your cart went through — check the summary below.');
        setResult({ order, bookings: bookingsCreated, partial: true });
        setStep('success');
        if (order) {
          for (const item of productSnapshot) cart.removeItem(item.lineKey);
        }
        for (const booking of bookingsCreated) {
          if (booking?.serviceId) {
            cart.removeItem(
              serviceLineKey(booking.serviceId, booking.variantId || '')
            );
          }
        }
      } else {
        notes.push('Nothing could be submitted. Try again.');
      }

      setSubmitNote([...new Set(notes.filter(Boolean))].join(' '));
    } finally {
      setSubmitting(false);
    }
  };

  if (returnState) {
    return (
      <div className="bb-checkout-flow">
        <div className="bb-checkout-flow__intro">
          <h2 className="bb-checkout-flow__title">
            {returnState.kind === 'cancelled'
              ? 'Payment cancelled'
              : returnState.kind === 'confirming'
                ? 'Confirming payment…'
                : returnState.kind === 'paid' || returnState.kind === 'paid_local'
                  ? 'Payment received'
                  : returnState.kind === 'pending'
                    ? 'Payment pending'
                    : 'Payment status'}
          </h2>
          <p className="bb-checkout-flow__lede">
            {returnState.kind === 'cancelled'
              ? 'No charge was completed. You can try again from checkout.'
              : returnState.kind === 'confirming'
                ? 'Checking with the payment provider…'
                : returnState.kind === 'paid'
                  ? `${workspaceName || workspace.brandName} will see this as paid.`
                  : returnState.note || 'Thanks — the studio will confirm shortly.'}
          </p>
          {returnState.note && returnState.kind !== 'paid' ? (
            <p className="bb-checkout-flow__lede">{returnState.note}</p>
          ) : null}
        </div>
        <button
          type="button"
          className="bb-checkout-cta"
          onClick={() => {
            setReturnState(null);
            onBack?.();
          }}
        >
          Continue browsing
          <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    );
  }

  const activeResult = result || previewResult;
  const showSuccess = step === 'success' && activeResult;

  if (showSuccess) {
    const firstBooking = activeResult.bookings?.[0];
    const calendarService = firstBooking
      ? services.find((row) => row.id === firstBooking.serviceId)
      : null;
    const calendarVariant =
      firstBooking?.variantId && calendarService
        ? findServiceVariant(calendarService, firstBooking.variantId)
        : null;
    const calendarUrl = firstBooking
      ? buildBookingCalendarUrl({
          serviceName: firstBooking.serviceName,
          brandName: workspaceName || workspace.brandName,
          dateKey: firstBooking.dateKey,
          time: firstBooking.time,
          durationMinutes: calendarService
            ? getServiceDurationMinutes(calendarService, calendarVariant)
            : 60,
          address: workspace.website?.address || '',
          note: firstBooking.clientNote || ''
        })
      : '';
    const successCopy = resolveFlowCopy({
      hasServices: Boolean(activeResult.bookings?.length),
      hasProducts: Boolean(activeResult.order)
    });
    const reference = formatCheckoutReference(
      activeResult.order?.id || firstBooking?.id || activeResult.reference
    );

    return (
      <div className="bb-checkout-flow bb-checkout-success">
        <div className="bb-checkout-success__mark" aria-hidden="true">
          <span className="bb-checkout-success__mark-core">
            <Check size={22} strokeWidth={2.6} />
          </span>
        </div>
        <div className="bb-checkout-flow__intro bb-checkout-flow__intro--center">
          <h2 className="bb-checkout-flow__title">
            {activeResult.partial ? 'Partly submitted.' : successCopy.successTitle}
          </h2>
          <p className="bb-checkout-flow__lede">{successCopy.successLede}</p>
          {submitNote ? <p className="bb-checkout-flow__lede">{submitNote}</p> : null}
        </div>

        <div className="bb-checkout-success__cards">
          <article className="bb-checkout-success__card">
            <p className="bb-checkout-success__card-label">
              <CreditCard size={15} strokeWidth={2} aria-hidden="true" />
              Reference
            </p>
            <p className="bb-checkout-success__card-value">{reference}</p>
            <p className="bb-checkout-success__card-body">
              Keep this for updates with the business.
            </p>
          </article>
          <article className="bb-checkout-success__card">
            <p className="bb-checkout-success__card-title">{successCopy.processTitle}</p>
            <p className="bb-checkout-success__card-body">{successCopy.processBody}</p>
          </article>
        </div>

        <div className="bb-checkout-companion">
          <div className="bb-checkout-companion__top">
            <span className="bb-checkout-companion__logo" aria-hidden="true">
              b
            </span>
            <div>
              <p className="bb-checkout-companion__eyebrow">{successCopy.companionEyebrow}</p>
              <h3 className="bb-checkout-companion__title">{successCopy.companionTitle}</h3>
              <p className="bb-checkout-companion__body">{successCopy.companionBody}</p>
            </div>
          </div>
          <div className="bb-checkout-companion__actions">
            <button
              type="button"
              className="bb-checkout-companion__btn bb-checkout-companion__btn--portal"
              onClick={() => navigate('/portal')}
            >
              Client portal
              <ArrowUpRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="bb-checkout-companion__btn bb-checkout-companion__btn--app"
              onClick={() => navigate('/portal?install=1')}
            >
              Add app
              <Download size={14} strokeWidth={2.4} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="bb-checkout-secondary">
          {calendarUrl ? (
            <a className="bb-ghost-btn" href={calendarUrl} target="_blank" rel="noreferrer">
              Add to Google Calendar
            </a>
          ) : null}
          {!lockedPreview ? (
            <button
              type="button"
              className="bb-ghost-btn"
              onClick={() => {
                setResult(null);
                setSubmitNote('');
                setDetails({
                  clientName: '',
                  clientEmail: '',
                  clientPhone: '',
                  clientNote: '',
                  country: '',
                  birthday: '',
                  emailUpdates: true
                });
                setStep('review');
                onBack?.();
              }}
            >
              Continue browsing
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  if (!cart.items.length && !lockedPreview) {
    return (
      <div className="bb-checkout-flow bb-checkout-empty">
        <p className="bb-checkout-flow__lede">Your cart is empty.</p>
        <p className="bb-checkout-flow__lede">
          Add services from Book or products from Buy. Quote-based products stay request-only.
        </p>
        <button type="button" className="bb-checkout-cta" onClick={onBack}>
          Continue browsing
          <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    );
  }

  if (step === 'details') {
    return (
      <div className="bb-checkout-flow">
        <div className="bb-checkout-flow__intro">
          <p className="bb-checkout-flow__eyebrow">Checkout</p>
          <h2 className="bb-checkout-flow__title">Fill in your details.</h2>
          <p className="bb-checkout-flow__lede">{copy.detailsLede}</p>
        </div>

        <form
          className="bb-checkout-form"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <div className="bb-checkout-form__row">
            <CheckoutField label="Full Name">
              <input
                value={details.clientName}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, clientName: event.target.value }))
                }
                autoComplete="name"
                required
              />
            </CheckoutField>
            <CheckoutField label="Mobile Number">
              <input
                value={details.clientPhone}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, clientPhone: event.target.value }))
                }
                autoComplete="tel"
                inputMode="tel"
              />
            </CheckoutField>
          </div>

          <div className="bb-checkout-form__row">
            <CheckoutField label="Email Address">
              <input
                type="email"
                value={details.clientEmail}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, clientEmail: event.target.value }))
                }
                autoComplete="email"
              />
            </CheckoutField>
            <CheckoutField label="Country / Region" optional>
              <input
                value={details.country}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, country: event.target.value }))
                }
                placeholder="South Africa"
                autoComplete="country-name"
              />
            </CheckoutField>
          </div>

          <div className="bb-checkout-form__row bb-checkout-form__row--single">
            <CheckoutField label={copy.noteLabel} optional>
              <textarea
                rows={3}
                value={details.clientNote}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, clientNote: event.target.value }))
                }
              />
            </CheckoutField>
          </div>

          <div className="bb-checkout-form__row bb-checkout-form__row--half">
            <CheckoutField label="Birthday" optional>
              <input
                type="date"
                value={details.birthday}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, birthday: event.target.value }))
                }
              />
            </CheckoutField>
          </div>

          <div className="bb-checkout-form__row">
            <button
              type="button"
              className={`bb-checkout-tile${details.emailUpdates ? ' is-checked' : ''}`}
              onClick={() =>
                setDetails((prev) => ({ ...prev, emailUpdates: !prev.emailUpdates }))
              }
            >
              <span className="bb-checkout-tile__check" aria-hidden="true">
                {details.emailUpdates ? <Check size={12} strokeWidth={3} /> : null}
              </span>
              <span className="bb-checkout-tile__copy">
                <span className="bb-checkout-tile__title">Email updates</span>
                <span className="bb-checkout-tile__body">{copy.emailUpdatesBody}</span>
              </span>
            </button>

            <div className="bb-checkout-tile">
              <span className="bb-checkout-tile__icon" aria-hidden="true">
                $
              </span>
              <span className="bb-checkout-tile__copy">
                <span className="bb-checkout-tile__title">Payment details</span>
                <span className="bb-checkout-tile__body">{paymentHint}</span>
              </span>
            </div>
          </div>

          {paymentOptions.length > 1 || chargeNow ? (
            <div className="bb-checkout-pay">
              {paymentOptions.some((option) => option.mode === 'test') && chargeNow ? (
                <p className="bb-pay-test-banner">Test mode — no live charges.</p>
              ) : null}
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
            </div>
          ) : null}

          {submitNote ? <p className="bb-checkout-flow__lede">{submitNote}</p> : null}

          {!lockedPreview ? (
            <button
              type="button"
              className="bb-checkout-flow__back"
              onClick={() => setStep('review')}
            >
              <ChevronLeft size={14} strokeWidth={2.4} aria-hidden="true" />
              Back to review
            </button>
          ) : null}

          <button type="submit" className="bb-checkout-cta" disabled={!canSubmit || lockedPreview}>
            {submitting ? 'Submitting…' : copy.detailsCta}
            <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="bb-checkout-flow">
      <button type="button" className="bb-checkout-flow__back" onClick={onBack}>
        <ChevronLeft size={14} strokeWidth={2.4} aria-hidden="true" />
        Edit selection
      </button>

      <div className="bb-checkout-flow__intro bb-checkout-flow__intro--center">
        <p className="bb-checkout-flow__eyebrow">{copy.reviewEyebrow}</p>
        <h2 className="bb-checkout-flow__title">{copy.reviewTitle}</h2>
        <p className="bb-checkout-flow__lede">{copy.reviewLede}</p>
      </div>

      <section className="bb-checkout-summary" aria-label={copy.summaryTitle}>
        <h3 className="bb-checkout-summary__title">{copy.summaryTitle}</h3>
        {summaryRows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.key} className="bb-checkout-summary__row">
              <span className="bb-checkout-summary__icon">
                <Icon size={16} strokeWidth={2} aria-hidden="true" />
              </span>
              <p className="bb-checkout-summary__label">{row.label}</p>
              <p className="bb-checkout-summary__value">{row.value}</p>
            </div>
          );
        })}
        <div className="bb-checkout-summary__total">
          <span>Total:</span>
          <span>{formatCents(cart.subtotalCents, cart.currency)}</span>
        </div>
      </section>

      {cart.hasServices ? (
        <div className="bb-checkout-slots">
          {cart.serviceItems.map((item) => {
            const service = services.find((row) => row.id === item.serviceId);
            const isSpot =
              item.isSpot || getServiceScheduleType(service || item) === 'class_session';
            if (isSpot) {
              const openSpots = service
                ? getServiceOpenSpots(service, bookings)
                : Math.max(0, Number(item.capacity || 1) || 1);
              return (
                <div key={`slot-${item.lineKey}`} className="bb-public-product-card p-4 grid gap-2">
                  <h3 className="bb-page-title text-xl m-0">Seat · {item.name}</h3>
                  <p className="bb-muted m-0 text-sm">
                    {item.sessionLabel ||
                      formatServiceSessionLabel(service || item) ||
                      'Fixed programme window'}
                  </p>
                  <p className="bb-muted m-0 text-sm">
                    {openSpots > 0
                      ? `${openSpots} open spot${openSpots === 1 ? '' : 's'} remaining`
                      : 'This programme is currently full — you can still request a seat.'}
                  </p>
                </div>
              );
            }
            return (
              <div key={`slot-${item.lineKey}`} className="bb-public-product-card p-4 grid gap-3">
                <h3 className="bb-page-title text-xl m-0">Schedule · {item.name}</h3>
                <p className="bb-muted m-0 text-sm">
                  {item.dateKey && item.time
                    ? `${formatDisplayDate(item.dateKey)} · ${item.time}`
                    : 'Choose an available date and time'}
                  {item.duration ? ` · ${formatServiceDuration(item.duration)}` : ''}
                </p>
                {!lockedPreview ? (
                  <button
                    type="button"
                    className="bb-ghost-btn justify-self-start"
                    onClick={() => setSlotEditItem(item)}
                  >
                    {item.dateKey && item.time ? 'Change date & time' : 'Pick date & time'}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}

      {!lockedPreview
        ? cart.productItems.map((item) => (
            <div
              key={`qty-${item.lineKey}`}
              className="bb-public-product-card p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <strong>{item.name}</strong>
                <p className="bb-muted m-0 text-sm">
                  {item.unitPriceCents === 0
                    ? item.priceLabel || formatServicePrice({ priceType: 'quote' })
                    : formatCents(item.unitPriceCents * item.quantity, item.currency)}
                </p>
              </div>
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
                <button
                  type="button"
                  className="bb-ghost-btn px-3 py-1 text-xs"
                  onClick={() => cart.removeItem(item.lineKey)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))
        : null}

      <button
        type="button"
        className="bb-checkout-cta"
        disabled={!canContinueDetails || lockedPreview}
        onClick={() => {
          if (lockedPreview) return;
          setStep('details');
        }}
      >
        Complete your details
        <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
      </button>

      <PublicServiceSlotSheet
        open={Boolean(slotEditItem)}
        service={
          slotEditItem
            ? services.find((row) => row.id === slotEditItem.serviceId) || {
                id: slotEditItem.serviceId,
                name: slotEditItem.name,
                scheduleType: slotEditItem.scheduleType,
                duration: slotEditItem.duration,
                variants: []
              }
            : null
        }
        workspace={workspace}
        bookings={bookings}
        initialDateKey={slotEditItem?.dateKey || ''}
        initialTime={slotEditItem?.time || ''}
        initialVariantId={slotEditItem?.variantId || ''}
        confirmLabel="Update slot"
        onClose={() => setSlotEditItem(null)}
        onConfirm={(slot) => {
          if (!slotEditItem) return;
          cart.updateServiceSlot(slotEditItem.lineKey, {
            dateKey: slot.dateKey,
            time: slot.time
          });
          setSlotEditItem(null);
        }}
      />
    </div>
  );
}

/** Seeded cart line for studio Cart / Checkout / Success mockups. */
export function buildCheckoutPreviewCartItems(workspace = {}) {
  const services = workspace.services || [];
  const service =
    services.find((row) => row.id === 'baking') ||
    services.find((row) => getServiceScheduleType(row) === 'appointment') ||
    services.find((row) => row.active !== false) ||
    null;

  if (!service) {
    return [
      {
        kind: 'service',
        lineKey: 'service:preview-pastry',
        serviceId: 'preview-pastry',
        id: 'preview-pastry',
        name: 'French Pastry Foundations',
        imageUrl: '',
        unitPriceCents: 95000,
        currency: workspace.currency || 'R',
        quantity: 1,
        scheduleType: 'appointment',
        isSpot: false,
        duration: 120,
        dateKey: toDateKey(new Date()),
        time: '09:00'
      }
    ];
  }

  const isSpot = getServiceScheduleType(service) === 'class_session';
  const variant =
    (Array.isArray(service.variants) ? service.variants : []).find(
      (row) => row.id === 'baking-6-month'
    ) ||
    (Array.isArray(service.variants) ? service.variants : [])[0] ||
    null;
  const variantId = variant?.id || '';
  return [
    {
      kind: 'service',
      lineKey: serviceLineKey(service.id, variantId),
      serviceId: service.id,
      variantId,
      variantName: variant?.name || '',
      id: service.id,
      name: variant?.name ? `${service.name} · ${variant.name}` : service.name,
      imageUrl: service.imageUrls?.[0] || service.image || '',
      unitPriceCents: getServiceUnitPriceCents(service, variant),
      currency: service.currency || workspace.currency || 'R',
      quantity: 1,
      scheduleType: service.scheduleType,
      isSpot,
      duration: variant?.minDuration || service.duration || '',
      durationMinutes: getServiceDurationMinutes(service, variant),
      sessionLabel: isSpot ? formatServiceSessionLabel(service) : '',
      sessionStartDate: service.sessionStartDate || '',
      sessionStartTime: service.sessionStartTime || '',
      sessionEndDate: service.sessionEndDate || '',
      sessionEndTime: service.sessionEndTime || '',
      capacity: service.capacity || 1,
      priceLabel: service.priceType === 'quote' ? 'Quote after consult' : '',
      dateKey: isSpot
        ? service.sessionStartDate || toDateKey(new Date())
        : toDateKey(new Date()),
      time: isSpot ? service.sessionStartTime || '09:00' : '09:00'
    }
  ];
}

export function buildCheckoutPreviewResult(items = []) {
  const item = items[0];
  return {
    order: null,
    bookings: [
      {
        id: 'bk-preview-0842',
        serviceId: item?.serviceId || 'preview-pastry',
        serviceName: item?.name || 'French Pastry Foundations',
        dateKey: item?.dateKey || toDateKey(new Date()),
        time: item?.time || '09:00',
        clientNote: ''
      }
    ],
    reference: 'BAB-2026-0842'
  };
}
