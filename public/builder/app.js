const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const APP_LOGO_SRC = "/brand/book-and-buy-mark.png";

// One coherent icon family for the entire builder. Every glyph uses the same
// Lucide 24px grid and 1.6px strokes, matching the shared app icon family. The chrome
// stays consistent even when backend adapters are replaced later.
const UI_ICONS = Object.freeze({
  "lightbulb": '<path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.09 14a6 6 0 1 0-6.18 0c.65.5 1.09 1.12 1.09 2h4c0-.88.44-1.5 1.09-2Z"></path>',
  "paintbrush": '<path d="m14.622 17.897-10.68-2.913"></path><path d="M18.376 2.622a1 1 0 1 1 3.002 3.002L17.36 9.643a.5.5 0 0 0 0 .707l.944.944a2.41 2.41 0 0 1 0 3.408l-.944.944a.5.5 0 0 1-.707 0L8.354 7.348a.5.5 0 0 1 0-.707l.944-.944a2.41 2.41 0 0 1 3.408 0l.944.944a.5.5 0 0 0 .707 0z"></path><path d="M9 8c-1.804 2.71-3.97 3.46-6.583 3.948a.507.507 0 0 0-.302.819l7.32 8.883a1 1 0 0 0 1.185.204C12.735 20.405 16 16.792 16 15"></path>',
  "chevron-down": "<path d=\"m6 9 6 6 6-6\"></path>",
  "chevron-right": "<path d=\"m9 18 6-6-6-6\"></path>",
  "arrow-right": "<path d=\"M5 12h14\"></path><path d=\"m12 5 7 7-7 7\"></path>",
  "arrow-up": "<path d=\"m5 12 7-7 7 7\"></path><path d=\"M12 19V5\"></path>",
  "undo": "<path d=\"M9 14 4 9l5-5\"></path><path d=\"M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5a5.5 5.5 0 0 1-5.5 5.5H11\"></path>",
  "redo": "<path d=\"m15 14 5-5-5-5\"></path><path d=\"M20 9H9.5A5.5 5.5 0 0 0 4 14.5A5.5 5.5 0 0 0 9.5 20H13\"></path>",
  "share": "<circle cx=\"18\" cy=\"5\" r=\"3\"></circle><circle cx=\"6\" cy=\"12\" r=\"3\"></circle><circle cx=\"18\" cy=\"19\" r=\"3\"></circle><line x1=\"8.59\" x2=\"15.42\" y1=\"13.51\" y2=\"17.49\"></line><line x1=\"15.41\" x2=\"8.59\" y1=\"6.51\" y2=\"10.49\"></line>",
  "publish": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"></path><polyline points=\"17 8 12 3 7 8\"></polyline><line x1=\"12\" x2=\"12\" y1=\"3\" y2=\"15\"></line>",
  "eye": "<path d=\"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0\"></path><circle cx=\"12\" cy=\"12\" r=\"3\"></circle>",
  "eye-off": "<path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\"></path><path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\"></path><path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\"></path><path d=\"m2 2 20 20\"></path>",
  "code": "<polyline points=\"16 18 22 12 16 6\"></polyline><polyline points=\"8 6 2 12 8 18\"></polyline>",
  "plus-square": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"></rect><path d=\"M8 12h8\"></path><path d=\"M12 8v8\"></path>",
  "paperclip": "<path d=\"M13.234 20.252 21 12.3\"></path><path d=\"m16 6-8.414 8.586a2 2 0 0 0 0 2.828 2 2 0 0 0 2.828 0l8.414-8.586a4 4 0 0 0 0-5.656 4 4 0 0 0-5.656 0l-8.415 8.585a6 6 0 1 0 8.486 8.486\"></path>",
  "sliders": "<line x1=\"21\" x2=\"14\" y1=\"4\" y2=\"4\"></line><line x1=\"10\" x2=\"3\" y1=\"4\" y2=\"4\"></line><line x1=\"21\" x2=\"12\" y1=\"12\" y2=\"12\"></line><line x1=\"8\" x2=\"3\" y1=\"12\" y2=\"12\"></line><line x1=\"21\" x2=\"16\" y1=\"20\" y2=\"20\"></line><line x1=\"12\" x2=\"3\" y1=\"20\" y2=\"20\"></line><line x1=\"14\" x2=\"14\" y1=\"2\" y2=\"6\"></line><line x1=\"8\" x2=\"8\" y1=\"10\" y2=\"14\"></line><line x1=\"16\" x2=\"16\" y1=\"18\" y2=\"22\"></line>",
  "history": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"></path><path d=\"M3 3v5h5\"></path><path d=\"M12 7v5l4 2\"></path>",
  "square": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"></rect>",
  "panel-left": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"></rect><path d=\"M9 3v18\"></path>",
  "monitor": "<rect width=\"20\" height=\"14\" x=\"2\" y=\"3\" rx=\"2\"></rect><line x1=\"8\" x2=\"16\" y1=\"21\" y2=\"21\"></line><line x1=\"12\" x2=\"12\" y1=\"17\" y2=\"21\"></line>",
  "tablet": "<rect width=\"16\" height=\"20\" x=\"4\" y=\"2\" rx=\"2\" ry=\"2\"></rect><line x1=\"12\" x2=\"12.01\" y1=\"18\" y2=\"18\"></line>",
  "smartphone": "<rect width=\"14\" height=\"20\" x=\"5\" y=\"2\" rx=\"2\" ry=\"2\"></rect><path d=\"M12 18h.01\"></path>",
  "mouse-pointer": "<path d=\"M4.037 4.688a.495.495 0 0 1 .651-.651l16 6.5a.5.5 0 0 1-.063.947l-6.124 1.58a2 2 0 0 0-1.438 1.435l-1.579 6.126a.5.5 0 0 1-.947.063z\"></path>",
  "refresh": "<path d=\"M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8\"></path><path d=\"M21 3v5h-5\"></path>",
  "external-link": "<path d=\"M15 3h6v6\"></path><path d=\"M10 14 21 3\"></path><path d=\"M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6\"></path>",
  "browser": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\"></rect><path d=\"M3 9h18\"></path><path d=\"M9 21V9\"></path>",
  "pencil": "<path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\"></path><path d=\"m15 5 4 4\"></path>",
  "button-edit": "<rect width=\"20\" height=\"12\" x=\"2\" y=\"6\" rx=\"2\"></rect><path d=\"M12 12h.01\"></path><path d=\"M17 12h.01\"></path><path d=\"M7 12h.01\"></path>",
  "spacing": "<path d=\"M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1\"></path>",
  "move": "<path d=\"M12 2v20\"></path><path d=\"m15 19-3 3-3-3\"></path><path d=\"m19 9 3 3-3 3\"></path><path d=\"M2 12h20\"></path><path d=\"m5 9-3 3 3 3\"></path><path d=\"m9 5 3-3 3 3\"></path>",
  "copy": "<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\"></rect><path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\"></path>",
  "trash": "<path d=\"M3 6h18\"></path><path d=\"M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6\"></path><path d=\"M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2\"></path><line x1=\"10\" x2=\"10\" y1=\"11\" y2=\"17\"></line><line x1=\"14\" x2=\"14\" y1=\"11\" y2=\"17\"></line>",
  "more-horizontal": "<circle cx=\"12\" cy=\"12\" r=\"1\"></circle><circle cx=\"19\" cy=\"12\" r=\"1\"></circle><circle cx=\"5\" cy=\"12\" r=\"1\"></circle>",
  "upload": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"></path><polyline points=\"17 8 12 3 7 8\"></polyline><line x1=\"12\" x2=\"12\" y1=\"3\" y2=\"15\"></line>",
  "folder-up": "<path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\"></path><path d=\"M12 10v6\"></path><path d=\"m9 13 3-3 3 3\"></path>",
  "folder": "<path d=\"M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z\"></path>",
  "files": "<path d=\"M20 7h-3a2 2 0 0 1-2-2V2\"></path><path d=\"M9 18a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h7l4 4v10a2 2 0 0 1-2 2Z\"></path><path d=\"M3 7.6v12.8A1.6 1.6 0 0 0 4.6 22h9.8\"></path>",
  "download": "<path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"></path><polyline points=\"7 10 12 15 17 10\"></polyline><line x1=\"12\" x2=\"12\" y1=\"15\" y2=\"3\"></line>",
  "check": "<path d=\"M20 6 9 17l-5-5\"></path>",
  "x": "<path d=\"M18 6 6 18\"></path><path d=\"m6 6 12 12\"></path>",
  "keyboard": "<path d=\"M10 8h.01\"></path><path d=\"M12 12h.01\"></path><path d=\"M14 8h.01\"></path><path d=\"M16 12h.01\"></path><path d=\"M18 8h.01\"></path><path d=\"M6 8h.01\"></path><path d=\"M7 16h10\"></path><path d=\"M8 12h.01\"></path><rect width=\"20\" height=\"16\" x=\"2\" y=\"4\" rx=\"2\"></rect>",
  "rotate-ccw": "<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\"></path><path d=\"M3 3v5h5\"></path>",
  "message-square": "<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"></path>",
  "shield": "<path d=\"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z\"></path><path d=\"m9 12 2 2 4-4\"></path>",
  "file-code": "<path d=\"M4 22h14a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v4\"></path><path d=\"M14 2v4a2 2 0 0 0 2 2h4\"></path><path d=\"m5 12-3 3 3 3\"></path><path d=\"m9 18 3-3-3-3\"></path>",
  "braces": "<path d=\"M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5c0 1.1.9 2 2 2h1\"></path><path d=\"M16 21h1a2 2 0 0 0 2-2v-5c0-1.1.9-2 2-2a2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1\"></path>",
  "image": "<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\"></rect><circle cx=\"9\" cy=\"9\" r=\"2\"></circle><path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\"></path>",
  "type": "<polyline points=\"4 7 4 4 20 4 20 7\"></polyline><line x1=\"9\" x2=\"15\" y1=\"20\" y2=\"20\"></line><line x1=\"12\" x2=\"12\" y1=\"4\" y2=\"20\"></line>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><path d=\"M12 16v-4\"></path><path d=\"M12 8h.01\"></path>",
  "mic": "<path d=\"M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z\"></path><path d=\"M19 10v2a7 7 0 0 1-14 0v-2\"></path><line x1=\"12\" x2=\"12\" y1=\"19\" y2=\"22\"></line>",
  "volume": "<path d=\"M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z\"></path><path d=\"M16 9a5 5 0 0 1 0 6\"></path><path d=\"M19.364 18.364a9 9 0 0 0 0-12.728\"></path>",
  "brain": "<path d=\"M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z\"></path><path d=\"M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z\"></path><path d=\"M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4\"></path><path d=\"M17.599 6.5a3 3 0 0 0 .399-1.375\"></path><path d=\"M6.003 5.125A3 3 0 0 0 6.401 6.5\"></path><path d=\"M3.477 10.896a4 4 0 0 1 .585-.396\"></path><path d=\"M19.938 10.5a4 4 0 0 1 .585.396\"></path><path d=\"M6 18a4 4 0 0 1-1.967-.516\"></path><path d=\"M19.967 17.484A4 4 0 0 1 18 18\"></path>",
  "message-plus": "<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"></path><path d=\"M12 7v6\"></path><path d=\"M9 10h6\"></path>",
  "list-checks": "<path d=\"m3 17 2 2 4-4\"></path><path d=\"m3 7 2 2 4-4\"></path><path d=\"M13 6h8\"></path><path d=\"M13 12h8\"></path><path d=\"M13 18h8\"></path>",
  "clock": "<circle cx=\"12\" cy=\"12\" r=\"10\"></circle><polyline points=\"12 6 12 12 16 14\"></polyline>",
  "loader": "<path d=\"M21 12a9 9 0 1 1-6.219-8.56\"></path>"
});

function uiIconMarkup(name, className = "") {
  const body = UI_ICONS[name] || UI_ICONS.info;
  return `<svg class="ui-icon ${className}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach(slot => {
    const name = slot.dataset.icon;
    slot.innerHTML = uiIconMarkup(name);
  });
}


const BOSTON = Object.freeze({
  buy: "#1E6BFF",
  book: "#12D97A",
  social: "#8B3FFF",
  analytics: "#FFC400",
  office: "#FF6A1A",
  business: "#15181D",
});

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  Object.values(value).forEach(deepFreeze);
  return value;
}

// Layer 1 — protected business core. The design engine receives no mutating
// references to this object. In production these contracts map to server APIs.
const BOOK_BUY_BUSINESS_CORE = deepFreeze({
  layer: "business-core",
  protection: "immutable",
  domains: [
    "products", "services", "prices", "inventory", "cart", "checkout",
    "payments", "webhooks", "auth", "orders", "bookings", "availability", "apis",
  ],
  contracts: {
    catalog: ["products.read", "services.read", "prices.read", "inventory.read"],
    cart: ["cart.read", "cart.add", "cart.remove", "cart.updateQuantity"],
    checkout: ["checkout.create", "checkout.status"],
    booking: ["availability.read", "booking.create", "booking.status"],
    identity: ["auth.session", "auth.customer"],
    platform: ["payments.intent", "webhooks.verify", "api.request"],
  },
  designMutationAllowed: false,
});

const BOOK_BUY_TOKENS = deepFreeze({
  colors: {
    buy: BOSTON.buy, book: BOSTON.book, social: BOSTON.social,
    analytics: BOSTON.analytics, office: BOSTON.office, business: BOSTON.business,
    ink: "#15181D", muted: "#68707B", line: "#E7EAEE",
    surface: "#FFFFFF", surfaceSoft: "#F8F9FA",
  },
  spacing: { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48, section: 72, hero: 88 },
  radius: { control: 10, card: 15, panel: 18, visual: 24 },
  typography: {
    displayXL: { fontSize: "clamp(52px,6.4vw,86px)", lineHeight: ".97", letterSpacing: "-.068em", fontWeight: "800" },
    displayLG: { fontSize: "clamp(42px,5.2vw,72px)", lineHeight: ".99", letterSpacing: "-.062em", fontWeight: "800" },
    heading: { fontSize: "36px", lineHeight: "1.05", letterSpacing: "-.055em", fontWeight: "750" },
    subheading: { fontSize: "20px", lineHeight: "1.18", letterSpacing: "-.035em", fontWeight: "700" },
    body: { fontSize: "15px", lineHeight: "1.72", letterSpacing: "0", fontWeight: "400" },
    small: { fontSize: "11px", lineHeight: "1.55", letterSpacing: "0", fontWeight: "550" },
    priceEmphasis: { fontSize: "18px", lineHeight: "1.2", letterSpacing: "-.025em", fontWeight: "750" },
  },
});

// Layer 2 — stable commerce components. The AI may only use the visual
// permissions listed here. Data bindings and internal behavior remain locked.
const BOOK_BUY_COMMERCE_COMPONENTS = deepFreeze({
  "product-card": { permissions: ["layout", "typography", "color", "variant", "move"], variants: ["minimal", "editorial", "compact"], protected: ["product binding", "price binding", "inventory binding"] },
  "buy-button": { permissions: ["layout", "typography", "color", "variant", "move"], variants: ["solid", "outline", "soft"], protected: ["cart.add behavior", "product binding"] },
  "cart-button": { permissions: ["layout", "typography", "color", "variant", "move"], variants: ["compact", "label", "icon"], protected: ["cart count binding", "cart.open behavior"] },
  "cart-drawer": { permissions: ["layout", "typography", "color", "variant"], variants: ["clean", "compact"], protected: ["cart contents", "totals", "checkout behavior"] },
  "checkout-button": { permissions: ["layout", "typography", "color", "variant", "move"], variants: ["solid", "outline"], protected: ["checkout.create behavior", "payment handoff"] },
  "service-card": { permissions: ["layout", "typography", "color", "variant", "move"], variants: ["minimal", "editorial", "compact"], protected: ["service binding", "price binding", "duration binding"] },
  "booking-button": { permissions: ["layout", "typography", "color", "variant", "move"], variants: ["solid", "outline", "soft"], protected: ["booking.select behavior", "service binding"] },
  "booking-calendar": { permissions: ["layout", "typography", "color", "variant", "move"], variants: ["month", "compact"], protected: ["availability source", "date selection behavior"] },
  "availability-picker": { permissions: ["layout", "typography", "color", "variant", "move"], variants: ["chips", "list"], protected: ["availability binding", "slot selection behavior"] },
});

const BOOK_BUY_DESIGN_PLAYBOOK = deepFreeze({
  name: "Book & Buy Commerce Design Specialist",
  principles: [
    "Keep the customer path obvious: understand, trust, act.",
    "Prefer one primary action per decision point.",
    "Use Book & Buy color tokens semantically, never decoratively.",
    "Protect price, availability, inventory, cart and checkout truth at all times.",
    "Use whitespace and hierarchy before adding decoration.",
    "Mobile commerce must preserve primary action visibility and readable pricing.",
    "Do not invent urgency, stock scarcity, reviews, discounts or claims.",
  ],
  spacingRules: [
    "Use the 4/8/12/16/24/32/48/72/88 spacing scale.",
    "Keep card internals tighter than section spacing.",
    "Keep related label/value pairs visually grouped.",
  ],
  ecommerceHeuristics: [
    "Product cards keep image, title, price and purchase action in predictable order.",
    "Service cards keep service name, duration, price and booking action together.",
    "Never separate a button from the product or service binding it acts on.",
    "Checkout and booking controls stay visually prominent but behaviorally immutable.",
    "Trust content must be factual and cannot be fabricated by the design engine.",
  ],
  examples: [
    { request: "Make the product cards more compact", actions: [{ type: "setComponentVariant", variant: "compact" }] },
    { request: "Make the hero feel more premium", actions: [{ type: "updateTypography", preset: "displayLG" }, { type: "updateLayout", preset: "airy" }] },
    { request: "Change the product price to R100", refusal: "Price is business data and cannot be changed by the design engine." },
    { request: "Make the price more prominent", actions: [{ type: "updateTypography", preset: "priceEmphasis" }] },
  ],
});

const SAFE_DESIGN_ACTIONS = deepFreeze({
  inspectTarget: { permission: null },
  rebuildFromApprovedTemplate: { permission: null },
  updateWebsiteSource: { permission: null },
  updateCopy: { permission: "copy" },
  updateLayout: { permission: "layout" },
  updateTypography: { permission: "typography" },
  updateColorToken: { permission: "color" },
  setComponentVariant: { permission: "variant" },
  moveComponent: { permission: "move" },
  insertApprovedSection: { permission: "insert" },
  removeElement: { permission: "remove" },
  duplicateElement: { permission: "duplicate" },
});

const APPROVED_SECTION_KEYS = deepFreeze(["story", "trust-strip", "faq", "newsletter"]);


const state = {
  view: "preview",
  device: "desktop",
  canvasMode: "view",
  busy: false,
  chatCollapsed: false,
  current: null,
  history: [],
  future: [],
  selectedId: null,
  hoveredId: null,
  aiTargetId: null,
  inlineEdit: null,
  attachments: [],
  promptHistory: [],
  promptHistoryIndex: -1,
  activeRun: null,
  lastAgentRun: null,
  activeFile: "index.html",
  codeDirty: false,
  projectCounter: 1,
  builderStatus: "ready",
  actionModalResolver: null,
  publishState: "idle",
  modalReturnFocus: null,
};

const els = {
  appShell: $("#appShell"),
  messages: $("#messages"),
  chatEmpty: $("#chatEmpty"),
  chatScroll: $("#chatScroll"),
  prompt: $("#promptInput"),
  send: $("#sendBtn"),
  composer: $("#composer"),
  composerHint: $("#composerHint"),
  modelLabel: $("#modelLabel"),
  modelState: $("#modelState"),
  aiPresence: $("#aiPresence"),
  frame: $("#previewFrame"),
  previewShell: $("#previewShell"),
  previewEmpty: $("#previewEmpty"),
  previewArea: $("#previewArea"),
  hoverOutline: $("#hoverOutline"),
  selectionOutline: $("#selectionOutline"),
  aiOutline: $("#aiOutline"),
  aiOutlineLabel: $("#aiOutlineLabel"),
  selectionToolbar: $("#selectionToolbar"),
  selectionLabel: $("#selectionLabel"),
  permissionPill: $("#permissionPill"),
  selectionContext: $("#selectionContext"),
  selectionContextText: $("#selectionContextText"),
  buildOverlay: $("#buildOverlay"),
  buildOverlayTitle: $("#buildOverlayTitle"),
  buildOverlayText: $("#buildOverlayText"),
  codeArea: $("#codeArea"),
  codeOutput: $("#codeOutput"),
  editorPath: $("#editorPath"),
  editorDirty: $("#editorDirty"),
  applyCodeBtn: $("#applyCodeBtn"),
  importSiteBtn: $("#importSiteBtn"),
  uploadSiteCard: $("#uploadSiteCard"),
  importFolderBtn: $("#importFolderBtn"),
  importFilesBtn: $("#importFilesBtn"),
  siteFilesInput: $("#siteFilesInput"),
  siteFolderInput: $("#siteFolderInput"),
  fileList: $("#fileList"),
  projectFileSummary: $("#projectFileSummary"),
  canvasModeSwitcher: $("#canvasModeSwitcher"),
  projectName: $("#projectName"),
  address: $("#previewAddress"),
  publishModal: $("#publishModal"),
  shortcutsModal: $("#shortcutsModal"),
  slugInput: $("#slugInput"),
  toast: $("#toast"),
  attachmentInput: $("#attachmentInput"),
  attachmentTray: $("#attachmentTray"),
  historyPopover: $("#historyPopover"),
  historyList: $("#historyList"),
  projectMenu: $("#projectMenu"),
  accountMenu: $("#accountMenu"),
  undoBtn: $("#undoBtn"),
  redoBtn: $("#redoBtn"),
  publishBtn: $("#publishBtn"),
  shareBtn: $("#shareBtn"),
  refreshBtn: $("#refreshBtn"),
  openPreviewBtn: $("#openPreviewBtn"),
  copyCodeBtn: $("#copyCodeBtn"),
  downloadCodeBtn: $("#downloadCodeBtn"),
  publishConfirm: $("#publishConfirm"),
  publishInlineStatus: $("#publishInlineStatus"),
  publishInlineStatusText: $("#publishInlineStatusText"),
  protectionModal: $("#protectionModal"),
  protectionGrid: $("#protectionGrid"),
  protectionTitle: $("#protectionTitle"),
  protectionCopy: $("#protectionCopy"),
  actionModal: $("#actionModal"),
  actionModalEyebrow: $("#actionModalEyebrow"),
  actionModalTitle: $("#actionModalTitle"),
  actionModalCopy: $("#actionModalCopy"),
  actionInputLabel: $("#actionInputLabel"),
  actionInput: $("#actionInput"),
  actionConfirmBtn: $("#actionConfirmBtn"),
  actionCancelBtn: $("#actionCancelBtn"),
  spacingMenu: $("#spacingMenu"),
  moveMenu: $("#moveMenu"),
  moreSelectionMenu: $("#moreSelectionMenu"),
  spacingSelectionBtn: $("#spacingSelectionBtn"),
  moveSelectionBtn: $("#moveSelectionBtn"),
  moreSelectionBtn: $("#moreSelectionBtn"),
  buttonEditSelectionBtn: $("#buttonEditSelectionBtn"),
  hideSelectionBtn: $("#hideSelectionBtn"),
};

// One canonical icon/action vocabulary. The shell keeps its inline SVGs for zero
// dependency startup, while this map gives Work a single source of truth when
// moving icons into a component library later.
const BOOKBUY_ICON_ACTIONS = deepFreeze({
  undoBtn: "undo", redoBtn: "redo", newProjectBtn: "add", attachBtn: "attach",
  magicBtn: "refine", historyBtn: "history", sendBtn: "send-stop",
  toggleChatBtn: "panel", refreshBtn: "refresh", openPreviewBtn: "open-external",
  editSelectionBtn: "edit-text", buttonEditSelectionBtn: "edit-button",
  spacingSelectionBtn: "spacing", moveSelectionBtn: "move", duplicateSelectionBtn: "duplicate",
  hideSelectionBtn: "hide", deleteSelectionBtn: "delete", moreSelectionBtn: "more",
  closePublish: "close", closeShortcuts: "close", closeProtection: "close", closeActionModal: "close",
});

Object.entries(BOOKBUY_ICON_ACTIONS).forEach(([id, action]) => {
  const element = document.getElementById(id);
  if (element) element.dataset.iconAction = action;
});
window.BookBuyIconActions = BOOKBUY_ICON_ACTIONS;

const escapeHtml = (str = "") => String(str)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const slugify = (str = "") => String(str)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 40) || "untitled-project";

async function copyTextToClipboard(text) {
  const value = String(text ?? "");
  if (!value) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch (_) {
    try {
      const helper = document.createElement("textarea");
      helper.value = value;
      helper.setAttribute("readonly", "");
      helper.style.position = "fixed";
      helper.style.opacity = "0";
      helper.style.pointerEvents = "none";
      document.body.appendChild(helper);
      helper.select();
      const copied = document.execCommand?.("copy") === true;
      helper.remove();
      return copied;
    } catch (_) {
      return false;
    }
  }
}

function rememberModalFocus() {
  let target = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  if (target?.closest?.("#projectMenu")) target = $("#projectSwitcher");
  else if (target?.closest?.("#accountMenu")) target = $("#avatarBtn");
  else if (target?.closest?.("#historyPopover")) target = $("#historyBtn");
  state.modalReturnFocus = target;
}

function restoreModalFocus() {
  const target = state.modalReturnFocus;
  state.modalReturnFocus = null;
  if (target?.isConnected) requestAnimationFrame(() => target.focus({ preventScroll: true }));
}

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const id = setTimeout(resolve, ms);
  if (!signal) return;
  const stop = () => {
    clearTimeout(id);
    reject(new DOMException("Canceled", "AbortError"));
  };
  if (signal.aborted) stop();
  else signal.addEventListener("abort", stop, { once: true });
});

const BUILDER_STATUS_LABELS = Object.freeze({
  ready: "Ready",
  thinking: "Thinking",
  building: "Building",
  applying: "Applying",
  complete: "Complete",
  error: "Error",
});

function showToast(text, options = {}) {
  const normalized = typeof options === "string" ? { tone: options } : options;
  const tone = normalized.tone || "info";
  const duration = normalized.duration || 2200;
  els.toast.textContent = text;
  els.toast.dataset.tone = tone;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    els.toast.classList.remove("show");
    setTimeout(() => { if (!els.toast.classList.contains("show")) delete els.toast.dataset.tone; }, 160);
  }, duration);
}

function setButtonLoading(button, loading, label = "Working") {
  if (!button) return;
  if (loading) {
    if (!button.dataset.originalMarkup) button.dataset.originalMarkup = button.innerHTML;
    if (!button.dataset.originalAriaLabel) button.dataset.originalAriaLabel = button.getAttribute("aria-label") ?? "__none__";
    const iconOnly = !button.textContent.trim() && Boolean(button.querySelector("svg"));
    button.classList.add("is-loading");
    button.disabled = true;
    button.setAttribute("aria-busy", "true");
    button.setAttribute("aria-label", label);
    if (!iconOnly) button.textContent = label;
  } else {
    button.classList.remove("is-loading");
    button.disabled = false;
    button.removeAttribute("aria-busy");
    if (button.dataset.originalMarkup) {
      button.innerHTML = button.dataset.originalMarkup;
      delete button.dataset.originalMarkup;
    }
    if (button.dataset.originalAriaLabel) {
      if (button.dataset.originalAriaLabel === "__none__") button.removeAttribute("aria-label");
      else button.setAttribute("aria-label", button.dataset.originalAriaLabel);
      delete button.dataset.originalAriaLabel;
    }
  }
}

function scrollChat() {
  requestAnimationFrame(() => {
    els.chatScroll.scrollTop = els.chatScroll.scrollHeight;
  });
}

function syncChatEmpty() {
  els.chatEmpty.classList.toggle("hidden", els.messages.children.length > 0);
}

function autoSizeComposer() {
  els.prompt.style.height = "auto";
  els.prompt.style.height = `${Math.min(170, Math.max(31, els.prompt.scrollHeight))}px`;
}

function setBuilderStatus(status = "ready", detail = "") {
  const safeStatus = BUILDER_STATUS_LABELS[status] ? status : "ready";
  state.builderStatus = safeStatus;
  els.modelLabel.dataset.status = safeStatus;
  els.modelState.textContent = detail || BUILDER_STATUS_LABELS[safeStatus];
  els.aiPresence.classList.toggle("working", ["thinking", "building", "applying"].includes(safeStatus));
  els.aiPresence.classList.toggle("error", safeStatus === "error");
  els.appShell.dataset.builderStatus = safeStatus;
}

// Compatibility shim for older call-sites. The visible state system is the
// six-state builder contract above, so real AI adapters only need to emit
// semantic stages rather than manipulate UI classes.
function setAgentState(mode, detail = "") {
  if (mode === "working") return setBuilderStatus("applying", detail || "Applying");
  if (mode === "error") return setBuilderStatus("error", detail || "Error");
  return setBuilderStatus("ready", detail && detail !== "Design" ? detail : "Ready");
}

function syncGlobalActionStates() {
  const hasSite = Boolean(state.current?.html);
  if (els.publishBtn && !els.publishBtn.classList.contains("is-loading")) els.publishBtn.disabled = state.busy || !hasSite;
  if (els.shareBtn && !els.shareBtn.classList.contains("is-loading")) els.shareBtn.disabled = state.busy || !hasSite;
  if (els.refreshBtn) els.refreshBtn.disabled = !hasSite;
  if (els.openPreviewBtn) els.openPreviewBtn.disabled = !hasSite;
  if (els.copyCodeBtn) els.copyCodeBtn.disabled = !hasSite || isProjectAsset(state.activeFile);
  if (els.downloadCodeBtn) els.downloadCodeBtn.disabled = !hasSite;
  $$(".canvas-mode-btn").forEach(btn => { btn.disabled = !hasSite; });
}

function setBusy(value, status = "thinking", detail = "") {
  state.busy = value;
  if (!value && pendingCatalogRefresh) { pendingCatalogRefresh = false; refreshConnectedCatalog(); }
  window.dispatchEvent(new CustomEvent('bookbuy-builder-busy', { detail: { busy: value } }));
  els.send.classList.toggle("is-stop", value);
  els.send.setAttribute("aria-label", value ? "Stop generation" : "Send prompt");
  els.send.setAttribute("data-tooltip", value ? "Stop" : "Send");
  els.composer.setAttribute("aria-busy", value ? "true" : "false");
  els.previewShell.classList.toggle("is-loading", value);
  updateHistoryControls();
  syncComposerActionState();
  syncGlobalActionStates();
  if (state.selectedId) syncSelectionContext();
  if (value) setBuilderStatus(status, detail);
  const help = $("#builderAiHelp");
  if (help) help.textContent = value ? "Working on your request · Esc or Stop to cancel" : "Drafts save automatically · review before publishing";
  els.composerHint.title = "Enter to send · Shift + Enter for a new line · ↑ for history";
}

function settleBuilderStatus(delay = 1200) {
  clearTimeout(settleBuilderStatus.timer);
  settleBuilderStatus.timer = setTimeout(() => {
    if (!state.busy) setBuilderStatus("ready");
  }, delay);
}

function setBuildOverlay(show, title = "Building your site", detail = "") {
  els.buildOverlay.classList.toggle("hidden", !show);
  if (title) els.buildOverlayTitle.textContent = title;
  if (detail) els.buildOverlayText.textContent = detail;
}

function titleFromPrompt(prompt) {
  const named = prompt.match(/\b(?:called|named)\s+(?:"([^"]+)"|'([^']+)'|([^\n.!?]+))/i);
  if (named) return (named[1] || named[2] || named[3]).trim().slice(0, 60);
  const cleaned = prompt
    .replace(/^(build|make|create|design|generate)\s+(me\s+)?/i, "")
    .replace(/\b(a|an|the)\b/ig, "")
    .trim();
  const words = cleaned.split(/\s+/).slice(0, 4);
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") || "New Website";
}

function inferSite(prompt) {
  const p = prompt.toLowerCase();
  let type = "business";
  if (/salon|barber|spa|beauty|nail|massage|booking/.test(p)) type = "booking";
  if (/store|shop|product|ecommerce|e-commerce|fashion|clothing|brand/.test(p)) type = "store";
  if (/restaurant|cafe|coffee|food|menu/.test(p)) type = "restaurant";
  if (/portfolio|designer|developer|photographer|creative/.test(p)) type = "portfolio";

  const name = titleFromPrompt(prompt);
  const palettes = {
    booking: { accent: BOSTON.book, tint: "#EEFCF5", label: "Bookings made simple" },
    store: { accent: BOSTON.buy, tint: "#EEF4FF", label: "New collection" },
    restaurant: { accent: BOSTON.office, tint: "#FFF3EC", label: "Fresh every day" },
    portfolio: { accent: BOSTON.social, tint: "#F4EEFF", label: "Selected work" },
    business: { accent: BOSTON.business, tint: "#F3F4F5", label: "Built for growth" },
  };
  return { type, name, dark: BOSTON.business, ...palettes[type], prompt };
}

function hexToRgb(hex) {
  const value = hex.replace("#", "");
  const bigint = parseInt(value, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function generatedSiteHtml(config) {
  const { type, name, accent, tint, dark } = config;
  const content = {
    booking: {
      kicker: "BOOK ONLINE IN SECONDS",
      headline: `Feel your best at ${name}.`,
      copy: "A calm, modern booking experience for services, availability and effortless appointments.",
      cta: "Book an appointment",
      secondary: "View services",
      cards: ["Signature service", "Express appointment", "Premium treatment"],
      nav: ["Services", "About", "Reviews"],
    },
    store: {
      kicker: "DESIGNED TO BE KEPT",
      headline: `${name}, made beautifully simple.`,
      copy: "A crisp storefront with high-impact product storytelling and a checkout path that stays out of the way.",
      cta: "Shop collection",
      secondary: "Our story",
      cards: ["Everyday essential", "New arrival", "Limited edition"],
      nav: ["Shop", "New", "About"],
    },
    restaurant: {
      kicker: "LOCAL. FRESH. MEMORABLE.",
      headline: `A table worth booking at ${name}.`,
      copy: "Seasonal food, warm service and an easy way to reserve your next meal.",
      cta: "Reserve a table",
      secondary: "View menu",
      cards: ["Seasonal plates", "Chef's selection", "Weekend table"],
      nav: ["Menu", "Bookings", "Visit"],
    },
    portfolio: {
      kicker: "INDEPENDENT CREATIVE STUDIO",
      headline: `${name} makes work people remember.`,
      copy: "A minimal portfolio built around clarity, confidence and beautifully presented projects.",
      cta: "View projects",
      secondary: "Start a project",
      cards: ["Identity system", "Digital product", "Campaign direction"],
      nav: ["Work", "About", "Contact"],
    },
    business: {
      kicker: "A BETTER WAY TO GROW",
      headline: `${name} is ready for what’s next.`,
      copy: "A polished business website designed to turn attention into action with a clean, focused customer journey.",
      cta: "Get started",
      secondary: "Learn more",
      cards: ["Simple setup", "Better conversion", "Built to scale"],
      nav: ["Product", "Customers", "Pricing"],
    },
  }[type];

  const accentRgb = hexToRgb(accent);
  const accentSoft = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},.10)`;
  const accentLine = `rgba(${accentRgb.r},${accentRgb.g},${accentRgb.b},.22)`;
  const productPrices = ["R 790", "R 1 190", "R 1 490"];
  const servicePrices = ["R 450", "R 650", "R 890"];
  const serviceTimes = ["45 min", "60 min", "90 min"];

  const genericCards = content.cards.map((x, i) => `<article class="card" data-bb-id="feature-${i + 1}"><div class="thumb" data-bb-id="feature-${i + 1}-visual"></div><h3 data-bb-id="feature-${i + 1}-title">${escapeHtml(x)}</h3><p data-bb-id="feature-${i + 1}-copy">${["Clear choices, clean presentation and a frictionless path forward.", "Designed to feel calm, trustworthy and easy to use on every screen.", "A polished visual system ready for your real content and brand assets."][i]}</p></article>`).join("");

  const productCards = content.cards.map((x, i) => `<article class="card commerce-card product-card" data-bb-id="product-card-${i + 1}" data-bb-layer="commerce" data-bb-component="product-card" data-bb-permission="layout,typography,color,variant,move" data-bb-variant="minimal">
    <div class="thumb" data-bb-id="product-visual-${i + 1}" data-bb-layer="commerce" data-bb-permission="layout,color"></div>
    <div class="product-copy" data-bb-id="product-copy-${i + 1}" data-bb-layer="commerce" data-bb-permission="layout,typography,color">
      <h3 data-bb-id="product-title-${i + 1}" data-bb-layer="commerce" data-bb-bind="products.product-${i + 1}.title" data-bb-permission="typography,color">${escapeHtml(x)}</h3>
      <div class="price-row" data-bb-id="product-meta-${i + 1}" data-bb-layer="commerce" data-bb-permission="layout,typography,color"><strong data-bb-id="product-price-${i + 1}" data-bb-layer="commerce" data-bb-bind="prices.product-${i + 1}" data-bb-permission="typography,color">${productPrices[i]}</strong><span data-bb-id="product-stock-${i + 1}" data-bb-layer="commerce" data-bb-bind="inventory.product-${i + 1}" data-bb-permission="typography,color">In stock</span></div>
      <button class="commerce-action buy-btn" data-bb-id="buy-button-${i + 1}" data-bb-layer="commerce" data-bb-component="buy-button" data-bb-permission="layout,typography,color,variant,move" data-bb-protected-fields="behavior,binding" data-bb-action="cart.add" data-bb-product-id="product-${i + 1}">Add to cart</button>
    </div>
  </article>`).join("");

  const serviceCards = content.cards.map((x, i) => `<article class="card commerce-card service-card" data-bb-id="service-card-${i + 1}" data-bb-layer="commerce" data-bb-component="service-card" data-bb-permission="layout,typography,color,variant,move" data-bb-variant="minimal">
    <div class="thumb" data-bb-id="service-visual-${i + 1}" data-bb-layer="commerce" data-bb-permission="layout,color"></div>
    <h3 data-bb-id="service-title-${i + 1}" data-bb-layer="commerce" data-bb-bind="services.service-${i + 1}.title" data-bb-permission="typography,color">${escapeHtml(x)}</h3>
    <div class="service-meta" data-bb-id="service-meta-${i + 1}" data-bb-layer="commerce" data-bb-permission="layout,typography,color"><span data-bb-id="service-duration-${i + 1}" data-bb-layer="commerce" data-bb-bind="services.service-${i + 1}.duration" data-bb-permission="typography,color">${serviceTimes[i]}</span><strong data-bb-id="service-price-${i + 1}" data-bb-layer="commerce" data-bb-bind="prices.service-${i + 1}" data-bb-permission="typography,color">${servicePrices[i]}</strong></div>
    <button class="commerce-action booking-btn" data-bb-id="booking-button-${i + 1}" data-bb-layer="commerce" data-bb-component="booking-button" data-bb-permission="layout,typography,color,variant,move" data-bb-protected-fields="behavior,binding" data-bb-action="booking.select" data-bb-service-id="service-${i + 1}">Choose service</button>
  </article>`).join("");

  const cardsMarkup = type === "store" ? productCards : type === "booking" ? serviceCards : genericCards;
  const sectionTitle = type === "store" ? "Shop the essentials." : type === "booking" ? "Choose your service." : "Everything in the right place.";
  const sectionCopy = type === "store" ? "Product information stays bound to Book & Buy while the presentation remains completely designable." : type === "booking" ? "Service details and availability stay connected while the visual experience can evolve around them." : "A focused layout that feels premium without getting in your customer’s way.";

  const navCommerce = type === "store"
    ? `<button class="cart-trigger" data-bb-id="cart-button" data-bb-layer="commerce" data-bb-component="cart-button" data-bb-permission="layout,typography,color,variant,move" data-bb-protected-fields="behavior,binding" data-bb-action="cart.open">Cart <span data-bb-id="cart-count" data-bb-layer="commerce" data-bb-bind="cart.count" data-bb-permission="typography,color">0</span></button>`
    : "";

  const bookingTools = type === "booking" ? `
    <div class="booking-tools" data-bb-id="booking-tools" data-bb-layer="commerce" data-bb-permission="layout,move">
      <section class="booking-module calendar" data-bb-id="booking-calendar" data-bb-layer="commerce" data-bb-component="booking-calendar" data-bb-permission="layout,typography,color,variant,move" data-bb-variant="month">
        <div class="module-head"><span>October</span><small data-bb-bind="availability.timezone" data-bb-layer="commerce" data-bb-permission="typography,color">Local time</small></div>
        <div class="calendar-grid">${["M", "T", "W", "T", "F", "S", "S"].map(d => `<b>${d}</b>`).join("")}${Array.from({ length: 14 }, (_, i) => `<button data-bb-layer="commerce" data-bb-action="booking.date" data-bb-date="2026-10-${String(i + 5).padStart(2, "0")}" class="date${i === 0 ? " active" : ""}">${i + 5}</button>`).join("")}</div>
      </section>
      <section class="booking-module availability" data-bb-id="availability-picker" data-bb-layer="commerce" data-bb-component="availability-picker" data-bb-permission="layout,typography,color,variant,move" data-bb-variant="chips">
        <div class="module-head"><span>Available times</span><small data-bb-id="availability-label" data-bb-layer="commerce" data-bb-bind="availability.selectedDate" data-bb-permission="typography,color">Mon 5 Oct</small></div>
        <div class="slot-list">${["09:00", "10:30", "12:00", "14:30", "16:00"].map(t => `<button data-bb-layer="commerce" data-bb-action="booking.slot" data-bb-slot="${t}">${t}</button>`).join("")}</div>
        <button class="commerce-action booking-confirm" data-bb-id="booking-confirm" data-bb-layer="commerce" data-bb-component="booking-button" data-bb-permission="layout,typography,color,variant,move" data-bb-action="booking.create">Continue to booking</button>
      </section>
    </div>` : "";

  const cartDrawer = type === "store" ? `
    <div class="drawer-backdrop" data-bb-runtime="cart-backdrop"></div>
    <aside class="cart-drawer" data-bb-id="cart-drawer" data-bb-layer="commerce" data-bb-component="cart-drawer" data-bb-permission="layout,typography,color,variant" data-bb-variant="clean" aria-hidden="true">
      <div class="drawer-head"><strong>Your cart</strong><button data-bb-layer="commerce" data-bb-action="cart.close" aria-label="Close cart">×</button></div>
      <div class="drawer-empty" data-bb-id="cart-items" data-bb-layer="commerce" data-bb-bind="cart.items" data-bb-permission="typography,color">Your cart is empty.</div>
      <div class="drawer-total"><span>Total</span><strong data-bb-id="cart-total" data-bb-layer="commerce" data-bb-bind="cart.total" data-bb-permission="typography,color">R 0</strong></div>
      <button class="checkout-btn" data-bb-id="checkout-button" data-bb-layer="commerce" data-bb-component="checkout-button" data-bb-permission="layout,typography,color,variant,move" data-bb-protected-fields="behavior,payment" data-bb-action="checkout.create">Checkout securely</button>
      <small>Checkout, payments and order creation are handled by the protected Book & Buy core.</small>
    </aside>` : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
<title>${escapeHtml(name)}</title>
<style>
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;font-family:Figtree,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:${dark};background:#fff;-webkit-font-smoothing:antialiased}button{font:inherit}h1,h2,h3,.brand{font-family:'Plus Jakarta Sans',Figtree,sans-serif}.page{min-height:100vh;background:#fff}
.nav{height:70px;display:flex;align-items:center;justify-content:space-between;padding:0 5vw;border-bottom:1px solid #E8EAED;background:rgba(255,255,255,.95);backdrop-filter:blur(14px);position:sticky;top:0;z-index:5}.brand{font-weight:780;letter-spacing:-.045em;font-size:16px;display:flex;align-items:center;gap:9px}.brand i{display:block;width:9px;height:9px;border-radius:3px;background:${accent}}.navlinks{display:flex;gap:26px;font-size:11px;font-weight:600;color:#68707B}.navlinks a{text-decoration:none;color:inherit}.navlinks a:hover{color:${dark}}.nav-actions{display:flex;align-items:center;gap:7px}.navcta,.cart-trigger{border:1px solid ${dark};background:${dark};color:#fff;padding:9px 14px;border-radius:9px;font-size:10.5px;font-weight:700;cursor:pointer}.cart-trigger{background:#fff;color:${dark};border-color:#E1E4E8}.cart-trigger span{display:inline-grid;place-items:center;min-width:17px;height:17px;margin-left:5px;padding:0 4px;border-radius:99px;background:${dark};color:#fff;font-size:8px}
.hero{max-width:1220px;margin:auto;padding:84px 5vw 62px;display:grid;grid-template-columns:1.02fr .98fr;gap:64px;align-items:center;min-height:620px}.kicker{font-size:9.5px;letter-spacing:.15em;font-weight:800;color:${accent};margin-bottom:18px}.hero h1{font-size:clamp(44px,5.7vw,78px);line-height:.99;letter-spacing:-.065em;margin:0 0 22px;max-width:760px}.hero p{max-width:540px;font-size:15px;line-height:1.72;color:#68707B;margin:0 0 27px}.actions{display:flex;gap:8px;flex-wrap:wrap}.primary,.secondary{border-radius:10px;padding:12px 16px;font-size:11px;font-weight:700;cursor:pointer}.primary{border:1px solid ${dark};background:${dark};color:#fff}.secondary{border:1px solid #E1E4E8;background:#fff;color:${dark}}
.visual{height:476px;border-radius:24px;background:${tint};position:relative;overflow:hidden;border:1px solid #E5E8EB}.visual:before{content:"";position:absolute;inset:28px;border:1px solid ${accentLine};border-radius:18px}.display{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:72%;height:64%;padding:24px;border:1px solid rgba(255,255,255,.9);border-radius:18px;background:#fff;box-shadow:0 18px 46px rgba(21,24,29,.09);display:flex;flex-direction:column;justify-content:space-between}.display-top{display:flex;align-items:center;justify-content:space-between}.display-dots{display:flex;gap:5px}.display-dots i{width:6px;height:6px;border-radius:50%;background:#DDE1E5}.display-dots i:first-child{background:${accent}}.tiny{font-size:9px;font-weight:700;color:#8B929C}.hero-card{height:72%;border-radius:13px;background:${dark};padding:22px;display:flex;align-items:flex-end;color:#fff;position:relative;overflow:hidden}.hero-card:before{content:"";position:absolute;width:120px;height:120px;right:-24px;top:-22px;border-radius:36px;background:${accent}}.hero-card b{position:relative;font-size:22px;letter-spacing:-.04em;max-width:190px}.metric{position:absolute;padding:12px 13px;border:1px solid #E4E7EA;border-radius:12px;background:rgba(255,255,255,.96);box-shadow:0 9px 25px rgba(21,24,29,.07)}.metric.one{left:22px;top:35px}.metric.two{right:22px;bottom:31px}.metric small{display:block;color:#7A828C;font-size:8px;font-weight:700;letter-spacing:.08em}.metric strong{display:block;margin-top:5px;font-size:18px;letter-spacing:-.04em}.status{display:flex;align-items:center;gap:5px;margin-top:5px;color:#7A828C;font-size:8.5px}.status i{width:5px;height:5px;border-radius:50%;background:${accent}}
.proof{border-top:1px solid #ECEEF0;border-bottom:1px solid #ECEEF0;padding:17px 5vw;display:flex;justify-content:center;gap:6vw;color:#7D858F;font-size:10px;font-weight:650;white-space:nowrap;overflow:auto}.cards{max-width:1220px;margin:auto;padding:64px 5vw 90px}.sectionhead{display:flex;justify-content:space-between;align-items:end;gap:28px;margin-bottom:24px}.sectionhead h2{font-size:36px;letter-spacing:-.055em;margin:0}.sectionhead p{max-width:430px;color:#68707B;font-size:12px;line-height:1.65;margin:0}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.card{border:1px solid #E7EAEE;border-radius:15px;padding:14px;background:#fff}.thumb{height:178px;border-radius:11px;background:${accentSoft};margin-bottom:15px;position:relative;overflow:hidden}.thumb:after{content:"";position:absolute;width:82px;height:82px;border:1px solid ${accentLine};border-radius:23px;right:17px;bottom:17px;background:#fff}.card h3{margin:0 0 6px;font-size:14px;letter-spacing:-.025em}.card p{margin:0;color:#7A828C;font-size:10.5px;line-height:1.55}
.commerce-card{display:flex;flex-direction:column}.commerce-card .thumb{flex:0 0 auto}.product-copy{display:flex;flex-direction:column;flex:1}.price-row,.service-meta{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:3px 0 13px}.price-row strong,.service-meta strong{font-size:14px;letter-spacing:-.025em}.price-row span,.service-meta span{color:#7A828C;font-size:9.5px}.commerce-action,.checkout-btn{width:100%;margin-top:auto;border:1px solid ${dark};border-radius:9px;background:${dark};color:#fff;padding:10px 12px;font-size:10px;font-weight:700;cursor:pointer}.commerce-action[data-bb-variant="outline"],.checkout-btn[data-bb-variant="outline"]{background:#fff;color:${dark}}.commerce-action[data-bb-variant="soft"]{border-color:${accentLine};background:${accentSoft};color:${dark}}.commerce-card[data-bb-variant="compact"]{padding:10px}.commerce-card[data-bb-variant="compact"] .thumb{height:128px;margin-bottom:11px}.commerce-card[data-bb-variant="editorial"] .thumb{height:230px}.commerce-card[data-bb-variant="editorial"]{border-color:transparent;padding:0}.booking-tools{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:28px}.booking-module{border:1px solid #E7EAEE;border-radius:15px;padding:16px;background:#fff}.module-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}.module-head span{font-size:12px;font-weight:750}.module-head small{color:#8A919A;font-size:8.5px}.calendar-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}.calendar-grid b{text-align:center;color:#969DA6;font-size:8px}.calendar-grid button,.slot-list button{height:32px;border:1px solid #E7EAEE;border-radius:8px;background:#fff;color:${dark};font-size:9px;cursor:pointer}.calendar-grid button.active,.calendar-grid button:hover,.slot-list button:hover,.slot-list button.active{border-color:${accent};box-shadow:inset 0 0 0 1px ${accentLine};background:${accentSoft}}.slot-list{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px}
.drawer-backdrop{position:fixed;inset:0;background:rgba(21,24,29,.18);opacity:0;pointer-events:none;transition:opacity .2s ease;z-index:19}.cart-drawer{position:fixed;right:12px;top:12px;bottom:12px;width:min(380px,calc(100vw - 24px));padding:18px;border:1px solid #E1E4E8;border-radius:18px;background:#fff;box-shadow:0 24px 70px rgba(21,24,29,.18);transform:translateX(calc(100% + 30px));transition:transform .24s cubic-bezier(.2,.72,.2,1);z-index:20;display:flex;flex-direction:column}.cart-drawer[data-open="true"]{transform:translateX(0)}.cart-drawer[data-open="true"]~*{}.drawer-backdrop[data-open="true"]{opacity:1;pointer-events:auto}.drawer-head{display:flex;align-items:center;justify-content:space-between}.drawer-head strong{font-size:18px;letter-spacing:-.04em}.drawer-head button{width:30px;height:30px;border:0;border-radius:8px;background:#F5F7F8;cursor:pointer}.drawer-empty{flex:1;padding:36px 0;color:#7A828C;font-size:11px}.drawer-total{padding:14px 0;border-top:1px solid #E7EAEE;display:flex;align-items:center;justify-content:space-between}.drawer-total span{font-size:10px;color:#68707B}.drawer-total strong{font-size:19px}.cart-drawer>small{display:block;margin-top:10px;color:#969DA6;font-size:8.5px;line-height:1.5}
@media(max-width:820px){.navlinks{display:none}.hero{grid-template-columns:1fr;padding-top:54px;gap:32px}.visual{height:410px}.grid,.booking-tools{grid-template-columns:1fr}.sectionhead{display:block}.sectionhead p{margin-top:10px}.nav{padding:0 20px}.hero,.cards{padding-left:20px;padding-right:20px}.proof{justify-content:flex-start}.cart-trigger{display:none}}
</style>
</head>
<body>
<div class="page" data-bb-id="page-root">
  <nav class="nav" data-bb-id="site-nav">
    <div class="brand" data-bb-id="site-brand"><i></i>${escapeHtml(name)}</div>
    <div class="navlinks" data-bb-id="site-nav-links">${content.nav.map((n, i) => `<a data-bb-id="nav-link-${i + 1}" href="#features-section">${escapeHtml(n)}</a>`).join("")}<a data-bb-id="nav-link-contact" href="#features-section">Contact</a></div>
    <div class="nav-actions" data-bb-id="nav-actions">${navCommerce}<button class="navcta" data-bb-id="nav-cta" onclick="document.getElementById('features-section').scrollIntoView({behavior:'smooth'})">${escapeHtml(content.cta)}</button></div>
  </nav>
  <main data-bb-id="main-content">
    <section class="hero" data-bb-id="hero">
      <div data-bb-id="hero-content">
        <div class="kicker" data-bb-id="hero-kicker">${escapeHtml(content.kicker)}</div>
        <h1 data-bb-id="hero-title">${escapeHtml(content.headline)}</h1>
        <p data-bb-id="hero-copy">${escapeHtml(content.copy)}</p>
        <div class="actions" data-bb-id="hero-actions"><button class="primary" data-bb-id="hero-primary" onclick="document.getElementById('features-section').scrollIntoView({behavior:'smooth'})">${escapeHtml(content.cta)}</button><button class="secondary" data-bb-id="hero-secondary" onclick="document.getElementById('features-section').scrollIntoView({behavior:'smooth'})">${escapeHtml(content.secondary)}</button></div>
      </div>
      <div class="visual" data-bb-id="hero-visual">
        <div class="metric one" data-bb-id="hero-metric-one"><small>THIS WEEK</small><strong>+34%</strong><span class="status"><i></i>Growing nicely</span></div>
        <div class="display" data-bb-id="hero-display"><div class="display-top"><div class="display-dots"><i></i><i></i><i></i></div><span class="tiny">BOOK &amp; BUY</span></div><div class="hero-card"><b>${escapeHtml(config.label)}</b></div></div>
        <div class="metric two" data-bb-id="hero-metric-two"><small>AVAILABLE</small><strong>24/7</strong><span class="status"><i></i>Ready for customers</span></div>
      </div>
    </section>
    <div class="proof" data-bb-id="proof"><span>Fast checkout</span><span>Live bookings</span><span>Mobile ready</span><span>Built to convert</span></div>
    <section class="cards" id="features-section" data-bb-id="features">
      <div class="sectionhead" data-bb-id="features-head"><h2 data-bb-id="features-title">${sectionTitle}</h2><p data-bb-id="features-copy">${sectionCopy}</p></div>
      <div class="grid" data-bb-id="features-grid">${cardsMarkup}</div>
      ${bookingTools}
    </section>
  </main>
</div>
${cartDrawer}
<script data-bb-layer="core" data-bb-protected="true">
(() => {
  // The generated page contains only a transport bridge. Cart, checkout,
  // booking and availability state live behind the builder's commerce adapter.
  const send = (type, payload = {}) => {
    try {
      const host = window.parent !== window ? window.parent : window.opener;
      host?.postMessage({ source: "bookbuy-preview", type, ...payload }, "*");
    } catch (_) {}
  };
  const drawer = document.querySelector('[data-bb-id="cart-drawer"]');
  const backdrop = document.querySelector('[data-bb-runtime="cart-backdrop"]');
  const money = value => "R " + Number(value || 0).toLocaleString("en-ZA");
  const setDrawer = open => {
    if (drawer) { drawer.dataset.open = open ? "true" : "false"; drawer.setAttribute("aria-hidden", open ? "false" : "true"); }
    if (backdrop) backdrop.dataset.open = open ? "true" : "false";
  };
  const renderState = state => {
    const cart = state?.cart || {};
    const booking = state?.booking || {};
    const count = document.querySelector('[data-bb-id="cart-count"]');
    const total = document.querySelector('[data-bb-id="cart-total"]');
    const items = document.querySelector('[data-bb-id="cart-items"]');
    if (count) count.textContent = String(cart.count || 0);
    if (total) total.textContent = money(cart.total || 0);
    if (items) items.textContent = cart.count ? (String(cart.count) + (cart.count === 1 ? " item ready for checkout." : " items ready for checkout.")) : "Your cart is empty.";
    setDrawer(Boolean(state?.drawerOpen));
    document.querySelectorAll('[data-bb-action="booking.date"]').forEach(x => x.classList.toggle("active", x.dataset.bbDate === booking.date));
    document.querySelectorAll('[data-bb-action="booking.slot"]').forEach(x => x.classList.toggle("active", x.dataset.bbSlot === booking.slot));
  };
  document.addEventListener("click", event => {
    const control = event.target.closest("[data-bb-action]");
    if (!control) return;
    const action = control.dataset.bbAction;
    send("commerce-action", {
      action,
      payload: {
        productId: control.dataset.bbProductId || null,
        serviceId: control.dataset.bbServiceId || null,
        date: control.dataset.bbDate || null,
        slot: control.dataset.bbSlot || null,
      },
    });
  });
  backdrop?.addEventListener("click", () => send("commerce-action", { action: "cart.close", payload: {} }));
  window.addEventListener("message", event => {
    const data = event.data || {};
    if (data.source !== "bookbuy-builder" || data.type !== "commerce-state") return;
    renderState(data.state || {});
  });
  send("commerce-ready");
})();
</script>
</body>
</html>`;
}
function defaultSite() {
  return generatedSiteHtml({
    type: "business",
    name: "Your next idea",
    accent: BOSTON.business,
    tint: "#F3F4F5",
    dark: BOSTON.business,
    label: "Live preview",
    prompt: "",
  });
}

function snapshotProject() {
  if (!state.current) return null;
  return {
    id: state.current.id || null,
    html: state.current.html,
    files: state.current.files ? cloneData(state.current.files) : null,
    assets: state.current.assets ? cloneData(state.current.assets) : null,
    entryFile: state.current.entryFile || "index.html",
    name: state.current.name,
    prompt: state.current.prompt || "",
    publishedUrl: state.current.publishedUrl || null,
    _validationIssues: state.current._validationIssues || [],
    address: els.address.textContent,
  };
}

function cloneSnapshot(snapshot) {
  return snapshot ? cloneData(snapshot) : null;
}

function pushUndo(snapshot = snapshotProject(), label = "Editor change") {
  if (!snapshot) return;
  const last = state.history.at(-1);
  const filesChanged = JSON.stringify(last?.files || null) !== JSON.stringify(snapshot.files || null);
  if (!last || last.html !== snapshot.html || last.name !== snapshot.name || filesChanged) {
    state.history.push(cloneSnapshot(snapshot));
    // Version persistence is deliberately an adapter side-effect. Undo/redo stays
    // instant and local; a real backend can persist the same snapshot contract.
    Promise.resolve(services?.versions?.recordVersion?.({ projectId: snapshot.id, snapshot, label })).catch(() => {});
  }
  if (state.history.length > 60) state.history.shift();
  state.future = [];
  updateHistoryControls();
}

function updateHistoryControls() {
  els.undoBtn.disabled = !state.history.length || state.busy;
  els.redoBtn.disabled = !state.future.length || state.busy;
}

function restoreSnapshot(snapshot, { clearFuture = false } = {}) {
  if (!snapshot) return;
  try { if (snapshot.html && window.BookBuyCommerce?.context) snapshot = { ...snapshot, html: window.BookBuyCommerce.wireHtml(snapshot.html, { allowRetired: true, draft: Boolean(snapshot._validationIssues?.length) }).html }; }
  catch (error) { showToast(error.message, { tone: 'error' }); return; }
  state.current = {
    id: snapshot.id || state.current?.id || null,
    html: snapshot.html,
    files: snapshot.files ? cloneData(snapshot.files) : null,
    assets: snapshot.assets ? cloneData(snapshot.assets) : null,
    entryFile: snapshot.entryFile || "index.html",
    name: snapshot.name,
    prompt: snapshot.prompt || "",
    publishedUrl: snapshot.publishedUrl || null,
    _validationIssues: snapshot._validationIssues || [],
  };
  els.address.textContent = snapshot.address || "preview.bookandbuy.app";
  if (clearFuture) state.future = [];
  clearCanvasSelection();
  renderCurrent();
  queueProjectDraftSave();
  updateHistoryControls();
}

function renderCurrent() {
  const hasSite = Boolean(state.current?.html);
  els.previewEmpty.classList.toggle("hidden", hasSite);
  els.frame.classList.toggle("hidden", !hasSite);

  if (!hasSite) {
    els.frame.srcdoc = "";
    els.codeOutput.value = "";
    setCodeDirty(false);
    els.projectName.textContent = "Untitled project";
    els.slugInput.value = "untitled-project";
    clearCanvasSelection();
    renderProjectFileList();
    updateHistoryControls();
    syncGlobalActionStates();
    return;
  }

  els.projectName.textContent = state.current.name || "Untitled project";
  els.slugInput.value = state.current.publishedUrl || "Assigned after your first publication";
  if (els.frame.srcdoc !== state.current.html) { resetRuntimeBridge(); els.frame.srcdoc = state.current.html; }
  renderProjectFileList();
  renderActiveCodeFile();
  updateHistoryControls();
  syncGlobalActionStates();
}

function setView(view) {
  if (state.view === "code" && view !== "code" && state.codeDirty) applyCodeEdits({ silent: true });
  state.view = view;
  if (window.matchMedia("(max-width: 760px)").matches) {
    state.chatCollapsed = true;
    els.appShell.classList.add("chat-collapsed");
  }
  $$("#mainViewTabs .view-tab").forEach(btn => {
    const active = btn.dataset.view === view;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  els.previewArea.classList.toggle("hidden", view !== "preview");
  els.codeArea.classList.toggle("hidden", view !== "code");
  if (view === "code") renderActiveCodeFile();
  else requestAnimationFrame(updateCanvasOverlays);
  syncMobileViewTabs();
}

function syncMobileViewTabs() {
  const mobile = window.matchMedia("(max-width: 760px)").matches;
  const chatVisible = mobile && !state.chatCollapsed;
  els.appShell.dataset.editorView = state.view;
  $("#mobileChatTab")?.setAttribute("aria-pressed", String(chatVisible));
  $$("#mainViewTabs .view-tab").forEach(button => {
    const active = !chatVisible && button.dataset.view === state.view;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function setDevice(device) {
  state.device = device;
  $$(".device-btn").forEach(btn => {
    const active = btn.dataset.device === device;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  els.previewShell.classList.remove("desktop", "tablet", "mobile");
  els.previewShell.classList.add(device);
  requestAnimationFrame(() => requestAnimationFrame(updateCanvasOverlays));
}

function setCanvasMode(mode = "view", { announce = true } = {}) {
  const next = mode === "view" ? "view" : "edit";
  if (state.busy && next !== state.canvasMode) return;
  const changed = next !== state.canvasMode;
  if (state.inlineEdit) commitInlineEdit();
  state.canvasMode = next;
  // Editing needs DOM access, while viewing needs scripts. Never grant both.
  els.frame.setAttribute("sandbox", next === "view" ? "allow-scripts" : "allow-same-origin");
  if (changed && state.current?.html) { resetRuntimeBridge(); els.frame.srcdoc = state.current.html; }
  $$(".canvas-mode-btn").forEach(btn => {
    const active = btn.dataset.canvasMode === next;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
  els.previewArea?.classList.toggle("canvas-view-mode", next === "view");
  els.previewShell?.classList.toggle("canvas-view-mode", next === "view");
  if (next === "view") {
    clearCanvasSelection();
    closeToolbarMenus();
    els.canvasModeSwitcher?.setAttribute("data-mode", "view");
  } else {
    els.canvasModeSwitcher?.setAttribute("data-mode", "edit");
    requestAnimationFrame(updateCanvasOverlays);
  }
  if (announce) showToast(next === "view" ? "Annotations off · website interactions are live" : "Annotations on · select an element to refine it", { tone: "info" });
}

function getFrameDocument() {
  try { return els.frame.contentDocument || els.frame.contentWindow?.document || null; }
  catch { return null; }
}


function parsePermissions(value = "") {
  return new Set(String(value).split(",").map(x => x.trim()).filter(Boolean));
}

function defaultDesignPermissionsFor(el) {
  const id = el.dataset.bbId || "";
  if (["page-root", "main-content"].includes(id)) return ["layout", "typography", "color", "insert"];
  const tag = el.tagName;
  const perms = ["layout", "typography", "color", "move", "remove", "duplicate"];
  if (["H1", "H2", "H3", "H4", "P", "BUTTON", "A", "SPAN", "DIV"].includes(tag)) perms.unshift("copy");
  if (["MAIN", "SECTION", "DIV", "ARTICLE"].includes(tag)) perms.push("insert");
  return [...new Set(perms)];
}

function hydratePermissionModel(doc) {
  if (!doc) return;
  doc.querySelectorAll("[data-bb-id]").forEach(el => {
    if (el.dataset.bbLayer === "core" || el.dataset.bbProtected === "true") {
      el.dataset.bbLayer = "core";
      el.dataset.bbPermission = "";
      return;
    }

    const commerceAncestor = el.closest('[data-bb-layer="commerce"]');
    if (!el.dataset.bbLayer && commerceAncestor) el.dataset.bbLayer = "commerce";
    if (!el.dataset.bbLayer) el.dataset.bbLayer = "design";

    if (el.dataset.bbLayer === "commerce") {
      if (!el.hasAttribute("data-bb-permission")) {
        if (el.dataset.bbBind) el.dataset.bbPermission = "typography,color";
        else if (el.dataset.bbAction) el.dataset.bbPermission = "layout,typography,color,variant,move";
        else el.dataset.bbPermission = "layout,typography,color";
      }
      return;
    }

    if (!el.hasAttribute("data-bb-permission")) {
      el.dataset.bbPermission = defaultDesignPermissionsFor(el).join(",");
    }
  });
}

function getElementPolicy(el) {
  if (!el) return { layer: "none", component: null, permissions: new Set(), protectedFields: [], bindings: [], locked: true, label: "Protected", reason: "No editable element is selected.", id: null };
  const layerOwner = el.dataset.bbLayer ? el : el.closest("[data-bb-layer]");
  const layer = layerOwner?.dataset.bbLayer || "design";
  const componentOwner = el.dataset.bbComponent ? el : el.closest("[data-bb-component]");
  const component = componentOwner?.dataset.bbComponent || null;
  const permissions = parsePermissions(el.dataset.bbPermission || (layer === "design" ? defaultDesignPermissionsFor(el).join(",") : ""));
  const protectedFields = String(el.dataset.bbProtectedFields || componentOwner?.dataset.bbProtectedFields || "").split(",").map(x => x.trim()).filter(Boolean);
  const bindings = el.dataset.bbBind ? [el.dataset.bbBind] : [];
  const locked = layer === "core" || permissions.size === 0;
  const label = layer === "core" || locked ? "Protected" : bindings.length ? "Bound · visual" : layer === "commerce" ? "Commerce-safe" : "Design";
  const reason = layer === "core"
    ? "This belongs to the protected Book & Buy business core."
    : bindings.length
      ? "Business data is bound here. Visual styling is allowed, but the bound value cannot be rewritten."
      : layer === "commerce"
        ? "This is a stable commerce component. Only approved visual actions are allowed."
        : "This is a design element and can use the safe editor action set.";
  return { layer, component, permissions, protectedFields, bindings, locked, label, reason, id: el.dataset.bbId || null };
}

function canElement(el, permission) {
  return getElementPolicy(el).permissions.has(permission)
    && (!["copy", "remove", "duplicate"].includes(permission) || !hasProtectedDescendants(el));
}

function hasProtectedDescendants(el) {
  return Boolean(el?.querySelector('[data-bb-layer="commerce"], [data-bb-layer="core"], [data-bb-protected="true"], [data-bb-bind], [data-bb-action], [data-bb-component]'));
}

function safeTextForDesignAI(el) {
  if (!el) return "";
  const policy = getElementPolicy(el);
  if (policy.bindings.length) return "[bound business data]";
  if (policy.layer === "commerce" && el.querySelector("[data-bb-bind]")) return "[commerce component content]";
  const direct = [...el.childNodes]
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent || "")
    .join(" ")
    .trim()
    .replace(/\s+/g, " ");
  if (direct) return direct.slice(0, 100);
  if (!el.children.length) return (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100);
  return "";
}

function getCanvasManifest() {
  const doc = getFrameDocument();
  if (!doc) return [];
  return [...doc.querySelectorAll("[data-bb-id]")].slice(0, 240).map(el => {
    const policy = getElementPolicy(el);
    return {
      id: el.dataset.bbId,
      tag: el.tagName.toLowerCase(),
      label: describeElement(el),
      layer: policy.layer,
      component: policy.component,
      permissions: [...policy.permissions],
      bound: Boolean(policy.bindings.length),
      protectedFields: policy.protectedFields,
      textPreview: safeTextForDesignAI(el),
    };
  });
}

function humanActionBlocked(el, permission, fallback = "That action is protected") {
  if (canElement(el, permission)) return false;
  const policy = getElementPolicy(el);
  if (policy.layer === "commerce" || policy.layer === "core" || policy.locked || policy.bindings.length) {
    openProtectionModal(el, { blockedPermission: permission });
  } else {
    showToast(fallback, { tone: "info" });
  }
  return true;
}

function assignEditableIds(doc) {
  if (!doc) return;
  const candidates = [...doc.querySelectorAll("nav,header,main,section,footer,article,h1,h2,h3,h4,p,button,a,img,[role='button']")];
  let counter = 1;
  candidates.forEach((el) => {
    if (!el.dataset.bbId) {
      while (doc.querySelector(`[data-bb-id="auto-${counter}"]`)) counter += 1;
      el.dataset.bbId = `auto-${counter++}`;
    }
  });
  hydratePermissionModel(doc);
}

function captureFrameHtml() {
  const doc = getFrameDocument();
  if (!doc?.documentElement) return state.current?.html || "";
  const clone = doc.documentElement.cloneNode(true);
  clone.querySelectorAll("[contenteditable]").forEach(el => {
    el.removeAttribute("contenteditable");
    el.removeAttribute("spellcheck");
  });
  return `<!DOCTYPE html>\n${clone.outerHTML}`;
}

function persistFrame({ updateCode = true } = {}) {
  if (!state.current) return;
  state.current.html = captureFrameHtml();
  if (state.current.files) state.current.files = captureFrameSourceFiles();
  state.current.updatedAt = Date.now();
  if (updateCode) renderActiveCodeFile();
  queueProjectDraftSave();
}

function queueProjectDraftSave() {
  clearTimeout(queueProjectDraftSave.timer);
  const project = cloneData(state.current);
  const switcher = $("#projectSwitcher");
  switcher?.classList.add("is-saving");
  queueProjectDraftSave.timer = setTimeout(async () => {
    try {
      const saved = await services?.projects?.saveDraft?.({ project });
      if (saved?.cloudSaved && state.current?.id === project.id && state.current.html === project.html) state.current._validationIssues = saved.issues || [];
      switcher?.classList.remove("is-saving");
      switcher?.classList.toggle("is-saved", saved?.cloudSaved !== false);
      window.dispatchEvent(new CustomEvent("BOOKBUY_BUILDER_SAVED", { detail: { projectId: project?.id } }));
      setTimeout(() => switcher?.classList.remove("is-saved"), 700);
    } catch (error) {
      switcher?.classList.remove("is-saving");
      showToast(error?.message || "Couldn’t save this draft on your device.", { tone: "error" });
      window.dispatchEvent(new CustomEvent("BOOKBUY_BUILDER_SAVE_ERROR", { detail: { message: error?.message } }));
    }
  }, 260);
}
window.addEventListener('bookbuy-cloud-draft-restore', event => { pushUndo(snapshotProject(), 'Before restoring cloud draft'); restoreSnapshot(event.detail.project); });
window.addEventListener('bookbuy-website-draft-issues', event => { showToast(`Draft connection needs attention before publishing: ${event.detail.message}`, { tone: 'error' }); });
window.addEventListener('pagehide', () => { clearTimeout(queueProjectDraftSave.timer); if (state.current) void services?.projects?.saveDraft?.({ project: cloneData(state.current) }).catch(() => {}); });

function getCanvasElement(id) {
  if (!id) return null;
  const doc = getFrameDocument();
  if (!doc) return null;
  return doc.querySelector(`[data-bb-id="${CSS.escape(id)}"]`);
}

function getSelectableTarget(target) {
  if (!target || target.nodeType !== 1 || typeof target.closest !== "function") return null;
  return target.closest("[data-bb-id]");
}

function describeElement(el) {
  if (!el) return "Element";
  const tag = el.tagName.toLowerCase();
  const id = el.dataset.bbId || tag;
  const policy = getElementPolicy(el);
  const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 38);
  const known = {
    "hero-title": "Hero title",
    "hero-copy": "Hero copy",
    "hero-primary": "Primary button",
    "hero-secondary": "Secondary button",
    "hero-visual": "Hero visual",
    "hero": "Hero section",
    "site-nav": "Navigation",
    "site-brand": "Brand",
    "features": "Features section",
    "features-title": "Section title",
    "cart-button": "Cart button",
    "cart-drawer": "Cart drawer",
    "checkout-button": "Checkout button",
    "booking-calendar": "Booking calendar",
    "availability-picker": "Availability picker",
  };
  if (known[id]) return known[id];
  if (policy.component) return policy.component.split("-").map(x => x[0]?.toUpperCase() + x.slice(1)).join(" ");
  if (el.dataset.bbBind) {
    const key = el.dataset.bbBind.split(".").at(-1);
    return `Bound ${key || "data"}`;
  }
  return text ? `${tag.toUpperCase()} · ${text}` : tag.toUpperCase();
}

function isTextEditableElement(el) {
  if (!el || !canElement(el, "copy")) return false;
  if (["H1","H2","H3","H4","P","BUTTON","A","SPAN","DIV"].includes(el.tagName)) {
    return !el.children.length;
  }
  return false;
}

function boxForElement(el) {
  if (!el || !els.previewArea) return null;
  const frameRect = els.frame.getBoundingClientRect();
  const areaRect = els.previewArea.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  return {
    left: frameRect.left - areaRect.left + rect.left,
    top: frameRect.top - areaRect.top + rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function placeOutline(box, rect) {
  if (!rect) {
    box.classList.add("hidden");
    return;
  }
  box.classList.remove("hidden");
  box.style.left = `${Math.round(rect.left)}px`;
  box.style.top = `${Math.round(rect.top)}px`;
  box.style.width = `${Math.round(rect.width)}px`;
  box.style.height = `${Math.round(rect.height)}px`;
}

function updateCanvasOverlays() {
  if (state.view !== "preview" || !state.current) return;
  if (state.canvasMode === "view") {
    els.hoverOutline.classList.add("hidden");
    els.selectionOutline.classList.add("hidden");
    els.selectionToolbar.classList.add("hidden");
    placeOutline(els.aiOutline, getCanvasElement(state.aiTargetId) ? boxForElement(getCanvasElement(state.aiTargetId)) : null);
    return;
  }
  const hovered = getCanvasElement(state.hoveredId);
  const selected = getCanvasElement(state.selectedId);
  const aiTarget = getCanvasElement(state.aiTargetId);

  placeOutline(els.hoverOutline, hovered && state.hoveredId !== state.selectedId ? boxForElement(hovered) : null);
  placeOutline(els.selectionOutline, selected ? boxForElement(selected) : null);
  placeOutline(els.aiOutline, aiTarget ? boxForElement(aiTarget) : null);

  if (selected) {
    const rect = boxForElement(selected);
    const areaRect = els.previewArea.getBoundingClientRect();
    if (rect) {
      els.selectionToolbar.classList.remove("hidden");
      els.selectionToolbar.style.visibility = "hidden";
      requestAnimationFrame(() => {
        const toolbarRect = els.selectionToolbar.getBoundingClientRect();
        const left = Math.max(8, Math.min(rect.left, areaRect.width - toolbarRect.width - 8));
        const preferredTop = rect.top - toolbarRect.height - 7;
        const top = preferredTop > 7 ? preferredTop : Math.min(areaRect.height - toolbarRect.height - 8, rect.top + rect.height + 7);
        els.selectionToolbar.style.left = `${Math.round(left)}px`;
        els.selectionToolbar.style.top = `${Math.round(top)}px`;
        els.selectionToolbar.style.visibility = "visible";
      });
    }
  } else {
    els.selectionToolbar.classList.add("hidden");
  }
}

function syncSelectionContext() {
  const el = getCanvasElement(state.selectedId);
  const has = Boolean(el);
  els.selectionContext.classList.toggle("hidden", !has);
  if (!has) {
    els.permissionPill?.classList.add("hidden");
    return;
  }

  const label = describeElement(el);
  const policy = getElementPolicy(el);
  const isButton = ["BUTTON", "A"].includes(el.tagName);
  const canCopy = isTextEditableElement(el);
  const protectedVisual = policy.layer === "commerce" || policy.layer === "core" || policy.locked || Boolean(policy.bindings.length);

  els.selectionContextText.textContent = label;
  els.selectionLabel.textContent = label;
  if (els.permissionPill) {
    els.permissionPill.classList.toggle("hidden", !protectedVisual);
    els.permissionPill.textContent = policy.layer === "commerce" ? "Protected" : policy.label;
    els.permissionPill.dataset.tooltip = policy.layer === "commerce" ? "Protected Book & Buy component" : policy.reason;
    els.permissionPill.setAttribute("aria-label", `${policy.label}. View protection details.`);
    els.permissionPill.classList.toggle("commerce", policy.layer === "commerce" && !policy.locked);
    els.permissionPill.classList.toggle("protected", policy.layer === "core" || policy.locked || Boolean(policy.bindings.length));
  }

  $("#protectionInfoBtn")?.classList.toggle("hidden", !protectedVisual);
  const editTextBtn = $("#editSelectionBtn");
  const editingLocked = state.busy;
  editTextBtn.classList.toggle("hidden", isButton);
  editTextBtn.disabled = editingLocked || !canCopy;
  els.buttonEditSelectionBtn.classList.toggle("hidden", !isButton);
  els.buttonEditSelectionBtn.disabled = editingLocked || !canCopy;
  els.spacingSelectionBtn.disabled = editingLocked || !policy.permissions.has("layout");
  els.moveSelectionBtn.disabled = editingLocked || !policy.permissions.has("move");
  $("#duplicateSelectionBtn").disabled = editingLocked || !policy.permissions.has("duplicate");
  els.hideSelectionBtn.disabled = editingLocked || !policy.permissions.has("remove");
  $("#deleteSelectionBtn").disabled = editingLocked || !policy.permissions.has("remove");
  $("#askAISelectionBtn").disabled = editingLocked;
}

function selectCanvasElement(el) {
  if (!el) return clearCanvasSelection();
  state.selectedId = el.dataset.bbId;
  state.hoveredId = null;
  syncSelectionContext();
  updateCanvasOverlays();
}

function clearCanvasSelection() {
  if (state.inlineEdit) cancelInlineEdit();
  state.selectedId = null;
  state.hoveredId = null;
  els.selectionContext.classList.add("hidden");
  els.permissionPill?.classList.add("hidden");
  els.selectionToolbar.classList.add("hidden");
  els.hoverOutline.classList.add("hidden");
  els.selectionOutline.classList.add("hidden");
}

function startInlineEdit() {
  const el = getCanvasElement(state.selectedId);
  if (!el || state.busy) return;
  if (!isTextEditableElement(el)) {
    const policy = getElementPolicy(el);
    if (policy.layer === "commerce" || policy.layer === "core" || policy.locked || policy.bindings.length) {
      openProtectionModal(el, { blockedPermission: "copy" });
      return;
    }
    return showToast("Select editable text or a button label", { tone: "info" });
  }
  if (state.inlineEdit) commitInlineEdit();
  state.inlineEdit = {
    id: state.selectedId,
    originalHtml: el.innerHTML,
    beforeSnapshot: snapshotProject(),
  };
  el.setAttribute("contenteditable", "true");
  el.setAttribute("spellcheck", "false");
  el.focus();
  const selection = el.ownerDocument.getSelection();
  const range = el.ownerDocument.createRange();
  range.selectNodeContents(el);
  selection.removeAllRanges();
  selection.addRange(range);
  els.selectionLabel.textContent = "Editing text";
  updateCanvasOverlays();
}

function commitInlineEdit() {
  if (!state.inlineEdit) return;
  const edit = state.inlineEdit;
  const el = getCanvasElement(edit.id);
  if (el) {
    el.removeAttribute("contenteditable");
    el.removeAttribute("spellcheck");
    if (el.innerHTML !== edit.originalHtml) {
      pushUndo(edit.beforeSnapshot);
      persistFrame();
      showToast("Text updated");
    }
  }
  state.inlineEdit = null;
  syncSelectionContext();
  updateCanvasOverlays();
}

function cancelInlineEdit() {
  if (!state.inlineEdit) return;
  const edit = state.inlineEdit;
  const el = getCanvasElement(edit.id);
  if (el) {
    el.innerHTML = edit.originalHtml;
    el.removeAttribute("contenteditable");
    el.removeAttribute("spellcheck");
  }
  state.inlineEdit = null;
  syncSelectionContext();
  updateCanvasOverlays();
}

function duplicateSelection() {
  const el = getCanvasElement(state.selectedId);
  if (!el || state.busy) return;
  if (humanActionBlocked(el, "duplicate", "That element can’t be duplicated")) return;
  pushUndo();
  const clone = el.cloneNode(true);
  const suffix = Date.now().toString(36).slice(-5);
  clone.querySelectorAll("[data-bb-id]").forEach((child, i) => child.dataset.bbId = `${child.dataset.bbId}-copy-${suffix}-${i}`);
  clone.dataset.bbId = `${el.dataset.bbId}-copy-${suffix}`;
  el.insertAdjacentElement("afterend", clone);
  state.selectedId = clone.dataset.bbId;
  persistFrame();
  syncSelectionContext();
  updateCanvasOverlays();
  showToast("Element duplicated");
}

function deleteSelection() {
  const el = getCanvasElement(state.selectedId);
  if (!el || state.busy) return;
  if (["page-root","main-content"].includes(el.dataset.bbId)) return showToast("That root element can’t be deleted", { tone: "info" });
  if (humanActionBlocked(el, "remove", "That element can’t be deleted")) return;
  pushUndo(undefined, "Delete element");
  el.remove();
  state.selectedId = null;
  persistFrame();
  clearCanvasSelection();
  showToast("Element deleted", { tone: "success" });
}

function hideSelection() {
  const el = getCanvasElement(state.selectedId);
  if (!el || state.busy) return;
  if (["page-root", "main-content"].includes(el.dataset.bbId)) return showToast("The page root can’t be hidden", { tone: "info" });
  if (humanActionBlocked(el, "remove", "That element can’t be hidden")) return;
  pushUndo(undefined, "Hide element");
  el.hidden = true;
  persistFrame();
  clearCanvasSelection();
  showToast("Element hidden · Undo to restore", { tone: "success" });
}

function applySelectionSpacing(preset) {
  const el = getCanvasElement(state.selectedId);
  if (!el || state.busy) return;
  if (humanActionBlocked(el, "layout", "Spacing is locked for this element")) return;
  const values = {
    compact: { padding: BOOK_BUY_TOKENS.spacing.sm, gap: BOOK_BUY_TOKENS.spacing.sm },
    balanced: { padding: BOOK_BUY_TOKENS.spacing.base, gap: BOOK_BUY_TOKENS.spacing.md },
    roomy: { padding: BOOK_BUY_TOKENS.spacing.lg, gap: BOOK_BUY_TOKENS.spacing.lg },
  };
  pushUndo(undefined, "Adjust spacing");
  if (preset === "reset") {
    el.style.removeProperty("padding");
    el.style.removeProperty("gap");
  } else {
    const value = values[preset] || values.balanced;
    el.style.padding = `${value.padding}px`;
    if (["flex", "grid"].includes(el.ownerDocument.defaultView.getComputedStyle(el).display)) el.style.gap = `${value.gap}px`;
  }
  persistFrame();
  syncSelectionContext();
  updateCanvasOverlays();
  closeToolbarMenus();
  showToast(preset === "reset" ? "Spacing reset" : `${preset[0].toUpperCase() + preset.slice(1)} spacing applied`, { tone: "success" });
}

function moveSelection(direction) {
  const el = getCanvasElement(state.selectedId);
  if (!el || state.busy || !el.parentElement) return;
  if (humanActionBlocked(el, "move", "That element can’t be moved")) return;
  const parent = el.parentElement;
  const before = el.previousElementSibling;
  const after = el.nextElementSibling;
  const canMove = direction === "up" ? Boolean(before) : direction === "down" ? Boolean(after) : parent.children.length > 1;
  if (!canMove) { closeToolbarMenus(); return showToast("It’s already at that edge", { tone: "info" }); }
  pushUndo(undefined, "Move element");
  if (direction === "up" && before) parent.insertBefore(el, before);
  else if (direction === "down" && after) parent.insertBefore(after, el);
  else if (direction === "start") parent.insertBefore(el, parent.firstElementChild);
  else if (direction === "end") parent.appendChild(el);
  persistFrame();
  updateCanvasOverlays();
  closeToolbarMenus();
  showToast("Element moved", { tone: "success" });
}

function closeToolbarMenus(except = null) {
  [
    [els.spacingMenu, els.spacingSelectionBtn],
    [els.moveMenu, els.moveSelectionBtn],
    [els.moreSelectionMenu, els.moreSelectionBtn],
  ].forEach(([menu, trigger]) => {
    if (!menu || menu === except) return;
    menu.classList.add("hidden");
    trigger?.setAttribute("aria-expanded", "false");
  });
}

function toggleToolbarMenu(menu, trigger) {
  if (!menu || !trigger || trigger.disabled) return;
  const willOpen = menu.classList.contains("hidden");
  closeToolbarMenus(willOpen ? menu : null);
  menu.classList.toggle("hidden", !willOpen);
  trigger.setAttribute("aria-expanded", willOpen ? "true" : "false");
  if (willOpen) menu.querySelector("button:not(:disabled)")?.focus({ preventScroll: true });
}

function openProtectionModal(el = getCanvasElement(state.selectedId), options = {}) {
  if (!el) return;
  rememberModalFocus();
  const policy = getElementPolicy(el);
  const componentName = policy.component ? policy.component.split("-").map(part => part[0].toUpperCase() + part.slice(1)).join(" ") : describeElement(el);
  els.protectionTitle.textContent = policy.layer === "commerce" ? `${componentName} is protected` : "Protected Book & Buy element";
  els.protectionCopy.textContent = options.blockedPermission
    ? `That ${options.blockedPermission} action is outside this element’s visual permissions. You can still use the approved design controls below.`
    : policy.reason;
  const allowed = [...policy.permissions];
  const protectedItems = policy.protectedFields.length ? policy.protectedFields : (BOOK_BUY_COMMERCE_COMPONENTS[policy.component]?.protected || []);
  els.protectionGrid.innerHTML = `
    <div class="protection-row"><strong>AI may change</strong><span>${escapeHtml(allowed.join(", ") || "Visual presentation only")}</span></div>
    <div class="protection-row"><strong>Always locked</strong><span>${escapeHtml(protectedItems.join(", ") || "Business behavior and data binding")}</span></div>
  `;
  closeAllPopovers();
  closeToolbarMenus();
  els.protectionModal.classList.remove("hidden");
  requestAnimationFrame(() => $("#protectionDone")?.focus());
}

function closeProtectionModal() {
  els.protectionModal.classList.add("hidden");
  restoreModalFocus();
}

function openActionDialog({ eyebrow = "Project", title, copy = "", inputLabel = "", inputValue = "", confirmLabel = "Continue", destructive = false } = {}) {
  rememberModalFocus();
  closeAllPopovers();
  closeToolbarMenus();
  els.actionModalEyebrow.textContent = eyebrow;
  els.actionModalTitle.textContent = title || "Confirm action";
  els.actionModalCopy.textContent = copy;
  const hasInput = Boolean(inputLabel);
  els.actionInputLabel.classList.toggle("hidden", !hasInput);
  els.actionInput.classList.toggle("hidden", !hasInput);
  els.actionInputLabel.textContent = inputLabel || "Name";
  els.actionInput.value = inputValue || "";
  els.actionConfirmBtn.textContent = confirmLabel;
  els.actionConfirmBtn.classList.toggle("destructive-btn", destructive);
  els.actionConfirmBtn.classList.toggle("primary-btn", !destructive);
  els.actionModal.classList.remove("hidden");
  requestAnimationFrame(() => (hasInput ? els.actionInput : els.actionConfirmBtn).focus());
  return new Promise(resolve => { state.actionModalResolver = resolve; });
}

function resolveActionDialog(confirmed) {
  if (els.actionModal.classList.contains("hidden")) return;
  const resolver = state.actionModalResolver;
  const value = confirmed ? (els.actionInput.classList.contains("hidden") ? true : els.actionInput.value.trim()) : false;
  state.actionModalResolver = null;
  els.actionModal.classList.add("hidden");
  resolver?.(value);
  restoreModalFocus();
}

function bindFrameEditor() {
  const doc = getFrameDocument();
  if (!doc?.body) return;
  assignEditableIds(doc);
  state.current.html = captureFrameHtml();
  renderActiveCodeFile();

  const onOver = (event) => {
    if (state.canvasMode !== "edit" || state.busy || state.inlineEdit) return;
    const target = getSelectableTarget(event.target);
    if (!target) return;
    state.hoveredId = target.dataset.bbId;
    updateCanvasOverlays();
  };
  const onOut = (event) => {
    if (state.canvasMode !== "edit" || state.inlineEdit) return;
    const related = event.relatedTarget && event.relatedTarget.nodeType === 1 ? getSelectableTarget(event.relatedTarget) : null;
    if (!related || related.dataset.bbId !== state.hoveredId) {
      state.hoveredId = null;
      updateCanvasOverlays();
    }
  };
  const onClick = (event) => {
    if (state.canvasMode !== "edit" || state.inlineEdit) return;
    const target = getSelectableTarget(event.target);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    selectCanvasElement(target);
  };
  const onDblClick = (event) => {
    if (state.canvasMode !== "edit") return;
    const target = getSelectableTarget(event.target);
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    selectCanvasElement(target);
    if (isTextEditableElement(target)) startInlineEdit();
  };
  const onKeyDown = (event) => {
    if (!state.inlineEdit) return;
    const el = getCanvasElement(state.inlineEdit.id);
    if (!el) return;
    if (event.key === "Escape") {
      event.preventDefault();
      cancelInlineEdit();
    } else if (event.key === "Enter" && !event.shiftKey && ["BUTTON","A","H1","H2","H3","H4"].includes(el.tagName)) {
      event.preventDefault();
      commitInlineEdit();
    }
  };
  const onBlur = (event) => {
    if (!state.inlineEdit) return;
    const el = getCanvasElement(state.inlineEdit.id);
    if (el && event.target === el) setTimeout(() => state.inlineEdit && commitInlineEdit(), 0);
  };

  doc.addEventListener("mouseover", onOver, true);
  doc.addEventListener("mouseout", onOut, true);
  doc.addEventListener("click", onClick, true);
  doc.addEventListener("dblclick", onDblClick, true);
  doc.addEventListener("keydown", onKeyDown, true);
  doc.addEventListener("blur", onBlur, true);
  doc.addEventListener("input", updateCanvasOverlays, true);
  els.frame.contentWindow.addEventListener("scroll", updateCanvasOverlays, { passive: true });
  requestAnimationFrame(updateCanvasOverlays);
}

function focusAIEditing(targetId, label = "AI editing") {
  state.aiTargetId = targetId || null;
  els.aiOutlineLabel.textContent = label;
  updateCanvasOverlays();
}

function clearAIEditing() {
  state.aiTargetId = null;
  els.aiOutline.classList.add("hidden");
}

function addMessage(role, html = "", options = {}) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;
  if (role === "ai") {
    wrap.innerHTML = `
      <div class="ai-meta"><span class="ai-icon" aria-hidden="true"><img class="app-logo ai-message-logo" src="${APP_LOGO_SRC}" alt=""></span><span>Book & Buy AI</span></div>
      <div class="message-bubble">${html}</div>
    `;
  } else {
    const context = options.contextLabel ? `<div class="message-context-ref"><i></i>${escapeHtml(options.contextLabel)}</div>` : "";
    const attachments = options.attachments?.length
      ? `<div class="message-attachments">${options.attachments.map(a => `<span class="message-attachment">${escapeHtml(a.name)}</span>`).join("")}</div>`
      : "";
    wrap.innerHTML = `<div class="message-bubble">${html}${context}${attachments}</div>`;
  }
  els.messages.appendChild(wrap);
  syncChatEmpty();
  scrollChat();
  return wrap;
}

function createAssistantStreamingMessage() {
  const wrap = addMessage("ai", `<span class="message-text"></span><span class="typing-cursor"></span>`);
  return {
    wrap,
    text: $(".message-text", wrap),
    cursor: $(".typing-cursor", wrap),
    bubble: $(".message-bubble", wrap),
  };
}
let recoveredConversationGeneration = 0;
window.addEventListener('bookbuy-ai-new-conversation', () => { recoveredConversationGeneration++; });
window.addEventListener('bookbuy-ai-connection-scope', () => { recoveredConversationGeneration++; els.messages.replaceChildren(); syncChatEmpty(); });
function recoveredResponseText(raw) { try { const value = JSON.parse(raw); return String(value.summary || value.question || raw).slice(0, 3000); } catch { return String(raw || '').slice(0, 3000); } }
function recoveredPromptText(raw) { try { return String(JSON.parse(raw).request || raw).slice(0, 2000); } catch { return String(raw || '').slice(0, 2000); } }
function addRecoveredDesignAction(bubble, raw) {
  let parsed; try { parsed = JSON.parse(raw); } catch { return; }
  if (parsed.kind !== 'edit' || typeof parsed.html !== 'string' || !parsed.html.trim()) return;
  appendMessageActions(bubble, [{ label: 'Review recovered design', onClick: async () => {
    if (state.busy) return;
    const accepted = await openActionDialog({ eyebrow: 'Recovered response', title: 'Apply this recovered design?', copy: 'This response completed while your chat was disconnected. It replaces the current design after its app connections are checked. Your current design will remain in Undo.', confirmLabel: 'Apply design' });
    if (!accepted) return;
    try { await window.BookBuyCommerce.ready(); const html = window.BookBuyCommerce.wireHtml(parsed.html).html; const action = { type: 'updateWebsiteSource', html, newSite: false }; const refusal = designEngine.validateAction(action); if (refusal) throw new Error(refusal.reason); setCanvasMode('edit', { announce: false }); await waitForFrameReady(); const run = { baseSnapshot: snapshotProject(), mutationStarted: false }; await applyAgentAction(action, null, undefined, run); showToast('Recovered design applied', { tone: 'success' }); }
    catch (error) { showToast(error.message, { tone: 'error' }); }
  } }]);
}
window.addEventListener('bookbuy-ai-history', async event => {
  if (state.busy || els.messages.childElementCount) return;
  const history = event.detail, generation = recoveredConversationGeneration;
  for (const turn of (history.turns || []).slice(-12)) {
    if (turn.user) addMessage('user', escapeHtml(recoveredPromptText(turn.user)));
    if (turn.assistant) { const message = addMessage('ai', escapeHtml(recoveredResponseText(turn.assistant)).replace(/\n/g, '<br/>')); if (turn.status === 'completed') addRecoveredDesignAction($('.message-bubble', message), turn.assistant); }
  }
  if (!history.activeRun) return;
  const message = addMessage('ai', 'Your earlier request is still running. I’ll recover its response here.');
  const bubble = $('.message-bubble', message);
  appendMessageActions(bubble, [{ label: 'Cancel earlier request', onClick: () => window.BookBuyCommerce.hostRequest('ai.run.cancel', { runId: history.activeRun }).catch(error => showToast(error.message, { tone: 'error' })) }]);
  for (let attempt = 0; attempt < 100 && generation === recoveredConversationGeneration && message.isConnected; attempt++) {
    try { const run = await window.BookBuyCommerce.hostRequest('ai.run.status', { runId: history.activeRun }); if (run.status !== 'running') { bubble.textContent = run.status === 'completed' ? recoveredResponseText(run.content) : run.error?.message || (run.status === 'cancelled' ? 'Earlier request cancelled.' : 'The earlier request could not complete.'); if (run.status === 'completed') addRecoveredDesignAction(bubble, run.content); return; } }
    catch (error) { bubble.textContent = 'The earlier response is saved on the server. Reconnect to recover it.'; return; }
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
});

function createPlanCard(plan, container) {
  const card = document.createElement("div");
  card.className = "plan-card";
  card.innerHTML = `
    <div class="plan-head" role="button" tabindex="-1" aria-expanded="true"><strong>${escapeHtml(plan.title || "Plan")}</strong><span class="plan-summary">${plan.steps.length} steps</span></div>
    <div class="plan-steps">
      ${plan.steps.map((step, i) => `
        <div class="plan-step" data-plan-step="${escapeHtml(step.id)}">
          <span class="step-state"></span>
          <span>${escapeHtml(step.label)}</span>
          <small>${i + 1}/${plan.steps.length}</small>
        </div>`).join("")}
    </div>`;
  const head = $(".plan-head", card);
  head.addEventListener("click", () => {
    if (!card.classList.contains("complete")) return;
    card.classList.toggle("collapsed");
    head.setAttribute("aria-expanded", card.classList.contains("collapsed") ? "false" : "true");
  });
  head.addEventListener("keydown", event => {
    if (!card.classList.contains("complete") || !["Enter", " "].includes(event.key)) return;
    event.preventDefault();
    head.click();
  });
  container.appendChild(card);
  scrollChat();
  return card;
}

function completePlanCard(card, summary = "Complete") {
  if (!card) return;
  card.classList.add("complete", "collapsed");
  const head = $(".plan-head", card);
  const summaryEl = $(".plan-summary", card);
  if (summaryEl) summaryEl.textContent = summary;
  if (head) { head.tabIndex = 0; head.setAttribute("aria-expanded", "false"); }
}

function setPlanStepState(card, stepId, status) {
  const row = card?.querySelector(`[data-plan-step="${CSS.escape(stepId)}"]`);
  if (!row) return;
  row.classList.remove("current", "done", "error", "blocked", "canceled");
  if (status) row.classList.add(status);
  scrollChat();
}

function appendMessageActions(container, actions) {
  const row = document.createElement("div");
  row.className = "message-actions";
  actions.forEach(({ label, icon, className = "", onClick }) => {
    const button = document.createElement("button");
    button.className = `message-action ${className}`.trim();
    button.innerHTML = `${icon ? uiIconMarkup(icon) : ''}<span>${escapeHtml(label)}</span>`;
    button.addEventListener("click", onClick);
    row.appendChild(button);
  });
  container.appendChild(row);
  scrollChat();
  return row;
}

function appendClarification(container, question, choices) {
  const card = document.createElement("div");
  card.className = "clarification-card";
  card.innerHTML = `<div class="clarification-heading">${uiIconMarkup('message-square')}<span>A quick question</span></div><strong>${escapeHtml(question)}</strong><div class="choice-list" role="radiogroup" aria-label="Answer choices"></div><label class="clarification-custom">Your answer<input type="text" placeholder="Or type your own answer…" maxlength="1200"></label><button type="button" class="primary-btn clarification-submit" disabled>Continue ${uiIconMarkup('arrow-right')}</button>`;
  const list = $(".choice-list", card);
  const input = $('input', card), submit = $('.clarification-submit', card); let answer = '';
  (choices || []).forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = 'button'; button.className = "choice-btn"; button.tabIndex = index === 0 ? 0 : -1; button.setAttribute('role', 'radio'); button.setAttribute('aria-checked', 'false');
    button.innerHTML = `<span class="choice-number">${index + 1}</span><span>${escapeHtml(choice.label)}</span><span class="choice-selected">${uiIconMarkup('check')}</span>`;
    button.addEventListener("click", () => {
      list.querySelectorAll('button').forEach(item => { item.classList.toggle('selected', item === button); item.setAttribute('aria-checked', String(item === button)); item.tabIndex = item === button ? 0 : -1; });
      answer = choice.prompt; input.value = ''; submit.disabled = false;
    });
    list.appendChild(button);
  });
  list.addEventListener('keydown', event => {
    if (!['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    const options = [...list.querySelectorAll('button:not(:disabled)')]; if (!options.length) return;
    event.preventDefault(); const index = options.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (['ArrowDown','ArrowRight'].includes(event.key) ? 1 : -1) + options.length) % options.length;
    options[next].focus(); options[next].click();
  });
  input.addEventListener('input', () => { answer = input.value.trim(); submit.disabled = !answer; list.querySelectorAll('button').forEach((item, index) => { item.classList.remove('selected'); item.setAttribute('aria-checked', 'false'); item.tabIndex = index === 0 ? 0 : -1; }); });
  submit.addEventListener('click', () => {
    if (!answer || state.busy) return;
    card.classList.add('answered'); card.querySelectorAll('button,input').forEach(item => item.disabled = true); submit.textContent = 'Answer sent';
    els.prompt.value = answer; autoSizeComposer(); syncComposerActionState(); els.prompt.focus(); sendPrompt();
  });
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); submit.click(); } });
  container.appendChild(card);
  scrollChat();
}

function createProgressCard(container) {
  const card = document.createElement('details'); card.className = 'bb-ai-progress'; card.open = true; card.dataset.state = 'working';
  card.innerHTML = `<summary>${uiIconMarkup('brain')}<span class="bb-progress-title">Thinking & planning</span><span class="bb-progress-time"></span>${uiIconMarkup('chevron-down', 'bb-progress-chevron')}</summary><div class="bb-progress-body"><div class="bb-progress-activity"></div><div class="bb-progress-summaries"></div><div class="bb-progress-plan hidden"><div class="bb-progress-section-label">Plan</div><ol></ol></div></div>`;
  container.prepend(card);
  const started = Date.now(), time = $('.bb-progress-time', card), title = $('.bb-progress-title', card);
  const timer = setInterval(() => { time.textContent = `${Math.floor((Date.now() - started) / 1000)}s`; }, 1000);
  const paragraphs = new Map(); let lastActivity = '';
  return {
    update(event) {
      if (event.type === 'plan') {
        const section = $('.bb-progress-plan', card), list = $('ol', section); list.replaceChildren(); section.classList.remove('hidden');
        for (const item of (event.plan || []).slice(0, 12)) { const li = document.createElement('li'); li.dataset.state = item.status || 'pending'; li.innerHTML = uiIconMarkup(item.status === 'completed' ? 'check' : item.status === 'in_progress' ? 'loader' : 'clock'); const text = document.createElement('span'); text.textContent = String(item.step || '').slice(0, 400); li.append(text); list.append(li); }
      } else if (['summary', 'commentary', 'planText'].includes(event.type)) {
        const key = `${event.type}:${event.itemId || ''}:${event.part || 0}`;
        let paragraph = paragraphs.get(key);
        if (!paragraph) { const section = document.createElement('div'); section.className = 'bb-progress-summary'; const label = document.createElement('div'); label.className = 'bb-progress-section-label'; label.textContent = ({ summary: 'Reasoning summary', commentary: 'Update', planText: 'Planning' })[event.type]; paragraph = document.createElement('p'); section.append(label, paragraph); $('.bb-progress-summaries', card).append(section); paragraphs.set(key, paragraph); }
        paragraph.textContent += event.text || '';
      } else if (event.text && event.text !== lastActivity) {
        const line = document.createElement('div'); line.className = 'bb-progress-line'; line.innerHTML = uiIconMarkup(event.type === 'check' && !event.text.endsWith('…') ? 'check' : 'loader'); const text = document.createElement('span'); text.textContent = event.text; line.append(text); $('.bb-progress-activity', card).append(line); lastActivity = event.text;
      }
      scrollChat();
    },
    finish(status = 'complete', planning = false) {
      clearInterval(timer); card.dataset.state = status; time.textContent = `${Math.max(1, Math.round((Date.now() - started) / 1000))}s`;
      title.textContent = planning && status === 'complete' ? 'Plan ready' : ({ complete: 'Work completed', question: 'Ready for your answer', error: 'Request interrupted', stopped: 'Stopped' })[status] || 'Work completed';
      card.open = status === 'error' || planning;
      $('.bb-progress-activity', card).querySelectorAll('.ui-icon').forEach(icon => icon.outerHTML = uiIconMarkup(status === 'complete' || status === 'question' ? 'check' : 'info'));
    }
  };
}

function appendError(container, message, prompt) {
  const card = document.createElement("div");
  card.className = "error-card";
  card.innerHTML = `<strong>Something interrupted this edit</strong><span>${escapeHtml(message || "The mock agent could not finish the requested action.")}</span>`;
  container.appendChild(card);
  appendMessageActions(container, [
    { label: "Retry", onClick: () => retryPrompt(prompt) },
    { label: "Edit prompt", className: "secondary", onClick: () => { els.prompt.value = prompt; autoSizeComposer(); els.prompt.focus(); } },
  ]);
}

function appendSafetyRefusal(container, refusal) {
  const card = document.createElement("div");
  card.className = "safety-card";
  card.innerHTML = `<strong>${escapeHtml(refusal?.title || "Protected by Book & Buy")}</strong><span>${escapeHtml(refusal?.reason || "That change is outside the design engine’s permissions.")}</span><small>${escapeHtml(refusal?.safeAlternative || "I can make a visual-only change instead.")}</small>`;
  container.appendChild(card);
  appendMessageActions(container, [
    { label: "Try a visual change", onClick: () => { els.prompt.value = "Restyle the selected element without changing its data or behavior."; autoSizeComposer(); els.prompt.focus(); } },
  ]);
  scrollChat();
  return card;
}

function extractQuotedText(prompt) {
  const match = prompt.match(/["“”']([^"“”']{2,100})["“”']/);
  return match?.[1]?.trim() || "";
}

function inferColor(prompt) {
  const p = prompt.toLowerCase();
  if (/\bblue\b/.test(p)) return BOSTON.buy;
  if (/\bgreen\b/.test(p)) return BOSTON.book;
  if (/\bpurple\b|violet/.test(p)) return BOSTON.social;
  if (/\byellow\b|gold/.test(p)) return BOSTON.analytics;
  if (/\borange\b/.test(p)) return BOSTON.office;
  if (/\bblack\b|dark/.test(p)) return BOSTON.business;
  return null;
}

function phraseAfter(prompt, keywords) {
  const pattern = new RegExp(`(?:${keywords.join("|")})\\s+(?:to|say|as)?\\s*["“”']?(.+?)["“”']?$`, "i");
  const match = prompt.match(pattern);
  if (!match) return "";
  return match[1].replace(/[.!?]+$/, "").trim();
}

function needsClarification(prompt, context) {
  const clean = prompt.trim().toLowerCase();
  if (!clean) return true;
  if (/^(change|update|fix|improve|redo|make it better|do it|this|that|adjust it)[.!?]*$/.test(clean)) return true;
  if (clean.split(/\s+/).length <= 2 && !/^(build|create|make|design)/.test(clean)) return true;
  if (/\b(this|it)\b/.test(clean) && !context.selectedId && clean.split(/\s+/).length < 6) return true;
  return false;
}

function buildClarification(context) {
  if (context.selectedId) {
    const selected = getCanvasElement(context.selectedId);
    const policy = getElementPolicy(selected);
    if (policy.layer === "commerce") {
      return {
        question: "What visual change should I make to this commerce element?",
        choices: [
          { label: "Make it more prominent", prompt: "Make the selected commerce element more visually prominent using typography only." },
          { label: "Adjust the spacing", prompt: "Make the selected commerce element spacing more compact." },
          { label: "Use Book & Buy blue", prompt: "Change the selected commerce element to Book & Buy blue without changing its behavior or data." },
        ],
      };
    }
    return {
      question: "What should I change about the selected design element?",
      choices: [
        { label: "Rewrite the copy", prompt: "Rewrite the selected text to be clearer and more premium." },
        { label: "Refine spacing", prompt: "Make the selected element spacing more balanced." },
        { label: "Change its color", prompt: "Change the selected element to Book & Buy blue." },
      ],
    };
  }
  return {
    question: "Which design area should I work on?",
    choices: [
      { label: "Refine the hero", prompt: "Refine the hero hierarchy and primary call to action." },
      { label: "Add a section", prompt: "Add an approved story section below the current content." },
      { label: "Rebuild the page", prompt: "Rebuild this as a premium business website using the Book & Buy design playbook." },
    ],
  };
}

function makeRewrite(original, prompt) {
  const p = prompt.toLowerCase();
  const quoted = extractQuotedText(prompt);
  if (quoted) return quoted;
  const explicit = phraseAfter(prompt, ["change(?: the)?(?: selected)?(?: text)?", "make(?: this)? say", "rewrite(?: it)?"]);
  if (explicit && explicit.length < 140 && !/clearer|shorter|premium|better/.test(explicit.toLowerCase())) return explicit;
  const words = String(original || "").trim().split(/\s+/).filter(Boolean);
  if (/short|concise|direct/.test(p) && words.length > 4) return words.slice(0, Math.max(3, Math.ceil(words.length * .62))).join(" ").replace(/[,.]$/, "") + (/[.!?]$/.test(original) ? "." : "");
  if (/premium|polish|clear|stronger|better/.test(p)) {
    const clean = String(original || "").replace(/\s+/g, " ").trim();
    if (!clean) return "Made simple. Built beautifully.";
    if (clean.length < 45) return clean.replace(/[.!?]+$/, "") + ", made beautifully simple.";
    return clean.replace(/\bvery\b/gi, "").replace(/\s+/g, " ").trim();
  }
  return original;
}

function inferColorToken(prompt) {
  const p = prompt.toLowerCase();
  if (/\bblue\b/.test(p)) return "buy";
  if (/\bgreen\b/.test(p)) return "book";
  if (/\bpurple\b|violet/.test(p)) return "social";
  if (/\byellow\b|gold/.test(p)) return "analytics";
  if (/\borange\b/.test(p)) return "office";
  if (/\bblack\b|dark|charcoal/.test(p)) return "business";
  return null;
}

function inferTypographyPreset(prompt, target = null) {
  const p = prompt.toLowerCase();
  if (/price|prominent|emphas/.test(p) && target?.dataset?.bbBind?.includes("price")) return "priceEmphasis";
  if (/bigger|larger|more impact|more dramatic/.test(p)) return target?.tagName === "H1" ? "displayXL" : "heading";
  if (/smaller|quieter|subtle|less prominent/.test(p)) return target?.tagName === "H1" ? "displayLG" : "small";
  if (/headline|hero|display/.test(p)) return "displayLG";
  if (/body|paragraph|readable/.test(p)) return "body";
  return target?.tagName === "H1" ? "displayLG" : target?.dataset?.bbBind?.includes("price") ? "priceEmphasis" : "subheading";
}

function inferLayoutPreset(prompt) {
  const p = prompt.toLowerCase();
  if (/airy|more space|spacious|breathing room|looser/.test(p)) return "airy";
  if (/compact|tighter|less space|dense/.test(p)) return "compact";
  if (/center|centred|centered/.test(p)) return "centered";
  if (/stack|single column/.test(p)) return "stacked";
  if (/split|two column|two-column/.test(p)) return "split";
  if (/wider|wide/.test(p)) return "wide";
  if (/narrow|contained/.test(p)) return "narrow";
  return "balanced";
}

function inferComponentVariant(prompt, component) {
  const p = prompt.toLowerCase();
  const available = BOOK_BUY_COMMERCE_COMPONENTS[component]?.variants || [];
  const candidates = ["compact", "editorial", "minimal", "outline", "soft", "solid", "clean", "month", "chips", "list", "label", "icon"];
  return candidates.find(v => available.includes(v) && new RegExp(`\\b${v}\\b`, "i").test(p)) || available[0] || null;
}

function requestedMoveDirection(prompt) {
  const p = prompt.toLowerCase();
  if (/move.*(up|before|earlier|above)/.test(p)) return "up";
  if (/move.*(down|after|later|below)/.test(p)) return "down";
  if (/move.*(first|start|top)/.test(p)) return "start";
  if (/move.*(last|end|bottom)/.test(p)) return "end";
  return "down";
}

function inferApprovedSection(prompt) {
  const p = prompt.toLowerCase();
  if (/faq|question/.test(p)) return "faq";
  if (/trust|confidence|reassurance|proof/.test(p)) return "trust-strip";
  if (/newsletter|email|subscribe/.test(p)) return "newsletter";
  return "story";
}

class SafetyBoundaryError extends Error {
  constructor(message, detail = {}) {
    super(message);
    this.name = "SafetyBoundaryError";
    this.code = detail.code || "DESIGN_BOUNDARY";
    this.targetId = detail.targetId || null;
    this.action = detail.action || null;
    this.safeMessage = detail.safeMessage || message;
    this.detail = detail;
  }
}

function makeSafetyRefusal(reason, detail = {}) {
  return {
    code: detail.code || "PROTECTED_BUSINESS_LOGIC",
    title: detail.title || "Protected by Book & Buy",
    reason,
    safeAlternative: detail.safeAlternative || "I can still change layout, typography, color, spacing, or an approved visual variant without touching the underlying business behavior or data.",
    targetId: detail.targetId || null,
  };
}

function detectProtectedBusinessMutation(prompt, context = {}) {
  const p = prompt.toLowerCase();
  const visualTerms = /\b(color|colour|font|type|typography|size|larger|smaller|bigger|bold|weight|spacing|space|padding|margin|layout|position|move|reposition|align|width|wider|narrow|style|visual|appearance|variant|compact|editorial|outline|soft|solid|prominent)\b/;
  const destructiveTerms = /\b(delete|remove|duplicate|clone|replace|rewrite|change|edit|set|update|modify|override|bypass|disable|wire|connect|disconnect)\b/;
  const coreTerms = /\b(price|pricing|inventory|stock|quantity|cart logic|cart data|checkout|payment|payments|webhook|webhooks|auth|authentication|api|apis|endpoint|order data|booking data|availability data|product id|service id|database|data binding|binding)\b/;
  const selected = getCanvasElement(context.selectedId);
  const policy = getElementPolicy(selected);

  if (destructiveTerms.test(p) && coreTerms.test(p) && !visualTerms.test(p)) {
    return makeSafetyRefusal("That request would change transactional data or business logic, which the design engine cannot mutate.", {
      targetId: context.selectedId,
      safeAlternative: "Ask me to change how that information is presented instead—for example its typography, spacing, color, placement, or component variant.",
    });
  }

  if (policy.layer === "commerce") {
    if (/\b(delete|remove|duplicate|clone)\b/.test(p)) {
      return makeSafetyRefusal("Stable commerce components cannot be deleted, duplicated, or detached by the design AI because that could break their data and behavior contracts.", { targetId: context.selectedId });
    }
    if ((policy.bindings.length || policy.protectedFields.length) && /\b(rewrite|change|edit|set|update)\b/.test(p) && /\b(text|copy|label|value|price|stock|inventory|duration|availability|total|count)\b/.test(p) && !visualTerms.test(p)) {
      return makeSafetyRefusal("This content is connected to Book & Buy business data, so the design AI cannot rewrite its bound value.", {
        targetId: context.selectedId,
        safeAlternative: "I can restyle or reposition it while keeping the live data binding intact.",
      });
    }
  }

  return null;
}

function actionTarget(action, step) {
  return getCanvasElement(action.targetId || step?.targetId || state.selectedId);
}

function guardDesignAction(action, step = null) {
  if (!action || typeof action !== "object" || Array.isArray(action)) {
    return makeSafetyRefusal("The design action must be a structured object.", { code: "INVALID_ACTION" });
  }
  if (action.type === 'updateWebsiteSource') {
    if (Object.keys(action).some(key => !['type', 'html', 'newSite'].includes(key)) || typeof action.html !== 'string' || action.html.length > 160000 || typeof action.newSite !== 'boolean' || !/<html[\s>]/i.test(action.html)) return makeSafetyRefusal('Invalid generated website source.');
    if (!action.newSite) {
      try { window.BookBuyWebsiteContract.validateWebsiteBindings(action.html, window.BookBuyCommerce.context, { previousHtml: state.current?.html || '', preserve: true }); }
      catch (error) { return makeSafetyRefusal(error.message); }
    }
    return null;
  }
  const allowedKeys = {
    inspectTarget: ["type", "targetId"],
    rebuildFromApprovedTemplate: ["type", "targetId", "prompt"],
    updateCopy: ["type", "targetId", "text", "rewritePrompt"],
    updateLayout: ["type", "targetId", "preset"],
    updateTypography: ["type", "targetId", "preset"],
    updateColorToken: ["type", "targetId", "token"],
    setComponentVariant: ["type", "targetId", "variant"],
    moveComponent: ["type", "targetId", "direction"],
    insertApprovedSection: ["type", "targetId", "sectionKey"],
    removeElement: ["type", "targetId"],
    duplicateElement: ["type", "targetId"],
  };
  if (typeof action.type !== "string" || !Object.hasOwn(allowedKeys, action.type)) {
    return makeSafetyRefusal("That operation is not an approved design action.", { code: "UNAPPROVED_ACTION" });
  }
  if (Object.keys(action).some(key => !allowedKeys[action.type].includes(key))) {
    return makeSafetyRefusal("The design action includes unsupported fields.", { code: "INVALID_ACTION_FIELDS" });
  }
  const sizeLimits = { type: 40, targetId: 160, text: 2000, rewritePrompt: 2000, prompt: 4000, preset: 40, token: 40, variant: 40, direction: 20, sectionKey: 40 };
  if (Object.entries(action).some(([key, value]) => key === "targetId" && value == null ? false : typeof value !== "string" || value.length > sizeLimits[key])) {
    return makeSafetyRefusal("The design action has invalid or oversized values.", { code: "INVALID_ACTION_VALUES" });
  }
  const definition = SAFE_DESIGN_ACTIONS[action?.type];
  if (!definition) {
    return makeSafetyRefusal(`“${action?.type || "unknown"}” is not an approved Book & Buy design action.`, {
      code: "UNAPPROVED_ACTION",
      safeAlternative: "The design engine can only use the structured visual action registry.",
    });
  }

  const forbiddenPayloadKeys = ["html", "script", "code", "endpoint", "webhook", "auth", "payment", "inventory", "price", "binding", "handler"];
  if (Object.keys(action).some(key => forbiddenPayloadKeys.includes(key))) {
    return makeSafetyRefusal("The requested action contains a field that belongs to the protected business layer.", { code: "FORBIDDEN_ACTION_PAYLOAD" });
  }

  if (action.type === "rebuildFromApprovedTemplate") return null;

  if (action.type === "insertApprovedSection") {
    if (!APPROVED_SECTION_KEYS.includes(action.sectionKey)) {
      return makeSafetyRefusal("That section type is not in the approved Book & Buy section registry.", { code: "UNAPPROVED_SECTION" });
    }
    const target = getCanvasElement(action.targetId || "main-content");
    if (!target || !canElement(target, "insert")) return makeSafetyRefusal("The requested insertion point is protected.", { targetId: action.targetId });
    return null;
  }

  const target = actionTarget(action, step);
  if (!target) return makeSafetyRefusal("The design target no longer exists on the canvas.", { code: "MISSING_TARGET", targetId: action.targetId || step?.targetId });
  const policy = getElementPolicy(target);

  if (policy.layer === "core") return makeSafetyRefusal("This node belongs to the protected Book & Buy business core and cannot be changed by design AI.", { targetId: policy.id });
  if (definition.permission && !canElement(target, definition.permission)) {
    return makeSafetyRefusal(`This ${policy.layer === "commerce" ? "commerce component" : "element"} does not grant the “${definition.permission}” design permission.`, {
      targetId: policy.id,
      safeAlternative: policy.reason,
    });
  }

  if (action.type === "updateCopy" && !isTextEditableElement(target)) {
    return makeSafetyRefusal("Choose an individual text element so its surrounding controls stay intact.", { code: "NON_LEAF_COPY_TARGET", targetId: policy.id });
  }

  if (action.type === "updateColorToken" && !Object.hasOwn(BOOK_BUY_TOKENS.colors, action.token)) {
    return makeSafetyRefusal("The requested color is outside the Book & Buy token system.", { code: "UNAPPROVED_TOKEN", targetId: policy.id });
  }

  if (action.type === "updateTypography" && !Object.hasOwn(BOOK_BUY_TOKENS.typography, action.preset)) {
    return makeSafetyRefusal("The requested typography preset is outside the Book & Buy design system.", { code: "UNAPPROVED_TYPE_PRESET", targetId: policy.id });
  }

  if (action.type === "updateLayout" && !["balanced", "airy", "compact", "centered", "stacked", "split", "wide", "narrow"].includes(action.preset)) {
    return makeSafetyRefusal("The requested layout preset is outside the safe layout system.", { code: "UNAPPROVED_LAYOUT", targetId: policy.id });
  }

  if (action.type === "setComponentVariant") {
    const component = policy.component;
    const registry = BOOK_BUY_COMMERCE_COMPONENTS[component];
    if (!registry || !registry.variants.includes(action.variant)) {
      return makeSafetyRefusal("That visual variant is not approved for this commerce component.", { code: "UNAPPROVED_VARIANT", targetId: policy.id });
    }
  }

  if (action.type === "moveComponent" && !["up", "down", "start", "end"].includes(action.direction)) {
    return makeSafetyRefusal("That move is outside the safe reordering options.", { code: "UNAPPROVED_MOVE", targetId: policy.id });
  }

  return null;
}

function approvedSectionMarkup(sectionKey, id) {
  const permissions = 'data-bb-layer="design" data-bb-permission="layout,typography,color,move,remove,duplicate,insert"';
  const child = 'data-bb-layer="design" data-bb-permission="copy,layout,typography,color,move,remove,duplicate"';
  const sections = {
    story: `<section data-bb-id="${id}" ${permissions} style="max-width:1220px;margin:0 auto;padding:72px 5vw 86px;border-top:1px solid #ECEEF0;background:#fff"><div data-bb-id="${id}-inner" ${permissions} style="display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:48px;align-items:start"><div><div data-bb-id="${id}-kicker" ${child} style="font-size:9px;letter-spacing:.14em;font-weight:800;color:#1E6BFF;margin-bottom:12px">OUR APPROACH</div><h2 data-bb-id="${id}-title" ${child} style="font-size:36px;line-height:1.05;letter-spacing:-.055em;margin:0">Built around what matters.</h2></div><p data-bb-id="${id}-copy" ${child} style="margin:3px 0 0;color:#68707B;font-size:13px;line-height:1.75;max-width:620px">Use this section for real brand story, service context or product value. Book & Buy AI keeps the structure clean and leaves factual business claims to you.</p></div></section>`,
    "trust-strip": `<section data-bb-id="${id}" ${permissions} style="border-top:1px solid #ECEEF0;border-bottom:1px solid #ECEEF0;padding:22px 5vw;background:#fff"><div data-bb-id="${id}-inner" ${permissions} style="max-width:1220px;margin:auto;display:grid;grid-template-columns:repeat(3,1fr);gap:16px"><div ${child} data-bb-id="${id}-a"><strong style="display:block;font-size:12px">Clear checkout</strong><span style="color:#68707B;font-size:10px">A direct path from choice to purchase.</span></div><div ${child} data-bb-id="${id}-b"><strong style="display:block;font-size:12px">Live availability</strong><span style="color:#68707B;font-size:10px">Booking UI stays connected to availability.</span></div><div ${child} data-bb-id="${id}-c"><strong style="display:block;font-size:12px">Mobile ready</strong><span style="color:#68707B;font-size:10px">Primary actions remain easy to reach.</span></div></div></section>`,
    faq: `<section data-bb-id="${id}" ${permissions} style="max-width:980px;margin:0 auto;padding:72px 5vw 86px;border-top:1px solid #ECEEF0"><h2 data-bb-id="${id}-title" ${child} style="font-size:36px;line-height:1.05;letter-spacing:-.055em;margin:0 0 28px">Common questions.</h2><div data-bb-id="${id}-list" ${permissions} style="display:grid;gap:10px"><article data-bb-id="${id}-q1" ${permissions} style="padding:18px;border:1px solid #E7EAEE;border-radius:14px"><strong data-bb-id="${id}-q1-title" ${child}>How does it work?</strong><p data-bb-id="${id}-q1-copy" ${child} style="margin:8px 0 0;color:#68707B;font-size:11px;line-height:1.65">Replace this with a factual answer about your product or service.</p></article><article data-bb-id="${id}-q2" ${permissions} style="padding:18px;border:1px solid #E7EAEE;border-radius:14px"><strong data-bb-id="${id}-q2-title" ${child}>What should customers know?</strong><p data-bb-id="${id}-q2-copy" ${child} style="margin:8px 0 0;color:#68707B;font-size:11px;line-height:1.65">Use this space for policies, delivery, booking preparation or other verified information.</p></article></div></section>`,
    newsletter: `<section data-bb-id="${id}" ${permissions} style="max-width:1220px;margin:0 auto 86px;padding:34px 5vw;border:1px solid #E7EAEE;border-radius:18px;background:#F8F9FA"><div data-bb-id="${id}-inner" ${permissions} style="display:flex;align-items:center;justify-content:space-between;gap:24px;flex-wrap:wrap"><div><h2 data-bb-id="${id}-title" ${child} style="font-size:28px;letter-spacing:-.05em;margin:0 0 7px">Stay in the loop.</h2><p data-bb-id="${id}-copy" ${child} style="margin:0;color:#68707B;font-size:11px">Add your verified email marketing connection when the backend is ready.</p></div><div data-bb-id="${id}-form" ${permissions} style="display:flex;gap:7px"><input disabled aria-label="Email preview" placeholder="Email address" style="height:40px;border:1px solid #D8DDE3;border-radius:9px;padding:0 12px;background:#fff"><button disabled style="height:40px;border:1px solid #15181D;border-radius:9px;padding:0 14px;background:#15181D;color:#fff;font-weight:700">Subscribe</button></div></div></section>`,
  };
  return sections[sectionKey] || "";
}

function applyTypographyPreset(target, preset) {
  const token = BOOK_BUY_TOKENS.typography[preset];
  if (!token) return;
  Object.entries(token).forEach(([key, value]) => { target.style[key] = value; });
}

function applyLayoutPreset(target, preset) {
  const s = BOOK_BUY_TOKENS.spacing;
  const tag = target.tagName;
  if (preset === "airy") {
    target.style.gap = `${s.xl}px`;
    if (["SECTION", "MAIN", "DIV", "ARTICLE"].includes(tag)) target.style.paddingTop = target.style.paddingBottom = `${s.section}px`;
  } else if (preset === "compact") {
    target.style.gap = `${s.md}px`;
    if (["SECTION", "DIV", "ARTICLE"].includes(tag)) target.style.paddingTop = target.style.paddingBottom = `${s.lg}px`;
  } else if (preset === "centered") {
    target.style.textAlign = "center";
    target.style.justifyItems = "center";
    target.style.alignItems = "center";
  } else if (preset === "stacked") {
    target.style.display = "grid";
    target.style.gridTemplateColumns = "1fr";
    target.style.gap = `${s.lg}px`;
  } else if (preset === "split") {
    target.style.display = "grid";
    target.style.gridTemplateColumns = "minmax(0,1fr) minmax(0,1fr)";
    target.style.gap = `${s.xxl}px`;
  } else if (preset === "wide") {
    target.style.maxWidth = "1320px";
    target.style.width = "100%";
  } else if (preset === "narrow") {
    target.style.maxWidth = "960px";
    target.style.marginLeft = "auto";
    target.style.marginRight = "auto";
  } else {
    target.style.gap = target.style.gap || `${s.base}px`;
  }
}

function createBookBuyDesignEngine() {
  return Object.freeze({
    tokens: BOOK_BUY_TOKENS,
    playbook: BOOK_BUY_DESIGN_PLAYBOOK,
    businessCore: BOOK_BUY_BUSINESS_CORE,
    commerceComponents: BOOK_BUY_COMMERCE_COMPONENTS,
    actions: SAFE_DESIGN_ACTIONS,

    preflight(prompt, context) {
      return detectProtectedBusinessMutation(prompt, context);
    },

    permissionsFor(targetId) {
      const el = getCanvasElement(targetId);
      const policy = getElementPolicy(el);
      return { ...policy, permissions: [...policy.permissions] };
    },

    validateAction(action, step) {
      return guardDesignAction(action, step);
    },

    async createPlan(prompt, context, signal) {
      await sleep(110, signal);
      const p = prompt.toLowerCase();
      const selectedId = context.selectedId || null;
      const selected = getCanvasElement(selectedId);
      const policy = getElementPolicy(selected);
      const componentOwner = selected?.closest?.("[data-bb-component]") || null;
      const componentPolicy = getElementPolicy(componentOwner || selected);
      const componentTargetId = componentOwner?.dataset?.bbId || selectedId;
      const selectedText = context.selectedText || "";
      const quoted = extractQuotedText(prompt);
      const colorToken = inferColorToken(prompt);
      const buildNew = !context.hasSite || /^(build|create|design|generate)\b/.test(p) || /^make\s+(?:me\s+)?(?:a|an)\b.*\b(site|website|store|shop|booking|portfolio|restaurant|landing page)\b/.test(p);

      if (buildNew) {
        return {
          title: "Book & Buy design plan",
          intro: "I’ll use the Book & Buy design playbook and approved commerce templates, then check the customer path without touching transactional logic.",
          final: "The page is built on the protected core and stable commerce component contracts. You can keep refining the visual layer safely.",
          steps: [
            { id: "structure", label: "Build from an approved template", targetId: null, action: { type: "rebuildFromApprovedTemplate", prompt } },
            { id: "hero", label: "Check hero hierarchy", targetId: "hero-title", action: { type: "inspectTarget", targetId: "hero-title" } },
            { id: "commerce", label: "Preserve commerce bindings", targetId: typeTargetForPrompt(p), action: { type: "inspectTarget", targetId: typeTargetForPrompt(p) } },
            { id: "responsive", label: "Check the primary mobile path", targetId: "hero-primary", action: { type: "inspectTarget", targetId: "hero-primary" } },
          ],
        };
      }

      if (selectedId && colorToken) {
        return {
          title: "Safe color refinement",
          intro: "I’ll change only the visual token on the selected element and preserve any Book & Buy binding or behavior behind it.",
          final: "The selected element now uses the requested Book & Buy color token; its behavior and data remain intact.",
          steps: [
            { id: "inspect", label: "Verify element permissions", targetId: selectedId, action: { type: "inspectTarget", targetId: selectedId } },
            { id: "color", label: "Apply approved color token", targetId: selectedId, action: { type: "updateColorToken", targetId: selectedId, token: colorToken } },
          ],
        };
      }

      if (selectedId && /\b(layout|spacing|space|airy|compact|center|stack|split|wide|narrow|padding|align)\b/.test(p)) {
        return {
          title: "Layout refinement",
          intro: "I’ll adjust the selected layout with Book & Buy spacing rules only, leaving its data and behavior contract untouched.",
          final: "The layout is updated within the safe Book & Buy spacing system.",
          steps: [
            { id: "inspect", label: "Verify layout permission", targetId: selectedId, action: { type: "inspectTarget", targetId: selectedId } },
            { id: "layout", label: "Apply safe layout preset", targetId: selectedId, action: { type: "updateLayout", targetId: selectedId, preset: inferLayoutPreset(prompt) } },
          ],
        };
      }

      if (selectedId && /\b(font|type|typography|bigger|larger|smaller|bold|weight|prominent|headline|readable)\b/.test(p)) {
        return {
          title: "Typography refinement",
          intro: "I’ll use the Book & Buy type scale on the selected element without rewriting any bound business value.",
          final: "Typography is updated; any commerce data binding remains intact.",
          steps: [
            { id: "inspect", label: "Verify typography permission", targetId: selectedId, action: { type: "inspectTarget", targetId: selectedId } },
            { id: "type", label: "Apply approved type preset", targetId: selectedId, action: { type: "updateTypography", targetId: selectedId, preset: inferTypographyPreset(prompt, selected) } },
          ],
        };
      }

      if (selectedId && componentPolicy.layer === "commerce" && /\b(variant|compact|editorial|minimal|outline|soft|solid|clean|chips|list|icon)\b/.test(p)) {
        const variant = inferComponentVariant(prompt, componentPolicy.component);
        return {
          title: "Commerce visual variant",
          intro: "I’ll switch only the approved visual variant. Component behavior and live bindings stay exactly where they are.",
          final: "The commerce component variant is updated without changing its functionality.",
          steps: [
            { id: "inspect", label: "Verify component contract", targetId: componentTargetId, action: { type: "inspectTarget", targetId: componentTargetId } },
            { id: "variant", label: "Apply approved visual variant", targetId: componentTargetId, action: { type: "setComponentVariant", targetId: componentTargetId, variant } },
          ],
        };
      }

      if (selectedId && /\b(move|reposition|above|below|before|after|first|last)\b/.test(p)) {
        const moveTargetId = policy.layer === "commerce" ? componentTargetId : selectedId;
        return {
          title: "Safe reposition",
          intro: "I’ll reorder the selected element without detaching its Book & Buy component contract.",
          final: "The element has been repositioned safely.",
          steps: [
            { id: "inspect", label: "Verify move permission", targetId: moveTargetId, action: { type: "inspectTarget", targetId: moveTargetId } },
            { id: "move", label: "Reorder within its current container", targetId: moveTargetId, action: { type: "moveComponent", targetId: moveTargetId, direction: requestedMoveDirection(prompt) } },
          ],
        };
      }

      if (selectedId && /\b(remove|delete|hide)\b/.test(p)) {
        return {
          title: "Remove design element",
          intro: "I’ll remove this only if its element permissions explicitly allow removal.",
          final: "The design element was removed. Protected commerce components would have been blocked instead.",
          steps: [
            { id: "inspect", label: "Verify removal permission", targetId: selectedId, action: { type: "inspectTarget", targetId: selectedId } },
            { id: "remove", label: "Remove editable design node", targetId: selectedId, action: { type: "removeElement", targetId: selectedId } },
          ],
        };
      }

      if (selectedId && (/\b(text|copy|say|rewrite|short|premium|clear|headline|label)\b/.test(p) || quoted)) {
        return {
          title: "Rewrite design copy",
          intro: "I’ll rewrite only the selected design copy. If this is a live commerce binding, the permission guard will refuse the mutation.",
          final: "The editable copy is updated and no business data was touched.",
          steps: [
            { id: "read", label: "Check copy permission", targetId: selectedId, action: { type: "inspectTarget", targetId: selectedId } },
            { id: "rewrite", label: "Update editable copy", targetId: selectedId, action: { type: "updateCopy", targetId: selectedId, text: makeRewrite(selectedText, prompt) } },
          ],
        };
      }

      if (/\b(add|new|insert)\b.*\b(section|block|faq|trust|newsletter|story)\b/.test(p)) {
        const sectionKey = inferApprovedSection(prompt);
        return {
          title: "Insert approved section",
          intro: `I’ll add the approved “${sectionKey}” section and keep it inside the Book & Buy design token system.`,
          final: "The approved section is on the canvas and remains fully inside the design layer.",
          steps: [
            { id: "place", label: "Verify safe insertion point", targetId: "main-content", action: { type: "inspectTarget", targetId: "main-content" } },
            { id: "insert", label: "Insert approved section", targetId: "main-content", action: { type: "insertApprovedSection", targetId: "main-content", sectionKey } },
          ],
        };
      }

      if (/\b(hero|headline)\b/.test(p)) {
        const newText = quoted || phraseAfter(prompt, ["hero(?: headline)?", "headline", "change(?: the)? hero(?: to)?"]);
        return {
          title: "Hero refinement",
          intro: "I’ll refine the hero using the Book & Buy hierarchy rules and keep the customer action path clear.",
          final: "The hero is refined without touching any commerce behavior.",
          steps: [
            { id: "copy", label: "Refine hero message", targetId: "hero-title", action: { type: "updateCopy", targetId: "hero-title", text: newText || makeRewrite(context.heroText || "", prompt), rewritePrompt: prompt } },
            { id: "type", label: "Balance headline hierarchy", targetId: "hero-title", action: { type: "updateTypography", targetId: "hero-title", preset: "displayLG" } },
          ],
        };
      }

      if (/\b(button|cta|call to action)\b/.test(p)) {
        const text = quoted || phraseAfter(prompt, ["button", "cta", "call to action"]);
        return {
          title: "Primary action refinement",
          intro: "I’ll refine the design-layer primary action while preserving any commerce controls elsewhere on the page.",
          final: "The primary action is updated.",
          steps: [
            { id: "copy", label: "Update primary label", targetId: "hero-primary", action: { type: "updateCopy", targetId: "hero-primary", text: text || "Get started" } },
          ],
        };
      }

      if (colorToken) {
        return {
          title: "Focused color update",
          intro: "I’ll use the Book & Buy token system rather than injecting an arbitrary color.",
          final: "The focused color update is applied.",
          steps: [{ id: "color", label: "Apply Book & Buy color token", targetId: "hero-primary", action: { type: "updateColorToken", targetId: "hero-primary", token: colorToken } }],
        };
      }

      return {
        title: "Specialist design refinement",
        intro: "I’ll make a restrained design-only refinement using the Book & Buy playbook rather than touching data or business logic.",
        final: "The refinement is complete and remains inside the safe design layer.",
        steps: [
          { id: "review", label: "Review hero hierarchy", targetId: "hero", action: { type: "inspectTarget", targetId: "hero" } },
          { id: "space", label: "Balance hero spacing", targetId: "hero", action: { type: "updateLayout", targetId: "hero", preset: "balanced" } },
        ],
      };
    },
  });
}

function typeTargetForPrompt(p) {
  if (/store|shop|product|ecommerce|e-commerce/.test(p)) return "product-card-1";
  if (/booking|salon|barber|spa|service/.test(p)) return "service-card-1";
  return "features";
}

const designEngine = createBookBuyDesignEngine();
window.BookBuyDesignEngine = designEngine;
window.BookBuyArchitecture = Object.freeze({
  businessCore: BOOK_BUY_BUSINESS_CORE,
  commerceComponents: BOOK_BUY_COMMERCE_COMPONENTS,
  playbook: BOOK_BUY_DESIGN_PLAYBOOK,
  safeActions: SAFE_DESIGN_ACTIONS,
});

function createMockAIService() {
  let controller = null;
  let lastPayload = null;

  return {
    async sendPrompt(payload, hooks = {}) {
      lastPayload = payload;
      controller = new AbortController();
      const signal = controller.signal;
      const context = payload.context || {};

      hooks.onStart?.({ signal });
      await sleep(90, signal);

      if (/simulate\s+(an\s+)?error|force\s+error/i.test(payload.prompt)) {
        throw new Error("Simulated agent error for front-end error-state testing.");
      }

      const safetyRefusal = designEngine.preflight(payload.prompt, context);
      if (safetyRefusal) {
        await this.streamResponse("I can help with the design, but I won’t cross the protected Book & Buy business boundary.", hooks.onToken, signal);
        return { type: "refusal", refusal: safetyRefusal };
      }

      if (needsClarification(payload.prompt, context)) {
        const clarification = buildClarification(context);
        const intro = "I need one design detail before I change the canvas.";
        await this.streamResponse(intro, hooks.onToken, signal);
        return { type: "clarification", ...clarification };
      }

      const plan = await this.createPlan(payload.prompt, context, signal);
      hooks.onPlan?.(plan);
      await this.streamResponse(plan.intro, hooks.onToken, signal);

      for (const step of plan.steps) {
        hooks.onStepStart?.(step);
        await this.executeAction(step, hooks, signal);
        hooks.onStepComplete?.(step);
      }

      return { type: "complete", plan, final: plan.final };
    },

    async streamResponse(text, onToken, signal) {
      const chunks = String(text).split(/(\s+)/);
      for (const chunk of chunks) {
        if (signal?.aborted) throw new DOMException("Canceled", "AbortError");
        onToken?.(chunk);
        await sleep(Math.min(30, 8 + chunk.length * 1.1), signal);
      }
    },

    async createPlan(prompt, context, signal) {
      return designEngine.createPlan(prompt, context, signal);
    },

    async executeAction(step, hooks, signal) {
      hooks.onActionStart?.(step.action, step);
      await sleep(step.action.type === "rebuildFromApprovedTemplate" ? 280 : 200, signal);
      const result = await hooks.applyAction?.(step.action, step, signal);
      await sleep(160, signal);
      hooks.onActionEnd?.(step.action, step, result);
      return result;
    },

    cancel() {
      controller?.abort();
    },

    retry(hooks = {}) {
      if (!lastPayload) throw new Error("Nothing to retry");
      return this.sendPrompt(lastPayload, hooks);
    },
  };
}
class MockAdapterError extends Error {
  constructor(message, code = "MOCK_SERVICE_ERROR", detail = {}) {
    super(message);
    this.name = "MockAdapterError";
    this.code = code;
    this.detail = detail;
  }
}

const cloneData = value => value == null ? value : JSON.parse(JSON.stringify(value));

// Backend-agnostic adapter contracts. These mocks intentionally own no real
// persistence, publishing, payments or commerce logic. Work can provide
// window.BOOKBUY_SERVICES before app.js loads and replace any adapter one-for-one.
function createMockProjectService() {
  let sequence = 1;
  const nextId = () => `mock-project-${Date.now().toString(36)}-${sequence++}`;
  return {
    kind: "mock-projects",
    async createProject({ name = "Untitled project", html = "", prompt = "" } = {}) {
      await sleep(110);
      return { id: nextId(), name, html, files: null, assets: null, entryFile: "index.html", prompt, publishedUrl: null, updatedAt: Date.now() };
    },
    async renameProject({ project, name }) {
      await sleep(90);
      if (!name?.trim()) throw new MockAdapterError("Project name can’t be empty.", "INVALID_NAME");
      return { ...cloneData(project), name: name.trim(), updatedAt: Date.now() };
    },
    async duplicateProject({ project }) {
      await sleep(130);
      return { ...cloneData(project), id: nextId(), name: `${project?.name || "Untitled project"} Copy`, publishedUrl: null, updatedAt: Date.now() };
    },
    async resetProject({ project, html = "" }) {
      await sleep(100);
      return { ...cloneData(project), html, files: null, assets: null, entryFile: "index.html", prompt: "", publishedUrl: null, updatedAt: Date.now() };
    },
    async saveDraft({ project }) {
      await sleep(55);
      return { projectId: project?.id || null, savedAt: Date.now() };
    },
  };
}

function createMockVersionService() {
  const versions = new Map();
  let sequence = 1;
  return {
    kind: "mock-versions",
    async recordVersion({ projectId, snapshot, label = "Editor change" }) {
      await sleep(35);
      if (!projectId || !snapshot) return null;
      const list = versions.get(projectId) || [];
      const version = { id: `mock-version-${sequence++}`, label, createdAt: Date.now(), snapshot: cloneData(snapshot) };
      list.unshift(version);
      versions.set(projectId, list.slice(0, 50));
      return cloneData(version);
    },
    async listVersions({ projectId }) {
      await sleep(55);
      return cloneData(versions.get(projectId) || []);
    },
    async restoreVersion({ projectId, versionId }) {
      await sleep(80);
      const version = (versions.get(projectId) || []).find(item => item.id === versionId);
      if (!version) throw new MockAdapterError("That mock version no longer exists.", "VERSION_NOT_FOUND");
      return cloneData(version.snapshot);
    },
  };
}

function createMockPublishingService() {
  const reserved = new Set(["admin", "api", "checkout", "auth", "book", "buy", "support"]);
  const published = new Map();
  return {
    kind: "mock-publishing",
    async publish({ project, slug }) {
      await sleep(650);
      const clean = slugify(slug);
      if (!project?.html) throw new MockAdapterError("There is no site to publish yet.", "EMPTY_PROJECT");
      if (reserved.has(clean)) throw new MockAdapterError("That Book & Buy address is reserved. Choose another one.", "SLUG_UNAVAILABLE");
      const result = { status: "published", slug: clean, url: `https://bookandbuy.site/${clean}`, publishedAt: Date.now() };
      if (project?.id) published.set(project.id, result);
      return cloneData(result);
    },
    async getStatus({ projectId }) {
      await sleep(80);
      return cloneData(published.get(projectId) || { status: "draft" });
    },
    async createShareLink({ project }) {
      await sleep(130);
      const live = project?.id ? published.get(project.id) : null;
      if (live?.url) return { url: live.url, kind: "published" };
      return { url: `https://preview.bookandbuy.app/p/${encodeURIComponent(project?.id || "mock-preview")}`, kind: "preview" };
    },
  };
}

function createMockCommerceBindingsService() {
  const sessions = new Map();
  const catalog = Object.freeze({
    "product-1": { price: 790 },
    "product-2": { price: 1190 },
    "product-3": { price: 1490 },
  });
  const makeState = () => ({
    cart: { count: 0, total: 0, items: [] },
    booking: { serviceId: null, date: "2026-10-05", slot: null },
    drawerOpen: false,
    notice: null,
  });
  const getMutable = projectId => {
    const key = projectId || "mock-project";
    if (!sessions.has(key)) sessions.set(key, makeState());
    return sessions.get(key);
  };
  return {
    kind: "mock-commerce-bindings",
    async getState({ projectId } = {}) {
      await sleep(45);
      return cloneData(getMutable(projectId));
    },
    async execute({ projectId, action, payload = {} }) {
      await sleep(85);
      const view = getMutable(projectId);
      view.notice = null;
      switch (action) {
        case "cart.add": {
          const item = catalog[payload.productId];
          if (!item) throw new MockAdapterError("That mock product binding was not found.", "PRODUCT_NOT_FOUND");
          view.cart.items.push(payload.productId);
          view.cart.count = view.cart.items.length;
          view.cart.total += item.price;
          view.drawerOpen = true;
          break;
        }
        case "cart.open": view.drawerOpen = true; break;
        case "cart.close": view.drawerOpen = false; break;
        case "checkout.create":
          view.notice = view.cart.count ? { tone: "info", message: "Mock checkout handoff ready for backend wiring." } : { tone: "error", message: "Add an item before opening checkout." };
          break;
        case "booking.select":
          view.booking.serviceId = payload.serviceId || view.booking.serviceId;
          view.notice = { tone: "info", message: "Mock service selection stored by the commerce adapter." };
          break;
        case "booking.date": view.booking.date = payload.date || view.booking.date; view.booking.slot = null; break;
        case "booking.slot": view.booking.slot = payload.slot || null; break;
        case "booking.create":
          view.notice = view.booking.slot ? { tone: "info", message: "Mock booking handoff ready for backend wiring." } : { tone: "error", message: "Choose an available time first." };
          break;
        default:
          throw new MockAdapterError("That commerce action is outside the mock binding contract.", "UNKNOWN_COMMERCE_ACTION", { action });
      }
      return cloneData(view);
    },
    async reset({ projectId } = {}) {
      await sleep(40);
      sessions.set(projectId || "mock-project", makeState());
      return cloneData(getMutable(projectId));
    },
  };
}

const BOOKBUY_SERVICE_BOUNDARIES = deepFreeze({
  ai: { owns: ["agent transport", "stream events", "plan/action requests"], neverOwns: ["DOM mutation", "commerce truth", "publishing"] },
  projects: { owns: ["project CRUD", "draft persistence"], neverOwns: ["editor DOM", "AI decisions"] },
  versions: { owns: ["version persistence", "version retrieval"], neverOwns: ["local undo latency", "DOM mutation"] },
  publishing: { owns: ["publish request", "publish status", "share links"], neverOwns: ["editor rendering", "commerce execution"] },
  commerce: { owns: ["bound commerce view state", "commerce action transport"], neverOwns: ["design mutations", "AI copy/layout decisions"] },
});

const BOOKBUY_SERVICE_CONTRACTS = deepFreeze({
  ai: ["sendPrompt", "streamResponse", "createPlan", "executeAction", "cancel", "retry"],
  projects: ["createProject", "renameProject", "duplicateProject", "resetProject", "saveDraft"],
  versions: ["recordVersion", "listVersions", "restoreVersion"],
  publishing: ["publish", "getStatus", "createShareLink"],
  commerce: ["getState", "execute", "reset"],
});

const injectedServices = window.BOOKBUY_SERVICES || {};
const services = Object.freeze({
  ai: injectedServices.ai || window.BOOKBUY_AI_SERVICE || createMockAIService(),
  projects: injectedServices.projects || createMockProjectService(),
  versions: injectedServices.versions || createMockVersionService(),
  publishing: injectedServices.publishing || createMockPublishingService(),
  commerce: injectedServices.commerce || createMockCommerceBindingsService(),
});

const aiService = services.ai;
window.BookBuyServices = services;
window.BookBuyServiceContracts = BOOKBUY_SERVICE_CONTRACTS;
window.BookBuyServiceBoundaries = BOOKBUY_SERVICE_BOUNDARIES;
window.BookBuyMockAIService = aiService;

function postCommerceState(targetWindow, commerceState) {
  try {
    targetWindow?.postMessage?.({ source: "bookbuy-builder", type: "commerce-state", state: commerceState }, "*");
  } catch (_) {}
}

let previewRuntimePort = null;
function resetRuntimeBridge() { previewRuntimePort?.close(); previewRuntimePort = null; }
async function handleCommerceBridgeMessage(event) {
  const data = event.data || {};
  if (event.source !== els.frame.contentWindow || data.source !== "bookbuy-preview" || state.canvasMode !== "view") return;
  try {
    if (data.type === 'runtime-ready') {
      if (previewRuntimePort) return;
      const channel = new MessageChannel();
      previewRuntimePort = channel.port1;
      let inflight = 0, count = 0, windowStart = Date.now();
      channel.port1.onmessage = async message => {
        const request = message.data || {};
        let admitted = false;
        try {
          if (Date.now() - windowStart > 60000) { windowStart = Date.now(); count = 0; }
          if (inflight >= 4 || ++count > 120 || typeof request.id !== 'string' || request.id.length > 100) throw new Error('Too many preview requests. Try again shortly.');
          inflight++;
          admitted = true;
          window.BookBuyWebsiteContract.validateWebsiteRequest(request.action, request.payload || {});
          const result = await window.BookBuyCommerce.hostRequest('runtime.' + request.action, request.payload || {});
          channel.port1.postMessage({ id: request.id, result });
        } catch (error) { channel.port1.postMessage({ id: request.id, error: error.message }); } finally { if (admitted) inflight--; }
      };
      channel.port1.start();
      event.source.postMessage({ type: 'bookbuy-runtime-connect', version: 1 }, '*', [channel.port2]);
      channel.port1.postMessage({ type: 'catalog-update', catalog: window.BookBuyCommerce.context });
      return;
    }
    if (data.type === "commerce-ready") {
      const commerceState = await services.commerce.getState({ projectId: state.current?.id });
      postCommerceState(event.source, commerceState);
      return;
    }
    if (data.type === "commerce-action") {
      const commerceState = await services.commerce.execute({
        projectId: state.current?.id,
        action: data.action,
        payload: data.payload || {},
      });
      postCommerceState(event.source, commerceState);
      if (commerceState.notice?.message) showToast(commerceState.notice.message, { tone: commerceState.notice.tone || "info" });
    }
  } catch (error) {
    showToast(error?.message || "The mock commerce adapter could not handle that action.", { tone: "error" });
  }
}

window.addEventListener("message", handleCommerceBridgeMessage);

let connectedCatalogSignature = '';
let pendingCatalogRefresh = false;
function refreshConnectedCatalog() {
  if (!state.current?.html) return;
  try {
    state.current.html = window.BookBuyCommerce.wireHtml(state.current.html, { allowRetired: true, draft: Boolean(state.current._validationIssues?.length) }).html;
    if (state.current.files) state.current.files[state.current.entryFile || 'index.html'] = state.current.html;
    renderCurrent(); queueProjectDraftSave();
  } catch (error) { showToast(error.message, { tone: 'error' }); }
}
window.addEventListener('bookbuy-catalog-ready', event => {
  const signature = JSON.stringify(event.detail);
  if (signature === connectedCatalogSignature) return;
  connectedCatalogSignature = signature;
  if (state.busy) { pendingCatalogRefresh = true; return; }
  refreshConnectedCatalog();
});

function markRunMutation(run) {
  if (run.mutationStarted) return;
  pushUndo(run.baseSnapshot);
  run.mutationStarted = true;
}

async function waitForFrameReady(signal) {
  if (!state.current?.html) return;
  for (let i = 0; i < 90; i += 1) {
    if (signal?.aborted) throw new DOMException("Canceled", "AbortError");
    const doc = getFrameDocument();
    if (doc?.readyState === "complete" && doc.body) return;
    await sleep(30, signal);
  }
  throw new Error("The editable preview is still loading. Try your request again.");
}

function findActionTarget(action, step) {
  return getCanvasElement(action.targetId || step.targetId || state.selectedId);
}

async function applyAgentAction(action, step, signal, run) {
  if (signal?.aborted) throw new DOMException("Canceled", "AbortError");

  const refusal = designEngine.validateAction(action, step);
  if (refusal) {
    throw new SafetyBoundaryError(refusal.reason, {
      code: refusal.code,
      targetId: refusal.targetId,
      action,
      safeMessage: refusal.safeAlternative,
      refusal,
    });
  }

  if (action.type === "inspectTarget") return true;

  if (action.type === 'updateWebsiteSource') {
    markRunMutation(run);
    state.current = { ...state.current, html: action.html, files: { ...(!action.newSite ? state.current.files || {} : {}), 'index.html': action.html }, entryFile: 'index.html', updatedAt: Date.now() };
    if (action.newSite) state.current.name = new DOMParser().parseFromString(action.html, 'text/html').title.slice(0, 80) || 'New website';
    clearCanvasSelection();
    const loaded = new Promise((resolve, reject) => {
      const finish = error => { clearTimeout(timer); els.frame.removeEventListener('load', onLoad); signal?.removeEventListener('abort', onAbort); error ? reject(error) : resolve(); };
      const onLoad = () => finish();
      const onAbort = () => finish(new DOMException('Canceled', 'AbortError'));
      const timer = setTimeout(() => finish(new Error('The generated website preview did not load.')), 15000);
      els.frame.addEventListener('load', onLoad, { once: true });
      signal?.addEventListener('abort', onAbort, { once: true });
    });
    renderCurrent();
    await loaded;
    await waitForFrameReady(signal);
    assignEditableIds(getFrameDocument());
    persistFrame();
    return true;
  }

  if (action.type === "rebuildFromApprovedTemplate") {
    markRunMutation(run);
    const config = inferSite(action.prompt || "Build a premium business website");
    state.current = { ...state.current, id: state.current?.id || `mock-project-${Date.now().toString(36)}`, html: generatedSiteHtml(config), files: null, assets: null, entryFile: "index.html", name: config.name, prompt: action.prompt || "", publishedUrl: null };
    els.address.textContent = "preview.bookandbuy.app";
    renderCurrent();
    await waitForFrameReady(signal);
    const doc = getFrameDocument();
    assignEditableIds(doc);
    persistFrame();
    return true;
  }

  const target = actionTarget(action, step);
  if (!target && action.type !== "insertApprovedSection") {
    throw new Error(`Couldn’t find the target element for “${step?.label || action.type}”.`);
  }

  if (action.type === "updateCopy") {
    markRunMutation(run);
    const currentText = (target.textContent || "").trim();
    const next = action.text || makeRewrite(currentText, action.rewritePrompt || "Make this clearer and more premium.");
    target.textContent = next || currentText;
    persistFrame();
    return true;
  }

  if (action.type === "updateColorToken") {
    markRunMutation(run);
    const color = BOOK_BUY_TOKENS.colors[action.token];
    const componentOwner = target.closest("[data-bb-component]");
    const surface = target.dataset.bbComponent ? target : componentOwner && target === componentOwner ? componentOwner : target;
    if (["BUTTON", "A"].includes(surface.tagName)) {
      surface.style.background = color;
      surface.style.borderColor = color;
      surface.style.color = action.token === "analytics" ? BOOK_BUY_TOKENS.colors.business : "#fff";
    } else if (surface.classList.contains("card") || surface.dataset.bbComponent) {
      surface.style.borderColor = color;
      surface.style.boxShadow = `inset 0 0 0 1px ${color}22`;
    } else {
      surface.style.color = color;
    }
    persistFrame();
    return true;
  }

  if (action.type === "updateTypography") {
    markRunMutation(run);
    applyTypographyPreset(target, action.preset);
    persistFrame();
    return true;
  }

  if (action.type === "updateLayout") {
    markRunMutation(run);
    applyLayoutPreset(target, action.preset);
    persistFrame();
    updateCanvasOverlays();
    return true;
  }

  if (action.type === "setComponentVariant") {
    const componentTarget = target.dataset.bbComponent ? target : target.closest("[data-bb-component]");
    if (!componentTarget) throw new Error("Commerce component root not found");
    markRunMutation(run);
    componentTarget.dataset.bbVariant = action.variant;
    persistFrame();
    state.selectedId = componentTarget.dataset.bbId || state.selectedId;
    syncSelectionContext();
    updateCanvasOverlays();
    return true;
  }

  if (action.type === "moveComponent") {
    const moveTarget = target.dataset.bbComponent ? target : (getElementPolicy(target).layer === "commerce" ? target.closest("[data-bb-component]") || target : target);
    const parent = moveTarget.parentElement;
    if (!parent) throw new Error("This element cannot be repositioned");
    markRunMutation(run);
    if (action.direction === "up" && moveTarget.previousElementSibling) parent.insertBefore(moveTarget, moveTarget.previousElementSibling);
    else if (action.direction === "down" && moveTarget.nextElementSibling) parent.insertBefore(moveTarget.nextElementSibling, moveTarget);
    else if (action.direction === "start") parent.insertBefore(moveTarget, parent.firstElementChild);
    else if (action.direction === "end") parent.appendChild(moveTarget);
    persistFrame();
    state.selectedId = moveTarget.dataset.bbId || state.selectedId;
    syncSelectionContext();
    updateCanvasOverlays();
    return true;
  }

  if (action.type === "removeElement") {
    markRunMutation(run);
    target.remove();
    if (state.selectedId === action.targetId) state.selectedId = null;
    persistFrame();
    syncSelectionContext();
    updateCanvasOverlays();
    return true;
  }

  if (action.type === "duplicateElement") {
    markRunMutation(run);
    const clone = target.cloneNode(true);
    const suffix = Date.now().toString(36).slice(-5);
    if (clone.dataset.bbId) clone.dataset.bbId = `${clone.dataset.bbId}-copy-${suffix}`;
    clone.querySelectorAll("[data-bb-id]").forEach((child, index) => {
      child.dataset.bbId = `${child.dataset.bbId}-copy-${suffix}-${index}`;
    });
    target.insertAdjacentElement("afterend", clone);
    persistFrame();
    state.selectedId = clone.dataset.bbId;
    syncSelectionContext();
    updateCanvasOverlays();
    return true;
  }

  if (action.type === "insertApprovedSection") {
    const doc = getFrameDocument();
    const insertionTarget = getCanvasElement(action.targetId || "main-content") || doc?.querySelector("main");
    if (!insertionTarget) throw new Error("Approved insertion point not found");
    markRunMutation(run);
    const id = `bb-${action.sectionKey}-${Date.now().toString(36)}`;
    insertionTarget.insertAdjacentHTML("beforeend", approvedSectionMarkup(action.sectionKey, id));
    hydratePermissionModel(doc);
    persistFrame();
    state.selectedId = id;
    syncSelectionContext();
    updateCanvasOverlays();
    return true;
  }

  throw new SafetyBoundaryError("The requested action is not available to the design engine.", {
    code: "UNHANDLED_SAFE_ACTION",
    action,
  });
}
async function runAgentPrompt(prompt, { silentUser = false, retrying = false, regenerating = false } = {}) {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt || state.busy) return;
  const restoreInteractivePreview = state.canvasMode === "view";

  if (state.canvasMode !== "edit") {
    setCanvasMode("edit", { announce: false });
    try { await waitForFrameReady(); }
    catch (error) { showToast(error.message, { tone: "error" }); return; }
  }
  if (state.inlineEdit) commitInlineEdit();
  const selected = getCanvasElement(state.selectedId);
  const contextLabel = selected ? describeElement(selected) : "";
  const attachments = state.attachments.map(file => ({ name: file.name, size: file.size, type: file.type }));

  if (!silentUser) {
    addMessage("user", escapeHtml(cleanPrompt), { contextLabel, attachments });
  }

  if (!retrying && !regenerating) {
    state.promptHistory = [cleanPrompt, ...state.promptHistory.filter(x => x !== cleanPrompt)].slice(0, 40);
    state.promptHistoryIndex = -1;
    renderPromptHistory();
  }

  const selectedPolicy = getElementPolicy(selected);
  const request = {
    prompt: cleanPrompt,
    attachments,
    context: {
      hasSite: Boolean(state.current?.html),
      selectedId: state.selectedId,
      selectedLabel: contextLabel,
      selectedText: safeTextForDesignAI(selected),
      selectedPolicy: {
        layer: selectedPolicy.layer,
        component: selectedPolicy.component,
        permissions: [...selectedPolicy.permissions],
        bound: Boolean(selectedPolicy.bindings.length),
        protectedFields: selectedPolicy.protectedFields,
      },
      canvasManifest: getCanvasManifest(),
      websiteSource: state.current?.html || '',
      safeActions: Object.keys(SAFE_DESIGN_ACTIONS),
      playbook: BOOK_BUY_DESIGN_PLAYBOOK.name,
      device: state.device,
    },
  };

  const assistant = createAssistantStreamingMessage();
  const run = {
    prompt: cleanPrompt,
    baseSnapshot: snapshotProject(),
    mutationStarted: false,
    assistant,
    planCard: null,
  };
  state.activeRun = run;
  state.lastAgentRun = {
    prompt: cleanPrompt,
    baseSnapshot: cloneSnapshot(run.baseSnapshot),
    selectedId: state.selectedId,
  };
  setBusy(true, "thinking", retrying ? "Retrying" : regenerating ? "Regenerating" : "Thinking");
  setBuildOverlay(true, "Book & Buy AI", retrying ? "Retrying the last action…" : regenerating ? "Regenerating…" : "Understanding your request…");
  closeAllPopovers();

  let streamedText = "";
  let progress;
  try {
    const hooks = {
      onStart: () => {},
      onProgress: event => {
        progress ||= createProgressCard(assistant.bubble); progress.update(event);
      },
      onToken: (token) => {
        streamedText += token;
        assistant.text.textContent = streamedText;
        scrollChat();
      },
      onPlan: (plan) => {
        if (!plan || typeof plan !== "object" || !Array.isArray(plan.steps) || !plan.steps.length || plan.steps.length > 12
          || ["title", "intro", "final"].some(key => plan[key] != null && (typeof plan[key] !== "string" || plan[key].length > 2000))
          || plan.steps.some(step => !step || typeof step.id !== "string" || !step.id || step.id.length > 80 || typeof step.label !== "string" || step.label.length > 180 || (step.targetId != null && (typeof step.targetId !== "string" || step.targetId.length > 160)))
          || new Set(plan.steps.map(step => step.id)).size !== plan.steps.length) {
          throw new Error("The AI returned an invalid design plan. Retry with a more specific request.");
        }
        assistant.cursor.remove();
        setBuilderStatus("building", "Building");
        run.planCard = createPlanCard(plan, assistant.bubble);
      },
      onStepStart: (step) => {
        setBuilderStatus("applying", "Applying");
        setPlanStepState(run.planCard, step.id, "current");
        const label = step.targetId ? `Editing ${step.label.toLowerCase()}` : step.label;
        setBuildOverlay(true, "Updating canvas", step.label);
        focusAIEditing(step.targetId, label);
      },
      onActionStart: () => setBuilderStatus("applying", "Applying"),
      applyAction: (action, step, signal) => applyAgentAction(action, step, signal, run),
      onActionEnd: () => updateCanvasOverlays(),
      onStepComplete: (step) => {
        setPlanStepState(run.planCard, step.id, "done");
        clearAIEditing();
      },
    };
    const result = retrying && typeof aiService.retry === "function"
      ? await aiService.retry(hooks)
      : await aiService.sendPrompt(request, hooks);

    assistant.cursor?.remove();
    progress?.finish(result.type === 'clarification' ? 'question' : 'complete', window.BookBuyLocalAI?.mode === 'plan');
    if (result.type === "clarification") {
      appendClarification(assistant.bubble, result.question, result.choices);
      setBuildOverlay(false);
      setBusy(false);
      setBuilderStatus("ready");
      state.activeRun = null;
      return;
    }

    if (result.type === "refusal") {
      appendSafetyRefusal(assistant.bubble, result.refusal);
      setBuildOverlay(false);
      clearAIEditing();
      setBusy(false);
      setBuilderStatus("ready");
      state.activeRun = null;
      updateHistoryControls();
      scrollChat();
      return;
    }

    const finalLine = document.createElement("div");
    finalLine.className = "message-text";
    finalLine.style.marginTop = "10px";
    finalLine.textContent = result.final || "Done.";
    window.dispatchEvent(new CustomEvent('bookbuy-ai-reply', { detail: { text: streamedText || result.final || '' } }));
    assistant.bubble.appendChild(finalLine);
    const replyActions = [
      { label: "Copy", icon: 'copy', className: 'secondary', onClick: async () => { try { await navigator.clipboard.writeText(streamedText || result.final || ''); showToast('Reply copied'); } catch { showToast('Could not copy. Select the reply text to copy it.', { tone: 'error' }); } } },
      { label: "Retry", icon: 'refresh', className: 'secondary', onClick: regenerateLast }
    ];
    if (run.mutationStarted) replyActions.push({ label: "Undo", icon: 'undo', className: "secondary", onClick: undo });
    if (window.BookBuyLocalAI?.mode === 'plan') replyActions.push({ label: 'Build this plan', icon: 'arrow-right', onClick: () => { const mode = $('#builderAiMode'); mode.value = 'build'; mode.dispatchEvent(new Event('change', { bubbles: true })); els.prompt.value = 'Apply the website plan we just discussed. Preserve existing app connections.'; autoSizeComposer(); syncComposerActionState(); sendPrompt(); } });
    appendMessageActions(assistant.bubble, replyActions);
    completePlanCard(run.planCard, `${result.plan?.steps?.length || 0} changes applied`);
    setBuildOverlay(false);
    clearAIEditing();
    setBusy(false);
    setBuilderStatus("complete");
    settleBuilderStatus(1300);
    state.activeRun = null;
    renderActiveCodeFile();
    updateHistoryControls();
    scrollChat();
  } catch (error) {
    progress?.finish(error?.name === 'AbortError' ? 'stopped' : 'error');
    assistant.cursor?.remove();
    clearAIEditing();
    setBuildOverlay(false);
    if (error?.name === "AbortError") {
      if (run.planCard) {
        $$(".plan-step", run.planCard).forEach(row => {
          if (!row.classList.contains("done")) {
            row.classList.remove("current");
            row.classList.add("canceled");
          }
        });
      }
      const note = document.createElement("div");
      note.className = "stopped-note";
      note.textContent = "Stopped. Any completed changes are still on the canvas and can be undone.";
      assistant.bubble.appendChild(note);
      appendMessageActions(assistant.bubble, [
        { label: "Regenerate", onClick: regenerateLast },
        { label: "Undo", className: "secondary", onClick: undo },
      ]);
      setBusy(false);
      setBuilderStatus("ready");
    } else if (error?.name === "SafetyBoundaryError") {
      setBusy(false);
      setBuilderStatus("ready");
      if (run.planCard) {
        const current = $(".plan-step.current", run.planCard);
        if (current) { current.classList.remove("current"); current.classList.add("blocked"); }
      }
      const refusal = error.detail?.refusal || makeSafetyRefusal(error.message, {
        code: error.code,
        targetId: error.targetId,
        safeAlternative: error.safeMessage,
      });
      appendSafetyRefusal(assistant.bubble, refusal);
    } else {
      setBusy(false);
      setBuilderStatus("error");
      appendError(assistant.bubble, error?.message, cleanPrompt);
      if (run.planCard) {
        const current = $(".plan-step.current", run.planCard);
        if (current) { current.classList.remove("current"); current.classList.add("error"); }
      }
      settleBuilderStatus(2200);
    }
    state.activeRun = null;
    updateHistoryControls();
    scrollChat();
  } finally {
    if (restoreInteractivePreview) {
      setBusy(false);
      setCanvasMode("view", { announce: false });
    }
  }
}

function sendPrompt() {
  if (state.busy) {
    aiService.cancel?.();
    return;
  }
  const prompt = els.prompt.value.trim();
  if (!prompt) return;
  els.prompt.value = "";
  autoSizeComposer();
  syncComposerActionState();
  runAgentPrompt(prompt);
  state.attachments = [];
  renderAttachments();
}

function stopGeneration() {
  if (!state.busy) return;
  aiService.cancel?.();
}

function retryPrompt(prompt) {
  if (state.busy) return;
  const previous = state.lastAgentRun;
  const base = previous?.baseSnapshot;
  if (base) restoreSnapshot(base, { clearFuture: true });
  if (previous?.selectedId) {
    state.selectedId = previous.selectedId;
    syncSelectionContext();
    updateCanvasOverlays();
  }
  runAgentPrompt(prompt, { silentUser: true, retrying: true });
}

function regenerateLast() {
  if (state.busy || !state.lastAgentRun?.prompt) return;
  const previous = state.lastAgentRun;
  const { prompt, baseSnapshot } = previous;
  if (baseSnapshot) restoreSnapshot(baseSnapshot, { clearFuture: true });
  if (previous.selectedId) {
    state.selectedId = previous.selectedId;
    syncSelectionContext();
    updateCanvasOverlays();
  }
  runAgentPrompt(prompt, { silentUser: true, regenerating: true });
}

function undo() {
  if (state.busy) return showToast("Stop the current AI edit before undoing");
  if (!state.history.length || !state.current) return showToast("Nothing to undo");
  state.future.push(snapshotProject());
  const snapshot = state.history.pop();
  restoreSnapshot(snapshot);
  showToast("Undone");
}

function redo() {
  if (state.busy) return showToast("Stop the current AI edit before redoing");
  if (!state.future.length || !state.current) return showToast("Nothing to redo");
  state.history.push(snapshotProject());
  const snapshot = state.future.pop();
  restoreSnapshot(snapshot);
  showToast("Redone");
}

function renderAttachments() {
  els.attachmentTray.innerHTML = "";
  els.attachmentTray.classList.toggle("hidden", state.attachments.length === 0);
  state.attachments.forEach((file, index) => {
    const chip = document.createElement("div");
    chip.className = "attachment-chip";
    const kb = Math.max(1, Math.round(file.size / 1024));
    chip.innerHTML = `<span>${escapeHtml(file.name)}</span><small>${kb} KB</small><button class="attachment-remove" aria-label="Remove ${escapeHtml(file.name)}">${uiIconMarkup("x")}</button>`;
    $("button", chip).addEventListener("click", () => {
      state.attachments.splice(index, 1);
      renderAttachments();
    });
    els.attachmentTray.appendChild(chip);
  });
}

function addAttachments(files) {
  if (services.ai.supportsAttachments !== true) { showToast('AI attachments aren’t supported yet; import website files through Chat tools.', { tone: 'info' }); return; }
  let skipped = 0;
  [...files].forEach(file => {
    if (state.attachments.length >= 8) { skipped += 1; return; }
    if (file.size > 10 * 1024 * 1024) { skipped += 1; return; }
    const exists = state.attachments.some(x => x.name === file.name && x.size === file.size);
    if (!exists) state.attachments.push(file);
  });
  renderAttachments();
  if (skipped) showToast("Some attachments were skipped · max 8 files, 10 MB each", { tone: "info" });
}

function syncComposerActionState() {
  const planToggle = document.getElementById("builderModeTrigger");
  if (planToggle) planToggle.disabled = state.busy;
  if (state.busy) {
    els.send.disabled = false;
    return;
  }
  els.send.disabled = !els.prompt.value.trim();
  els.send.dataset.tooltip = "Send";
}

function renderPromptHistory() {
  els.historyList.innerHTML = "";
  if (!state.promptHistory.length) {
    els.historyList.innerHTML = `<div class="history-empty">Your recent prompts will appear here.</div>`;
    return;
  }
  state.promptHistory.slice(0, 10).forEach(prompt => {
    const button = document.createElement("button");
    button.className = "history-item";
    button.setAttribute("role", "menuitem");
    button.textContent = prompt;
    button.addEventListener("click", () => {
      els.prompt.value = prompt;
      autoSizeComposer();
      syncComposerActionState();
      els.prompt.focus();
      togglePopover("historyPopover", false);
    });
    els.historyList.appendChild(button);
  });
}

function navigatePromptHistory(direction) {
  if (!state.promptHistory.length || state.busy) return;
  if (direction < 0) state.promptHistoryIndex = Math.min(state.promptHistory.length - 1, state.promptHistoryIndex + 1);
  else state.promptHistoryIndex = Math.max(-1, state.promptHistoryIndex - 1);
  els.prompt.value = state.promptHistoryIndex === -1 ? "" : state.promptHistory[state.promptHistoryIndex];
  autoSizeComposer();
  requestAnimationFrame(() => els.prompt.setSelectionRange(els.prompt.value.length, els.prompt.value.length));
}

function getVirtualFiles(html) {
  if (!html) return { "index.html": "", "styles.css": "", "app.js": "" };
  const styleMatches = [...html.matchAll(/<style(?![^>]*data-bb-source-file)[^>]*>([\s\S]*?)<\/style>/gi)];
  const scriptMatches = [...html.matchAll(/<script(?![^>]*src=)(?![^>]*data-bb-source-file)[^>]*>([\s\S]*?)<\/script>/gi)];
  const css = styleMatches.map(m => m[1].trim()).join("\n\n");
  const js = scriptMatches.map(m => m[1].trim()).join("\n\n");
  let index = html;
  if (styleMatches.length) index = index.replace(/<style(?![^>]*data-bb-source-file)[^>]*>[\s\S]*?<\/style>/gi, '<link rel="stylesheet" href="styles.css">');
  if (scriptMatches.length) index = index.replace(/<script(?![^>]*src=)(?![^>]*data-bb-source-file)[^>]*>[\s\S]*?<\/script>/gi, '<script src="app.js"></script>');
  return {
    "index.html": index,
    "styles.css": css || "/* No page-specific CSS extracted yet. */",
    "app.js": js || "// No page-specific JavaScript is required for this page yet.",
  };
}

const PROJECT_IMPORT_LIMITS = Object.freeze({ maxFiles: 300, maxSingleBytes: 20 * 1024 * 1024, maxTotalBytes: 80 * 1024 * 1024 });
const PROJECT_TEXT_EXTENSIONS = new Set(["html", "htm", "css", "js", "mjs", "cjs", "json", "txt", "md", "csv", "xml", "map"]);
const issuedAssetUrls = new Set();

function normalizeProjectPath(path = "") {
  const parts = String(path).replace(/\\/g, "/").replace(/^\/+/, "").split("/");
  const out = [];
  parts.forEach(part => {
    if (!part || part === ".") return;
    if (part === "..") out.pop();
    else out.push(part);
  });
  return out.join("/");
}

function projectDirname(path = "") {
  const clean = normalizeProjectPath(path);
  const index = clean.lastIndexOf("/");
  return index < 0 ? "" : clean.slice(0, index);
}

function splitResourceRef(ref = "") {
  const value = String(ref).trim();
  const match = value.match(/^([^?#]*)([?#][\s\S]*)?$/);
  return { path: match?.[1] || value, suffix: match?.[2] || "" };
}

function isExternalResource(ref = "") {
  const value = String(ref).trim();
  return !value || value.startsWith("#") || value.startsWith("//") || /^(?:[a-z][a-z0-9+.-]*:)/i.test(value);
}

function resolveProjectPath(fromFile, ref) {
  const { path } = splitResourceRef(ref);
  if (!path || isExternalResource(path)) return null;
  const decoded = (() => { try { return decodeURIComponent(path); } catch { return path; } })();
  if (decoded.startsWith("/")) return normalizeProjectPath(decoded.slice(1));
  const base = projectDirname(fromFile);
  return normalizeProjectPath(base ? `${base}/${decoded}` : decoded);
}

function findProjectPath(path, files = {}, assets = {}) {
  if (!path) return null;
  if (Object.prototype.hasOwnProperty.call(files, path) || Object.prototype.hasOwnProperty.call(assets, path)) return path;
  const lower = path.toLowerCase();
  return [...Object.keys(files), ...Object.keys(assets)].find(key => key.toLowerCase() === lower) || null;
}

function relativeProjectRef(fromFile, targetFile) {
  const fromParts = projectDirname(fromFile).split("/").filter(Boolean);
  const toParts = normalizeProjectPath(targetFile).split("/").filter(Boolean);
  while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
    fromParts.shift();
    toParts.shift();
  }
  return `${"../".repeat(fromParts.length)}${toParts.join("/")}` || "./";
}

function mimeForProjectPath(path = "") {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return ({
    html: "text/html", htm: "text/html", css: "text/css", js: "text/javascript", mjs: "text/javascript", cjs: "text/javascript",
    json: "application/json", txt: "text/plain", md: "text/markdown", csv: "text/csv", xml: "application/xml", svg: "image/svg+xml",
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", avif: "image/avif", ico: "image/x-icon",
    woff: "font/woff", woff2: "font/woff2", ttf: "font/ttf", otf: "font/otf", mp4: "video/mp4", webm: "video/webm", mp3: "audio/mpeg", wav: "audio/wav",
    pdf: "application/pdf",
  })[ext] || "application/octet-stream";
}

function textFileDataUrl(path, content = "") {
  return `data:${mimeForProjectPath(path)};charset=utf-8,${encodeURIComponent(String(content))}`;
}

function projectResourceUrl(fromFile, ref, files = {}, assets = {}) {
  if (isExternalResource(ref)) return null;
  const resolved = resolveProjectPath(fromFile, ref);
  const actual = findProjectPath(resolved, files, assets);
  if (!actual) return null;
  const suffix = splitResourceRef(ref).suffix;
  if (assets[actual]?.previewUrl || assets[actual]?.url) return `${assets[actual].previewUrl || assets[actual].url}${suffix}`;
  const ext = actual.split(".").pop()?.toLowerCase() || "";
  if (files[actual] != null && !["html", "htm", "css", "js", "mjs", "cjs"].includes(ext)) return `${textFileDataUrl(actual, files[actual])}${suffix}`;
  return null;
}

function rewriteCssForPreview(css = "", cssPath, files = {}, assets = {}, stack = new Set()) {
  const currentPath = normalizeProjectPath(cssPath);
  if (stack.has(currentPath)) return String(css);
  const nextStack = new Set(stack);
  nextStack.add(currentPath);
  let output = String(css);

  output = output.replace(/@import\s+(?:url\(\s*)?["']([^"']+\.css(?:[?#][^"']*)?)["']\s*\)?\s*;/gi, (full, ref) => {
    const resolved = findProjectPath(resolveProjectPath(currentPath, ref), files, assets);
    if (!resolved || files[resolved] == null) return full;
    return `\n/* Book & Buy preview: ${resolved} */\n${rewriteCssForPreview(files[resolved], resolved, files, assets, nextStack)}\n`;
  });

  output = output.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)/gi, (full, quote, ref) => {
    const url = projectResourceUrl(currentPath, ref, files, assets);
    return url ? `url("${url}")` : full;
  });
  return output;
}

function moduleFileDataUrl(path, files, assets, stack = new Set()) {
  const clean = normalizeProjectPath(path);
  if (stack.has(clean) || files[clean] == null) return null;
  const next = new Set(stack);
  next.add(clean);
  const code = rewriteJavaScriptForPreview(files[clean], clean, files, assets, next, true);
  return `data:text/javascript;charset=utf-8,${encodeURIComponent(code)}`;
}

function rewriteJavaScriptForPreview(code = "", jsPath, files = {}, assets = {}, stack = new Set(), moduleMode = false) {
  let output = String(code);
  if (moduleMode) {
    output = output.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])([^"']+)\2/g, (full, prefix, quote, ref) => {
      if (isExternalResource(ref) || (!ref.startsWith(".") && !ref.startsWith("/"))) return full;
      const resolved = findProjectPath(resolveProjectPath(jsPath, ref), files, assets);
      if (!resolved) return full;
      const ext = resolved.split(".").pop()?.toLowerCase();
      let url = null;
      if (["js", "mjs", "cjs"].includes(ext) && files[resolved] != null) url = moduleFileDataUrl(resolved, files, assets, stack);
      else url = projectResourceUrl(jsPath, ref, files, assets);
      return url ? `${prefix}${quote}${url}${quote}` : full;
    });
  }
  output = output.replace(/(["'])(\.?\.?\/[^"']+|\/[^"']+)\1/g, (full, quote, ref) => {
    const url = projectResourceUrl(jsPath, ref, files, assets);
    return url ? `${quote}${url}${quote}` : full;
  });
  return output;
}

function markAndRewriteAttribute(el, attr, fromFile, files, assets) {
  const original = el.getAttribute(attr);
  if (!original || isExternalResource(original)) return;
  const url = projectResourceUrl(fromFile, original, files, assets);
  if (!url) return;
  el.setAttribute(`data-bb-original-${attr}`, original);
  el.setAttribute(attr, url);
}

function rewriteSrcset(el, fromFile, files, assets) {
  const original = el.getAttribute("srcset");
  if (!original) return;
  let changed = false;
  const next = original.split(",").map(candidate => {
    const trimmed = candidate.trim();
    const match = trimmed.match(/^(\S+)([\s\S]*)$/);
    if (!match) return candidate;
    const url = projectResourceUrl(fromFile, match[1], files, assets);
    if (!url) return candidate;
    changed = true;
    return `${url}${match[2] || ""}`;
  }).join(", ");
  if (changed) {
    el.setAttribute("data-bb-original-srcset", original);
    el.setAttribute("srcset", next);
  }
}

function ensureProjectFiles() {
  if (!state.current) return { "index.html": "", "styles.css": "", "app.js": "" };
  if (!state.current.files) {
    state.current.files = getVirtualFiles(state.current.html || "");
    state.current.entryFile = "index.html";
  }
  return state.current.files;
}

function compileSiteFiles(files = {}, assets = {}, entryFile = "index.html") {
  const preferredEntry = normalizeProjectPath(entryFile || "index.html");
  const resolvedEntry = findProjectPath(preferredEntry, files, assets)
    || Object.keys(files).filter(path => /(?:^|\/)index\.html?$/i.test(path)).sort((a, b) => a.length - b.length)[0]
    || Object.keys(files).find(path => /\.html?$/i.test(path));
  const index = String(resolvedEntry ? files[resolvedEntry] || "" : "");
  if (!index.trim()) return "";
  const doc = new DOMParser().parseFromString(index, "text/html");
  if (!doc?.documentElement) return index;

  let mountedCss = 0;
  [...doc.querySelectorAll('link[rel~="stylesheet"][href]')].forEach(link => {
    const href = (link.getAttribute("href") || "").trim();
    if (isExternalResource(href)) return;
    const sourcePath = findProjectPath(resolveProjectPath(resolvedEntry, href), files, assets);
    if (!sourcePath || files[sourcePath] == null || !/\.css$/i.test(sourcePath)) return;
    const style = doc.createElement("style");
    style.dataset.bbSourceFile = sourcePath;
    if (link.media) style.media = link.media;
    style.textContent = rewriteCssForPreview(files[sourcePath], sourcePath, files, assets);
    link.replaceWith(style);
    mountedCss += 1;
  });
  if (!mountedCss && files["styles.css"]?.trim()) {
    const style = doc.createElement("style");
    style.dataset.bbSourceFile = "styles.css";
    style.textContent = rewriteCssForPreview(files["styles.css"], "styles.css", files, assets);
    (doc.head || doc.documentElement).appendChild(style);
  }

  let mountedJs = 0;
  [...doc.querySelectorAll('script[src]')].forEach(script => {
    const src = (script.getAttribute("src") || "").trim();
    if (isExternalResource(src)) return;
    const sourcePath = findProjectPath(resolveProjectPath(resolvedEntry, src), files, assets);
    if (!sourcePath || files[sourcePath] == null || !/\.(?:m?js|cjs)$/i.test(sourcePath)) return;
    const inline = doc.createElement("script");
    inline.dataset.bbSourceFile = sourcePath;
    const isModule = script.type === "module" || /\.mjs$/i.test(sourcePath);
    if (script.type) inline.type = script.type;
    if (script.hasAttribute("nomodule")) inline.setAttribute("nomodule", "");
    inline.textContent = rewriteJavaScriptForPreview(files[sourcePath], sourcePath, files, assets, new Set(), isModule);
    script.replaceWith(inline);
    mountedJs += 1;
  });
  if (!mountedJs && files["app.js"]?.trim()) {
    const inline = doc.createElement("script");
    inline.dataset.bbSourceFile = "app.js";
    inline.textContent = rewriteJavaScriptForPreview(files["app.js"], "app.js", files, assets);
    (doc.body || doc.documentElement).appendChild(inline);
  }

  doc.querySelectorAll("img[src],source[src],video[src],audio[src],input[src],embed[src],iframe[src]").forEach(el => markAndRewriteAttribute(el, "src", resolvedEntry, files, assets));
  doc.querySelectorAll("video[poster]").forEach(el => markAndRewriteAttribute(el, "poster", resolvedEntry, files, assets));
  doc.querySelectorAll("object[data]").forEach(el => markAndRewriteAttribute(el, "data", resolvedEntry, files, assets));
  doc.querySelectorAll("img[srcset],source[srcset]").forEach(el => rewriteSrcset(el, resolvedEntry, files, assets));
  doc.querySelectorAll("link[href]").forEach(el => {
    if ((el.getAttribute("rel") || "").split(/\s+/).includes("stylesheet")) return;
    markAndRewriteAttribute(el, "href", resolvedEntry, files, assets);
  });
  doc.querySelectorAll("a[href]").forEach(el => {
    const href = el.getAttribute("href") || "";
    const resolved = findProjectPath(resolveProjectPath(resolvedEntry, href), files, assets);
    if (resolved && assets[resolved]) markAndRewriteAttribute(el, "href", resolvedEntry, files, assets);
  });
  doc.querySelectorAll("[style]").forEach(el => {
    const original = el.getAttribute("style") || "";
    const rewritten = rewriteCssForPreview(original, resolvedEntry, files, assets);
    if (rewritten !== original) {
      el.setAttribute("data-bb-original-style", original);
      el.setAttribute("style", rewritten);
    }
  });
  doc.querySelectorAll("style:not([data-bb-source-file])").forEach(style => {
    style.textContent = rewriteCssForPreview(style.textContent || "", resolvedEntry, files, assets);
  });

  doc.documentElement.setAttribute("data-bb-entry-file", resolvedEntry);
  return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
}

function restoreOriginalPreviewReferences(root) {
  if (!root?.querySelectorAll) return;
  const attrs = ["src", "href", "poster", "data", "srcset", "style"];
  attrs.forEach(attr => {
    root.querySelectorAll(`[data-bb-original-${attr}]`).forEach(el => {
      el.setAttribute(attr, el.getAttribute(`data-bb-original-${attr}`) || "");
      el.removeAttribute(`data-bb-original-${attr}`);
    });
  });
}

function captureFrameSourceFiles() {
  const doc = getFrameDocument();
  if (!doc?.documentElement || !state.current?.files) return state.current?.files || null;
  const files = cloneData(state.current.files);
  const clone = doc.documentElement.cloneNode(true);
  clone.querySelectorAll("[contenteditable]").forEach(el => {
    el.removeAttribute("contenteditable");
    el.removeAttribute("spellcheck");
  });
  restoreOriginalPreviewReferences(clone);
  const entryFile = state.current.entryFile || clone.getAttribute("data-bb-entry-file") || "index.html";
  clone.removeAttribute("data-bb-entry-file");
  clone.querySelectorAll('style[data-bb-source-file]').forEach(style => {
    const name = style.dataset.bbSourceFile || "styles.css";
    const link = doc.createElement("link");
    link.setAttribute("rel", "stylesheet");
    link.setAttribute("href", relativeProjectRef(entryFile, name));
    if (style.media) link.setAttribute("media", style.media);
    style.replaceWith(link);
  });
  clone.querySelectorAll('script[data-bb-source-file]').forEach(script => {
    const name = script.dataset.bbSourceFile || "app.js";
    const replacement = doc.createElement("script");
    replacement.setAttribute("src", relativeProjectRef(entryFile, name));
    if (script.type) replacement.setAttribute("type", script.type);
    if (script.hasAttribute("nomodule")) replacement.setAttribute("nomodule", "");
    script.replaceWith(replacement);
  });
  files[entryFile] = `<!DOCTYPE html>\n${clone.outerHTML}`;
  return files;
}

function isProjectAsset(path) {
  return Boolean(state.current?.assets?.[path]);
}

function fileTypeForPath(path = "") {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if (["html", "htm"].includes(ext)) return { className: "html", icon: "file-code" };
  if (ext === "css") return { className: "css", icon: "sliders" };
  if (["js", "mjs", "cjs"].includes(ext)) return { className: "js", icon: "code" };
  if (["json", "map"].includes(ext)) return { className: "data", icon: "braces" };
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "svg", "ico"].includes(ext)) return { className: "asset", icon: "image" };
  if (["woff", "woff2", "ttf", "otf"].includes(ext)) return { className: "asset", icon: "type" };
  return { className: "asset", icon: "files" };
}

function renderProjectFileList() {
  if (!els.fileList) return;
  const files = state.current?.files || (state.current?.html ? getVirtualFiles(state.current.html) : {});
  const assets = state.current?.assets || {};
  const entry = state.current?.entryFile || "index.html";
  const codePaths = Object.keys(files).sort((a, b) => (a === entry ? -1 : b === entry ? 1 : a.localeCompare(b)));
  const assetPaths = Object.keys(assets).sort((a, b) => a.localeCompare(b));
  const allPaths = [...codePaths, ...assetPaths];

  if (!allPaths.includes(state.activeFile)) state.activeFile = codePaths.includes(entry) ? entry : codePaths[0] || assetPaths[0] || "index.html";
  els.fileList.innerHTML = "";
  const addGroup = (label, paths) => {
    if (!paths.length) return;
    const group = document.createElement("div");
    group.className = "file-group-label";
    group.textContent = label;
    els.fileList.appendChild(group);
    paths.forEach(path => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `file-item${path === state.activeFile ? " active" : ""}`;
      button.dataset.file = path;
      button.title = path;
      const type = fileTypeForPath(path);
      const badge = document.createElement("span");
      badge.className = `file-type ${type.className}`;
      badge.innerHTML = uiIconMarkup(type.icon);
      const labelEl = document.createElement("span");
      labelEl.className = "file-name";
      labelEl.textContent = path;
      button.append(badge, labelEl);
      els.fileList.appendChild(button);
    });
  };
  addGroup("Code", codePaths);
  addGroup("Assets", assetPaths);
  if (els.projectFileSummary) {
    if (!state.current?.files) els.projectFileSummary.textContent = "Generated project · import a folder to replace it.";
    else {
      const codeText = `${codePaths.length} file${codePaths.length === 1 ? "" : "s"}`;
      const assetText = `${assetPaths.length} asset${assetPaths.length === 1 ? "" : "s"}`;
      els.projectFileSummary.textContent = `${codeText} · ${assetText}`;
    }
  }
}

function setCodeDirty(dirty) {
  state.codeDirty = Boolean(dirty) && !isProjectAsset(state.activeFile);
  els.editorDirty?.classList.toggle("hidden", !state.codeDirty);
  if (els.applyCodeBtn) els.applyCodeBtn.disabled = !state.codeDirty || !state.current || isProjectAsset(state.activeFile);
}

function renderActiveCodeFile() {
  const files = state.current?.files || getVirtualFiles(state.current?.html || "");
  const asset = state.current?.assets?.[state.activeFile];
  if (asset) {
    els.codeOutput.readOnly = true;
    els.codeOutput.classList.add("asset-inspector");
    const size = asset.size >= 1024 * 1024 ? `${(asset.size / (1024 * 1024)).toFixed(2)} MB` : `${Math.max(1, Math.round(asset.size / 1024))} KB`;
    els.codeOutput.value = `Asset\n\nPath: ${state.activeFile}\nType: ${asset.mime || mimeForProjectPath(state.activeFile)}\nSize: ${size}\n\nThis asset is loaded into the preview from the imported project. Binary assets are intentionally read-only in the code editor.`;
  } else {
    els.codeOutput.readOnly = false;
    els.codeOutput.classList.remove("asset-inspector");
    els.codeOutput.value = files[state.activeFile] || "";
  }
  els.editorPath.textContent = `Project / ${state.activeFile}`;
  if (els.downloadCodeBtn) els.downloadCodeBtn.textContent = asset ? "Download asset" : "Download file";
  if (els.copyCodeBtn) els.copyCodeBtn.disabled = Boolean(asset) || !state.current?.html;
  setCodeDirty(false);
}

function applyCodeEdits({ silent = false } = {}) {
  if (!state.current || !state.codeDirty || isProjectAsset(state.activeFile)) return false;
  const before = snapshotProject();
  const files = cloneData(ensureProjectFiles());
  files[state.activeFile] = els.codeOutput.value;
  const entryFile = state.current.entryFile || "index.html";
  let compiled = compileSiteFiles(files, state.current.assets || {}, entryFile);
  try {
    window.BookBuyWebsiteContract.validateWebsiteBindings(compiled, window.BookBuyCommerce.context, { previousHtml: state.current.html, preserve: true });
    compiled = window.BookBuyCommerce.wireHtml(compiled).html;
  } catch (error) { showToast(error.message, { tone: 'error' }); return false; }
  if (!compiled.trim()) {
    if (!silent) showToast(`${entryFile} can’t be empty`, { tone: "error" });
    return false;
  }
  pushUndo(before, `Edit ${state.activeFile}`);
  state.current.files = cloneData(files);
  state.current.html = compiled;
  state.current.updatedAt = Date.now();
  setCodeDirty(false);
  clearCanvasSelection();
  els.frame.srcdoc = state.current.html;
  queueProjectDraftSave();
  renderProjectFileList();
  if (!silent) showToast(`${state.activeFile} applied to preview`, { tone: "success" });
  return true;
}

function incomingDescriptors(fileList) {
  return [...(fileList || [])].map(item => item?.file ? item : ({ file: item, relativePath: item?.webkitRelativePath || item?.name || "" })).filter(item => item.file);
}

function stripSharedRoot(descriptors) {
  const paths = descriptors.map(item => normalizeProjectPath(item.relativePath || item.file.name));
  const firstSegments = paths.map(path => path.split("/")[0]);
  const canStrip = paths.length > 0 && paths.every(path => path.includes("/")) && new Set(firstSegments).size === 1;
  return descriptors.map((item, index) => ({
    ...item,
    relativePath: canStrip ? paths[index].split("/").slice(1).join("/") : paths[index],
  }));
}

function shouldReadAsText(file, path) {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  if ((file.type || "").toLowerCase() === "image/svg+xml" || ext === "svg") return false;
  return PROJECT_TEXT_EXTENSIONS.has(ext) || /^text\//i.test(file.type) || /(?:javascript|json|xml)/i.test(file.type);
}

async function readUploadedSiteFiles(fileList) {
  let incoming = stripSharedRoot(incomingDescriptors(fileList)).filter(item => !/(?:^|\/)\.DS_Store$/i.test(item.relativePath));
  if (!incoming.length) return null;
  if (incoming.length > PROJECT_IMPORT_LIMITS.maxFiles) throw new Error(`That project has ${incoming.length} files. The local preview limit is ${PROJECT_IMPORT_LIMITS.maxFiles}.`);
  const totalBytes = incoming.reduce((sum, item) => sum + (item.file.size || 0), 0);
  if (totalBytes > PROJECT_IMPORT_LIMITS.maxTotalBytes) throw new Error("That project is too large for the local browser preview. Keep the import under 80 MB.");
  const tooLarge = incoming.find(item => item.file.size > PROJECT_IMPORT_LIMITS.maxSingleBytes);
  if (tooLarge) throw new Error(`${tooLarge.file.name} is over the 20 MB per-file local preview limit.`);

  const files = {};
  const assets = {};
  for (const item of incoming) {
    const path = normalizeProjectPath(item.relativePath || item.file.name);
    if (!path) continue;
    if (shouldReadAsText(item.file, path)) {
      files[path] = await item.file.text();
    } else {
      const url = URL.createObjectURL(item.file);
      issuedAssetUrls.add(url);
      const previewUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(`Couldn’t read ${item.file.name}.`));
        reader.readAsDataURL(item.file);
      });
      // Opaque script previews cannot read their parent's blob URLs.
      assets[path] = { url, previewUrl, mime: item.file.type || mimeForProjectPath(path), size: item.file.size || 0, name: item.file.name };
    }
  }

  const htmlPaths = Object.keys(files).filter(path => /\.html?$/i.test(path));
  const entryFile = htmlPaths.find(path => /^index\.html?$/i.test(path))
    || htmlPaths.filter(path => /(?:^|\/)index\.html?$/i.test(path)).sort((a, b) => a.length - b.length)[0]
    || htmlPaths[0];
  if (!entryFile) throw new Error("Include an index.html file so the builder knows what to load.");
  return { files, assets, entryFile, count: incoming.length, totalBytes };
}

function inferImportedProjectName(indexHtml = "") {
  try {
    const doc = new DOMParser().parseFromString(indexHtml, "text/html");
    const title = (doc.querySelector("title")?.textContent || "").trim();
    return title ? title.slice(0, 60) : "Imported website";
  } catch {
    return "Imported website";
  }
}

async function readDirectoryEntry(entry) {
  if (entry.isFile) {
    const file = await new Promise((resolve, reject) => entry.file(resolve, reject));
    return [{ file, relativePath: normalizeProjectPath(entry.fullPath || file.name) }];
  }
  if (!entry.isDirectory) return [];
  const reader = entry.createReader();
  const children = [];
  while (true) {
    const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    if (!batch.length) break;
    children.push(...batch);
  }
  const nested = await Promise.all(children.map(child => readDirectoryEntry(child)));
  return nested.flat();
}

async function collectDroppedProjectFiles(dataTransfer) {
  const items = [...(dataTransfer?.items || [])];
  const entries = items.map(item => item.webkitGetAsEntry?.()).filter(Boolean);
  if (entries.length) {
    const nested = await Promise.all(entries.map(entry => readDirectoryEntry(entry)));
    return nested.flat();
  }
  return incomingDescriptors(dataTransfer?.files || []);
}

async function importWebsiteFiles(fileList) {
  if (state.busy) return showToast("Stop the current build before importing files.", { tone: "info" });
  els.uploadSiteCard?.classList.add("is-importing");
  if (els.projectFileSummary) els.projectFileSummary.textContent = "Reading project…";
  try {
    const imported = await readUploadedSiteFiles(fileList);
    if (!imported) return;
    const before = snapshotProject();
    const compiled = window.BookBuyCommerce.wireHtml(compileSiteFiles(imported.files, imported.assets, imported.entryFile)).html;
    if (!compiled.trim()) throw new Error(`The uploaded ${imported.entryFile} is empty.`);
    if (before) pushUndo(before, "Import website project");
    const name = inferImportedProjectName(imported.files[imported.entryFile]);
    state.current = {
      ...(state.current || {}),
      id: state.current?.id || `local-project-${Date.now().toString(36)}`,
      name,
      prompt: state.current?.prompt || "",
      publishedUrl: null,
      files: cloneData(imported.files),
      assets: cloneData(imported.assets),
      entryFile: imported.entryFile,
      html: compiled,
      updatedAt: Date.now(),
    };
    state.activeFile = imported.entryFile;
    els.address.textContent = "local-preview.bookandbuy.app";
    renderCurrent();
    setView("preview");
    setCanvasMode("view", { announce: false });
    queueProjectDraftSave();
    const assetCount = Object.keys(imported.assets).length;
    showToast(`Imported ${imported.count} files${assetCount ? ` · ${assetCount} assets linked` : ""} · View mode is on`, { tone: "success" });
  } catch (error) {
    renderProjectFileList();
    showToast(error?.message || "Couldn’t load that website project.", { tone: "error" });
  } finally {
    els.uploadSiteCard?.classList.remove("is-importing", "is-dragover");
    if (els.siteFilesInput) els.siteFilesInput.value = "";
    if (els.siteFolderInput) els.siteFolderInput.value = "";
  }
}


function closeAllPopovers(exceptId = null) {
  ["projectMenu","accountMenu","historyPopover","builderModelMenu","builderToolsMenu"].forEach(id => {
    if (id === exceptId) return;
    const el = $(`#${id}`);
    el?.classList.add("hidden");
  });
  $("#projectSwitcher").setAttribute("aria-expanded", "false");
  $("#avatarBtn").setAttribute("aria-expanded", "false");
  $("#historyBtn").setAttribute("aria-expanded", "false");
  ['builderModelTrigger','builderEffortTrigger','builderToolsTrigger'].forEach(id => $(`#${id}`)?.setAttribute('aria-expanded', 'false'));
}

function togglePopover(id, force) {
  const popover = $(`#${id}`);
  if (!popover) return;
  const trigger = id === "projectMenu" ? $("#projectSwitcher") : id === "accountMenu" ? $("#avatarBtn") : $("#historyBtn");
  const shouldOpen = force ?? popover.classList.contains("hidden");
  closeAllPopovers(shouldOpen ? id : null);
  popover.classList.toggle("hidden", !shouldOpen);
  trigger?.setAttribute("aria-expanded", String(shouldOpen));
}

async function newProject({ confirm = true } = {}) {
  if (state.busy) stopGeneration();
  if (confirm && (state.current?.html || els.messages.children.length)) {
    const ok = await openActionDialog({
      eyebrow: "Project",
      title: "Start a new project?",
      copy: "Your current draft is saved on this device before you start a fresh workspace.",
      confirmLabel: "New project",
    });
    if (!ok) return;
  }
  try {
    clearTimeout(queueProjectDraftSave.timer);
    if (state.current) await services.projects.saveDraft({ project: cloneData(state.current) });
    const project = await services.projects.createProject({ name: "Untitled project", html: "", prompt: "" });
    state.history = [];
    state.future = [];
    state.current = project;
    state.selectedId = null;
    state.hoveredId = null;
    state.aiTargetId = null;
    state.attachments = [];
    state.lastAgentRun = null;
    els.messages.innerHTML = "";
    renderAttachments();
    syncChatEmpty();
    els.address.textContent = "preview.bookandbuy.app";
    await services.commerce.reset({ projectId: project.id });
    renderCurrent();
    queueProjectDraftSave();
    setView("preview");
    state.chatCollapsed = false;
    els.appShell.classList.remove("chat-collapsed");
    closeAllPopovers();
    closeToolbarMenus();
    els.prompt.focus();
    setBuilderStatus("ready");
    showToast("New project ready", { tone: "success" });
  } catch (error) {
    showToast(error?.message || "Couldn’t create the project.", { tone: "error" });
  }
}

async function duplicateProject() {
  if (!state.current) return showToast("Nothing to duplicate yet", { tone: "info" });
  closeAllPopovers();
  try {
    clearTimeout(queueProjectDraftSave.timer);
    await services.projects.saveDraft({ project: cloneData(state.current) });
    const duplicate = await services.projects.duplicateProject({ project: cloneData(state.current) });
    state.current = duplicate;
    state.history = [];
    state.future = [];
    clearCanvasSelection();
    renderCurrent();
    queueProjectDraftSave();
    await services.commerce.reset({ projectId: duplicate.id });
    showToast("Duplicate project ready", { tone: "success" });
  } catch (error) {
    showToast(error?.message || "Couldn’t duplicate this project.", { tone: "error" });
  }
}

async function renameProject() {
  if (!state.current) return showToast("Build a site first", { tone: "info" });
  const next = await openActionDialog({
    eyebrow: "Project",
    title: "Rename project",
    copy: "This changes the workspace label only. Publishing stays behind its own adapter.",
    inputLabel: "Project name",
    inputValue: state.current.name || "Untitled project",
    confirmLabel: "Rename",
  });
  if (!next || next === state.current.name) return;
  try {
    const before = snapshotProject();
    const renamed = await services.projects.renameProject({ project: cloneData(state.current), name: next });
    pushUndo(before, "Rename project");
    state.current = renamed;
    renderCurrent();
    queueProjectDraftSave();
    showToast("Project renamed", { tone: "success" });
  } catch (error) {
    showToast(error?.message || "Couldn’t rename this project.", { tone: "error" });
  }
}

function setPublishInlineState(kind = "idle", text = "") {
  state.publishState = kind;
  if (!els.publishInlineStatus) return;
  const visible = kind !== "idle" && Boolean(text);
  els.publishInlineStatus.classList.toggle("hidden", !visible);
  els.publishInlineStatus.classList.toggle("error", kind === "error");
  els.publishInlineStatus.classList.toggle("success", kind === "success");
  els.publishInlineStatusText.textContent = text;
}

function openPublish() {
  if (!state.current?.html) return showToast("Build a site first", { tone: "info" });
  rememberModalFocus();
  closeAllPopovers();
  closeToolbarMenus();
  setPublishInlineState("idle");
  els.publishModal.classList.remove("hidden");
  requestAnimationFrame(() => els.slugInput.focus());
}

function closePublish() {
  if (state.publishState === "loading") return;
  els.publishModal.classList.add("hidden");
  setPublishInlineState("idle");
  restoreModalFocus();
}
function openShortcuts() {
  rememberModalFocus();
  closeAllPopovers();
  els.shortcutsModal.classList.remove("hidden");
  requestAnimationFrame(() => $("#closeShortcuts")?.focus());
}
function closeShortcuts() {
  els.shortcutsModal.classList.add("hidden");
  restoreModalFocus();
}

// Composer events
els.send.addEventListener("click", () => state.busy ? stopGeneration() : sendPrompt());
els.prompt.addEventListener("input", () => { autoSizeComposer(); syncComposerActionState(); });
els.prompt.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!state.busy) sendPrompt();
    return;
  }
  if (event.key === "ArrowUp" && (els.prompt.selectionStart === 0 || !els.prompt.value)) {
    event.preventDefault();
    navigatePromptHistory(-1);
  } else if (event.key === "ArrowDown" && state.promptHistoryIndex !== -1) {
    event.preventDefault();
    navigatePromptHistory(1);
  }
});

$$(".suggestion").forEach(btn => btn.addEventListener("click", () => {
  els.prompt.value = btn.querySelector("span")?.textContent || btn.textContent;
  autoSizeComposer();
  syncComposerActionState();
  els.prompt.focus();
}));

const aiAttachmentsSupported = services.ai.supportsAttachments === true;
$("#attachBtn").disabled = !aiAttachmentsSupported;
els.attachmentInput.disabled = !aiAttachmentsSupported;
$("#attachBtn").title = aiAttachmentsSupported ? 'Attach files' : 'AI attachments aren’t supported yet; import website files through Chat tools.';
$("#attachBtn").dataset.tooltip = $("#attachBtn").title;
$("#attachBtn").addEventListener("click", () => { if (aiAttachmentsSupported) els.attachmentInput.click(); });
els.attachmentInput.addEventListener("change", () => {
  addAttachments(els.attachmentInput.files || []);
  els.attachmentInput.value = "";
});
els.composer.addEventListener("dragover", (event) => { event.preventDefault(); els.composer.classList.add("dragover"); });
els.composer.addEventListener("dragleave", () => els.composer.classList.remove("dragover"));
els.composer.addEventListener("drop", (event) => {
  event.preventDefault();
  els.composer.classList.remove("dragover");
  if (event.dataTransfer?.files?.length) addAttachments(event.dataTransfer.files);
});

$("#magicBtn").addEventListener("click", () => {
  const text = els.prompt.value.trim();
  if (text) {
    els.prompt.value = `${text.replace(/[.\s]+$/, "")}. Keep the change focused, preserve the existing Book & Buy design system, and make only the minimum visual changes needed.`;
  } else if (state.selectedId) {
    els.prompt.value = "Refine the selected element to be clearer and more premium without changing the surrounding design.";
  } else {
    els.prompt.value = "Refine the hero copy and primary call to action without redesigning the page.";
  }
  autoSizeComposer();
  syncComposerActionState();
  els.prompt.focus();
});

$("#historyBtn").addEventListener("click", (event) => { event.stopPropagation(); renderPromptHistory(); togglePopover("historyPopover"); });
$("#clearSelectionContext").addEventListener("click", clearCanvasSelection);

// Canvas controls
$("#editSelectionBtn").addEventListener("click", startInlineEdit);
els.buttonEditSelectionBtn.addEventListener("click", startInlineEdit);
els.spacingSelectionBtn.addEventListener("click", event => { event.stopPropagation(); toggleToolbarMenu(els.spacingMenu, els.spacingSelectionBtn); });
els.moveSelectionBtn.addEventListener("click", event => { event.stopPropagation(); toggleToolbarMenu(els.moveMenu, els.moveSelectionBtn); });
els.moreSelectionBtn.addEventListener("click", event => { event.stopPropagation(); toggleToolbarMenu(els.moreSelectionMenu, els.moreSelectionBtn); });
els.spacingMenu.addEventListener("click", event => {
  const button = event.target.closest("button[data-spacing]");
  if (button) applySelectionSpacing(button.dataset.spacing);
});
els.moveMenu.addEventListener("click", event => {
  const button = event.target.closest("button[data-move]");
  if (button) moveSelection(button.dataset.move);
});
$("#askAISelectionBtn").addEventListener("click", () => {
  const el = getCanvasElement(state.selectedId);
  if (!el) return;
  closeToolbarMenus();
  els.prompt.value = "";
  els.prompt.placeholder = "Describe a change…";
  autoSizeComposer();
  syncComposerActionState();
  els.prompt.focus();
});
$("#protectionInfoBtn").addEventListener("click", () => openProtectionModal());
els.permissionPill.addEventListener("click", () => openProtectionModal());
$("#duplicateSelectionBtn").addEventListener("click", duplicateSelection);
els.hideSelectionBtn.addEventListener("click", hideSelection);
$("#deleteSelectionBtn").addEventListener("click", deleteSelection);

$("#closeProtection").addEventListener("click", closeProtectionModal);
$("#protectionDone").addEventListener("click", closeProtectionModal);
els.protectionModal.addEventListener("click", event => { if (event.target === els.protectionModal) closeProtectionModal(); });

els.actionConfirmBtn.addEventListener("click", () => resolveActionDialog(true));
els.actionCancelBtn.addEventListener("click", () => resolveActionDialog(false));
$("#closeActionModal").addEventListener("click", () => resolveActionDialog(false));
els.actionModal.addEventListener("click", event => { if (event.target === els.actionModal) resolveActionDialog(false); });
els.actionInput.addEventListener("keydown", event => {
  if (event.key === "Enter") { event.preventDefault(); resolveActionDialog(true); }
});

els.frame.addEventListener("load", () => {
  if (!state.current?.html) return;
  if (state.canvasMode === "edit") bindFrameEditor();
  requestAnimationFrame(updateCanvasOverlays);
});
window.addEventListener("resize", updateCanvasOverlays);

// View / stage controls
$$("#mainViewTabs .view-tab").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
$$(".device-btn").forEach(btn => btn.addEventListener("click", () => setDevice(btn.dataset.device)));
$$(".canvas-mode-btn").forEach(btn => btn.addEventListener("click", () => setCanvasMode(state.canvasMode === "edit" ? "view" : "edit")));
$("#toggleChatBtn").addEventListener("click", () => {
  state.chatCollapsed = !state.chatCollapsed;
  els.appShell.classList.toggle("chat-collapsed", state.chatCollapsed);
  syncMobileViewTabs();
  requestAnimationFrame(() => requestAnimationFrame(updateCanvasOverlays));
});
$("#mobileChatTab").addEventListener("click", () => {
  state.chatCollapsed = false;
  els.appShell.classList.remove("chat-collapsed");
  syncMobileViewTabs();
});
window.addEventListener("resize", syncMobileViewTabs);
$("#builderNewChat")?.addEventListener("click", () => {
  if (!state.busy && window.matchMedia("(max-width: 760px)").matches) $("#mobileChatTab").click();
});
$("#refreshBtn").addEventListener("click", () => {
  if (!state.current?.html) return showToast("Nothing to refresh yet");
  state.current.html = captureFrameHtml();
  if (state.current.files) state.current.files = captureFrameSourceFiles();
  resetRuntimeBridge(); els.frame.srcdoc = state.current.html;
  showToast("Preview refreshed", { tone: "success" });
});
$("#openPreviewBtn").addEventListener("click", () => {
  const html = state.current?.html;
  if (!html) return showToast("Build a site first");
  // The standalone preview uses the same opaque-origin script sandbox as View.
  const previewHtml = `<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Local website preview</title><style>html,body,iframe{margin:0;width:100%;height:100%;border:0}body{overflow:hidden}</style></head><body><iframe title="Local website preview" sandbox="allow-scripts" srcdoc="${escapeHtml(html)}"></iframe></body></html>`;
  const blob = new Blob([previewHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const previewWindow = window.open(url, "_blank");
  if (!previewWindow) {
    URL.revokeObjectURL(url);
    return showToast("Your browser blocked the preview window.", { tone: "error" });
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
});

// Code controls
function openSiteFilePicker(kind = "folder") {
  if (state.busy) return showToast("Stop the current build before importing files.", { tone: "info" });
  if (kind === "files") els.siteFilesInput?.click();
  else els.siteFolderInput?.click();
}

els.importSiteBtn?.addEventListener("click", () => openSiteFilePicker("folder"));
$("#builderImportWebsiteFiles")?.addEventListener("click", () => { closeAllPopovers(); setView("code"); openSiteFilePicker("files"); });
els.importFolderBtn?.addEventListener("click", event => { event.stopPropagation(); openSiteFilePicker("folder"); });
els.importFilesBtn?.addEventListener("click", event => { event.stopPropagation(); openSiteFilePicker("files"); });
els.uploadSiteCard?.addEventListener("keydown", event => {
  if (["Enter", " "].includes(event.key) && event.target === els.uploadSiteCard) {
    event.preventDefault();
    openSiteFilePicker("folder");
  }
});
els.siteFilesInput?.addEventListener("change", () => importWebsiteFiles(els.siteFilesInput.files));
els.siteFolderInput?.addEventListener("change", () => importWebsiteFiles(els.siteFolderInput.files));

[els.uploadSiteCard, els.codeArea].filter(Boolean).forEach(dropTarget => {
  dropTarget.addEventListener("dragover", event => {
    if (!event.dataTransfer?.types?.includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (dropTarget === els.uploadSiteCard) dropTarget.classList.add("is-dragover");
  });
  dropTarget.addEventListener("dragleave", event => {
    if (dropTarget === els.uploadSiteCard && !dropTarget.contains(event.relatedTarget)) dropTarget.classList.remove("is-dragover");
  });
  dropTarget.addEventListener("drop", async event => {
    if (!event.dataTransfer?.files?.length && !event.dataTransfer?.items?.length) return;
    event.preventDefault();
    event.stopPropagation();
    if (dropTarget === els.uploadSiteCard) dropTarget.classList.remove("is-dragover");
    try {
      const dropped = await collectDroppedProjectFiles(event.dataTransfer);
      await importWebsiteFiles(dropped);
    } catch (error) {
      showToast(error?.message || "Couldn’t read that dropped project.", { tone: "error" });
    }
  });
});

els.fileList?.addEventListener("click", event => {
  const btn = event.target.closest(".file-item[data-file]");
  if (!btn) return;
  if (btn.dataset.file === state.activeFile) return;
  if (state.codeDirty) applyCodeEdits({ silent: true });
  state.activeFile = btn.dataset.file;
  renderProjectFileList();
  renderActiveCodeFile();
});

els.codeOutput.addEventListener("input", () => {
  if (!els.codeOutput.readOnly) setCodeDirty(true);
});
els.codeOutput.addEventListener("keydown", event => {
  if (els.codeOutput.readOnly) return;
  const meta = event.ctrlKey || event.metaKey;
  if (meta && event.key.toLowerCase() === "s") {
    event.preventDefault();
    applyCodeEdits();
    return;
  }
  if (event.key === "Tab") {
    event.preventDefault();
    const start = els.codeOutput.selectionStart;
    const end = els.codeOutput.selectionEnd;
    els.codeOutput.setRangeText("  ", start, end, "end");
    setCodeDirty(true);
  }
});
els.applyCodeBtn?.addEventListener("click", () => applyCodeEdits());

$("#copyCodeBtn").addEventListener("click", async () => {
  if (!state.current?.html) return showToast("No code yet", { tone: "info" });
  if (isProjectAsset(state.activeFile)) return showToast("Binary assets aren’t copied as code.", { tone: "info" });
  const copied = await copyTextToClipboard(els.codeOutput.value || "");
  showToast(copied ? `${state.activeFile} copied` : "Copy is unavailable in this browser", { tone: copied ? "success" : "error" });
});
$("#downloadCodeBtn").addEventListener("click", () => {
  if (!state.current?.html) return showToast("No project yet");
  if (state.codeDirty) applyCodeEdits({ silent: true });
  const asset = state.current?.assets?.[state.activeFile];
  if (asset?.url) {
    const a = document.createElement("a");
    a.href = asset.url;
    a.download = asset.name || state.activeFile.split("/").pop() || "asset";
    a.click();
    showToast(`${a.download} downloaded`, { tone: "success" });
    return;
  }
  const files = ensureProjectFiles();
  const content = files[state.activeFile] || "";
  const mime = mimeForProjectPath(state.activeFile);
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = state.activeFile.split("/").pop() || "file";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  showToast(`${state.activeFile} downloaded`, { tone: "success" });
});

// History
els.undoBtn.addEventListener("click", undo);
els.redoBtn.addEventListener("click", redo);

// Project and account menus
$("#homeBtn").addEventListener("click", () => {
  state.chatCollapsed = false;
  els.appShell.classList.remove("chat-collapsed");
  setView("preview");
  clearCanvasSelection();
  els.prompt.focus();
});
$("#projectSwitcher").addEventListener("click", (event) => { event.stopPropagation(); togglePopover("projectMenu"); });
$("#avatarBtn").addEventListener("click", (event) => { event.stopPropagation(); togglePopover("accountMenu"); });
$("#newProjectBtn").addEventListener("click", () => newProject());
$("#menuNewProjectBtn").addEventListener("click", () => newProject());
$("#renameProjectBtn").addEventListener("click", renameProject);
$("#duplicateProjectBtn").addEventListener("click", duplicateProject);
$("#shortcutsBtn").addEventListener("click", openShortcuts);
$("#resetDemoBtn").addEventListener("click", async () => {
  closeAllPopovers();
  const ok = await openActionDialog({
    eyebrow: "Workspace",
    title: "Reset this demo?",
    copy: "This clears the local editor conversation and restores the sample canvas. No real backend data is touched.",
    confirmLabel: "Reset demo",
    destructive: true,
  });
  if (!ok) return;
  try {
    const seed = state.current || { id: `mock-project-${Date.now().toString(36)}`, name: "Untitled project" };
    state.current = await services.projects.resetProject({ project: seed, html: defaultSite() });
    state.history = [];
    state.future = [];
    state.lastAgentRun = null;
    els.messages.innerHTML = "";
    syncChatEmpty();
    els.address.textContent = "preview.bookandbuy.app";
    await services.commerce.reset({ projectId: state.current.id });
    clearCanvasSelection();
    renderCurrent();
    queueProjectDraftSave();
    setBuilderStatus("ready");
    showToast("Demo reset", { tone: "success" });
  } catch (error) {
    showToast(error?.message || "Couldn’t reset the mock workspace.", { tone: "error" });
  }
});

// Publish / share
$("#publishBtn").addEventListener("click", openPublish);
$("#closePublish").addEventListener("click", closePublish);
$("#cancelPublish").addEventListener("click", closePublish);
els.publishModal.addEventListener("click", event => { if (event.target === els.publishModal) closePublish(); });
els.publishConfirm.addEventListener("click", async () => {
  if (state.publishState === "loading") return;
  const slug = slugify(els.slugInput.value);
  els.slugInput.value = slug;
  state.publishState = "loading";
  setPublishInlineState("loading", "Checking your publishing connection…");
  setButtonLoading(els.publishConfirm, true, "Publishing");
  try {
    const result = await services.publishing.publish({ project: cloneData(state.current), slug });
    state.current.publishedUrl = result.url;
    els.address.textContent = result.url.replace(/^https?:\/\//, "");
    setPublishInlineState("success", "Your website is published.");
    queueProjectDraftSave();
    showToast("Site published", { tone: "success" });
    setTimeout(() => { if (!els.publishModal.classList.contains("hidden")) closePublish(); }, 720);
  } catch (error) {
    setPublishInlineState("error", error?.message || "The mock publish request failed.");
    showToast(error?.message || "Publishing failed", { tone: "error" });
  } finally {
    setButtonLoading(els.publishConfirm, false);
    if (state.publishState === "loading") state.publishState = "idle";
    syncGlobalActionStates();
  }
});
els.shareBtn.addEventListener("click", async () => {
  if (!state.current?.html) return showToast("Build a site first", { tone: "info" });
  setButtonLoading(els.shareBtn, true, "Sharing");
  try {
    const result = await services.publishing.createShareLink({ project: cloneData(state.current) });
    const copied = await copyTextToClipboard(result.url);
    showToast(
      copied ? (result.kind === "published" ? "Published link copied" : "Preview link copied") : "Share link created, but clipboard access is unavailable",
      { tone: copied ? "success" : "info" },
    );
  } catch (error) {
    showToast(error?.message || "Sharing is not connected yet. Use local preview to test your website.", { tone: "error" });
  } finally {
    setButtonLoading(els.shareBtn, false);
    syncGlobalActionStates();
  }
});

// Shortcuts modal and global keyboard
$("#closeShortcuts").addEventListener("click", closeShortcuts);
els.shortcutsModal.addEventListener("click", event => { if (event.target === els.shortcutsModal) closeShortcuts(); });

document.addEventListener("click", event => {
  if (!event.target.closest(".menu-anchor")) closeAllPopovers();
  if (!event.target.closest(".selection-toolbar")) closeToolbarMenus();
});

const MENU_BINDINGS = [
  [$("#projectSwitcher"), els.projectMenu],
  [$("#avatarBtn"), els.accountMenu],
  [$("#historyBtn"), els.historyPopover],
  [els.spacingSelectionBtn, els.spacingMenu],
  [els.moveSelectionBtn, els.moveMenu],
  [els.moreSelectionBtn, els.moreSelectionMenu],
];

function menuItems(menu) {
  if (!menu) return [];
  return $$('[role="menuitem"]:not(:disabled), .history-item:not(:disabled)', menu).filter(item => item.offsetParent !== null);
}

MENU_BINDINGS.forEach(([trigger, menu]) => {
  if (!trigger || !menu) return;
  trigger.addEventListener("keydown", event => {
    if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
    event.preventDefault();
    if (menu.classList.contains("hidden")) {
      if (menu === els.spacingMenu || menu === els.moveMenu || menu === els.moreSelectionMenu) toggleToolbarMenu(menu, trigger);
      else togglePopover(menu.id, true);
    }
    const items = menuItems(menu);
    (event.key === "ArrowUp" ? items.at(-1) : items[0])?.focus();
  });
  menu.addEventListener("keydown", event => {
    const items = menuItems(menu);
    if (!items.length) return;
    const index = Math.max(0, items.indexOf(document.activeElement));
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      items[(index + delta + items.length) % items.length]?.focus();
    } else if (event.key === "Home") { event.preventDefault(); items[0]?.focus(); }
    else if (event.key === "End") { event.preventDefault(); items.at(-1)?.focus(); }
    else if (event.key === "Escape") {
      event.preventDefault();
      if (menu === els.spacingMenu || menu === els.moveMenu || menu === els.moreSelectionMenu) closeToolbarMenus();
      else closeAllPopovers();
      trigger.focus({ preventScroll: true });
    }
  });
});

function getActiveModal() {
  return [els.publishModal, els.shortcutsModal, els.protectionModal, els.actionModal].find(modal => modal && !modal.classList.contains("hidden")) || null;
}

function trapModalFocus(event, modal) {
  if (event.key !== "Tab" || !modal) return false;
  const focusable = $$('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), [href], [tabindex]:not([tabindex="-1"])', modal)
    .filter(el => !el.classList.contains("hidden") && el.offsetParent !== null);
  if (!focusable.length) return false;
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); return true; }
  if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); return true; }
  return false;
}

document.addEventListener("keydown", (event) => {
  const modal = getActiveModal();
  if (trapModalFocus(event, modal)) return;
  const meta = event.ctrlKey || event.metaKey;
  const targetIsInput = ["INPUT","TEXTAREA"].includes(document.activeElement?.tagName);

  if (!targetIsInput && !modal && !meta) {
    const key = event.key.toLowerCase();
    if (key === "?") { event.preventDefault(); openShortcuts(); return; }
    if (key === "n") { event.preventDefault(); newProject(); return; }
    if (key === "r") { event.preventDefault(); renameProject(); return; }
    if (key === "d") { event.preventDefault(); duplicateProject(); return; }
  }

  if (meta && event.key.toLowerCase() === "z" && !targetIsInput) {
    event.preventDefault();
    if (event.shiftKey) redo(); else undo();
    return;
  }

  if (event.key === "Escape") {
    if (state.busy) { stopGeneration(); return; }
    if (!els.publishModal.classList.contains("hidden")) return closePublish();
    if (!els.shortcutsModal.classList.contains("hidden")) return closeShortcuts();
    if (!els.protectionModal.classList.contains("hidden")) return closeProtectionModal();
    if (!els.actionModal.classList.contains("hidden")) return resolveActionDialog(false);
    closeAllPopovers();
    closeToolbarMenus();
    if (state.inlineEdit) return cancelInlineEdit();
    clearCanvasSelection();
    return;
  }

  if (!targetIsInput && state.selectedId && event.key === "Enter") {
    event.preventDefault();
    startInlineEdit();
  }
  if (!targetIsInput && state.selectedId && (event.key === "Delete" || event.key === "Backspace")) {
    event.preventDefault();
    deleteSelection();
  }
});

hydrateIcons(document);

async function initializeBuilder() {
  // A saved project's assets are rehydrated by the project adapter before load.
  let restored = null;
  try { restored = await services.projects.loadDraft?.(); }
  catch (error) { showToast(error?.message || "Couldn’t restore your saved draft.", { tone: "error" }); }
  state.current = restored || { id: "local-project-seed", html: defaultSite(), files: null, assets: null, entryFile: "index.html", name: "Untitled project", prompt: "", publishedUrl: null, updatedAt: Date.now() };
  if (state.current.files) {
    state.current.html = compileSiteFiles(state.current.files, state.current.assets || {}, state.current.entryFile || "index.html");
    state.activeFile = state.current.entryFile || "index.html";
  }
  await window.BookBuyCommerce.ready();
  if (state.current.html) state.current.html = window.BookBuyCommerce.wireHtml(state.current.html, { allowRetired: true, draft: Boolean(state.current._validationIssues?.length) }).html;
  els.address.textContent = "Local preview";
  els.appShell.dataset.serviceMode = Object.values(services).every(adapter => String(adapter?.kind || "").startsWith("mock-")) ? "mock" : "connected";
  setCanvasMode("view", { announce: false });
  renderPromptHistory();
  renderCurrent();
  syncChatEmpty();
  syncMobileViewTabs();
  autoSizeComposer();
  syncComposerActionState();
  setBuilderStatus("ready");
  updateHistoryControls();
  window.dispatchEvent(new CustomEvent("BOOKBUY_BUILDER_READY", { detail: { restored: Boolean(restored), projectId: state.current.id } }));
  window.BookBuyBuilderReady = true;
  if (parent !== window) parent.postMessage({ source: 'bookbuy-builder-host', type: 'builder-ready', url: location.pathname + location.search }, location.origin);
}

initializeBuilder().catch(error => {
  if (parent !== window) parent.postMessage({ source: 'bookbuy-builder-host', type: 'builder-error', url: location.pathname + location.search }, location.origin);
  setBuilderStatus("error");
  showToast(error?.message || "The builder could not start. Reload to retry.", { tone: "error" });
});

window.addEventListener('bookbuy-ai-conversation-deleted', event => { state.promptHistory = []; state.promptHistoryIndex = -1; renderPromptHistory(); if (event.detail.current) { recoveredConversationGeneration++; els.messages.replaceChildren(); syncChatEmpty(); } });
