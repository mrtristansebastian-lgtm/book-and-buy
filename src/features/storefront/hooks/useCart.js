import { useMemo, useState } from 'react';
import { getProductUnitPriceCents } from '../../../utils/products';
import { getServiceUnitPriceCents } from '../../../utils/services';

export const productLineKey = (id) => `product:${id}`;
export const serviceLineKey = (id) => `service:${id}`;

export function useCart() {
  const [items, setItems] = useState([]);

  const addItem = (product, quantity = 1) => {
    if (!product?.id) return;
    if (product.quoteBased || product.priceType === 'quote') return;
    const lineKey = productLineKey(product.id);
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
          id: product.id,
          name: product.name,
          imageUrl: product.imageUrls?.[0] || product.image || '',
          unitPriceCents: getProductUnitPriceCents(product),
          currency: product.currency || 'R',
          quantity
        }
      ];
    });
  };

  const addService = (service) => {
    if (!service?.id) return;
    const lineKey = serviceLineKey(service.id);
    setItems((prev) => {
      if (prev.some((item) => item.lineKey === lineKey)) return prev;
      return [
        ...prev,
        {
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
          duration: service.duration || '',
          priceLabel: service.priceType === 'quote' ? 'Quote after consult' : '',
          dateKey: '',
          time: ''
        }
      ];
    });
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
        item.lineKey === lineKey && item.kind === 'service'
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
      allServicesSlotted: serviceItems.every((item) => item.dateKey && item.time)
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
