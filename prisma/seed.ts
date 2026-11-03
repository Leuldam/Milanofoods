import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { dessertProductVariants } from "../src/lib/product-variants";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const categories = [
  {
    name: "Mojito Syrups",
    slug: "mojito-syrups",
    imageUrl: "/images/milano-mint-bottle-cutout.png",
    description: "Bright, fruit-inspired flavors for refreshing drinks.",
  },
  {
    name: "Ice Cream Powders",
    slug: "ice-cream-powders",
    imageUrl: "/images/milanoice.png",
    description:
      "Choose strawberry, chocolate, mango, or vanilla in hard or soft powder and 1 kg, 2 kg, 3 kg, or 5 kg packs.",
  },
  {
    name: "Milkshake Powders",
    slug: "milkshake-powders",
    imageUrl: "/images/milanomilk.png",
    description:
      "Choose strawberry, chocolate, vanilla, or mango milkshake powder (5 kg) or liquid (5 L).",
  },
];

const products = [
  {
    name: "Mint Mojito Syrup",
    slug: "mint-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: "Bestseller",
    category: "mojito-syrups",
    flavor: "Mint",
    variantType: "Syrup",
    imageUrl: "/images/milano-mint-bottle-cutout.png",
  },
  {
    name: "Strawberry Mojito Syrup",
    slug: "strawberry-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    flavor: "Strawberry",
    variantType: "Syrup",
    imageUrl: "/images/milano-mint-bottle-cutout.png",
  },
  {
    name: "Pineapple Mojito Syrup",
    slug: "pineapple-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    flavor: "Pineapple",
    variantType: "Syrup",
    imageUrl: "/images/milano-mint-bottle-cutout.png",
  },
  {
    name: "Mango Mojito Syrup",
    slug: "mango-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    flavor: "Mango",
    variantType: "Syrup",
    imageUrl: "/images/milano-mint-bottle-cutout.png",
  },
  {
    name: "Lemon Mojito Syrup",
    slug: "lemon-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    flavor: "Lemon",
    variantType: "Syrup",
    imageUrl: "/images/milano-mint-bottle-cutout.png",
  },
  {
    name: "Tropical Mojito Syrup",
    slug: "tropical-mojito-syrup",
    price: 480,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    flavor: "Tropical",
    variantType: "Syrup",
    imageUrl: "/images/milano-mint-bottle-cutout.png",
  },
  {
    name: "Peach Mojito Syrup",
    slug: "peach-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    flavor: "Peach",
    variantType: "Syrup",
    imageUrl: "/images/milano-mint-bottle-cutout.png",
  },
  {
    name: "Orange Mojito Syrup",
    slug: "orange-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    flavor: "Orange",
    variantType: "Syrup",
    imageUrl: "/images/milano-mint-bottle-cutout.png",
  },
  {
    name: "Coconut Mojito Syrup",
    slug: "coconut-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    flavor: "Coconut",
    variantType: "Syrup",
    imageUrl: "/images/milano-mint-bottle-cutout.png",
  },
  {
    name: "Milano Special Syrup",
    slug: "milano-special-syrup",
    price: 520,
    size: "750 ml",
    badge: "Signature",
    category: "mojito-syrups",
    flavor: "Milano Special",
    variantType: "Syrup",
    imageUrl: "/images/milano-mint-bottle-cutout.png",
  },
  ...dessertProductVariants,
];

async function main() {
  const categoryIds = new Map<string, string>();

  // Create categories without overwriting existing records.
  for (const category of categories) {
    const savedCategory = await prisma.category.upsert({
      where: {
        slug: category.slug,
      },
      update: {},
      create: category,
    });

    categoryIds.set(category.slug, savedCategory.id);
  }

  // Create products without overwriting existing records.
  for (const product of products) {
    const categoryId = categoryIds.get(product.category);

    if (!categoryId) {
      throw new Error(
        `Category not found for product: ${product.name}`
      );
    }

    await prisma.product.upsert({
      where: {
        slug: product.slug,
      },
      update: {},
      create: {
        sku: product.slug.toUpperCase(),
        name: product.name,
        slug: product.slug,
        price: product.price,
        size: product.size,
        flavor: product.flavor,
        variantType: product.variantType,
        badge: product.badge,
        imageUrl: product.imageUrl,
        categoryId,
        stock: 0,
        isPublished: false,
        isActive: true,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error("Milano Foods seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });