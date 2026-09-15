"use client";

import Image from "next/image";
import { useState } from "react";
import { Plus, Minus, UtensilsCrossed } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { money, resolveLine, type CartLine } from "./cart";
import type { MenuItem } from "./menu";

export function FoodImage({ item, hero = false }: { item: MenuItem; hero?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (!item.image || failed)
    return (
      <div className="food-placeholder">
        <UtensilsCrossed size={36} aria-hidden="true" />
        <span>{item.name}</span>
        <small>Photo coming soon</small>
      </div>
    );
  return (
    <Image
      src={item.image}
      alt={item.name}
      fill
      sizes={
        hero
          ? "(max-width: 700px) 100vw, 55vw"
          : "(max-width: 600px) 50vw, (max-width: 1024px) 33vw, 25vw"
      }
      preload={hero}
      onError={() => setFailed(true)}
    />
  );
}
export function Quantity({
  value,
  onChange,
  name = "item",
}: {
  value: number;
  onChange: (value: number) => void;
  name?: string;
}) {
  return (
    <div className="quantity">
      <button
        type="button"
        aria-label={`Decrease ${name} quantity`}
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
      >
        <Minus size={16} />
      </button>
      <output aria-label={`${name} quantity`}>{value}</output>
      <button
        type="button"
        aria-label={`Increase ${name} quantity`}
        disabled={value >= 99}
        onClick={() => onChange(value + 1)}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}
export function ProductDialog({
  item,
  initial,
  close,
  save,
}: {
  item: MenuItem;
  initial?: CartLine;
  close: () => void;
  save: (line: CartLine) => void;
}) {
  const [variantId, setVariant] = useState(initial?.variantId ?? "");
  const [addonIds, setAddons] = useState<string[]>(initial?.addonIds ?? []);
  const [quantity, setQuantity] = useState(initial?.quantity ?? 1);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const line: CartLine = {
    id: initial?.id ?? "preview",
    productId: item.id,
    variantId: variantId || undefined,
    addonIds,
    quantity,
    notes,
  };
  const resolved = resolveLine(line);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        className="sf-modal sf-product"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          document.getElementById(`add-${item.id}`)?.focus();
        }}
      >
        <div className="product-modal-photo">
          <FoodImage item={item} />
        </div>
        <div className="modal-body">
          <span className="eyebrow">MAKE IT YOURS</span>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>{item.description}</DialogDescription>
          {item.variants && (
            <fieldset>
              <legend>
                Choose your size <span className="required-tag">Required</span>
              </legend>
              {item.variants.map((variant) => (
                <label className="choice-row" key={variant.id}>
                  <span>
                    <input
                      type="radio"
                      name="variant"
                      value={variant.id}
                      checked={variantId === variant.id}
                      onChange={() => setVariant(variant.id)}
                    />
                    {variant.name}
                  </span>
                  <strong>{money(variant.price)}</strong>
                </label>
              ))}
            </fieldset>
          )}
          {item.addons && (
            <fieldset>
              <legend>
                Something extra? <small>Optional</small>
              </legend>
              {item.addons.map((addon) => (
                <label className="choice-row" key={addon.id}>
                  <span>
                    <input
                      type="checkbox"
                      checked={addonIds.includes(addon.id)}
                      onChange={(event) =>
                        setAddons(
                          event.target.checked
                            ? [...addonIds, addon.id]
                            : addonIds.filter((id) => id !== addon.id),
                        )
                      }
                    />
                    {addon.name}
                  </span>
                  <span>+ {money(addon.price)}</span>
                </label>
              ))}
            </fieldset>
          )}
          <label className="field">
            Special instructions{" "}
            <small>Optional · allergens? Please call us before ordering.</small>
            <textarea
              maxLength={300}
              rows={2}
              placeholder="Anything you’d like us to know?"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
        </div>
        <div className="modal-action">
          <Quantity value={quantity} onChange={setQuantity} />
          <button
            className="sf-button"
            disabled={!resolved || !item.available}
            onClick={() => {
              save({ ...line, id: initial?.id ?? crypto.randomUUID() });
              close();
            }}
          >
            {resolved ? (
              <>
                {initial ? "Save changes" : "Add to cart"}
                <span>{money(resolved.total)}</span>
              </>
            ) : (
              "Choose a size first"
            )}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
