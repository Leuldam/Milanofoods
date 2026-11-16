INSERT INTO "ProductPackagingOption" (
  "id",
  "productId",
  "label",
  "unitsPerPackage",
  "isEnabled",
  "createdAt",
  "updatedAt"
)
SELECT
  'carton12-' || md5(product."id"),
  product."id",
  'Carton (12 units)',
  12,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Product" AS product
WHERE product."isActive" = true
ON CONFLICT ("productId", "label") DO NOTHING;
