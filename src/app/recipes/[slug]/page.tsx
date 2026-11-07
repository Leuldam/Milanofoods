import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock3, UsersRound } from "lucide-react";
import { products, recipes } from "@/lib/products";
import { ProductCard } from "@/components/product-card";

export function generateStaticParams() {
  return recipes.map((recipe) => ({ slug: recipe.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = recipes.find((item) => item.slug === slug);
  if (!recipe) notFound();

  return {
    title: `${recipe.title} Recipe`,
    description: recipe.description,
    alternates: { canonical: `/recipes/${recipe.slug}` },
    openGraph: {
      type: "article",
      title: `${recipe.title} Recipe`,
      description: recipe.description,
      url: `/recipes/${recipe.slug}`,
      images: [{ url: recipe.image, alt: recipe.title }],
    },
  };
}

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recipe = recipes.find((item) => item.slug === slug);
  if (!recipe) notFound();
  const recipeSchema = {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    description: recipe.description,
    image: recipe.image,
    recipeCategory: recipe.category,
    prepTime: `PT${Number.parseInt(recipe.time, 10)}M`,
    recipeYield: recipe.serves,
    recipeIngredient: recipe.ingredients,
    recipeInstructions: recipe.steps.map((text) => ({
      "@type": "HowToStep",
      text,
    })),
    author: {
      "@type": "Organization",
      name: "Milano Foods",
      url: process.env.NEXT_PUBLIC_SITE_URL || "https://milanofoods.vercel.app",
    },
  };

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeSchema).replace(/</g, "\\u003c") }} />
    <main className="recipe-detail-page">
      <section className="recipe-detail-hero">
        <div className="wrap">
          <div className="breadcrumb">
            <Link href="/">Home</Link> / <Link href="/recipes">Recipes</Link> / {recipe.title}
          </div>
          <div className="recipe-detail-layout">
            <div className="recipe-detail-copy">
              <span className="eyebrow">{recipe.category}</span>
              <h1>{recipe.title}</h1>
              <p>{recipe.description}</p>
              <div className="recipe-detail-meta">
                <span><Clock3 size={17} /> Ready in {recipe.time}</span>
                <span><UsersRound size={17} /> Makes {recipe.serves}</span>
              </div>
              <Link href="#recipe-instructions" className="btn">
                Start cooking <ArrowRight size={16} />
              </Link>
            </div>
            <div className="recipe-detail-image">
              <Image
                src={recipe.image}
                alt={recipe.title}
                fill
                priority
                sizes="(max-width: 860px) 100vw, 52vw"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="recipe-instructions">
        <div className="wrap recipe-instructions">
          <aside className="recipe-ingredients">
            <span className="eyebrow">What you’ll need</span>
            <h2>Ingredients</h2>
            <ul>
              {recipe.ingredients.map((ingredient) => (
                <li key={ingredient}>{ingredient}</li>
              ))}
            </ul>
            <p className="recipe-tip">
              Taste as you go: adjust syrup and citrus to suit your glass and
              preferred sweetness.
            </p>
          </aside>
          <div className="recipe-method">
            <span className="eyebrow">Let’s make it</span>
            <h2>Method</h2>
            <ol>
              {recipe.steps.map((step, index) => (
                <li key={step}>
                  <span className="recipe-step-number">{String(index + 1).padStart(2, "0")}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
            {recipe.slug === "creamy-milkshake" && (
              <p className="recipe-tip">
                Follow the serving measurement on your Milano powder package;
                product formulations may vary.
              </p>
            )}
            <Link href="/recipes" className="text-link">
              <ArrowLeft size={15} /> All recipes
            </Link>
          </div>
        </div>
      </section>

      <section className="section recipe-products-section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Make it Milano</span>
              <h2>Explore the range.</h2>
            </div>
            <Link href="/products" className="text-link">
              Shop all products <ArrowRight size={15} />
            </Link>
          </div>
          <div className="product-grid">
            {products.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
