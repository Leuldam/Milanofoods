"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Check, MapPin, Minus, Plus, ShoppingBag, Truck } from "lucide-react";

import { Product } from "@/lib/products";
import { comparePackageSizes, getPreferredProductVariant } from "@/lib/product-variants";
import { minimumPackageQuantity } from "@/lib/product-pricing";
import { PackagingOption, useStore } from "@/components/store-provider";
import { ProductCard } from "@/components/product-card";

type StoreProduct = Product & {
  availableStock: number;
  inStock: boolean;
  galleryImageUrls: string[];
};

export default function ProductPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSku, setSelectedSku] = useState("");
  const [selectedPackagingId, setSelectedPackagingId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const { add } = useStore();

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      try {
        const response = await fetch("/api/products", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load products.");
        const data: StoreProduct[] = await response.json();
        if (active) setProducts(data);
      } catch (error) {
        console.error("Product loading failed:", error);
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadProducts();
    return () => { active = false; };
  }, []);

  const routeProduct = products.find((product) => product.slug === slug);
  const categoryProducts = useMemo(
    () => routeProduct ? products.filter((product) => product.category === routeProduct.category) : [],
    [products, routeProduct],
  );
  const currentProduct = categoryProducts.find((product) => product.slug === selectedSku) || routeProduct;

  useEffect(() => {
    setSelectedSku(routeProduct?.slug || "");
    setSelectedPackagingId(null);
    setQty(1);
    setGalleryIndex(0);
  }, [routeProduct?.slug]);

  const flavors = Array.from(new Set(categoryProducts.map((product) => product.flavor).filter((value): value is string => Boolean(value)))).sort();
  const activeFlavorProducts = currentProduct?.flavor
    ? categoryProducts.filter((product) => product.flavor === currentProduct.flavor)
    : categoryProducts;
  const typeOrder = currentProduct?.category === "Ice Cream Powders" ? ["Hard", "Soft"] : ["Powder", "Liquid"];
  const variantTypes = Array.from(new Set(activeFlavorProducts.map((product) => product.variantType).filter((value): value is string => Boolean(value))))
    .sort((first, second) => {
      const firstIndex = typeOrder.indexOf(first);
      const secondIndex = typeOrder.indexOf(second);
      if (firstIndex < 0 && secondIndex < 0) return first.localeCompare(second);
      if (firstIndex < 0) return 1;
      if (secondIndex < 0) return -1;
      return firstIndex - secondIndex;
    });
  const sizes = Array.from(new Set(activeFlavorProducts.map((product) => product.size).filter((value): value is string => Boolean(value)))).sort(comparePackageSizes);
  const isDessertFamily = currentProduct?.category === "Ice Cream Powders" || currentProduct?.category === "Milkshake Powders";
  const visibleDescription = !isDessertFamily
    ? currentProduct?.description
    : currentProduct.category === "Ice Cream Powders"
      ? `${currentProduct.variantType || "Ice cream"} style for frozen dessert menus.`
      : `${currentProduct.variantType || "Milkshake"} format for shakes and blended drinks.`;

  function chooseVariation(field: "flavor" | "variantType" | "size", value: string) {
    if (!currentProduct) return;
    const targetFlavor = field === "flavor" ? value : currentProduct.flavor;
    const targetType = field === "variantType" ? value : currentProduct.variantType;
    const matchingVariants = categoryProducts.filter((product) =>
      product.flavor === targetFlavor &&
      product.variantType === targetType &&
      (field !== "size" || product.size === value),
    );
    const next = field === "size"
      ? matchingVariants[0]
      : getPreferredProductVariant(matchingVariants, targetType) ||
        categoryProducts.find((product) => product.flavor === targetFlavor);
    if (next) setSelectedSku(next.slug);
  }

  useEffect(() => {
    if (!currentProduct) return;
    setSelectedPackagingId(null);
    const initialUnits = minimumPackageQuantity(currentProduct.minimumOrderQuantity || 1, 1);
    setQty(initialUnits);
    setGalleryIndex(0);
  }, [currentProduct?.slug]);

  if (loading) {
    return <main className="wrap section"><p>Loading product...</p></main>;
  }
  if (!routeProduct || !currentProduct) {
    return (
      <main className="wrap section">
        <h1>Product not found</h1>
        <p>This product may be unavailable or unpublished.</p>
        <Link className="btn" href="/products">Browse products</Link>
      </main>
    );
  }

  const packageOptions = currentProduct.packagingOptions || [];
  const selectedPackaging: PackagingOption | null = packageOptions.find((option) => option.id === selectedPackagingId) || null;
  const unitsPerPackage = selectedPackaging?.unitsPerPackage || 1;
  const minimumQty = minimumPackageQuantity(currentProduct.minimumOrderQuantity || 1, unitsPerPackage);
  const maxQty = Math.floor(currentProduct.availableStock / unitsPerPackage);
  const gallery = currentProduct.galleryImageUrls?.length ? currentProduct.galleryImageUrls : [currentProduct.image];
  const unavailable = currentProduct.availableStock < minimumQty || maxQty < minimumQty;

  return (
    <main>
      <section className="section product-detail-section">
        <div className="wrap">
          <div className="breadcrumb"><Link href="/">Home</Link> / <Link href="/products">Products</Link> / {currentProduct.name}</div>
          <div className="product-detail">
            <div className={`detail-gallery${currentProduct.category === "Mojito Syrups" ? " is-bottle" : ""}`}>
              <div className="detail-image">
                <Image
                  src={gallery[galleryIndex] || currentProduct.image}
                  alt={currentProduct.name}
                  width={1000}
                  height={1100}
                  priority
                  unoptimized={Boolean((gallery[galleryIndex] || currentProduct.image).startsWith("http"))}
                  style={{ width: "100%", height: "100%", objectFit: currentProduct.category === "Mojito Syrups" || currentProduct.category.includes("Powder") ? "contain" : "cover" }}
                />
              </div>
              {gallery.length > 1 && <div className="detail-gallery-thumbnails" aria-label="Product images">
                {gallery.map((image, index) => <button type="button" className={index === galleryIndex ? "is-selected" : ""} key={`${image}-${index}`} onClick={() => setGalleryIndex(index)} aria-label={`View product image ${index + 1}`}>
                  <Image src={image} alt="" width={92} height={92} unoptimized={image.startsWith("http")} />
                </button>)}
              </div>}
            </div>

            <div className="detail-copy">
              <span className="eyebrow">{currentProduct.category}</span>
              <h1>{currentProduct.name}</h1>
              {!isDessertFamily && currentProduct.sku && <p className="product-detail-sku">SKU · {currentProduct.sku}</p>}
              <p className="lead">{visibleDescription}</p>

              {(flavors.length > 1 || variantTypes.length > 1 || (!isDessertFamily && sizes.length > 1)) && <div className="product-detail-variants">
                {flavors.length > 1 && <div className="field"><label htmlFor="product-flavor">Flavor</label><select id="product-flavor" value={currentProduct.flavor || ""} onChange={(event) => chooseVariation("flavor", event.target.value)}>{flavors.map((flavor) => <option key={flavor}>{flavor}</option>)}</select></div>}
                {variantTypes.length > 1 && <div className="field"><label htmlFor="product-type">Type / style</label><select id="product-type" value={currentProduct.variantType || ""} onChange={(event) => chooseVariation("variantType", event.target.value)}>{variantTypes.map((type) => <option key={type}>{type}</option>)}</select></div>}
                {!isDessertFamily && sizes.length > 1 && <div className="field"><label htmlFor="product-size">Weight / volume</label><select id="product-size" value={currentProduct.size} onChange={(event) => chooseVariation("size", event.target.value)}>{sizes.map((size) => <option key={size}>{size}</option>)}</select></div>}
              </div>}
              {flavors.length <= 1 && currentProduct.flavor && <p className="product-detail-flavor">Flavor · <strong>{currentProduct.flavor}</strong></p>}
              {!isDessertFamily && sizes.length <= 1 && currentProduct.size && <div className="field" style={{ maxWidth: 240 }}><label>Weight / volume</label><div className="product-detail-size">{currentProduct.size}</div></div>}

              <p className={`product-stock-note${unavailable ? " is-unavailable" : ""}`}>
                {unavailable ? `Not enough stock for the minimum order. ${currentProduct.availableStock} individual units available.` : <><Check size={14}/> {currentProduct.availableStock} individual units available</>}
              </p>

              <div className="product-purchase-fields">
                <div className="field">
                  <label htmlFor="product-packaging">Packaging</label>
                  <select id="product-packaging" value={selectedPackagingId || ""} onChange={(event) => {
                    setSelectedPackagingId(event.target.value || null);
                    const nextOption = packageOptions.find((option) => option.id === event.target.value);
                    setQty(minimumPackageQuantity(currentProduct.minimumOrderQuantity || 1, nextOption?.unitsPerPackage || 1));
                  }}>
                    <option value="">Single unit</option>
                    {packageOptions.map((option) => {
                      const optionMinimum = minimumPackageQuantity(currentProduct.minimumOrderQuantity || 1, option.unitsPerPackage);
                      return <option key={option.id} value={option.id} disabled={currentProduct.availableStock < optionMinimum * option.unitsPerPackage}>
                        {option.label} · {option.unitsPerPackage} units
                      </option>;
                    })}
                  </select>
                  {(currentProduct.minimumOrderQuantity || 1) > 1 && <small className="product-field-hint">Minimum order: {currentProduct.minimumOrderQuantity} individual units</small>}
                </div>

                <div className="field">
                  <span className="field-label">Quantity</span>
                  <div className="qty-control" role="group" aria-label={`Quantity in ${selectedPackaging?.label || "individual units"}`}>
                    <button type="button" onClick={() => setQty(Math.max(minimumQty, qty - 1))} aria-label="Decrease quantity" disabled={unavailable || qty <= minimumQty}><Minus size={14}/></button>
                    <span>{qty}</span>
                    <button type="button" onClick={() => setQty(Math.min(maxQty, qty + 1))} aria-label="Increase quantity" disabled={unavailable || qty >= maxQty}><Plus size={14}/></button>
                  </div>
                </div>
              </div>

              <div className="detail-actions">
                <button className="btn" disabled={unavailable} onClick={() => add({
                  id: currentProduct.id,
                  sku: currentProduct.sku,
                  slug: currentProduct.slug,
                  name: currentProduct.name,
                  price: 0,
                  image: currentProduct.image,
                  size: currentProduct.size,
                  flavor: currentProduct.flavor,
                  variantType: currentProduct.variantType,
                  packagingOptionId: selectedPackaging?.id || null,
                  packagingLabel: selectedPackaging?.label || "Single unit",
                  unitsPerPackage,
                  packagingOptions: packageOptions,
                  minimumOrderQuantity: currentProduct.minimumOrderQuantity,
                  promotionEnabled: false,
                  promotionDiscountPercent: null,
                  availableStock: currentProduct.availableStock,
                  inStock: currentProduct.inStock,
                }, qty)}><ShoppingBag size={16}/>{unavailable ? "Out of stock" : "Add to Cart"}</button>
                <Link href="/cart" className="btn btn-outline">View Cart</Link>
              </div>
              <div className="detail-points">
                <span><Truck size={14}/> Delivery options at checkout</span>
                <span><MapPin size={14}/> Pickup available in selected locations</span>
              </div>
              <div className="product-information"><h3>Product information</h3><p className="lead">For ingredients, storage guidance, and preparation details, refer to the verified product packaging. Our team can help confirm product details before you order.</p></div>
            </div>
          </div>
        </div>
      </section>
      <section className="section" style={{ background: "#fffdf9" }}>
        <div className="wrap">
          <div className="section-head"><div><span className="eyebrow">Keep exploring</span><h2>You may also like</h2></div></div>
          <div className="product-grid">
            {categoryProducts.filter((product) => product.slug !== currentProduct.slug).slice(0, 4).map((product) => (
              <ProductCard key={product.slug} product={product}/>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
