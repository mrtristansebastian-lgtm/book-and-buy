import { useMemo, useState } from 'react';
import { getProductUnitPriceCents } from '../../../utils/products';

export function useCart() {
  const [items, setItems] = useState([]);

  const addItem = (product, quantity = 1) => {
    if (!product?.id) return;
    if (product.quoteBased || product.priceType === 'quote') return;
    setItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          imageUrl: product.imageUrls?.[0] || '',
          unitPriceCents: getProductUnitPriceCents(product),
          currency: product.currency || 'R',
          quantity
        }
      ];
    });
  };

  const setQuantity = (productId, quantity) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.max(0, Math.round(quantity)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeItem = (productId) =>
    setItems((prev) => prev.filter((item) => item.productId !== productId));

  const clear = () => setItems([]);

  const totals = useMemo(() => {
    const subtotalCents = items.reduce(
      (sum, item) => sum + item.unitPriceCents * item.quantity,
      0
    );
    return {
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotalCents,
      currency: items[0]?.currency || 'R'
    };
  }, [items]);

  return { items, addItem, setQuantity, removeItem, clear, ...totals };
}
