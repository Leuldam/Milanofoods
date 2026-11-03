ALTER TABLE "Product"
ADD COLUMN "flavor" TEXT,
ADD COLUMN "variantType" TEXT;

UPDATE "Product"
SET
    "flavor" = regexp_replace("name", '\s+Mojito\s+Syrup$', '', 'i'),
    "variantType" = 'Syrup'
WHERE "categoryId" IN (
    SELECT "id" FROM "Category" WHERE "slug" = 'mojito-syrups'
);

UPDATE "Category"
SET "description" = 'Choose strawberry, chocolate, mango, or vanilla in hard or soft powder and 1 kg, 2 kg, 3 kg, or 5 kg packs.'
WHERE "slug" = 'ice-cream-powders';

UPDATE "Category"
SET "description" = 'Choose strawberry, chocolate, vanilla, or mango milkshake powder (5 kg) or liquid (5 L).'
WHERE "slug" = 'milkshake-powders';

UPDATE "Product"
SET "isPublished" = false
WHERE "slug" IN ('ice-cream-powder', 'milkshake-powder');

WITH flavors("name", "slug") AS (
    VALUES
        ('Strawberry', 'strawberry'),
        ('Chocolate', 'chocolate'),
        ('Mango', 'mango'),
        ('Vanilla', 'vanilla')
),
types("name", "slug") AS (
    VALUES
        ('Hard', 'hard'),
        ('Soft', 'soft')
),
sizes("name", "slug") AS (
    VALUES
        ('1 kg', '1-kg'),
        ('2 kg', '2-kg'),
        ('3 kg', '3-kg'),
        ('5 kg', '5-kg')
)
INSERT INTO "Product" (
    "id", "name", "slug", "price", "size", "flavor", "variantType",
    "description", "imageUrl", "categoryId", "stock", "isPublished", "isActive",
    "createdAt", "updatedAt"
)
SELECT
    'catalog-' || 'ice-cream-' || flavors."slug" || '-' || types."slug" || '-' || sizes."slug",
    flavors."name" || ' ' || types."name" || ' Ice Cream Powder',
    'ice-cream-' || flavors."slug" || '-' || types."slug" || '-' || sizes."slug",
    0,
    sizes."name",
    flavors."name",
    types."name",
    flavors."name" || ' flavor ' || lower(types."name") || ' ice cream powder, ' || sizes."name" || ' pack.',
    category."imageUrl",
    category."id",
    0,
    false,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM flavors
CROSS JOIN types
CROSS JOIN sizes
CROSS JOIN "Category" AS category
WHERE category."slug" = 'ice-cream-powders'
ON CONFLICT ("slug") DO NOTHING;

WITH flavors("name", "slug") AS (
    VALUES
        ('Strawberry', 'strawberry'),
        ('Chocolate', 'chocolate'),
        ('Vanilla', 'vanilla'),
        ('Mango', 'mango')
),
types("name", "slug", "size") AS (
    VALUES
        ('Powder', 'powder', '5 kg'),
        ('Liquid', 'liquid', '5 L')
)
INSERT INTO "Product" (
    "id", "name", "slug", "price", "size", "flavor", "variantType",
    "description", "imageUrl", "categoryId", "stock", "isPublished", "isActive",
    "createdAt", "updatedAt"
)
SELECT
    'catalog-' || 'milkshake-' || flavors."slug" || '-' || types."slug",
    flavors."name" || ' Milkshake ' || types."name",
    'milkshake-' || flavors."slug" || '-' || types."slug" || '-' || replace(types."size", ' ', '-'),
    0,
    types."size",
    flavors."name",
    types."name",
    flavors."name" || ' flavor milkshake ' || lower(types."name") || ', ' || types."size" || ' pack.',
    category."imageUrl",
    category."id",
    0,
    false,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM flavors
CROSS JOIN types
CROSS JOIN "Category" AS category
WHERE category."slug" = 'milkshake-powders'
ON CONFLICT ("slug") DO NOTHING;
