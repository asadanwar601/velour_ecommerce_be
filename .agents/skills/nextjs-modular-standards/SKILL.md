---
name: nextjs-modular-standards
description: >-
  Enforces Next.js App Router architectural standards where app/ routes contain zero business logic, and UI components, custom hooks, API services, and Zustand stores are isolated strictly under src/modules/[module_name]/. Use when creating or modifying any Next.js frontend code.
---

# Next.js Modular Architecture Standard

This skill establishes strict standards for the Next.js 15 (React 19, TypeScript) frontend application. All frontend code must adhere to modular isolation, clean App Router boundaries, and the 250 LOC ceiling.

---

## 1. App Router Zero-Logic Rule

> [!IMPORTANT]
> The `app/` directory is strictly for routing, page metadata, dynamic parameter resolution, and layout composition. **Zero business logic, zero inline API fetching, and zero inline state orchestration is permitted inside `app/**/page.tsx` files.**

### Target Pattern for `app/**/page.tsx` (< 50 lines):

```tsx
// app/checkout/page.tsx
import { Metadata } from 'next';
import { CheckoutContainer } from '@/modules/checkout';

export const metadata: Metadata = {
  title: 'Secure Checkout | VELOUR Atelier',
  description: 'Complete your luxury fashion order with complimentary packaging.',
};

interface CheckoutPageProps {
  searchParams: Promise<{ step?: string; coupon?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const resolvedParams = await searchParams;
  return <CheckoutContainer initialStep={resolvedParams.step} initialCoupon={resolvedParams.coupon} />;
}
```

---

## 2. Feature Module Directory Standard (`src/modules/[module_name]/`)

All UI components, business logic, state stores, custom hooks, and API fetchers must live inside domain modules:

```text
src/modules/[module_name]/
├── components/           # Presentational & Compound UI components
│   ├── [ComponentName].tsx
│   └── [SubComponent].tsx
├── hooks/                # Domain-specific React hooks
│   └── use[Feature].ts
├── services/             # Axios API calls, DTO transformers, query endpoints
│   └── [module].api.ts
├── store/                # Domain-scoped Zustand state store
│   └── use[Feature]Store.ts
├── types/                # Domain interfaces, types, and Zod schemas
│   └── [module].types.ts
└── index.ts              # Public API barrel export
```

### Example Domain Modules:
- `src/modules/cart/` -> Cart drawer, persistence, quantities, guest merging.
- `src/modules/checkout/` -> Step transitions, shipping forms, payment tokens.
- `src/modules/products/` -> Product grid, gallery, PDP selectors, size charts.
- `src/modules/auth/` -> Login, registration, OTP modals, Google OAuth, 2FA.
- `src/modules/account/` -> Profile updates, order history, address book, security.
- `src/modules/admin/` -> Inventory management, order fulfillment, coupon engine.

---

## 3. State Management: Modular Zustand Stores

Global state must NOT be stuffed into a single monolithic file (e.g. `lib/store.tsx`). Each domain module maintains its own scoped Zustand store under 150 LOC:

```typescript
// src/modules/cart/store/useCartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CartItem, Product, Coupon } from '../types/cart.types';
import * as cartApi from '../services/cart.api';

interface CartState {
  items: CartItem[];
  coupon: Coupon | null;
  isOpen: boolean;
  isLoading: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (product: Product, size: string, quantity?: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<void>;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      coupon: null,
      isOpen: false,
      isLoading: false,
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      addItem: async (product, size, quantity = 1) => {
        set({ isLoading: true });
        try {
          const updatedCart = await cartApi.addCartItem({ productId: product.id, size, quantity });
          set({ items: updatedCart.items, isLoading: false });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },
      removeItem: async (itemId) => {
        set({ isLoading: true });
        const updatedCart = await cartApi.removeCartItem(itemId);
        set({ items: updatedCart.items, isLoading: false });
      },
      applyCoupon: async (code) => {
        const coupon = await cartApi.validateCoupon(code);
        set({ coupon });
      },
      clearCart: () => set({ items: [], coupon: null }),
    }),
    {
      name: 'velour_cart_storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items, coupon: state.coupon }),
    }
  )
);
```

---

## 4. Hook Encapsulation Pattern

UI components must not contain complex orchestration logic. Encapsulate business flow inside custom hooks:

```typescript
// src/modules/checkout/hooks/useCheckoutFlow.ts
import { useState } from 'react';
import { useCheckoutForm } from './useCheckoutForm';
import { useCartStore } from '@/modules/cart';
import * as checkoutApi from '../services/checkout.api';

export function useCheckoutFlow() {
  const { form, errors, updateField, validate } = useCheckoutForm();
  const { items, coupon, clearCart } = useCartStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const placeOrder = async () => {
    if (!validate()) return null;
    setIsSubmitting(true);
    setOrderError(null);
    try {
      const order = await checkoutApi.executeCheckout({
        ...form,
        items,
        promoCode: coupon?.code,
      });
      clearCart();
      return order;
    } catch (err: any) {
      setOrderError(err.response?.data?.message || 'Checkout failed. Please try again.');
      return null;
    } finally {
      setIsSubmitting(false);
    }
  };

  return { form, errors, updateField, placeOrder, isSubmitting, orderError };
}
```

---

## 5. Performance & Asset Best Practices

1. **Next.js `<Image />` Component**:
   - Always specify `sizes` for responsive images.
   - Use `priority` only on above-the-fold hero banners.
   - Include `blurDataURL` or placeholder for smooth rendering.
2. **Dynamic Imports**:
   - Lazy load heavy modals and admin utilities:
   ```tsx
   const ImageCropperModal = dynamic(() => import('@/modules/admin/components/ImageCropperModal'), {
     ssr: false,
     loading: () => <ModalSkeleton />,
   });
   ```
3. **Selective Rendering**:
   - Keep Server Components at the tree root.
   - Apply `'use client'` only to leaf nodes requiring state, interactivity, or browser APIs.
