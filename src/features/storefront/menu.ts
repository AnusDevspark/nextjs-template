export type Option = { id: string; name: string; price: number };
export type MenuItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image?: string;
  variants?: Option[];
  addons?: Option[];
  available: boolean;
  label?: string;
};
const photo = (id: string) => `/food/${id}.webp`;
const wingPhoto = (id: string) => `/food/${id}.webp`;
export const addons: Option[] = [
  { id: "cheese", name: "Cheese", price: 50 },
  { id: "jalapeno", name: "Jalapeño", price: 50 },
  { id: "pickles", name: "Pickles", price: 50 },
  { id: "masala", name: "Masala", price: 30 },
  { id: "patty", name: "Extra patty", price: 300 },
];
export const categories = ["All", "Burgers", "Wraps", "Snacks", "Sauces", "Add-ons", "Drinks"];
// Names and prices from foodguy.pk. Variant prices are complete prices, not surcharges.
// Descriptions intentionally avoid unverified ingredients or dietary claims.
export const menu: MenuItem[] = [
  {
    id: "zinger-max",
    name: "Zinger Max",
    category: "Burgers",
    description: "Your next burger craving, sorted. Make it yours with extras.",
    price: 700,
    image: photo("47043354"),
    addons,
    available: true,
  },
  {
    id: "fillet-max",
    name: "Fillet Max",
    category: "Burgers",
    description: "The Fillet Max. Your burger, your choice of extras.",
    price: 700,
    image: photo("47043355"),
    addons,
    available: true,
  },
  {
    id: "zinger-pro",
    name: "Zinger Pro",
    category: "Burgers",
    description: "Go Pro on your next burger order.",
    price: 800,
    image: photo("66385445"),
    addons,
    available: true,
  },
  {
    id: "super-zinger",
    name: "Super Zinger",
    category: "Burgers",
    description: "A super-sized name for your next big craving.",
    price: 990,
    image: photo("87867707"),
    addons,
    available: true,
  },
  {
    id: "zinger-wrap",
    name: "Zinger Wrap",
    category: "Wraps",
    description: "Your Zinger order, all wrapped up. Regular or large.",
    price: 730,
    variants: [
      { id: "regular", name: "Regular", price: 730 },
      { id: "large", name: "Large", price: 930 },
    ],
    addons,
    available: true,
  },
  {
    id: "fillet-wrap",
    name: "Fillet Wrap",
    category: "Wraps",
    description: "Pick your size, add your extras, make it your own.",
    price: 730,
    variants: [
      { id: "regular", name: "Regular", price: 730 },
      { id: "large", name: "Large", price: 930 },
    ],
    addons,
    available: true,
  },
  {
    id: "fries",
    name: "Fries",
    category: "Snacks",
    description: "A side for your burger. Choose regular or large.",
    price: 250,
    variants: [
      { id: "regular", name: "Regular", price: 250 },
      { id: "large", name: "Large", price: 440 },
    ],
    available: true,
  },
  {
    id: "nuggets",
    name: "Nuggets",
    category: "Snacks",
    description: "A little extra on the side. Choose your portion.",
    price: 450,
    variants: [
      { id: "6", name: "6 pieces", price: 450 },
      { id: "9", name: "9 pieces", price: 620 },
      { id: "12", name: "12 pieces", price: 750 },
    ],
    available: true,
  },
  {
    id: "chip-strip",
    name: "Chip N Strip",
    category: "Snacks",
    description: "Chips and strips, together in one order.",
    price: 790,
    available: true,
  },
  {
    id: "crispy-wings",
    name: "Crispy Wings",
    category: "Snacks",
    description: "10 pieces. Add your favourite dip on the side.",
    price: 750,
    image: wingPhoto("e2fb4c79-7f1e-4be9-9023-246a6038d11d"),
    available: true,
  },
  {
    id: "kickin-wings",
    name: "Kickin’ Wings",
    category: "Snacks",
    description: "8 pieces. Something different for your next order.",
    price: 750,
    image: wingPhoto("0e5ed08d-377a-412c-8839-e06c45619500"),
    available: true,
  },
  {
    id: "glazin-wings",
    name: "Glazin’ Wings",
    category: "Snacks",
    description: "8 pieces. Complete your order with a side.",
    price: 750,
    image: wingPhoto("8933a813-96fe-4722-8118-6f6f458a9a55"),
    available: true,
  },
  ...["Mayonnaise", "Cocktail", "Creamy Hot", "Garlic", "Honey Mustard"].map((name) => ({
    id: name.toLowerCase().replaceAll(" ", "-"),
    name,
    category: "Sauces",
    description: "A little something extra for every bite.",
    price: 100,
    available: true,
  })),
  ...addons.map((option) => ({
    ...option,
    category: "Add-ons",
    description: "Add an extra to your order. Tell us which item it’s for.",
    available: true,
  })),
  {
    id: "strips",
    name: "3 Pc Strips",
    category: "Add-ons",
    description: "Three strips to add to your order.",
    price: 450,
    available: true,
  },
  {
    id: "cold-drink",
    name: "Cold Drink",
    category: "Drinks",
    description: "Choose a size. Request your preferred flavour in the notes.",
    price: 120,
    variants: [
      { id: "345ml", name: "345 ml", price: 120 },
      { id: "1.5l", name: "1.5 litre", price: 290 },
    ],
    available: true,
  },
  {
    id: "slice",
    name: "Slice Juice",
    category: "Drinks",
    description: "Add a drink to your meal.",
    price: 120,
    available: true,
  },
  {
    id: "water",
    name: "Water",
    category: "Drinks",
    description: "500 ml bottled water.",
    price: 120,
    available: true,
  },
  {
    id: "sting",
    name: "Sting",
    category: "Drinks",
    description: "500 ml. Served as listed on our menu.",
    price: 180,
    available: true,
  },
];
