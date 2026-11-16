"use client";

import { useEffect, useMemo, useState } from "react";
import { ProductCard } from "@/components/product-card";
import { Product } from "@/lib/products";
import { groupProductVariants } from "@/lib/product-variants";
import { Search } from "lucide-react";

type StoreProduct = Product & {
  flavor: string | null;
  variantType: string | null;
  availableStock: number;
  inStock: boolean;
};

const allProductsOption = { value: "All Products", label: "All product families", slug: "", description: "" };

export default function ProductsPage() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("All Products");
  const [flavor, setFlavor] = useState("");
  const [variantType, setVariantType] = useState("");
  const [size, setSize] = useState("");
  const [sort, setSort] = useState("featured");
  const [categoryOptions, setCategoryOptions] = useState([allProductsOption]);
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const selectedCategory = new URLSearchParams(
      window.location.search
    ).get("category");

    const matchedCategory = categoryOptions.find(
      (option) => option.value === selectedCategory || option.label === selectedCategory,
    );
    if (matchedCategory) setCategory(matchedCategory.value);

    async function loadCategories() {
      try {
        const response = await fetch("/api/categories", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load categories.");
        const data: { name: string; slug: string; description: string }[] = await response.json();
        const options = [
          allProductsOption,
          ...data.map((item) => ({
            value: item.name,
            label: item.name,
            slug: item.slug,
            description: item.description,
          })),
        ];
        setCategoryOptions(options);
        const matchingCategory = data.find(
          (item) => item.name === selectedCategory || item.slug === selectedCategory,
        );
        if (matchingCategory) setCategory(matchingCategory.name);
      } catch (loadError) {
        console.error("Product categories could not be loaded:", loadError);
      }
    }

    async function loadProducts() {
      try {
        const response = await fetch("/api/products", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load products.");
        }

        const data: StoreProduct[] = await response.json();
        setProducts(data);
      } catch (err) {
        console.error(err);
        setError("Unable to load products. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    void loadCategories();
    void loadProducts();
  }, []);

  const familyProducts = useMemo(
    () => products.filter((product) => category === "All Products" || product.category === category),
    [products, category],
  );
  const flavors = useMemo(
    () => Array.from(new Set(familyProducts.map((product) => product.flavor).filter((value): value is string => Boolean(value)))).sort(),
    [familyProducts],
  );
  const variantTypes = useMemo(
    () => {
      const types = Array.from(new Set(familyProducts.map((product) => product.variantType).filter((value): value is string => Boolean(value))));
      const preferredOrder = category === "Ice Cream Powders" ? ["Hard", "Soft"] : ["Powder", "Liquid"];
      return types.sort((first, second) => {
        const firstIndex = preferredOrder.indexOf(first);
        const secondIndex = preferredOrder.indexOf(second);
        if (firstIndex < 0 && secondIndex < 0) return first.localeCompare(second);
        if (firstIndex < 0) return 1;
        if (secondIndex < 0) return -1;
        return firstIndex - secondIndex;
      });
    },
    [category, familyProducts],
  );
  const sizes = useMemo(
    () => Array.from(new Set(familyProducts.map((product) => product.size).filter(Boolean))).sort(),
    [familyProducts],
  );

  const list = useMemo(() => {
    const arr = products.filter(
      (p) =>
        (category === "All Products" || p.category === category) &&
        (!flavor || p.flavor === flavor) &&
        (!variantType || p.variantType === variantType) &&
        (!size || p.size === size) &&
        `${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase())
    );

    if (sort === "name") arr.sort((a, b) => a.name.localeCompare(b.name));

    return arr;
  }, [products, q, category, flavor, variantType, size, sort]);
  const productGroups = useMemo(() => {
    const groups = groupProductVariants(list);
    if (sort === "name") groups.sort((a, b) => a.product.name.localeCompare(b.product.name));
    return groups;
  }, [list, sort]);

  const selectedFamily = categoryOptions.find((option) => option.value === category);

  return (
    <main>
      <section className="page-hero">
        <div className="wrap">
          <div className="breadcrumb">Home / Products</div>
          <h1>{category === "All Products" ? "All products" : selectedFamily?.label ?? "All products"}</h1>
          <p>
            {category === "All Products"
              ? "Choose from Milano mojito syrup, ice cream powder, milkshake, and more."
              : category === "Ice Cream Powders"
                ? "Choose your favorite flavor in hard or soft style."
                : category === "Milkshake Powders"
                  ? "Choose your favorite flavor in powder or liquid format."
              : selectedFamily?.description || "Explore products in this category."}
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="catalog-tools">
            <div className="catalog-search">
              <Search size={17} aria-hidden="true" />
              <input
                className="search-input"
                aria-label="Search products"
                placeholder="Search products..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <label className="catalog-tool-select">
              <span>Category</span>
              <select
                aria-label="Category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setFlavor("");
                  setVariantType("");
                  setSize("");
                }}
              >
                {categoryOptions.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </label>

            <label className="catalog-tool-select">
              <span>Sort by</span>
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="name">Name</option>
              </select>
            </label>
          </div>

          <div className="catalog-layout">
            <div>
              {category !== "All Products" && (
                flavors.length > 1 ||
                variantTypes.length > 1 ||
                (category !== "Ice Cream Powders" && category !== "Milkshake Powders" && sizes.length > 1)
              ) && (
                <div className="catalog-variant-filters" aria-label="Filter product variants">
                  {flavors.length > 1 && <label>Flavor<select aria-label="Flavor" value={flavor} onChange={(event) => setFlavor(event.target.value)}><option value="">All flavors</option>{flavors.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
                  {variantTypes.length > 1 && <label>{category === "Ice Cream Powders" ? "Style" : "Format"}<select aria-label={category === "Ice Cream Powders" ? "Style" : "Format"} value={variantType} onChange={(event) => setVariantType(event.target.value)}><option value="">All {category === "Ice Cream Powders" ? "styles" : "formats"}</option>{variantTypes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
                  {category !== "Ice Cream Powders" && category !== "Milkshake Powders" && sizes.length > 1 && <label>Pack size<select aria-label="Pack size" value={size} onChange={(event) => setSize(event.target.value)}><option value="">All sizes</option>{sizes.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>}
                </div>
              )}
              {loading ? (
                <p>Loading products...</p>
              ) : error ? (
                <div className="empty-state">
                  <h2>Products unavailable</h2>
                  <p>{error}</p>
                  <button
                    className="btn"
                    onClick={() => window.location.reload()}
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <>
                  <p className="catalog-result-count">
                    <strong>{productGroups.length}</strong> products
                  </p>

                  {list.length ? (
                    <div className="product-grid">
                      {productGroups.map((group) => (
                        <ProductCard key={group.key} product={group.product} variants={group.variants} />
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <h2>No products found</h2>
                      <p>Try another search or category.</p>
                      <button
                        className="btn"
                        onClick={() => {
                          setQ("");
                          setCategory("All Products");
                          setFlavor("");
                          setVariantType("");
                          setSize("");
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}