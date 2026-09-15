import type { Metadata } from "next";
import { Storefront } from "@/features/storefront/storefront";
import "@/features/storefront/storefront.css";

export const metadata: Metadata = {
  title: { absolute: "FOODGUY · Bite Into Perfection" },
  description:
    "Explore Foodguy’s burgers, wraps and snacks in Johar Town, Lahore. Customize your food, choose pickup or delivery, and request your order on WhatsApp.",
};
export default function HomePage() {
  return <Storefront />;
}
