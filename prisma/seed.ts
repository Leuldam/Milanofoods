import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

const categories = [
  {
    name: "Mojito Syrups",
    slug: "mojito-syrups",
    imageUrl: "/images/bottle.png",
    description: "Bright, fruit-inspired flavors for refreshing drinks.",
  },
  {
    name: "Ice Cream Powders",
    slug: "ice-cream-powders",
    imageUrl:
      "https://images.unsplash.com/photo-1563805042-7684c019e1cb",
    description: "Powders for creating delicious ice cream.",
  },
  {
    name: "Milkshake Powders",
    slug: "milkshake-powders",
    imageUrl:
      "https://images.unsplash.com/photo-1572490122747-3968b75cc699",
    description: "Powders for creamy, flavorful milkshakes.",
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
    imageUrl: "/images/bottle.png",
  },
  {
    name: "Strawberry Mojito Syrup",
    slug: "strawberry-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    imageUrl: "/images/bottle.png",
  },
  {
    name: "Pineapple Mojito Syrup",
    slug: "pineapple-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    imageUrl: "/images/bottle.png",
  },
  {
    name: "Mango Mojito Syrup",
    slug: "mango-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    imageUrl: "/images/bottle.png",
  },
  {
    name: "Lemon Mojito Syrup",
    slug: "lemon-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    imageUrl: "/images/bottle.png",
  },
  {
    name: "Tropical Mojito Syrup",
    slug: "tropical-mojito-syrup",
    price: 480,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    imageUrl: "/images/bottle.png",
  },
  {
    name: "Ice Cream Powder",
    slug: "ice-cream-powder",
    price: 650,
    size: "1 kg",
    badge: "Popular",
    category: "ice-cream-powders",
    imageUrl:
      "https://images.unsplash.com/photo-1563805042-7684c019e1cb",
  },
  {
    name: "Milkshake Powder",
    slug: "milkshake-powder",
    price: 580,
    size: "1 kg",
    badge: null,
    category: "milkshake-powders",
    imageUrl:
      "https://images.unsplash.com/photo-1572490122747-3968b75cc699",
  },
  {
    name: "Peach Mojito Syrup",
    slug: "peach-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    imageUrl: "/images/bottle.png",
  },
  {
    name: "Orange Mojito Syrup",
    slug: "orange-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    imageUrl: "/images/bottle.png",
  },
  {
    name: "Coconut Mojito Syrup",
    slug: "coconut-mojito-syrup",
    price: 450,
    size: "750 ml",
    badge: null,
    category: "mojito-syrups",
    imageUrl: "/images/bottle.png",
  },
  {
    name: "Milano Special Syrup",
    slug: "milano-special-syrup",
    price: 520,
    size: "750 ml",
    badge: "Signature",
    category: "mojito-syrups",
    imageUrl: "/images/bottle.png",
  },
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
        name: product.name,
        slug: product.slug,
        price: product.price,
        size: product.size,
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