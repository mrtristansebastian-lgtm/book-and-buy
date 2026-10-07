import { createContext, useContext, useState } from 'react';
import { useCart } from './hooks/useCart';

const PublicCartContext = createContext(null);

export function PublicCartProvider({ children, initialItems = [] }) {
  const cart = useCart(initialItems);
  const [browse, setBrowse] = useState({});
  const updateBrowse = (key, patch) => setBrowse((previous) => ({ ...previous, [key]: { ...previous[key], ...patch } }));
  return <PublicCartContext.Provider value={{ ...cart, browse, updateBrowse }}>{children}</PublicCartContext.Provider>;
}

export function usePublicCart() {
  const value = useContext(PublicCartContext);
  if (!value) {
    throw new Error('usePublicCart must be used within PublicCartProvider');
  }
  return value;
}
