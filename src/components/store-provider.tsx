"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartLine = {
  id: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  size: string;
  qty: number;
  availableStock?: number;
  inStock?: boolean;
};

type DatabaseProduct = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string;
  availableStock: number;
  inStock: boolean;
};

type StoreContextType = {
  cart: CartLine[];
  add: (p: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  productsLoaded: boolean;
};

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<DatabaseProduct[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("milano-cart");

      if (raw) {
        const savedCart: CartLine[] = JSON.parse(raw);
        setCart(savedCart);
      }
    } catch {
      localStorage.removeItem("milano-cart");
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Could not load products.");
        }

        const data: DatabaseProduct[] = await response.json();

        if (!active) return;

        setProducts(data);

        setCart((current) =>
          current.map((item) => {
            const product = data.find(
              (p) => p.slug === item.slug || p.id === item.id
            );

            if (!product) return item;

            return {
              ...item,
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: product.price,
              image: product.image,
              size: product.size,
              availableStock: product.availableStock,
              inStock: product.inStock,
            };
          })
        );
      } catch (error) {
        console.error("Product synchronization failed:", error);
      } finally {
        if (active) setProductsLoaded(true);
      }
    }

    loadProducts();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("milano-cart", JSON.stringify(cart));
    } catch (error) {
      console.error("Could not save cart:", error);
    }
  }, [cart]);

  const add = useCallback(
    (p: Omit<CartLine, "qty">, qty = 1) => {
      const product = products.find(
        (item) => item.id === p.id || item.slug === p.slug
      );

      if (productsLoaded && !product) return;
      if (product && (!product.inStock || product.availableStock < 1)) return;

      const availableStock = product?.availableStock;
      const safeQty = Math.max(
        1,
        Math.min(99, Math.floor(qty), availableStock ?? 99)
      );

      const line: Omit<CartLine, "qty"> = product
        ? {
            id: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            image: product.image,
            size: product.size,
            availableStock: product.availableStock,
            inStock: product.inStock,
          }
        : p;

      setCart((old) => {
        const found = old.find((item) => item.id === line.id);

        if (found) {
          return old.map((item) => {
            if (item.id !== line.id) return item;

            const maximum = availableStock ?? 99;

            return {
              ...item,
              qty: Math.min(maximum, item.qty + safeQty),
            };
          });
        }

        return [...old, { ...line, qty: safeQty }];
      });
    },
    [products, productsLoaded]
  );

  const setQty = useCallback(
    (id: string, qty: number) => {
      const product = products.find((item) => item.id === id);
      const maximum = product?.availableStock ?? 99;

      setCart((old) =>
        old.map((item) =>
          item.id === id
            ? {
                ...item,
                qty: Math.max(1, Math.min(99, maximum, Math.floor(qty))),
              }
            : item
        )
      );
    },
    [products]
  );

  const remove = useCallback(
    (id: string) => setCart((old) => old.filter((item) => item.id !== id)),
    []
  );

  const clear = useCallback(() => setCart([]), []);

  const value = useMemo<StoreContextType>(
    () => ({
      cart,
      add,
      setQty,
      remove,
      clear,
      productsLoaded,
      count: cart.reduce((total, item) => total + item.qty, 0),
      subtotal: cart.reduce(
        (total, item) => total + item.price * item.qty,
        0
      ),
    }),
    [cart, add, setQty, remove, clear, productsLoaded]
  );

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const value = useContext(StoreContext);

  if (!value) {
    throw new Error("StoreProvider missing");
  }

  return value;
}