import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CartItem {
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  businessId: string;
  businessName: string;
  image?: string;
  notes?: string;
}

interface OrderCartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
  currentBusinessId: string | null;
}

const OrderCartContext = createContext<OrderCartContextType | undefined>(undefined);

export function OrderCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [currentBusinessId, setCurrentBusinessId] = useState<string | null>(null);

  const addItem = (item: Omit<CartItem, 'quantity'>) => {
    if (currentBusinessId && currentBusinessId !== item.businessId) {
      throw new Error('Solo puedes agregar productos del mismo bar');
    }

    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          i.productId === item.productId
            ? { ...i, quantity: i.quantity + 1 }
            : i
        );
      }
      if (!currentBusinessId) {
        setCurrentBusinessId(item.businessId);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeItem = (productId: string) => {
    setItems((prev) => {
      const newItems = prev.filter((i) => i.productId !== productId);
      if (newItems.length === 0) {
        setCurrentBusinessId(null);
      }
      return newItems;
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity } : i
      )
    );
  };

  const updateNotes = (productId: string, notes: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, notes } : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setCurrentBusinessId(null);
  };

  const getTotal = () => {
    return items.reduce((sum, item) => sum + item.productPrice * item.quantity, 0);
  };

  const getItemCount = () => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  return (
    <OrderCartContext.Provider
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
    </OrderCartContext.Provider>
  );
}

export function useOrderCart() {
  const context = useContext(OrderCartContext);
  if (!context) {
    throw new Error('useOrderCart must be used within OrderCartProvider');
  }
  return context;
}
