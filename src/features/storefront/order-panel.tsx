"use client";

import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Copy,
  MessageCircle,
  ShoppingBag,
  Trash2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cartTotals, money, resolveLine, type CartLine, type Method } from "./cart";
import { FoodImage, Quantity } from "./product";
import { restaurant } from "./restaurant";
import { checkoutSchema, orderMessage, whatsappLink, type CheckoutDetails } from "./whatsapp";

export function OrderPanel({
  lines,
  change,
  edit,
  close,
  method,
  setMethod,
}: {
  lines: CartLine[];
  change: (lines: CartLine[]) => void;
  edit: (line: CartLine) => void;
  close: () => void;
  method: Method;
  setMethod: (method: Method) => void;
}) {
  const [stage, setStage] = useState<"cart" | "checkout" | "review">("cart");
  const [details, setDetails] = useState<CheckoutDetails>({
    name: "",
    phone: "",
    method,
    address: "",
    landmark: "",
    zone: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState("");
  const [opened, setOpened] = useState(false);
  const totals = cartTotals(lines, method, details.zone);
  const message = stage === "review" ? orderMessage(lines, { ...details, method }) : "";
  const link = whatsappLink(message);
  const update = (key: keyof CheckoutDetails, value: string) => {
    setDetails((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = checkoutSchema.safeParse({
      ...details,
      method,
      phone: details.phone.replace(/[\s()-]/g, ""),
    });
    if (!parsed.success) {
      const nextErrors = Object.fromEntries(
        parsed.error.issues.map((issue) => [String(issue.path[0]), issue.message]),
      );
      setErrors(nextErrors);
      document.getElementById(`order-${String(parsed.error.issues[0]?.path[0])}`)?.focus();
      return;
    }
    setDetails(parsed.data);
    setStage("review");
  };
  const field = (
    key: "name" | "phone" | "address" | "landmark" | "notes",
    label: string,
    placeholder: string,
    optional = false,
  ) => (
    <label className="field" key={key} htmlFor={`order-${key}`}>
      {label}
      {optional && <small>Optional</small>}
      <input
        id={`order-${key}`}
        value={details[key]}
        type={key === "phone" ? "tel" : "text"}
        autoComplete={
          key === "name"
            ? "name"
            : key === "phone"
              ? "tel"
              : key === "address"
                ? "street-address"
                : "off"
        }
        maxLength={key === "notes" ? 500 : key === "address" ? 400 : 150}
        placeholder={placeholder}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `error-${key}` : undefined}
        onChange={(event) => update(key, event.target.value)}
      />
      {errors[key] && (
        <span className="field-error" id={`error-${key}`}>
          {errors[key]}
        </span>
      )}
    </label>
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="sf-modal sf-cart"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById("header-cart")?.focus();
        }}
      >
        <div className="order-heading">
          <span className="eyebrow">GOOD FOOD. JUST A FEW TAPS AWAY.</span>
          <DialogTitle>
            {stage === "cart"
              ? "Your good-food bag."
              : stage === "checkout"
                ? "A few last details."
                : "Ready for WhatsApp."}
          </DialogTitle>
          <DialogDescription>
            {stage === "cart"
              ? `${lines.reduce((sum, line) => sum + line.quantity, 0)} items · made your way`
              : stage === "checkout"
                ? "No account needed. Just you and your next meal."
                : "Review your request, then press Send inside WhatsApp."}
          </DialogDescription>
        </div>
        {!lines.length ? (
          <div className="empty-cart">
            <ShoppingBag size={52} strokeWidth={1} />
            <h3>Something good belongs here.</h3>
            <p>Find your favourite and make it yours.</p>
            <button className="sf-button" onClick={close}>
              Explore the menu <ArrowUpRight size={18} />
            </button>
          </div>
        ) : (
          <>
            <div className="order-scroll">
              {stage !== "review" && (
                <div className="fulfilment" aria-label="Order method">
                  <button aria-pressed={method === "pickup"} onClick={() => setMethod("pickup")}>
                    Pickup
                  </button>
                  <button
                    aria-pressed={method === "delivery"}
                    onClick={() => setMethod("delivery")}
                  >
                    Delivery
                  </button>
                </div>
              )}
              {stage === "cart" && (
                <div className="cart-lines">
                  {lines.map((line) => {
                    const item = resolveLine(line);
                    if (!item) return null;
                    return (
                      <article className="cart-line" key={line.id}>
                        <div className="cart-photo">
                          <FoodImage item={item.product} />
                        </div>
                        <div>
                          <div className="line-heading">
                            <h3>{item.product.name}</h3>
                            <strong>{money(item.total)}</strong>
                          </div>
                          <p>
                            {[item.variant?.name, ...item.addons.map((extra) => extra.name)]
                              .filter(Boolean)
                              .join(" · ") || "As listed"}
                          </p>
                          {line.notes && <p className="line-note">{line.notes}</p>}
                          <div className="line-actions">
                            <Quantity
                              value={line.quantity}
                              name={item.product.name}
                              onChange={(quantity) =>
                                change(
                                  lines.map((current) =>
                                    current.id === line.id ? { ...current, quantity } : current,
                                  ),
                                )
                              }
                            />
                            <button className="text-button" onClick={() => edit(line)}>
                              Edit
                            </button>
                            <button
                              className="icon-button"
                              aria-label={`Remove ${item.product.name}`}
                              onClick={() =>
                                change(lines.filter((current) => current.id !== line.id))
                              }
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
              {stage === "checkout" && (
                <form id="checkout-form" onSubmit={submit} noValidate>
                  {field("name", "Full name", "Your name")}
                  {field("phone", "Mobile number", "03031234567")}
                  {method === "delivery" ? (
                    <>
                      {field("address", "Delivery address", "House, street, block and area")}
                      {field("landmark", "Nearby landmark", "Help your rider find you", true)}
                      <label className="field" htmlFor="order-zone">
                        Delivery area
                        <select
                          id="order-zone"
                          value={details.zone}
                          aria-invalid={Boolean(errors.zone)}
                          aria-describedby={errors.zone ? "error-zone" : "zone-note"}
                          onChange={(event) => update("zone", event.target.value)}
                        >
                          <option value="">Select your area</option>
                          {restaurant.deliveryZones.map((zone) => (
                            <option key={zone.id} value={zone.id}>
                              {zone.name}
                            </option>
                          ))}
                        </select>
                        {errors.zone && (
                          <span className="field-error" id="error-zone">
                            {errors.zone}
                          </span>
                        )}
                        <small id="zone-note">
                          We’ll confirm coverage and the delivery fee on WhatsApp.
                        </small>
                      </label>
                    </>
                  ) : (
                    <p className="soft-note">
                      Pickup from {restaurant.address}. Please wait for a confirmed pickup time.
                    </p>
                  )}
                  <fieldset>
                    <legend>Payment method</legend>
                    <label className="choice-row">
                      <span>
                        <input type="radio" checked readOnly name="payment" />
                        {restaurant.paymentMethods[method]}
                      </span>
                    </label>
                    <small>
                      Cash payment is requested with your order; the restaurant confirms available
                      methods.
                    </small>
                    {restaurant.raast && (
                      <p>
                        Raast: {restaurant.raast.name} · {restaurant.raast.id}. Confirm details with
                        the restaurant before paying.
                      </p>
                    )}
                  </fieldset>
                  {field("notes", "Order notes", "Anything else we should know?", true)}
                </form>
              )}
              {stage === "review" && (
                <>
                  <div className="review-note">
                    <Check size={20} />
                    <p>
                      Your request is ready. <strong>Your order is not confirmed yet.</strong>{" "}
                      Foodguy must confirm availability, delivery charges and timing.
                    </p>
                  </div>
                  <pre className="order-preview">{message}</pre>
                  <button
                    className="text-button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(message);
                        setCopied("Order copied.");
                      } catch {
                        setCopied(
                          "Copy unavailable. Select and copy the summary above, or call us.",
                        );
                      }
                    }}
                  >
                    <Copy size={16} /> Copy order summary
                  </button>
                  <p role="status">{copied}</p>
                  {opened && (
                    <p className="soft-note" role="status">
                      WhatsApp opened in another tab. Press Send there. If it didn’t open, use the
                      link again, copy your summary, or call {restaurant.phoneDisplay}.
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="order-bottom">
              <dl className="totals">
                <div>
                  <dt>Subtotal</dt>
                  <dd>{money(totals.subtotal)}</dd>
                </div>
                <div>
                  <dt>{method === "pickup" ? "Pickup" : "Delivery fee"}</dt>
                  <dd>
                    {totals.deliveryFee === null ? "To be confirmed" : money(totals.deliveryFee)}
                  </dd>
                </div>
                <div className="total">
                  <dt>{totals.deliveryFee === null ? "Total before delivery" : "Total"}</dt>
                  <dd>{money(totals.total)}</dd>
                </div>
              </dl>
              {stage === "cart" && (
                <button className="sf-button full" onClick={() => setStage("checkout")}>
                  Continue to checkout <ArrowUpRight size={20} />
                </button>
              )}
              {stage === "checkout" && (
                <button className="sf-button full" type="submit" form="checkout-form">
                  Review WhatsApp order <ArrowUpRight size={20} />
                </button>
              )}
              {stage === "review" &&
                (link ? (
                  <a
                    className="sf-button full"
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setOpened(true)}
                  >
                    <MessageCircle size={20} /> Open WhatsApp to send <ArrowUpRight size={20} />
                  </a>
                ) : (
                  <p role="alert">
                    WhatsApp is not configured. Please call{" "}
                    <a href={`tel:${restaurant.phone}`}>{restaurant.phoneDisplay}</a>.
                  </p>
                ))}
              {stage !== "cart" && (
                <button
                  className="back-button"
                  onClick={() => {
                    setStage(stage === "review" ? "checkout" : "cart");
                    setOpened(false);
                  }}
                >
                  <ArrowLeft size={15} />
                  {stage === "review" ? "Edit details" : "Back to cart"}
                </button>
              )}
              <small className="checkout-note">
                Your details stay in this tab until you choose to open WhatsApp.
              </small>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
