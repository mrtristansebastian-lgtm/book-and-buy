import { createContext, useContext } from 'react';
import { useCart } from './hooks/useCart';

const PublicCartContext = createContext(null);

export function PublicCartProvider({ children }) {
  const cart = useCart();
  return <PublicCartContext.Provider value={cart}>{children}</PublicCartContext.Provider>;
}

export function usePublicCart() {
  const value = useContext(PublicCartContext);
  if (!value) {
    throw new Error('usePublicCart must be used within PublicCartProvider');
  }
  return value;
}
