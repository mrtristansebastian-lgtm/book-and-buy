import { Button } from '../../../shared/ui/Button';
import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useAuth } from '../../auth/AuthContext';
import { useClientProfile } from '../../client-app/ClientProfileContext';
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
import { catalogAllowed, resolveMarket, shippingQuote, shippingDisplayName } from '../../../utils/markets';
import { MARKET_COUNTRIES } from '../../../config/marketCountries';
import { buildBookingCalendarUrl } from '../../../shared/firebase/integrations';
import { isFirebaseConfigured } from '../../../shared/firebase/client';
import { serviceLineKey } from '../hooks/useCart';
import { firebaseCallables } from '../../../shared/firebase/callables';
import { APP_ID } from '../../../config/appConfig';
import { buildTestCheckoutResult } from '../../../utils/testCheckout';
import {
  checkoutQuoteInput, clearCheckoutRecovery, mergePublicCommerceWorkspace,
  onlineCheckoutRestriction, quotePublicCart, quoteRevisionPayload,
  readCheckoutRecovery, saveCheckoutRecovery
} from '../../../utils/publicCommerceCheckout';
import { navigate, publicPagePath } from '../../../app/routing';
import {
  trackAnalyticsEvent,
  upsertAnalyticsCart,
  getAnalyticsAttribution
} from '../../../shared/analytics/beacon';

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
  lockedPreview = false,
  testMode = false
}) {
  const ctx = useWorkspace();
  const cart = usePublicCart();
  const { user } = useAuth();
  const { profile, isClient } = useClientProfile();
  const initialWorkspace = catalogWorkspace || ctx.workspace;
  const liveCommerce = publicMode && !lockedPreview && !testMode;
  const [catalogState, setCatalogState] = useState({ status: 'loading', key: '', catalog: null, error: '' });
  const workspace = mergePublicCommerceWorkspace(initialWorkspace, catalogState.catalog);
  const analyticsEnabled = publicMode && !lockedPreview && user?.uid !== workspace?.ownerId;
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
    shippingAddress: '',
    birthday: '',
    emailUpdates: true
  });

  useEffect(() => {
    if (!isClient || !profile) return;
    setDetails((prev) => ({
      ...prev,
      clientName: prev.clientName || profile.displayName || '',
      clientEmail: prev.clientEmail || profile.email || user?.email || ''
    }));
  }, [isClient, profile, user?.email]);
  const [submitNote, setSubmitNote] = useState('');
  const [result, setResult] = useState(() => previewResult || null);
  const [submitting, setSubmitting] = useState(false);
  const [quoteState, setQuoteState] = useState({ status: 'idle', signature: '', quote: null, error: '' });
  const [quoteRefresh, setQuoteRefresh] = useState(0);
  const [paymentRecovery, setPaymentRecovery] = useState(null);
  const bookingRequests = useRef(new Map());
  const requestAttribution = useRef(new Map());
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

  const buyerCountry = initialWorkspace.website?.buyerCountryCode || details.country;
  const catalogKey = `${initialWorkspace.slug || ''}:${buyerCountry}`;
  useEffect(() => {
    if (!liveCommerce) return undefined;
    let stopped = false;
    setCatalogState({ status: 'loading', key: catalogKey, catalog: null, error: '' });
    if (!isFirebaseConfigured() || !initialWorkspace.slug) {
      setCatalogState({ status: 'error', key: catalogKey, catalog: null,
        error: 'The business checkout is unavailable. Please try again later.' });
      return undefined;
    }
    firebaseCallables.getPublicCommerceContext({ slug: initialWorkspace.slug, countryCode: buyerCountry })
      .then((catalog) => { if (!stopped) setCatalogState({ status: 'ready', key: catalogKey, catalog, error: '' }); })
      .catch((error) => { if (!stopped) setCatalogState({ status: 'error', key: catalogKey, catalog: null,
        error: error?.message || 'Could not load the current business catalog.' }); });
    return () => { stopped = true; };
  }, [liveCommerce, catalogKey, quoteRefresh]);

  useEffect(() => {
    if (!liveCommerce || !workspace.slug) return;
    const saved = readCheckoutRecovery(window.sessionStorage, workspace.slug);
    if (!saved) return;
    setPaymentRecovery(saved);
    if (cart.items.length && !readCheckoutReturnParams().paid && !readCheckoutReturnParams().cancelled) return;
    setResult(saved.result);
    setStep('success');
    setSubmitNote('Your confirmed request is saved. Continue payment below, or check its status in your bookings and orders.');
  }, [liveCommerce, workspace.slug]);

  useEffect(() => {
    if (!paymentOptions.length || paymentOptions.some((option) => option.gatewayType === paymentMethod)) return;
    setPaymentMethod(paymentOptions[0].gatewayType);
  }, [paymentOptions, paymentMethod]);

  useEffect(() => {
    if (!analyticsEnabled || step !== 'details') return;
    const ownerId = workspace?.ownerId;
    const slug = workspace?.slug;
    if (!ownerId || !slug) return;
    void trackAnalyticsEvent('begin_checkout', { slug, ownerId }, {
      valueCents: cart.subtotalCents
    });
    void upsertAnalyticsCart(
      { slug, ownerId },
      {
        items: cart.items,
        status: 'checkout',
        valueCents: cart.subtotalCents
      }
    );
  }, [step, analyticsEnabled, workspace?.ownerId, workspace?.slug]);

  useEffect(() => {
    if (lockedPreview || testMode) return undefined;
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
          kind: 'error',
          note: 'This payment return could not be verified. Check your bookings and orders or contact the business before paying again.'
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
        if (confirmed?.paid) {
          clearCheckoutRecovery(window.sessionStorage, workspace.slug);
          setPaymentRecovery(null);
        }
        setReturnState({
          kind: confirmed?.inventoryException ? 'exception' : confirmed?.paid ? 'paid' : 'pending',
          note: confirmed?.inventoryException
            ? 'Payment was received after the stock reservation ended. The business must review availability and fulfilment.'
            : confirmed?.reason || ''
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
  }, [workspace.slug, lockedPreview, testMode]);

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
  const marketsConfigured = Array.isArray(workspace.website?.markets);
  const delivery = (() => {
    if (liveCommerce) return { amountInCents: quoteState.quote?.shippingAmountInCents || 0, profileIds: [], error: '' };
    if (!marketsConfigured) return { amountInCents: 0, profileIds: [], error: '' };
    try {
      const market = resolveMarket(workspace.website, buyerCountry);
      if (!buyerCountry || !market?.enabled) throw new Error('Choose a supported country before checkout.');
      if (cart.serviceItems.some((item) => !catalogAllowed(market, 'service', item.serviceId))) throw new Error('A service in your cart is not available in this market.');
      return { ...shippingQuote(workspace.website, buyerCountry, cart.productItems, cart.productItems.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0)), error: '' };
    } catch (error) { return { amountInCents: 0, profileIds: [], error: error.message }; }
  })();
  const onlineRestriction = onlineCheckoutRestriction(cart.items, paymentMethod);
  const quoteInput = checkoutQuoteInput({ slug: workspace.slug, items: cart.items, details, countryCode: buyerCountry, paymentMethod });
  const quoteSignature = JSON.stringify(quoteInput);
  const detailsReady = Boolean(details.clientName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.clientEmail.trim()) &&
    (!marketsConfigured || buyerCountry) &&
    (!marketsConfigured || !cart.hasProducts || details.shippingAddress.trim()) && cart.allServicesSlotted);
  const currentQuote = quoteState.status === 'ready' && quoteState.signature === quoteSignature ? quoteState.quote : null;
  useEffect(() => {
    if (!liveCommerce || step !== 'details') return undefined;
    let stopped = false;
    setQuoteState({ status: 'idle', signature: quoteSignature, quote: null, error: '' });
    if (!detailsReady || onlineRestriction || catalogState.status !== 'ready' || catalogState.key !== catalogKey) return undefined;
    setQuoteState({ status: 'loading', signature: quoteSignature, quote: null, error: '' });
    const timer = window.setTimeout(() => {
      quotePublicCart(quoteInput, firebaseCallables)
        .then((quote) => { if (!stopped) setQuoteState({ status: 'ready', signature: quoteSignature, quote, error: '' }); })
        .catch((error) => { if (!stopped) setQuoteState({ status: 'error', signature: quoteSignature, quote: null,
          error: error?.message || 'Could not confirm the checkout total.' }); });
    }, 300);
    return () => { stopped = true; window.clearTimeout(timer); };
  }, [liveCommerce, step, quoteSignature, detailsReady, onlineRestriction, catalogState.status, catalogState.key, catalogKey, quoteRefresh]);
  const canContinueDetails = cart.items.length > 0 && cart.allServicesSlotted;
  const canSubmit =
    cart.items.length > 0 &&
    details.clientName.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.clientEmail.trim()) &&
    !delivery.error &&
    (!marketsConfigured || !cart.hasProducts || details.shippingAddress.trim()) &&
    cart.allServicesSlotted &&
    (!liveCommerce || (catalogState.status === 'ready' && catalogState.key === catalogKey && currentQuote &&
      paymentOptions.some((option) => option.gatewayType === paymentMethod))) &&
    (!onlineRestriction || testMode) &&
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
      clientPhone: workspace.features?.collectClientPhone === false ? '' : details.clientPhone.trim(),
      clientNote: workspace.features?.collectClientNotes === false ? '' : details.clientNote.trim(),
      clientCountry: buyerCountry.trim(),
      clientBirthday: details.birthday.trim(),
      clientUid: isClient ? profile?.uid || user?.uid || '' : '',
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

    if (liveCommerce) {
      const quote = currentQuote?.serviceQuotes.find((row) => row.lineKey === item.lineKey);
      Object.assign(payload, quoteRevisionPayload(quote), { amountInCents: quote.amountInCents, currency: quote.currency });
    }

    if (liveCommerce) {
      if (!isFirebaseConfigured() || !workspace.slug) throw new Error('The business checkout is unavailable.');
      try {
        const signature = JSON.stringify({ slug: workspace.slug, ...payload });
        if (!bookingRequests.current.has(signature)) bookingRequests.current.set(signature, crypto.randomUUID());
        if (!requestAttribution.current.has(signature)) requestAttribution.current.set(signature,
          analyticsEnabled ? await getAnalyticsAttribution({ ownerId: workspace.ownerId, slug: workspace.slug }) : {});
        const remote = await firebaseCallables.createPublicBookingRequest({
          slug: workspace.slug,
          requestId: bookingRequests.current.get(signature),
          ...payload,
          ...requestAttribution.current.get(signature)
        });
        if (!remote?.id) throw new Error('The booking service returned no confirmation.');
        return { ...payload, ...remote };
      } catch (failure) {
        throw new Error(failure.message || 'The booking could not be confirmed. Please try again.');
      }
    }
    if (sameOwnerContext) {
      return ctx.addBooking(payload);
    }
    return { ...payload, id: `bk-local-${Date.now()}`, localOnly: true };
  };

  const submitProducts = async (productItems) => {
    if (!productItems.length) return null;
    const client = {
      ...details,
      clientPhone: workspace.features?.collectClientPhone === false ? '' : details.clientPhone,
      clientNote: workspace.features?.collectClientNotes === false ? '' : details.clientNote,
      country: buyerCountry,
      clientUid: isClient ? profile?.uid || user?.uid || '' : ''
    };
    const signature = JSON.stringify({ slug: workspace.slug, items: productItems, client, paymentMethod });
    if (!bookingRequests.current.has(signature)) bookingRequests.current.set(signature, crypto.randomUUID());

    if (liveCommerce) {
      if (!isFirebaseConfigured() || !workspace.slug) throw new Error('The business checkout is unavailable.');
      try {
        if (!requestAttribution.current.has(signature)) requestAttribution.current.set(signature,
          analyticsEnabled ? await getAnalyticsAttribution({ ownerId: workspace.ownerId, slug: workspace.slug }) : {});
        const remote = await firebaseCallables.createPublicProductOrder({
          requestId: bookingRequests.current.get(signature),
          slug: workspace.slug,
          items: productItems,
          client,
          paymentMethod,
          ...quoteRevisionPayload(currentQuote?.productQuote),
          ...requestAttribution.current.get(signature)
        });
        if (remote?.id) return remote;
        throw new Error('The order service returned no confirmation.');
      } catch (error) {
        throw new Error(error.message || 'Your order could not be placed. Please try again.');
      }
    }

    if (sameOwnerContext) {
      return ctx.placeProductOrder({
        requestId: bookingRequests.current.get(signature),
        items: productItems,
        client,
        shipping: delivery,
        paymentMethod
      });
    }

    return createPublicProductOrder({
      workspaceSlug: workspace.slug,
      workspaceName: workspaceName || workspace.brandName,
      items: productItems,
      client,
      shipping: delivery,
      currency: workspace.currency || 'R',
      paymentMethod
    });
  };

  const continuePayment = async (recovery = paymentRecovery) => {
    if (!liveCommerce || !recovery?.sourceId || submitting) return;
    setSubmitting(true);
    setSubmitNote('Opening secure payment…');
    try {
      const { successUrl, cancelUrl } = buildReturnUrls(workspace.slug, recovery.sourceType === 'order' ? 'buy' : 'book');
      const initiated = await firebaseCallables.initiatePayment({
        appId: APP_ID, slug: workspace.slug, gatewayType: recovery.paymentMethod,
        sourceType: recovery.sourceType, sourceId: recovery.sourceId,
        requestId: `checkout-${recovery.sourceId}`, successUrl, cancelUrl
      });
      if (!initiated?.redirectUrl) throw new Error(initiated?.reason || 'Payment could not start. Your confirmed request remains saved.');
      window.location.assign(initiated.redirectUrl);
    } catch (error) {
      setSubmitNote(`${error?.message || 'Payment could not start.'} Your request is saved. Retry payment below without placing another request.`);
    } finally { setSubmitting(false); }
  };

  const submit = async () => {
    if (lockedPreview) return;
    if (!canSubmit) return;
    if (testMode) {
      setResult(buildTestCheckoutResult(cart.items, details));
      setSubmitNote('Test checkout completed. No order, booking or payment was created.');
      setStep('success');
      return;
    }
    if (onlineRestriction) { setSubmitNote(onlineRestriction); return; }
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
        } catch (error) {
          notes.push(error?.message || `Could not request ${item.name}.`);
        }
      }

      const productsOk = !hadProducts || Boolean(order);
      const servicesOk = !hadServices || bookingsCreated.length === serviceSnapshot.length;
      if (liveCommerce && (!productsOk || !servicesOk)) setQuoteRefresh((value) => value + 1);

      if (productsOk && servicesOk) {
        const confirmedResult = { order, bookings: bookingsCreated };
        setResult(confirmedResult);
        setStep('success');
        cart.clear();

        const ownerId = workspace?.ownerId;
        const slug = workspace?.slug;
        if (analyticsEnabled && ownerId && slug) {
          const valueCents = currentQuote?.amountInCents ?? productSnapshot.reduce(
            (sum, item) => sum + (item.unitPriceCents || 0) * (item.quantity || 0),
            0
          ) + serviceSnapshot.reduce(
            (sum, item) => sum + (item.unitPriceCents || 0) * (item.quantity || 0),
            0
          );
          void trackAnalyticsEvent('purchase', { slug, ownerId }, {
            valueCents,
            orderId: order?.id || '',
            bookingCount: bookingsCreated.length
          });
          if (bookingsCreated.length) {
            void trackAnalyticsEvent('booking_confirmed', { slug, ownerId }, {
              bookingCount: bookingsCreated.length
            });
          }
          void upsertAnalyticsCart(
            { slug, ownerId },
            { items: [], status: 'converted', valueCents }
          );
        }

        if (chargeNow && liveCommerce) {
          const firstBooking = bookingsCreated[0];
          const recovery = {
            slug: workspace.slug, paymentMethod, result: confirmedResult,
            sourceType: order ? 'order' : 'booking', sourceId: order?.id || firstBooking?.id,
            serviceId: firstBooking?.serviceId, serviceName: firstBooking?.serviceName
          };
          saveCheckoutRecovery(window.sessionStorage, recovery);
          setPaymentRecovery(recovery);
          if (recovery.sourceId) {
            try {
              const { successUrl, cancelUrl } = buildReturnUrls(workspace.slug, hadProducts ? 'buy' : 'book');
              const initiated = await firebaseCallables.initiatePayment({
                appId: APP_ID,
                slug: workspace.slug,
                gatewayType: paymentMethod,
                sourceType: recovery.sourceType,
                sourceId: recovery.sourceId,
                requestId: `checkout-${recovery.sourceId}`,
                successUrl,
                cancelUrl
              });
              if (initiated?.redirectUrl) {
                window.location.assign(initiated.redirectUrl);
                return;
              }
              notes.push(
                initiated?.reason ||
                  'Payment could not start. Your confirmed request is saved. Retry payment below.'
              );
            } catch (error) {
              notes.push(
                error?.message ||
                  'Payment could not start. Your confirmed request is saved. Retry payment below.'
              );
            }
          }
        }
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
    } catch (error) {
      setSubmitNote(error?.message || 'Your request could not be submitted. Please try again.');
      if (liveCommerce) setQuoteRefresh((value) => value + 1);
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
                : returnState.kind === 'paid'
                  ? 'Payment received'
                  : returnState.kind === 'pending'
                    ? 'Payment pending'
                    : 'Payment status'}
          </h2>
          <p className="bb-checkout-flow__lede">
            {returnState.kind === 'cancelled'
              ? 'Payment was cancelled. Your confirmed request remains saved. Check its status before retrying.'
              : returnState.kind === 'confirming'
                ? 'Checking with the payment provider…'
                : returnState.kind === 'paid'
                  ? `${workspaceName || workspace.brandName} will see this as paid.`
                  : returnState.note || 'Thanks — the studio will confirm shortly.'}
          </p>
        </div>
        {paymentRecovery && returnState.kind !== 'paid' && returnState.kind !== 'confirming' ? (
          <Button action="continue" variant="secondary" type="button" disabled={submitting} onClick={() => { setReturnState(null); setStep('success'); }}>
            View saved request
          </Button>
        ) : null}
        <Button action="continue" variant="primary"
          type="button"
          className="bb-checkout-cta"
          onClick={() => {
            setReturnState(null);
            onBack?.();
          }}
        >
          Continue browsing
          <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
        </Button>
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
    const calendarUrl = firstBooking?.status === 'confirmed'
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
    const resultReference = activeResult.order?.id || firstBooking?.id || activeResult.reference;
    const reference = testMode ? resultReference : formatCheckoutReference(resultReference);

    return (
      <div className="bb-checkout-flow bb-checkout-success">
        <div className="bb-checkout-success__mark" aria-hidden="true">
          <span className="bb-checkout-success__mark-core">
            <Check size={22} strokeWidth={2.6} />
          </span>
        </div>
        <div className="bb-checkout-flow__intro bb-checkout-flow__intro--center">
          <h2 className="bb-checkout-flow__title">
            {testMode ? 'Test checkout complete.' : activeResult.partial ? 'Partly submitted.' : successCopy.successTitle}
          </h2>
          <p className="bb-checkout-flow__lede">{testMode ? 'Your website connection passed this checkout preview.' : successCopy.successLede}</p>
          {submitNote ? <p className="bb-checkout-flow__lede">{submitNote}</p> : null}
        </div>

        {!testMode && paymentRecovery?.sourceId === resultReference ? (
          <Button action="continue" variant="primary" type="button" className="bb-checkout-cta"
            disabled={submitting} busy={submitting} busyLabel="Opening payment…" onClick={() => continuePayment()}>
            Continue secure payment
          </Button>
        ) : null}

        <div className="bb-checkout-success__cards">
          <article className="bb-checkout-success__card">
            <p className="bb-checkout-success__card-label">
              <CreditCard size={15} strokeWidth={2} aria-hidden="true" />
              Reference
            </p>
            <p className="bb-checkout-success__card-value">{reference}</p>
            <p className="bb-checkout-success__card-body">
              {testMode ? 'Preview reference only.' : 'Keep this for updates with the business.'}
            </p>
          </article>
          <article className="bb-checkout-success__card">
            <p className="bb-checkout-success__card-title">{testMode ? 'Connected to Book & Buy' : successCopy.processTitle}</p>
            <p className="bb-checkout-success__card-body">{testMode ? 'Product options, booking times and customer details use the same checkout rules as your profile.' : successCopy.processBody}</p>
          </article>
        </div>

        {!testMode && <div className="bb-checkout-companion">
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
            <Button action="orders" variant="secondary"
              type="button"
              className="bb-checkout-companion__btn bb-checkout-companion__btn--portal"
              onClick={() => navigate('/portal')}
            >
              My bookings & orders
              <ArrowUpRight size={14} strokeWidth={2.4} aria-hidden="true" />
            </Button>
            <Button action="download" variant="primary"
              type="button"
              className="bb-checkout-companion__btn bb-checkout-companion__btn--app"
              onClick={() => navigate('/portal?install=1')}
            >
              Add app
              <Download size={14} strokeWidth={2.4} aria-hidden="true" />
            </Button>
          </div>
        </div>}

        <div className="bb-checkout-secondary">
          {calendarUrl ? (
            <Button as="a" action="calendar" className="bb-ghost-btn" href={calendarUrl} target="_blank" rel="noreferrer">
              Add to Google Calendar
            </Button>
          ) : null}
          {!lockedPreview ? (
            <Button action="continue" variant="primary"
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
                  shippingAddress: '',
                  birthday: '',
                  emailUpdates: true
                });
                setStep('review');
                onBack?.();
              }}
            >
              Continue browsing
            </Button>
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
        <Button action="continue" variant="primary" type="button" className="bb-checkout-cta" onClick={onBack}>
          Continue browsing
          <ChevronRight size={16} strokeWidth={2.4} aria-hidden="true" />
        </Button>
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
            {workspace.features?.collectClientPhone !== false ? <CheckoutField label="Mobile Number" optional>
              <input
                value={details.clientPhone}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, clientPhone: event.target.value }))
                }
                autoComplete="tel"
                inputMode="tel"
              />
            </CheckoutField> : null}
          </div>

          <div className="bb-checkout-form__row">
            <CheckoutField label="Email Address">
              <input
                type="email"
                required
                value={details.clientEmail}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, clientEmail: event.target.value }))
                }
                autoComplete="email"
              />
            </CheckoutField>
            <CheckoutField label="Country / Region" optional={!marketsConfigured}>
              {marketsConfigured ? workspace.website?.buyerCountryCode ? <><input readOnly value={MARKET_COUNTRIES.find((country) => country.code === buyerCountry)?.label || buyerCountry} /><small className="bb-muted">Matches your shopping country. Change it using the country selector above.</small></> : <select value={buyerCountry} onChange={(event) => setDetails((prev) => ({ ...prev, country: event.target.value }))}><option value="">Choose a country</option>{MARKET_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}</select> : <input
                value={details.country}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, country: event.target.value }))
                }
                placeholder="South Africa"
                autoComplete="country-name"
              />}
            </CheckoutField>
          </div>

          {marketsConfigured && cart.hasProducts && <div className="bb-checkout-form__row bb-checkout-form__row--single"><CheckoutField label="Delivery address"><textarea rows={3} autoComplete="street-address" placeholder="Street address, city, province/state and postal code" value={details.shippingAddress} onChange={(event) => setDetails((prev) => ({ ...prev, shippingAddress: event.target.value }))} /></CheckoutField></div>}
          {delivery.error && <p role="alert" className="bb-muted">{delivery.error}</p>}
          {workspace.features?.collectClientNotes !== false ? <div className="bb-checkout-form__row bb-checkout-form__row--single">
            <CheckoutField label={copy.noteLabel} optional>
              <textarea
                rows={3}
                value={details.clientNote}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, clientNote: event.target.value }))
                }
              />
            </CheckoutField>
          </div> : null}

          <div className="bb-checkout-form__row bb-checkout-form__row--half">
            <CheckoutField label="Birthday" optional>
              <input
                type="date"
                value={details.birthday}
                onChange={(event) =>
                  setDetails((prev) => ({ ...prev, birthday: event.target.value }))
                }
              />
              <small className="bb-muted">Optional profile information. It is not required to place your request.</small>
            </CheckoutField>
          </div>

          <div className="bb-checkout-form__row">
            <button
              type="button"
              className={`bb-checkout-tile${details.emailUpdates ? ' is-checked' : ''}`}
              aria-pressed={details.emailUpdates}
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
              {paymentOptions.find((option) => option.gatewayType === paymentMethod)?.mode === 'test' && chargeNow ? (
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

          {liveCommerce ? (
            <section className="bb-checkout-summary" aria-label="Current checkout quote" aria-live="polite">
              <h3 className="bb-checkout-summary__title">Review your current total</h3>
              {catalogState.error ? <p role="alert">{catalogState.error}</p>
                : onlineRestriction ? <p role="alert">{onlineRestriction}</p>
                  : !paymentOptions.length && catalogState.status === 'ready' ? <p role="alert">The business has no payment option available for checkout.</p>
                    : quoteState.status === 'error' ? <p role="alert">{quoteState.error}</p>
                      : !currentQuote ? <p>{detailsReady ? 'Checking current prices, delivery and booking availability…' : 'Complete your details to check the current total and availability.'}</p>
                        : <>
                          {currentQuote.productQuote?.items.map((item) => (
                            <div className="bb-checkout-summary__row" key={`${item.productId}:${item.variantId}`}>
                              <p>{item.name}{item.variantLabel ? ` · ${item.variantLabel}` : ''} × {item.quantity}</p>
                              <p>{formatCents(item.lineTotalCents, currentQuote.currency)}</p>
                            </div>
                          ))}
                          {currentQuote.serviceQuotes.map((quote) => (
                            <div className="bb-checkout-summary__row" key={quote.lineKey}>
                              <p>{cart.items.find((item) => item.lineKey === quote.lineKey)?.name}</p>
                              <p>{quote.quoteBased ? 'Price confirmed by the business after consultation' : formatCents(quote.amountInCents, currentQuote.currency)}</p>
                            </div>
                          ))}
                          {currentQuote.productQuote ? <div className="bb-checkout-summary__row"><p>Delivery</p><p>{formatCents(currentQuote.shippingAmountInCents, currentQuote.currency)}</p></div> : null}
                          <div className="bb-checkout-summary__total"><span>Total:</span><span>{formatCents(currentQuote.amountInCents, currentQuote.currency)}</span></div>
                          <p className="bb-muted">{chargeNow ? 'Review this total before continuing to secure payment.' : 'Review this total before placing your request. No payment is taken now.'}</p>
                        </>}
              {quoteState.status === 'error' || catalogState.status === 'error' ? <Button action="refresh" variant="secondary" type="button" onClick={() => setQuoteRefresh((value) => value + 1)}>Refresh checkout</Button> : null}
            </section>
          ) : null}
          {paymentRecovery ? <p className="bb-muted">You also have a saved payment request. <button type="button" className="bb-ghost-btn" onClick={() => { setResult(paymentRecovery.result); setStep('success'); }}>View saved request</button></p> : null}
          {submitNote ? <p role="status" className="bb-checkout-flow__lede">{submitNote}</p> : null}

          {!lockedPreview ? (
            <Button action="back" variant="secondary"
              type="button"
              className="bb-checkout-flow__back"
              onClick={() => setStep('review')}
            >
              <ChevronLeft size={14} strokeWidth={2.4} aria-hidden="true" />
              Back to review
            </Button>
          ) : null}

          <Button action="continue" variant="primary" type="submit" className="bb-checkout-cta" disabled={!canSubmit || lockedPreview} busy={submitting} busyLabel="Submitting…">
            {copy.detailsCta}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="bb-checkout-flow">
      <Button action="edit" variant="secondary" type="button" className="bb-checkout-flow__back" onClick={onBack}>
        <ChevronLeft size={14} strokeWidth={2.4} aria-hidden="true" />
        Edit selection
      </Button>

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
          <span>{liveCommerce ? 'Estimated items:' : 'Total:'}</span>
          <span>{formatCents(cart.subtotalCents + delivery.amountInCents, cart.currency)}</span>
        </div>
        {liveCommerce ? <p className="bb-muted">Current prices, delivery and availability are confirmed after you complete your details.</p> : marketsConfigured && cart.hasProducts && <div className="bb-checkout-summary__row"><p>{delivery.profileIds.length ? delivery.profileIds.map((id) => shippingDisplayName(workspace.website.shippingProfiles?.find((profile) => profile.id === id))).join(' + ') : 'Shipping'}</p><p>{delivery.error ? 'Unavailable' : delivery.amountInCents === 0 ? 'Free' : formatCents(delivery.amountInCents, cart.currency)}</p></div>}
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
                    {liveCommerce ? 'Seat availability is checked before you submit.' : openSpots > 0
                      ? `${openSpots} open spot${openSpots === 1 ? '' : 's'} remaining`
                      : 'This programme is currently full — you can still request a seat.'}
                  </p>
                </div>
              );
            }
            return (
              <div key={`slot-${item.lineKey}`} className="bb-public-product-card p-4 grid gap-3">
                  <strong className="bb-cart-time-action-title">{item.name}</strong>
                {!item.dateKey || !item.time ? <p className="bb-muted m-0 text-sm">Choose an available date and time to continue.</p> : null}
                {!lockedPreview ? (
                  <Button action="calendar" variant={item.dateKey && item.time ? 'secondary' : 'primary'}
                    type="button"
                    className="bb-ghost-btn justify-self-start"
                    onClick={() => setSlotEditItem(item)}
                  >
                    {item.dateKey && item.time ? 'Change date & time' : 'Pick date & time'}
                  </Button>
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
                <Button action="remove" variant="destructive"
                  type="button"
                  className="bb-ghost-btn px-3 py-1 text-xs"
                  onClick={() => cart.removeItem(item.lineKey)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))
        : null}

      <Button action="continue" variant="primary"
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
      </Button>

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
        publicMode={liveCommerce}
        slug={workspace.slug}
        countryCode={buyerCountry}
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
