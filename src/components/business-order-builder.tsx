"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ShoppingCart } from "lucide-react";
import { useStore } from "@/components/store-provider";

type PackagingOption = {
  id: string;
  label: string;
  unitsPerPackage: number;
};

type BusinessProduct = {
  id: string;
  slug: string;
  sku: string;
  name: string;
  category: string;
  categorySlug: string;
  image: string;
  size: string;
  flavor: string | null;
  variantType: string | null;
  minimumOrderQuantity: number;
  availableStock: number;
  inStock: boolean;
  packagingOptions: PackagingOption[];
};

const CARTON_SIZE = 12;

export default function BusinessOrderBuilder() {
  const { add, cart, productsLoaded } = useStore();
  const [products, setProducts] = useState<BusinessProduct[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load current business products.");
        const data: BusinessProduct[] = await response.json();
        if (active) setProducts(data);
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load products.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadProducts();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [...new Map(products.map((product) => [product.categorySlug, product.category])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1])),
    [products],
  );

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products
      .filter((product) => product.packagingOptions.some((option) => option.unitsPerPackage === CARTON_SIZE))
      .filter((product) => category === "all" || product.categorySlug === category)
      .filter((product) => !term || [
        product.name,
        product.flavor || "",
        product.variantType || "",
        product.sku,
      ].some((value) => value.toLowerCase().includes(term)))
      .sort((a, b) => {
        const familyOrder = a.category.localeCompare(b.category);
        return familyOrder || (a.flavor || a.name).localeCompare(b.flavor || b.name);
      });
  }, [category, products, search]);

  const selectedProducts = products.filter((product) => (quantities[product.slug] || 0) > 0);
  const selectedCartons = selectedProducts.reduce((total, product) => total + quantities[product.slug], 0);
  const selectedUnits = selectedProducts.reduce((total, product) => total + quantities[product.slug] * CARTON_SIZE, 0);

  function availableCartons(product: BusinessProduct) {
    const alreadyInCart = cart
      .filter((item) => item.slug === product.slug)
      .reduce((total, item) => total + item.qty * (item.unitsPerPackage || 1), 0);
    return Math.max(0, Math.floor((product.availableStock - alreadyInCart) / CARTON_SIZE));
  }

  function minimumCartons(product: BusinessProduct) {
    return Math.max(1, Math.ceil(product.minimumOrderQuantity / CARTON_SIZE));
  }

  function addSelectedToCart() {
    const invalidProduct = selectedProducts.find((product) => {
      const option = product.packagingOptions.find((candidate) => candidate.unitsPerPackage === CARTON_SIZE);
      return !option ||
        quantities[product.slug] < minimumCartons(product) ||
        quantities[product.slug] > availableCartons(product) ||
        !product.inStock;
    });

    if (!productsLoaded || invalidProduct) {
      setError(invalidProduct
        ? `Please check the carton quantity for ${invalidProduct.name}; it may exceed available stock.`
        : "Please wait while current stock is verified.");
      return;
    }

    setError("");
    setNotice("");
    for (const product of selectedProducts) {
      const option = product.packagingOptions.find((candidate) => candidate.unitsPerPackage === CARTON_SIZE);
      if (!option) continue;
      add({
        id: product.id,
        slug: product.slug,
        sku: product.sku,
        name: product.name,
        price: 0,
        image: product.image,
        size: product.size,
        flavor: product.flavor,
        variantType: product.variantType,
        packagingOptionId: option.id,
        packagingLabel: option.label,
        unitsPerPackage: option.unitsPerPackage,
        packagingOptions: product.packagingOptions,
        minimumOrderQuantity: product.minimumOrderQuantity,
        availableStock: product.availableStock,
        inStock: product.inStock,
      }, quantities[product.slug]);
    }
    setNotice(`${selectedCartons} carton${selectedCartons === 1 ? "" : "s"} (${selectedUnits} units) added to your cart.`);
    setQuantities({});
  }

  return (
    <section className="business-order-section" id="business-order">
      <div className="wrap info-page-wrap">
        <div className="section-head">
          <div>
            <h2>Order by the carton.</h2>
            <p>Choose a flavor and enter how many cartons you need. Each carton contains 12 units; you can add multiple flavors to one cart.</p>
          </div>
          <Link href="/cart" className="text-link">View cart <ArrowRight size={15} /></Link>
        </div>

        <div className="business-order-tools">
          <label>
            <span>Search flavors</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by flavor or product"
            />
          </label>
          <label>
            <span>Product family</span>
            <select value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">All product families</option>
              {categories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
            </select>
          </label>
        </div>

        {loading && <p className="business-order-status">Loading current products and carton availability…</p>}
        {!loading && error && <p className="business-order-error" role="alert">{error}</p>}
        {!loading && !error && visibleProducts.length === 0 && (
          <div className="business-order-empty">
            <h3>{products.length ? "No 12-unit cartons are configured yet." : "No products are currently available."}</h3>
            <p>
              {products.length
                ? "Ask the Milano team to configure carton packs for your products, or contact us to arrange your order."
                : "Please contact the Milano team for current business ordering options."}
            </p>
          </div>
        )}

        {visibleProducts.length > 0 && (
          <>
            <div className="business-order-grid">
              {visibleProducts.map((product) => {
                const cartonOption = product.packagingOptions.find((option) => option.unitsPerPackage === CARTON_SIZE);
                const maxCartons = availableCartons(product);
                const minCartons = minimumCartons(product);
                const qty = quantities[product.slug] || 0;
                const unavailable = !product.inStock || maxCartons < minCartons;

                return (
                  <article className={`business-order-card${unavailable ? " is-unavailable" : ""}`} key={product.slug}>
                    <div className="business-order-card-heading">
                      <span>{product.category}</span>
                      <strong>{product.flavor || product.name}</strong>
                      <p>{[product.variantType, product.size].filter(Boolean).join(" · ")}</p>
                    </div>
                    <div className="business-order-card-stock">
                      <span>{product.availableStock} units available</span>
                      <span>{cartonOption?.label || "Carton of 12"} · 12 units</span>
                    </div>
                    <label className="business-order-quantity">
                      <span>Cartons</span>
                      <input
                        type="number"
                        min={0}
                        max={Math.min(99, maxCartons)}
                        step={1}
                        value={qty}
                        disabled={unavailable}
                        aria-label={`Cartons of ${product.name}`}
                        onChange={(event) => {
                          const nextQty = Number(event.target.value);
                          setNotice("");
                          setError("");
                          setQuantities((current) => ({
                            ...current,
                            [product.slug]: Number.isSafeInteger(nextQty)
                              ? nextQty === 0
                                ? 0
                                : Math.max(minCartons, Math.min(99, maxCartons, nextQty))
                              : 0,
                          }));
                        }}
                      />
                    </label>
                    <p className="business-order-card-total">
                      {unavailable
                        ? "Not enough stock for a full carton"
                        : qty > 0
                          ? `${qty} carton${qty === 1 ? "" : "s"} · ${qty * CARTON_SIZE} units`
                          : `Minimum ${minCartons} carton${minCartons === 1 ? "" : "s"}`}
                    </p>
                  </article>
                );
              })}
            </div>
            <div className="business-order-submit">
              <p>{selectedCartons} cartons · {selectedUnits} individual units</p>
              <button
                type="button"
                className="btn"
                disabled={!selectedCartons || !productsLoaded}
                onClick={addSelectedToCart}
              >
                <ShoppingCart size={16} /> Add cartons to cart
              </button>
            </div>
          </>
        )}

        {notice && (
          <p className="business-order-success" role="status">
            {notice} <Link href="/cart">Review cart <ArrowRight size={14} /></Link>
          </p>
        )}
      </div>
    </section>
  );
}
