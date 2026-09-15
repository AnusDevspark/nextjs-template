import { describe, expect, it } from "vitest";
import { cartTotals, type CartLine } from "./cart";

describe("cart totals", () => {
  it("multiplies variants and extras by quantity and never treats an unquoted delivery as free", () => {
    const lines: CartLine[] = [
      {
        id: "a",
        productId: "zinger-wrap",
        variantId: "large",
        addonIds: ["cheese", "pickles"],
        quantity: 2,
        notes: "",
      },
      { id: "b", productId: "fries", variantId: "regular", addonIds: [], quantity: 1, notes: "" },
    ];
    expect(cartTotals(lines, "pickup")).toEqual({ subtotal: 2310, deliveryFee: 0, total: 2310 });
    expect(cartTotals(lines, "delivery", "johar-town")).toEqual({
      subtotal: 2310,
      deliveryFee: null,
      total: 2310,
    });
    expect(cartTotals([], "delivery")).toEqual({ subtotal: 0, deliveryFee: 0, total: 0 });
  });
});
