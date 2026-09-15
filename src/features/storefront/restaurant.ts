/** Public menu and hours: https://foodguy.pk/ (checked 2026-09-15).
 * Address / coordinates: the restaurant's Google Maps listing.
 * Delivery fees, boundaries, payment policy and WhatsApp capability need merchant approval.
 */
export const restaurant = {
  name: "FOODGUY",
  tagline: "Bite Into Perfection",
  logo: null as string | null,
  phone: "+923030910009",
  phoneDisplay: "0303-091-0009",
  whatsappNumber: "923030910009",
  address: "392, Block F, Phase 1, Johar Town, Lahore",
  coordinates: { lat: 31.4646005, lng: 74.2892755 },
  mapsUrl:
    "https://www.google.com/maps/place/foodguy/data=!4m2!3m1!1s0x391903ae03dcae6f:0x770281763d52d74d",
  openingHours: "11:30 AM – 5:00 AM",
  timezone: "Asia/Karachi",
  preparationTime: null as string | null,
  minimumOrder: null as number | null,
  pickup: true,
  delivery: true,
  deliveryRadiusKm: 25,
  coverageConfirmed: false,
  deliveryZones: [
    { id: "johar-town", name: "Johar Town", fee: null as number | null, confirmed: false },
    {
      id: "other",
      name: "Another area — request availability",
      fee: null as number | null,
      confirmed: false,
    },
  ],
  paymentMethods: { pickup: "Cash on pickup", delivery: "Cash on delivery" },
  raast: null as { name: string; id: string } | null,
  socialUrls: [] as { name: string; url: string }[],
};

export const features = { dashboard: false, whatsappAutomation: false, aiOrdering: false };
