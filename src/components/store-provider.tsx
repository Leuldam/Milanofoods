"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  calculatePackageTotalCents,
  calculateUnitPriceCents,
  decimalToCents,
  minimumPackageQuantity,
} from "@/lib/product-pricing";

export type PackagingOption = {
  id: string;
  label: string;
  unitsPerPackage: number;
};

export type CartLine = {
  id: string;
  sku?: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string;
  flavor?: string | null;
  variantType?: string | null;
  qty: number;
  packagingOptionId?: string | null;
  packagingLabel?: string;
  unitsPerPackage?: number;
  packagingOptions?: PackagingOption[];
  minimumOrderQuantity?: number;
  promotionEnabled?: boolean;
  promotionDiscountPercent?: string | number | null;
  availableStock?: number;
  inStock?: boolean;
};

type DatabaseProduct = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  price: number;
  image: string;
  size: string;
  flavor: string | null;
  variantType: string | null;
  minimumOrderQuantity: number;
  promotionEnabled: boolean;
  promotionDiscountPercent: string | null;
  availableStock: number;
  inStock: boolean;
  packagingOptions: PackagingOption[];
};

type StoreContextType = {
  cart: CartLine[];
  add: (p: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  setPackaging: (id: string, packagingOptionId: string | null) => void;
  remove: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
  productsLoaded: boolean;
};

const StoreContext = createContext<StoreContextType | null>(null);

function lineId(slug: string, packagingOptionId: string | null | undefined) {
  return `${slug}::${packagingOptionId || "single"}`;
}

function itemUnits(item: CartLine) {
  return (item.unitsPerPackage || 1) * item.qty;
}

function minimumPackages(item: CartLine, unitsPerPackage = item.unitsPerPackage || 1) {
  return minimumPackageQuantity(item.minimumOrderQuantity || 1, unitsPerPackage);
}

function packageUnitPriceCents(item: CartLine) {
  const baseCents = decimalToCents(item.price);
  return calculateUnitPriceCents(
    baseCents,
    item.promotionEnabled === true,
    item.promotionDiscountPercent ?? null,
  );
}

function lineTotalCents(item: CartLine) {
  return calculatePackageTotalCents(
    packageUnitPriceCents(item),
    item.unitsPerPackage || 1,
    item.qty,
  );
}

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
        setCart(savedCart.map((item) => ({
          ...item,
          unitsPerPackage: item.unitsPerPackage || 1,
          packagingLabel: item.packagingLabel || "Single unit",
          minimumOrderQuantity: item.minimumOrderQuantity || 1,
        })));
      }
    } catch {
      localStorage.removeItem("milano-cart");
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) throw new Error("Could not load products.");
        const data: DatabaseProduct[] = await response.json();
        if (!active) return;

        setProducts(data);
        setCart((current) => current.map((item) => {
          const product = data.find((candidate) => candidate.slug === item.slug);
          if (!product) return { ...item, inStock: false };

          const packaging = item.packagingOptionId
            ? product.packagingOptions.find((option) => option.id === item.packagingOptionId)
            : null;
          const packageStillAvailable = !item.packagingOptionId || Boolean(packaging);
          const unitsPerPackage = packaging?.unitsPerPackage ?? (item.packagingOptionId ? item.unitsPerPackage || 1 : 1);
          const packagingLabel = packaging?.label ?? (item.packagingOptionId ? item.packagingLabel : "Single unit");
          const key = lineId(product.slug, item.packagingOptionId);
          return {
            ...item,
            id: key,
            slug: product.slug,
            sku: product.sku,
            name: product.name,
            price: product.price,
            image: product.image,
            size: product.size,
            flavor: product.flavor,
            variantType: product.variantType,
            unitsPerPackage,
            packagingLabel,
            packagingOptions: product.packagingOptions,
            minimumOrderQuantity: product.minimumOrderQuantity,
            promotionEnabled: product.promotionEnabled,
            promotionDiscountPercent: product.promotionDiscountPercent,
            availableStock: product.availableStock,
            inStock: productStillAvailable(product, unitsPerPackage, item.qty) && packageStillAvailable,
          };
        }));
      } catch (error) {
        console.error("Product synchronization failed:", error);
      } finally {
        if (active) setProductsLoaded(true);
      }
    }

    void loadProducts();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("milano-cart", JSON.stringify(cart));
    } catch (error) {
      console.error("Could not save cart:", error);
    }
  }, [cart]);

  const add = useCallback(
    (input: Omit<CartLine, "qty">, quantity = 1) => {
      const product = products.find((candidate) => candidate.slug === input.slug || candidate.id === input.id);
      if (productsLoaded && !product) return;

      const option = product && input.packagingOptionId
        ? product.packagingOptions.find((candidate) => candidate.id === input.packagingOptionId)
        : null;
      if (input.packagingOptionId && !option) return;

      const unitsPerPackage = option?.unitsPerPackage ?? 1;
      const minimumOrderQuantity = product?.minimumOrderQuantity ?? input.minimumOrderQuantity ?? 1;
      const availableStock = product?.availableStock ?? input.availableStock ?? 99;
      const minPackages = minimumPackageQuantity(minimumOrderQuantity, unitsPerPackage);
      if (product && !product.inStock) return;
      const requestedQuantity = Number.isFinite(quantity) ? Math.max(minPackages, Math.floor(quantity)) : minPackages;
      const line: Omit<CartLine, "qty"> = {
        ...input,
        id: lineId(product?.slug || input.slug, option?.id || null),
        slug: product?.slug || input.slug,
        sku: product?.sku || input.sku,
        name: product?.name || input.name,
        price: product?.price ?? input.price,
        image: product?.image || input.image,
        size: product?.size ?? input.size,
        flavor: product?.flavor ?? input.flavor,
        variantType: product?.variantType ?? input.variantType,
        packagingOptionId: option?.id || null,
        packagingLabel: option?.label || "Single unit",
        unitsPerPackage,
        packagingOptions: product?.packagingOptions ?? input.packagingOptions,
        minimumOrderQuantity,
        promotionEnabled: product?.promotionEnabled ?? input.promotionEnabled,
        promotionDiscountPercent: product?.promotionDiscountPercent ?? input.promotionDiscountPercent,
        availableStock,
        inStock: true,
      };

      setCart((old) => {
        const found = old.find((item) => item.id === line.id);
        const otherUnits = old
          .filter((item) => item.slug === line.slug && item.id !== line.id)
          .reduce((total, item) => total + itemUnits(item), 0);
        const maxPackages = Math.floor(Math.max(0, availableStock - otherUnits) / unitsPerPackage);
        if (maxPackages < minPackages) return old;
        if (!found) return [...old, { ...line, qty: Math.min(99, maxPackages, requestedQuantity) }];
        return old.map((item) => item.id === line.id
          ? { ...item, qty: Math.min(99, maxPackages, item.qty + requestedQuantity) }
          : item);
      });
    },
    [products, productsLoaded],
  );

  const setQty = useCallback(
    (id: string, quantity: number) => {
      setCart((old) => old.map((item) => {
        if (item.id !== id) return item;
        const unitsPerPackage = item.unitsPerPackage || 1;
        const otherUnits = old
          .filter((line) => line.slug === item.slug && line.id !== id)
          .reduce((total, line) => total + itemUnits(line), 0);
        const maximum = Math.floor(Math.max(0, (item.availableStock ?? 99) - otherUnits) / unitsPerPackage);
        const minimum = minimumPackages(item);
        return {
          ...item,
          qty: Math.max(Math.min(minimum, Math.max(maximum, 1)), Math.min(maximum || 1, 99, Math.floor(quantity))),
          inStock: maximum >= minimum,
        };
      }));
    },
    [],
  );

  const setPackaging = useCallback(
    (id: string, packagingOptionId: string | null) => {
      const item = cart.find((line) => line.id === id);
      const product = item && products.find((candidate) => candidate.slug === item.slug);
      if (!item || !product) return;

      const option = packagingOptionId
        ? product.packagingOptions.find((candidate) => candidate.id === packagingOptionId)
        : null;
      if (packagingOptionId && !option) return;

      const unitsPerPackage = option?.unitsPerPackage ?? 1;
      const availableStock = product.availableStock;
      const minimum = minimumPackageQuantity(product.minimumOrderQuantity, unitsPerPackage);
      const newId = lineId(product.slug, option?.id || null);
      setCart((old) => {
        const existing = old.find((line) => line.id === newId && line.id !== id);
        const otherUnits = old
          .filter((line) => line.slug === product.slug && line.id !== id && line.id !== newId)
          .reduce((total, line) => total + itemUnits(line), 0);
        const freeUnits = Math.max(0, availableStock - otherUnits);
        const maxPackages = Math.floor(freeUnits / unitsPerPackage);
        if (maxPackages < minimum) return old;
        if (existing) {
          return old
            .filter((line) => line.id !== id)
            .map((line) => line.id === newId
              ? { ...line, qty: Math.min(99, maxPackages, line.qty + item.qty), inStock: true }
              : line);
        }
        return old.map((line) => line.id === id
          ? {
              ...line,
              id: newId,
              packagingOptionId: option?.id || null,
              packagingLabel: option?.label || "Single unit",
              unitsPerPackage,
              minimumOrderQuantity: product.minimumOrderQuantity,
              qty: Math.max(minimum, Math.min(99, maxPackages, line.qty)),
              inStock: product.inStock && maxPackages >= minimum,
            }
          : line);
      });
    },
    [cart, products],
  );

  const remove = useCallback((id: string) => setCart((old) => old.filter((item) => item.id !== id)), []);
  const clear = useCallback(() => setCart([]), []);

  const value = useMemo<StoreContextType>(
    () => ({
      cart,
      add,
      setQty,
      setPackaging,
      remove,
      clear,
      productsLoaded,
      count: cart.reduce((total, item) => total + itemUnits(item), 0),
      subtotal: cart.reduce((total, item) => total + lineTotalCents(item), 0) / 100,
    }),
    [cart, add, setQty, setPackaging, remove, clear, productsLoaded],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

function productStillAvailable(product: DatabaseProduct, unitsPerPackage: number, packageQuantity: number) {
  const units = unitsPerPackage * packageQuantity;
  return product.availableStock >= units && units >= (product.minimumOrderQuantity || 1);
}

export function getCartLinePrice(item: CartLine) {
  return packageUnitPriceCents(item) / 100;
}

export function getCartLineTotal(item: CartLine) {
  return lineTotalCents(item) / 100;
}

export function getCartLineUnits(item: CartLine) {
  return itemUnits(item);
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("StoreProvider missing");
  return value;
}
