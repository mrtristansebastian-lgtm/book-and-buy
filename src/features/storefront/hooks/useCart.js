import { useMemo, useState } from 'react';
import { getProductUnitPriceCents, isVariantPurchasable } from '../../../utils/products';
import {
  formatServiceSessionLabel,
  getServiceUnitPriceCents
} from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';

export const productLineKey = (id, variantId = '') =>
  variantId ? `product:${id}:${variantId}` : `product:${id}:base`;

export const serviceLineKey = (id) => `service:${id}`;

export function useCart(initialItems = []) {
  const [items, setItems] = useState(() =>
    Array.isArray(initialItems) ? initialItems.map((item) => ({ ...item })) : []
  );

  const addItem = (product, quantity = 1, variant = null) => {
    if (!product?.id) return;
    if (product.quoteBased || product.priceType === 'quote') return;
    if (!isVariantPurchasable(product, variant)) return;

    const variantId = variant?.id || '';
    const lineKey = productLineKey(product.id, variantId);
    const unitPriceCents = getProductUnitPriceCents(product, variant);
    const imageUrl =
      variant?.imageUrl || product.imageUrls?.[0] || product.image || '';
    const variantLabel =
      variant?.title ||
      Object.values(variant?.optionValues || {})
        .filter(Boolean)
        .join(' / ') ||
      '';

    setItems((prev) => {
      const existing = prev.find((item) => item.lineKey === lineKey);
      if (existing) {
        return prev.map((item) =>
          item.lineKey === lineKey
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          kind: 'product',
          lineKey,
          productId: product.id,
          variantId,
          variantLabel,
          id: product.id,
          name: variantLabel
            ? `${product.name} · ${variantLabel}`
            : product.name,
          imageUrl,
          unitPriceCents,
          currency: product.currency || 'R',
          quantity
        }
      ];
    });
  };

  const addService = (service, slot = null) => {
    if (!service?.id) return false;
    const lineKey = serviceLineKey(service.id);
    const isSpot = getServiceScheduleType(service) === 'class_session';
    const dateKey = isSpot
      ? service.sessionStartDate || ''
      : String(slot?.dateKey || '').trim();
    const time = isSpot
      ? service.sessionStartTime || ''
      : String(slot?.time || '').trim();

    if (!isSpot && (!dateKey || !time)) return false;

    setItems((prev) => {
      const nextLine = {
        kind: 'service',
        lineKey,
        serviceId: service.id,
        id: service.id,
        name: service.name,
        imageUrl: service.imageUrls?.[0] || service.image || '',
        unitPriceCents: getServiceUnitPriceCents(service),
        currency: service.currency || 'R',
        quantity: 1,
        scheduleType: service.scheduleType,
        isSpot,
        duration: service.duration || '',
        sessionLabel: isSpot ? formatServiceSessionLabel(service) : '',
        sessionStartDate: service.sessionStartDate || '',
        sessionStartTime: service.sessionStartTime || '',
        sessionEndDate: service.sessionEndDate || '',
        sessionEndTime: service.sessionEndTime || '',
        capacity: service.capacity || 1,
        priceLabel: service.priceType === 'quote' ? 'Quote after consult' : '',
        dateKey,
        time
      };
      const existing = prev.find((item) => item.lineKey === lineKey);
      if (existing) {
        return prev.map((item) => (item.lineKey === lineKey ? { ...item, ...nextLine } : item));
      }
      return [...prev, nextLine];
    });
    return true;
  };

  const setQuantity = (lineKeyOrProductId, quantity) => {
    setItems((prev) =>
      prev
        .map((item) => {
          const match =
            item.lineKey === lineKeyOrProductId ||
            (item.kind === 'product' && item.productId === lineKeyOrProductId);
          if (!match) return item;
          if (item.kind === 'service') return item;
          return { ...item, quantity: Math.max(0, Math.round(quantity)) };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const updateServiceSlot = (lineKey, { dateKey = '', time = '' } = {}) => {
    setItems((prev) =>
      prev.map((item) =>
        item.lineKey === lineKey && item.kind === 'service' && !item.isSpot
          ? { ...item, dateKey, time }
          : item
      )
    );
  };

  const removeItem = (lineKeyOrId) =>
    setItems((prev) =>
      prev.filter(
        (item) =>
          item.lineKey !== lineKeyOrId &&
          item.productId !== lineKeyOrId &&
          item.serviceId !== lineKeyOrId
      )
    );

  const clear = () => setItems([]);

  const totals = useMemo(() => {
    const subtotalCents = items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    );
    const serviceItems = items.filter((item) => item.kind === 'service');
    const productItems = items.filter((item) => item.kind === 'product');
    return {
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalCents,
      currency: items[0]?.currency || 'R',
      hasServices: serviceItems.length > 0,
      hasProducts: productItems.length > 0,
      serviceItems,
      productItems,
      allServicesSlotted: serviceItems.every((item) =>
        item.isSpot
          ? Boolean(item.dateKey && item.time)
          : Boolean(item.dateKey && item.time)
      )
    };
  }, [items]);

  return {
    items,
    addItem,
    addService,
    setQuantity,
    updateServiceSlot,
    removeItem,
    clear,
    ...totals
  };
}
