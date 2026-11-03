export type ProductImageOwner = "products" | "categories";

const imageDataPattern = /^data:(image\/(?:png|jpeg));base64,([A-Za-z0-9+/]+={0,2})$/;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function validateImageDataUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("INVALID_IMAGE");

  const match = imageDataPattern.exec(value);
  if (!match) throw new Error("INVALID_IMAGE");

  const [, mimeType, encoded] = match;
  const buffer = Buffer.from(encoded, "base64");
  if (
    buffer.length === 0 ||
    buffer.length > MAX_IMAGE_BYTES ||
    buffer.toString("base64") !== encoded
  ) {
    throw new Error("INVALID_IMAGE");
  }

  const isPng = mimeType === "image/png" && buffer.subarray(0, 8).equals(PNG_SIGNATURE);
  const isJpeg = mimeType === "image/jpeg" &&
    buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (!isPng && !isJpeg) throw new Error("INVALID_IMAGE");

  return value;
}

export function getPublicImageUrl(
  imageUrl: string | null,
  owner: ProductImageOwner,
  id: string,
  updatedAt?: Date,
): string | null {
  if (!imageUrl?.startsWith("data:image/")) return imageUrl;
  const version = updatedAt ? `?v=${updatedAt.getTime()}` : "";
  return `/api/media/${owner}/${encodeURIComponent(id)}${version}`;
}

export function getCategoryImageUrl(
  imageUrl: string | null,
  categoryId: string,
  categorySlug: string,
  updatedAt?: Date,
): string | null {
  const uploadedImage = getPublicImageUrl(imageUrl, "categories", categoryId, updatedAt);
  if (imageUrl?.startsWith("data:image/")) return uploadedImage;
  if (categorySlug === "ice-cream-powders") return "/images/milanoice.png";
  if (categorySlug === "milkshake-powders") return "/images/milanomilk.png";
  return uploadedImage;
}

export function getProductImageUrl(
  imageUrl: string | null,
  productId: string,
  productUpdatedAt: Date,
  categoryImageUrl: string | null,
  categoryId: string,
  categorySlug: string,
  categoryUpdatedAt: Date,
): string | null {
  const uploadedProductImage = getPublicImageUrl(
    imageUrl,
    "products",
    productId,
    productUpdatedAt,
  );
  if (imageUrl?.startsWith("data:image/")) return uploadedProductImage;
  return (
    getCategoryImageUrl(
      categoryImageUrl,
      categoryId,
      categorySlug,
      categoryUpdatedAt,
    ) ||
    uploadedProductImage
  );
}

export function getProductGalleryImageUrls(
  imageUrl: string | null,
  galleryImageUrls: string[],
  productId: string,
  productUpdatedAt: Date,
  categoryImageUrl: string | null,
  categoryId: string,
  categorySlug: string,
  categoryUpdatedAt: Date,
) {
  const primaryImage = getProductImageUrl(
    imageUrl,
    productId,
    productUpdatedAt,
    categoryImageUrl,
    categoryId,
    categorySlug,
    categoryUpdatedAt,
  );
  const gallery = galleryImageUrls.map((galleryImage, index) =>
    galleryImage.startsWith("data:image/")
      ? `/api/media/products/${encodeURIComponent(productId)}?gallery=${index}&v=${productUpdatedAt.getTime()}`
      : galleryImage,
  );
  return [...new Set([primaryImage, ...gallery].filter((image): image is string => Boolean(image)))];
}

export function decodeImageDataUrl(value: string) {
  const match = imageDataPattern.exec(value);
  if (!match) throw new Error("Stored image data is invalid.");

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}
