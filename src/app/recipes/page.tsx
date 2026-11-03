import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock3, UsersRound } from "lucide-react";
import { recipes } from "@/lib/products";

export default function RecipesPage() {
  return (
    <main className="recipes-page">
      <section className="recipes-hero">
        <div className="wrap">
          <div className="breadcrumb">Home / Recipes</div>
          <span className="eyebrow">From the Milano kitchen</span>
          <h1>Make a little moment delicious.</h1>
          <p>
            Easy-to-follow drink and dessert ideas for home, cafés, and
            restaurants. Pick a recipe, gather your ingredients, and make it
            your own.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <div>
              <span className="eyebrow">Made to mix and share</span>
              <h2>Find your next favorite.</h2>
            </div>
            <p>Simple steps, flexible servings, and plenty of room to add your own touch.</p>
          </div>
          <div className="recipe-grid">
            {recipes.map((recipe) => (
              <article className="recipe-card" key={recipe.slug}>
                <Link
                  href={`/recipes/${recipe.slug}`}
                  className="recipe-card-image"
                  aria-label={`View ${recipe.title} recipe`}
                >
                  <Image
                    src={recipe.image}
                    alt={recipe.title}
                    fill
                    sizes="(max-width: 720px) 100vw, (max-width: 1000px) 50vw, 33vw"
                  />
                  <span className="recipe-card-category">{recipe.category}</span>
                </Link>
                <div className="recipe-card-copy">
                  <h3>{recipe.title}</h3>
                  <p>{recipe.description}</p>
                  <div className="recipe-card-meta">
                    <span><Clock3 size={15} />{recipe.time}</span>
                    <span><UsersRound size={15} />{recipe.serves}</span>
                  </div>
                  <Link href={`/recipes/${recipe.slug}`} className="recipe-card-link">
                    View recipe <ArrowRight size={15} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
