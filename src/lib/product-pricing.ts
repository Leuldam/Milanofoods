export type PackagingConfiguration = {
  label: string;
  unitsPerPackage: number;
};

export function decimalToCents(value: string | number): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) throw new Error("INVALID_MONEY");

  const cents = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) throw new Error("INVALID_MONEY");
  return cents;
}

export function percentToBasisPoints(value: string | number): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) throw new Error("INVALID_DISCOUNT");

  const basisPoints = Number(match[1]) * 100 + Number((match[2] || "").padEnd(2, "0"));
  if (!Number.isSafeInteger(basisPoints) || basisPoints < 0 || basisPoints >= 10_000) {
    throw new Error("INVALID_DISCOUNT");
  }
  return basisPoints;
}

export function calculateUnitPriceCents(
  baseUnitPriceCents: number,
  promotionEnabled: boolean,
  promotionDiscountPercent: string | number | null,
): number {
  if (!promotionEnabled || promotionDiscountPercent === null) return baseUnitPriceCents;
  const discountBasisPoints = percentToBasisPoints(promotionDiscountPercent);
  return Math.round((baseUnitPriceCents * (10_000 - discountBasisPoints)) / 10_000);
}

export function calculatePackageTotalCents(
  unitPriceCents: number,
  unitsPerPackage: number,
  packageQuantity: number,
): number {
  if (
    !Number.isSafeInteger(unitPriceCents) ||
    unitPriceCents < 0 ||
    !Number.isSafeInteger(unitsPerPackage) ||
    unitsPerPackage < 1 ||
    !Number.isSafeInteger(packageQuantity) ||
    packageQuantity < 1
  ) {
    throw new Error("INVALID_PACKAGE_QUANTITY");
  }

  const total = unitPriceCents * unitsPerPackage * packageQuantity;
  if (!Number.isSafeInteger(total)) throw new Error("INVALID_PACKAGE_TOTAL");
  return total;
}

export function parsePackagingConfigurations(value: unknown): PackagingConfiguration[] {
  if (typeof value !== "string" || !value.trim()) return [];

  const entries = value.split(/[\n,]+/).map((entry) => entry.trim()).filter(Boolean);
  if (entries.length > 20) throw new Error("INVALID_PACKAGING_OPTIONS");

  const options = entries.map((entry) => {
    const match = /^(.{1,80})\s*=\s*(\d{1,4})$/.exec(entry);
    if (!match) throw new Error("INVALID_PACKAGING_OPTIONS");

    const label = match[1].trim();
    const unitsPerPackage = Number(match[2]);
    if (!label || unitsPerPackage < 2 || unitsPerPackage > 1000) {
      throw new Error("INVALID_PACKAGING_OPTIONS");
    }
    return { label, unitsPerPackage };
  });

  if (
    new Set(options.map((option) => option.label.toLowerCase())).size !== options.length ||
    new Set(options.map((option) => option.unitsPerPackage)).size !== options.length
  ) {
    throw new Error("INVALID_PACKAGING_OPTIONS");
  }
  return options;
}

export function minimumPackageQuantity(minimumOrderQuantity: number, unitsPerPackage: number): number {
  return Math.max(1, Math.ceil(minimumOrderQuantity / unitsPerPackage));
}

export function formatTotalMeasure(size: string | null | undefined, units: number): string | null {
  const match = /^\s*(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\s*$/i.exec(size || "");
  if (!match || !Number.isSafeInteger(units) || units < 1) return null;

  const amount = Number(match[1]) * units;
  const unit = match[2].toLowerCase();
  const isWeight = unit === "kg" || unit === "g";
  const baseAmount = unit === "kg" || unit === "l" ? amount * 1000 : amount;
  const displayAmount = baseAmount >= 1000 ? baseAmount / 1000 : baseAmount;
  const displayUnit = baseAmount >= 1000 ? (isWeight ? "kg" : "L") : (isWeight ? "g" : "ml");
  return `${Number(displayAmount.toFixed(3))} ${displayUnit}`;
}
