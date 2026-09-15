"use client";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Bike,
  Clock3,
  Flame,
  MapPin,
  Menu as MenuIcon,
  MessageCircle,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { menu, categories, type MenuItem } from "./menu";
import { restaurant } from "./restaurant";
import { cartTotals, money, restoreCart, type CartLine, type Method } from "./cart";
import { FoodImage, ProductDialog } from "./product";
import { OrderPanel } from "./order-panel";
import { Location } from "./location";

const CART_KEY = "foodguy.cart.v1";
const faqs = [
  [
    "Which areas do you deliver to?",
    "We’re based in Johar Town, Lahore. Select your area at checkout or call us. Delivery boundaries are awaiting restaurant approval; the map’s radius is an illustrative guide.",
  ],
  [
    "How much does delivery cost?",
    "A delivery fee is not published yet. Your cart shows the food total separately, and Foodguy will confirm any delivery charge on WhatsApp before you agree to the order.",
  ],
  [
    "When is my order confirmed?",
    "Opening WhatsApp does not place or confirm an order. Review your message, press Send, and wait for Foodguy to confirm availability, the final price and timing.",
  ],
  [
    "Can I make it my own?",
    "Yes. Choose an available size, select listed extras, and leave item instructions. Custom requests and ingredient availability need restaurant confirmation. For allergies, please call before ordering.",
  ],
  [
    "Which payment methods can I use?",
    "This ordering flow requests cash on delivery or cash on pickup. The restaurant must approve the payment policy before launch. No online payment is collected here.",
  ],
  [
    "Can I order ahead?",
    "Advance-order policy is awaiting restaurant approval. Include your preferred time in the notes and wait for the restaurant to confirm it.",
  ],
  [
    "What if WhatsApp doesn’t open?",
    `Copy the order summary and paste it into WhatsApp, or call ${restaurant.phoneDisplay}. Your cart remains saved on this device.`,
  ],
];
function Wordmark() {
  return (
    <span className="wordmark">
      FOOD<span>GUY</span>
    </span>
  );
}
export function Storefront() {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [storageNotice, setStorageNotice] = useState("");
  const [method, setMethod] = useState<Method>("pickup");
  const [category, setCategory] = useState("Burgers");
  const [search, setSearch] = useState("");
  const [product, setProduct] = useState<{ item: MenuItem; line?: CartLine } | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [notice, setNotice] = useState("");
  const [policy, setPolicy] = useState<"Privacy" | "Order policy" | null>(null);
  useEffect(() => {
    // Hydrate after mounting so localStorage never changes the server-rendered HTML.
    const frame = requestAnimationFrame(() => {
      try {
        setLines(restoreCart(localStorage.getItem(CART_KEY)));
      } catch {
        setStorageNotice("Device storage is unavailable. Your cart will stay for this visit only.");
      }
      setLoaded(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const changeCart = (next: CartLine[]) => {
    setLines(next);
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(next));
    } catch {
      setStorageNotice("Your browser couldn’t save the cart. Keep this tab open until you finish.");
    }
  };
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const totals = cartTotals(lines, method);
  const filtered = menu.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      `${item.name} ${item.category} ${item.description}`
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  const hero = menu.find((item) => item.id === "super-zinger") ?? menu[0];
  const choose = (item: MenuItem) => {
    setProduct({ item });
    setNotice("");
  };
  const save = (line: CartLine) => {
    changeCart(
      lines.some((existing) => existing.id === line.id)
        ? lines.map((existing) => (existing.id === line.id ? line : existing))
        : [...lines, line],
    );
    setNotice(`${menu.find((item) => item.id === line.productId)?.name} added to your bag.`);
  };
  return (
    <div className="storefront">
      <a className="skip-link" href="#menu">
        Skip to menu
      </a>
      <div className="announcement">
        <span>BIG CRAVINGS. LATE NIGHTS. GOOD FOOD.</span>
        <span>
          <Clock3 size={13} /> {restaurant.openingHours}
        </span>
      </div>
      <header className="sf-header">
        <div className="sf-container header-inner">
          <a href="#" aria-label="Foodguy home">
            <Wordmark />
          </a>
          <nav aria-label="Main navigation">
            <a href="#menu">Our menu</a>
            <a href="#location">Find your Foodguy</a>
            <a href="#how-it-works">How it works</a>
          </nav>
          <div className="header-actions">
            <a className="header-phone" href={`tel:${restaurant.phone}`} aria-label="Call Foodguy">
              <Phone size={19} />
            </a>
            <a href="#menu" className="sf-button header-order">
              Order now <ArrowUpRight size={17} />
            </a>
            <button
              id="header-cart"
              className="cart-button"
              aria-label={`Open cart, ${count} items`}
              onClick={() => setCartOpen(true)}
            >
              <ShoppingBag size={21} />
              <span>{count}</span>
            </button>
            <button
              className="icon-button mobile-menu-button"
              aria-label={mobileNav ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileNav}
              aria-controls="mobile-navigation"
              onClick={() => setMobileNav(!mobileNav)}
            >
              {mobileNav ? <X /> : <MenuIcon />}
            </button>
          </div>
        </div>
        {mobileNav && (
          <nav id="mobile-navigation" className="mobile-navigation" aria-label="Mobile navigation">
            {[
              ["Our menu", "#menu"],
              ["Location & delivery", "#location"],
              ["How it works", "#how-it-works"],
              ["Contact", "#contact"],
            ].map(([label, href]) => (
              <a href={href} key={href} onClick={() => setMobileNav(false)}>
                {label}
                <ArrowUpRight size={18} />
              </a>
            ))}
          </nav>
        )}
      </header>
      <main>
        <section className="hero sf-container">
          <div className="hero-copy">
            <div className="eyebrow">
              <span className="small-rule" /> JOHAR TOWN, LAHORE
            </div>
            <h1>
              BIG ON
              <br />
              FLAVOUR.
              <br />
              <span>BIG ON YOU.</span>
            </h1>
            <p>
              Your burger. Your extras. Your kind of good.
              <br className="desktop-break" /> Burgers, wraps and late-night cravings, sorted.
            </p>
            <div className="hero-actions">
              <a className="sf-button" href="#menu">
                Let’s order <ArrowUpRight size={21} />
              </a>
              <a href="#menu" className="view-menu">
                View the menu <ArrowDown size={17} />
              </a>
            </div>
            <div className="hero-footnote">
              <Store size={16} /> Pickup <span>+</span>
              <Bike size={18} /> Delivery <span className="footnote-rule" /> Straight from your
              Foodguy
            </div>
          </div>
          <div className="hero-visual">
            <span className="hero-outline" aria-hidden="true">
              ONE BIG
              <br />
              BITE.
            </span>
            <div className="hero-food">
              <FoodImage item={hero} hero />
            </div>
            <div className="hero-price">
              <span>MEET THE</span>
              <strong>Super Zinger</strong>
              <span>
                {money(hero.price)} <ArrowUpRight size={17} />
              </span>
            </div>
            <span className="hero-caption">BITE INTO PERFECTION.</span>
          </div>
        </section>
        <div className="info-strip">
          <div className="sf-container info-strip-inner">
            <div>
              <Clock3 />
              <span>
                <strong>For your late-night cravings</strong>
                <small>Listed hours: {restaurant.openingHours}</small>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <strong>Your neighbourhood spot</strong>
                <small>Johar Town, Lahore</small>
              </span>
            </div>
            <div>
              <MessageCircle />
              <span>
                <strong>Order directly on WhatsApp</strong>
                <small>Send your request. Wait for confirmation.</small>
              </span>
            </div>
          </div>
        </div>
        <section className="menu-section sf-container" id="menu">
          <div className="menu-heading">
            <div>
              <span className="eyebrow">THE GOOD STUFF</span>
              <h2>What are you craving?</h2>
              <p>Find your favourite. Make it your own.</p>
            </div>
            <div className="fulfilment" aria-label="Choose order method">
              <button aria-pressed={method === "pickup"} onClick={() => setMethod("pickup")}>
                <Store size={17} /> Pickup
              </button>
              <button aria-pressed={method === "delivery"} onClick={() => setMethod("delivery")}>
                <Bike size={19} /> Delivery
              </button>
            </div>
          </div>
          <div className="menu-tools">
            <div className="categories" aria-label="Menu categories">
              {categories.map((name) => (
                <button
                  key={name}
                  aria-pressed={category === name}
                  onClick={() => setCategory(name)}
                >
                  {name === "All" && <Flame size={16} />}
                  {name}
                </button>
              ))}
            </div>
            <label className="menu-search">
              <Search size={18} />
              <span className="sr-only">Search the menu</span>
              <input
                value={search}
                placeholder="Find your next bite…"
                onChange={(event) => setSearch(event.target.value)}
              />
              {search && (
                <button aria-label="Clear search" onClick={() => setSearch("")}>
                  <X size={16} />
                </button>
              )}
            </label>
          </div>
          <div className="menu-results">
            <span>
              {category === "All" ? "The full menu" : category} <small>({filtered.length})</small>
            </span>
            <span>Prices in PKR · Availability confirmed on order</span>
          </div>
          <div className="product-grid">
            {filtered.map((item) => (
              <article
                className={`product-card ${!item.available ? "sold-out" : ""}`}
                key={item.id}
              >
                <button
                  className="product-photo"
                  onClick={() => choose(item)}
                  disabled={!item.available || !loaded}
                  aria-label={`Customize ${item.name}`}
                >
                  <FoodImage item={item} />
                  {item.label && <span className="food-label">{item.label}</span>}
                  {!item.available && <span className="food-label">Sold out</span>}
                  <span className="photo-arrow">
                    <ArrowUpRight size={19} />
                  </span>
                </button>
                <div className="product-info">
                  <span className="product-category">{item.category}</span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <div className="product-bottom">
                    <strong>
                      {item.variants && <small>From </small>}
                      {money(item.price)}
                    </strong>
                    <button
                      id={`add-${item.id}`}
                      className="add-button"
                      disabled={!item.available || !loaded}
                      aria-label={`Add ${item.name}`}
                      onClick={() => choose(item)}
                    >
                      {item.available ? (
                        <>
                          <Plus size={17} /> Add
                        </>
                      ) : (
                        "Sold out"
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="menu-empty">
              <Search size={34} />
              <h3>No bites found.</h3>
              <p>Try another name or explore the full menu.</p>
              <button
                className="sf-button secondary"
                onClick={() => {
                  setCategory("All");
                  setSearch("");
                }}
              >
                Show all food
              </button>
            </div>
          )}
          <p className="menu-disclaimer">
            Menu prices match our published menu. Let us confirm availability and any special
            requests before you order.
          </p>
        </section>
        <section className="ordering-steps" id="how-it-works">
          <div className="sf-container">
            <div>
              <span className="eyebrow">LESS SCROLLING. MORE EATING.</span>
              <h2>Three steps to your next bite.</h2>
            </div>
            <ol>
              <li>
                <span>01</span>
                <div>
                  <h3>Find your food.</h3>
                  <p>Pick a favourite. Choose your extras.</p>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  <h3>Make it yours.</h3>
                  <p>Review your bag and add your details.</p>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  <h3>Say it on WhatsApp.</h3>
                  <p>Press Send. Wait for our confirmation.</p>
                </div>
              </li>
            </ol>
          </div>
        </section>
        <Location />
        <section className="faq-section sf-container">
          <div>
            <span className="eyebrow">A LITTLE HELP ON THE SIDE</span>
            <h2>
              Good questions.
              <br />
              Straight answers.
            </h2>
            <p>Still wondering about something?</p>
            <a className="text-button" href={`tel:${restaurant.phone}`}>
              Give us a call <ArrowUpRight size={18} />
            </a>
          </div>
          <div className="faq-list">
            {faqs.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <Plus size={19} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="final-cta">
          <div className="sf-container">
            <div>
              <span className="eyebrow">YOU’VE SCROLLED. NOW TAKE A BITE.</span>
              <h2>
                YOUR NEXT GOOD
                <br />
                DECISION IS FOOD.
              </h2>
            </div>
            <div>
              <a className="sf-button" href="#menu">
                Browse the menu <ArrowUpRight size={20} />
              </a>
              <button className="cta-whatsapp" onClick={() => setCartOpen(true)}>
                <MessageCircle size={19} /> Order on WhatsApp <ArrowRight size={18} />
              </button>
              <a href={`tel:${restaurant.phone}`}>{restaurant.phoneDisplay}</a>
            </div>
          </div>
        </section>
      </main>
      <footer className="sf-footer" id="contact">
        <div className="sf-container footer-main">
          <div>
            <a href="#" aria-label="Foodguy home">
              <Wordmark />
            </a>
            <p>
              Bite Into Perfection.
              <br />
              Your burger and wrap stop in Johar Town.
            </p>
          </div>
          <div>
            <h3>Find your next bite</h3>
            <a href="#menu">Our menu</a>
            <a href="#location">Location & delivery</a>
            <a href="#how-it-works">How to order</a>
          </div>
          <div>
            <h3>Come say hello</h3>
            <address>{restaurant.address}</address>
            <span>{restaurant.openingHours}</span>
          </div>
          <div>
            <h3>Let’s talk food</h3>
            <a href={`tel:${restaurant.phone}`}>{restaurant.phoneDisplay}</a>
            <a
              href={`https://wa.me/${restaurant.whatsappNumber}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp <ArrowUpRight size={14} />
            </a>
            {restaurant.socialUrls.map((social) => (
              <a href={social.url} key={social.name}>
                {social.name}
              </a>
            ))}
          </div>
        </div>
        <div className="sf-container footer-bottom">
          <span>© {new Date().getFullYear()} FOODGUY. All good things reserved.</span>
          <div>
            <button onClick={() => setPolicy("Privacy")}>Privacy</button>
            <button onClick={() => setPolicy("Order policy")}>Order policy</button>
            <span>Made for good appetites.</span>
          </div>
        </div>
      </footer>
      <div className="cart-announcement" role="status">
        {notice && (
          <button onClick={() => setCartOpen(true)}>
            <CheckNotice />
            {notice}
            <span>View bag →</span>
          </button>
        )}
        {storageNotice && <p>{storageNotice}</p>}
      </div>
      {count > 0 && !cartOpen && !product && (
        <button className="mobile-cart-bar" onClick={() => setCartOpen(true)}>
          <span>
            <ShoppingBag size={19} />
            {count} {count === 1 ? "item" : "items"}
          </span>
          <strong>View your bag</strong>
          <span>{money(totals.subtotal)}</span>
        </button>
      )}
      {product && (
        <ProductDialog
          key={product.line?.id ?? product.item.id}
          item={product.item}
          initial={product.line}
          close={() => setProduct(null)}
          save={save}
        />
      )}
      {cartOpen && !product && (
        <OrderPanel
          lines={lines}
          change={changeCart}
          method={method}
          setMethod={setMethod}
          close={() => setCartOpen(false)}
          edit={(line) => {
            const item = menu.find((item) => item.id === line.productId);
            if (item) setProduct({ item, line });
          }}
        />
      )}
      {policy && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) setPolicy(null);
          }}
        >
          <DialogContent className="sf-modal sf-policy">
            <DialogTitle>{policy} — draft</DialogTitle>
            <DialogDescription>
              Restaurant approval required before public launch.
            </DialogDescription>
            <p>
              {policy === "Privacy"
                ? "Your food selections are stored in this browser. Checkout details are held in this tab and passed to WhatsApp only when you open the order link. The location checker calculates distance in your browser. The embedded map and external images are served by third parties. A complete privacy policy and retention terms must be supplied by the restaurant."
                : "Orders are requests until Foodguy confirms availability, final pricing, delivery and timing. Cancellation, refunds, substitutions, advance orders and payment terms need restaurant approval. This draft does not establish a refund or cancellation policy."}
            </p>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
function CheckNotice() {
  return <ShoppingBag size={17} />;
}
