import { z } from "zod";
import { cartTotals, money, resolveLine, type CartLine } from "./cart";
import { restaurant } from "./restaurant";

export const checkoutSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(80),
    phone: z
      .string()
      .trim()
      .regex(/^(?:\+?92|0)3\d{9}$/, "Enter a Pakistani mobile number, e.g. 03031234567."),
    method: z.enum(["pickup", "delivery"]),
    address: z.string().trim().max(400),
    landmark: z.string().trim().max(150),
    zone: z.string(),
    notes: z.string().trim().max(500),
  })
  .superRefine((data, context) => {
    if (data.method === "delivery") {
      if (data.address.length < 8)
        context.addIssue({
          code: "custom",
          path: ["address"],
          message: "Enter your house, street and area.",
        });
      if (!restaurant.deliveryZones.some((zone) => zone.id === data.zone))
        context.addIssue({ code: "custom", path: ["zone"], message: "Select your delivery area." });
    }
  });
export type CheckoutDetails = z.infer<typeof checkoutSchema>;
const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ");
export function orderMessage(lines: CartLine[], details: CheckoutDetails) {
  const totals = cartTotals(lines, details.method, details.zone);
  const items = lines.map((line) => {
    const item = resolveLine(line);
    if (!item) throw new Error("An item is no longer available. Please review your cart.");
    return [
      `${line.quantity}× ${item.product.name}${item.variant ? ` (${item.variant.name})` : ""} — ${money(item.total)}`,
      ...item.addons.map((extra) => `  + ${extra.name}`),
      ...(line.notes ? [`  Instructions: ${oneLine(line.notes)}`] : []),
    ].join("\n");
  });
  return [
    "New Website Order",
    "",
    `Customer: ${oneLine(details.name)}`,
    `Phone: ${details.phone}`,
    `Order Type: ${details.method === "pickup" ? "Pickup" : "Delivery"}`,
    "",
    ...items,
    "",
    `Subtotal: ${money(totals.subtotal)}`,
    `Delivery: ${totals.deliveryFee === null ? "To be confirmed by restaurant" : money(totals.deliveryFee)}`,
    `Total${totals.deliveryFee === null ? " before delivery" : ""}: ${money(totals.total)}`,
    "",
    ...(details.method === "delivery"
      ? [
          `Address: ${oneLine(details.address)}`,
          `Area: ${restaurant.deliveryZones.find((zone) => zone.id === details.zone)?.name}`,
          `Landmark: ${oneLine(details.landmark) || "Not provided"}`,
        ]
      : [`Pickup: ${restaurant.address}`]),
    `Payment: ${restaurant.paymentMethods[details.method]}`,
    ...(details.notes ? [`Notes: ${oneLine(details.notes)}`] : []),
    "",
    "Please confirm availability, final price and timing. This is an order request.",
  ].join("\n");
}
export function whatsappLink(message: string) {
  if (!/^[1-9]\d{7,14}$/.test(restaurant.whatsappNumber)) return null;
  return `https://wa.me/${restaurant.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
