export type CatalogProductVariant = {
  name: string;
  slug: string;
  price: number;
  size: string;
  badge?: string | null;
  flavor: string;
  variantType: string;
  category: string;
  imageUrl: string;
  description: string;
};

export type GroupableProduct = {
  id: string;
  category: string;
  flavor?: string | null;
  size?: string | null;
  variantType?: string | null;
};

export function comparePackageSizes(first: string, second: string) {
  return first.localeCompare(second, undefined, { numeric: true });
}

export function groupProductVariants<T extends GroupableProduct>(products: T[]) {
  const grouped = new Map<string, T[]>();

  for (const product of products) {
    const isVariantFamily =
      (product.category === "Ice Cream Powders" ||
        product.category === "Milkshake Powders") &&
      Boolean(product.flavor?.trim());
    const key = isVariantFamily
      ? `${product.category}:${product.flavor!.trim().toLowerCase()}`
      : product.id;
    const variants = grouped.get(key);

    if (variants) variants.push(product);
    else grouped.set(key, [product]);
  }

  return Array.from(grouped, ([key, variants]) => {
    const category = variants[0].category;
    const typeOrder = category === "Ice Cream Powders" ? ["Hard", "Soft"] : ["Powder", "Liquid"];
    variants.sort((first, second) => {
      const typeDifference =
        typeOrder.indexOf(first.variantType || "") - typeOrder.indexOf(second.variantType || "");
      if (typeDifference !== 0) return typeDifference;
      return comparePackageSizes(first.size || "", second.size || "");
    });

    return { key, product: variants[0], variants };
  });
}

const iceCreamImage = "/images/milanoice.png";
const milkshakeImage = "/images/milanomilk.png";

const slugPart = (value: string) =>
  value.toLowerCase().replaceAll(" ", "-");

export const dessertProductVariants: CatalogProductVariant[] = [
  ...["Strawberry", "Chocolate", "Mango", "Vanilla"].flatMap((flavor) =>
    ["Hard", "Soft"].flatMap((variantType) =>
      ["1 kg", "2 kg", "3 kg", "5 kg"].map((size) => ({
        name: `${flavor} ${variantType} Ice Cream Powder`,
        slug: `ice-cream-${slugPart(flavor)}-${slugPart(variantType)}-${slugPart(size)}`,
        price: 0,
        size,
        flavor,
        variantType,
        category: "ice-cream-powders",
        imageUrl: iceCreamImage,
        description: `${flavor} flavor ${variantType.toLowerCase()} ice cream powder, ${size} pack.`,
      })),
    ),
  ),
  ...["Strawberry", "Chocolate", "Vanilla", "Mango"].flatMap((flavor) =>
    [
      { variantType: "Powder", size: "5 kg" },
      { variantType: "Liquid", size: "5 L" },
    ].map(({ variantType, size }) => ({
      name: `${flavor} Milkshake ${variantType}`,
      slug: `milkshake-${slugPart(flavor)}-${slugPart(variantType)}-${slugPart(size)}`,
      price: 0,
      size,
      flavor,
      variantType,
      category: "milkshake-powders",
      imageUrl: milkshakeImage,
      description: `${flavor} flavor milkshake ${variantType.toLowerCase()}, ${size} pack.`,
    })),
  ),
];
