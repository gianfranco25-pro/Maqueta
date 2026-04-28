import type { Product, SizePriceRule } from "./types";

const toNumber = (value?: string | number) => {
  const parsed = typeof value === "number" ? value : Number(String(value || "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const resolveProductPriceRule = (product: Product): SizePriceRule | undefined => {
  if (!product.sizePrices?.length || product.priceMode === "base") return undefined;

  if (product.priceMode === "talla_exacta") {
    return product.sizePrices.find((rule) => String(rule.size || "") === String(product.size || ""));
  }

  if (product.priceMode === "rango_tallas") {
    const size = toNumber(product.size);
    if (size === undefined) return undefined;
    return product.sizePrices.find((rule) => {
      const min = rule.minSize ?? Number.NEGATIVE_INFINITY;
      const max = rule.maxSize ?? Number.POSITIVE_INFINITY;
      return size >= min && size <= max;
    });
  }

  return undefined;
};

export const getProductPrices = (product: Product) => {
  const rule = resolveProductPriceRule(product);
  return {
    basePrice: rule?.basePrice ?? product.basePrice,
    wholesalePrice: rule?.wholesalePrice ?? product.wholesalePrice,
    ruleLabel: rule?.label,
  };
};
