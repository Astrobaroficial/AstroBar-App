import React, { createContext, useContext, useState, ReactNode } from 'react';

export type CartItemType = 'product' | 'promotion';

interface CartItem {
  id: string;
  type: CartItemType;
  name: string;
  price: number;
  quantity: number;
  businessId: string;
  businessName: string;
  image?: string;
  notes?: string;
  // Para promociones
  promotionId?: string;
  originalPrice?: number;
  // Para productos
  productId?: string;
}

interface UnifiedCartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateNotes: (id: string, notes: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  currentBusinessId: string | null;
}

const UnifiedCartContext = createContext<UnifiedCartContextType | undefined>(undefined);

export function UnifiedCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    // Solo permitir productos del mismo bar
    if (currentBusinessId && currentBusinessId !== item.businessId) {
      throw new Error('Solo puedes agregar productos del mismo bar');
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      if (!currentBusinessId) {
        setCurrentBusinessId(item.businessId);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => {
      const newItems = prev.filter((i) => i.id !== id);
      if (newItems.length === 0) {
        setCurrentBusinessId(null);
      }
      return newItems;
    });
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const updateNotes = (id: string, notes: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, notes } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setCurrentBusinessId(null);
  };

  const getTotal = () => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const getItemCount = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <UnifiedCartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        updateNotes,
        clearCart,
        getTotal,
        getItemCount,
        currentBusinessId,
      }}
    >
      {children}
    </UnifiedCartContext.Provider>
  );
}

export function useUnifiedCart() {
  const context = useContext(UnifiedCartContext);
  if (!context) {
    throw new Error('useUnifiedCart must be used within UnifiedCartProvider');
  }
  return context;
}
