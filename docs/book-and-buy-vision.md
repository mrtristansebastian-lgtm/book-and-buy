# Book and Buy — product vision

Last updated: 2026-08-06

This is the product north star. For screen-by-screen and backend detail, see [book-and-buy-ai-agent-handoff-map.md](./book-and-buy-ai-agent-handoff-map.md).

## Pillars

1. **Book** — Clients request and schedule services. Owners triage on Booking Requests and run the day on Schedule.
2. **Buy** — Clients order products on a public shop. Owners fulfil on Product Orders.
3. **Run the day** — One owner workspace for requests, orders, inbox, hours, payments, and shareable public links — without a heavy “schedule product” as the home.
4. **Your pages** — A guided Website builder and Social studio that publish one public site.

## Surfaces

### Public (customer)

| Route | Job |
|-------|-----|
| `/w/:slug` | Website home |
| `/w/:slug/book` (also `/book/:slug`) | Book a service |
| `/w/:slug/shop` (also `/shop/:slug`) | Buy products |
| `/w/:slug/social` | Social feed |

Same brand chrome. Clear nav between Home, Book, Shop, and Social when each page is enabled.

### Owner (dashboard)

| Area | Job |
|------|-----|
| Overview | Mission control — queues and share links, not fake analytics |
| Services | Catalog + Booking Requests |
| Schedule | Today’s board (hours settings stay light) |
| Products | Catalog + Orders |
| Website | Guided site builder + live preview + publish |
| Social | Post composer that publishes the public Social page |
| Support | Client threads |
| Finance | Stripe, Paystack (API keys), Manual EFT, Cash |
| Clients / Profile | People, team, brand basics |

## Design rules

- White surfaces, dark navy/black text, sharp typography.
- Native fill gradient only for active/selected/primary actions.
- Flush layouts; one job per section; cards only when they hold interaction.
- Period-style segmented toggles for Catalog/Requests and Catalog/Orders.
- Public website pages share header, loaders, errors, and CTA language — no third aesthetic.
- Website builder stays guided (sections + preview). Do not rebuild a free-form cinema theme editor.

## Do not rebuild (unless explicitly asked)

- Cinema Editor as a free-form drag canvas / theme labyrinth
- Payfast / Yoco
- Paystack bank Connect / subaccount platform fees
- Inventory enforcement and shipping rate engines (V1 notes only)
- Fake dashboard KPI walls
- Social network features (followers, DMs, algorithms)

## Naming

- User-facing product name: **Book and Buy**
- Legacy code/package/Firebase ids may still say `build-a-booking` until a deliberate infra rename
