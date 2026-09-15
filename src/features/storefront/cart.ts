import { z } from "zod";
import { menu } from "./menu";
import { restaurant } from "./restaurant";

export const cartLineSchema = z.object({
  id: z.string().min(1).max(100),
  productId: z.string(),
  variantId: z.string().optional(),
  addonIds: z.array(z.string()).max(20),
  quantity: z.number().int().min(1).max(99),
  notes: z.string().max(300),
});
export type CartLine = z.infer<typeof cartLineSchema>;
export type Method = "pickup" | "delivery";
export const money = (amount: number) => `PKR ${amount.toLocaleString("en-PK")}`;
export function resolveLine(line: CartLine) {
  const product = menu.find((item) => item.id === line.productId && item.available);
  if (!product) return null;
  const variant = product.variants?.find((option) => option.id === line.variantId);
  if (product.variants?.length && !variant) return null;
  const extras = [...new Set(line.addonIds)].map((id) =>
    product.addons?.find((option) => option.id === id),
  );
  if (extras.some((extra) => !extra)) return null;
  const addons = extras.filter((extra) => extra !== undefined);
  const unitPrice =
    (variant?.price ?? product.price) + addons.reduce((sum, extra) => sum + extra.price, 0);
  return { product, variant, addons, unitPrice, total: unitPrice * line.quantity };
}
export function cartTotals(lines: CartLine[], method: Method, zoneId = "") {
  const subtotal = lines.reduce((sum, line) => sum + (resolveLine(line)?.total ?? 0), 0);
  const fee =
    method === "pickup" || lines.length === 0
      ? 0
      : (restaurant.deliveryZones.find((zone) => zone.id === zoneId)?.fee ?? null);
  return { subtotal, deliveryFee: fee, total: subtotal + (fee ?? 0) };
}
export function restoreCart(value: string | null): CartLine[] {
  if (!value) return [];
  try {
    const parsed = z.array(cartLineSchema).max(100).safeParse(JSON.parse(value));
    if (!parsed.success) return [];
    return parsed.data.filter(
      (line, i, all) => resolveLine(line) && all.findIndex((other) => other.id === line.id) === i,
    );
  } catch {
    return [];
  }
}
