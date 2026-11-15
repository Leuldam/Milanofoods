UPDATE "Product" AS product
SET "isPublished" = false
FROM "Category" AS category
WHERE product."categoryId" = category."id"
  AND category."slug" = 'mojito-syrups'
  AND lower(regexp_replace(trim(coalesce(product."size", '')), '\s+', '', 'g')) <> '750ml';

UPDATE "Product" AS product
SET "isPublished" = false
FROM "Category" AS category
WHERE product."categoryId" = category."id"
  AND category."slug" = 'ice-cream-powders'
  AND lower(regexp_replace(trim(coalesce(product."size", '')), '\s+', '', 'g')) <> '1kg';

UPDATE "Product" AS product
SET "isPublished" = false
FROM "Category" AS category
WHERE product."categoryId" = category."id"
  AND category."slug" = 'milkshake-powders'
  AND NOT (
    (lower(trim(coalesce(product."variantType", ''))) = 'powder'
      AND lower(regexp_replace(trim(coalesce(product."size", '')), '\s+', '', 'g')) = '1kg')
    OR
    (lower(trim(coalesce(product."variantType", ''))) = 'liquid'
      AND lower(regexp_replace(trim(coalesce(product."size", '')), '\s+', '', 'g')) = '5kg')
  );

UPDATE "Category"
SET "description" = 'Available in 750 ml bottles.'
WHERE "slug" = 'mojito-syrups';

UPDATE "Category"
SET "description" = 'Available in 1 kg packs, in hard and soft styles.'
WHERE "slug" = 'ice-cream-powders';

UPDATE "Category"
SET "description" = 'Milkshake powder is available in 1 kg packs; liquid milkshake is available in 5 kg packs.'
WHERE "slug" = 'milkshake-powders';

WITH flavors("name", "slug") AS (
  VALUES
    ('Strawberry', 'strawberry'),
    ('Chocolate', 'chocolate'),
    ('Vanilla', 'vanilla'),
    ('Mango', 'mango')
),
types("name", "slug", "size") AS (
  VALUES
    ('Powder', 'powder', '1 kg'),
    ('Liquid', 'liquid', '5 kg')
)
INSERT INTO "Product" (
  "id", "sku", "name", "slug", "price", "size", "flavor", "variantType",
  "description", "imageUrl", "categoryId", "stock", "isPublished", "isActive",
  "createdAt", "updatedAt"
)
SELECT
  'catalog-milkshake-' || flavors."slug" || '-' || types."slug" || '-' || replace(types."size", ' ', '-'),
  upper('milkshake-' || flavors."slug" || '-' || types."slug" || '-' || replace(types."size", ' ', '-')),
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
ON CONFLICT DO NOTHING;
