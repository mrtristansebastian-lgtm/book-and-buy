# Book and Buy

Greenfield rebuild of the Book and Buy owner workspace and public pages.

## Stack

- React 18 + Vite + TypeScript + Tailwind
- Firebase (Auth, Firestore, Storage, Functions)
- Exact native accent gradient system under `src/design/`

## Develop

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`

- Auth entry: `#/`
- Owner workspace: `#/dashboard/overview`
- Demo public site: `#/demo` or `#/w/flour-and-flame`

## Rebuild phases

1. Foundation + shells — done
2. Book pillar — done (demo workspace state)
3. Buy pillar — Products catalog/orders, public Buy cart/checkout — done
4. E-Business Platform — Pages + Social studios, Home/Book/Buy/Social — done
5. Run — Support, Clients, Profile/Team, Finance gateways — done
6. Hardening — onboarding, client portal, health/smoke, Capacitor config stub — done

See `docs/book-and-buy-vision.md`.

## Checks

```bash
npm run health
npm run smoke
```

Capacitor config is ready (`capacitor.config.json`); add native projects later with `npx cap add android|ios` after `npm run build`.

## Try Book + Buy + E-Business Platform

- `#/` — auth entry
- `#/onboarding` — create workspace wizard
- `#/portal` — client portal lookup
- `#/demo` — Flour & Flame public demo
- `#/dashboard/services` — Catalog | Requests + manual booking
- `#/dashboard/staff` — Schedule day board
- `#/dashboard/products` — Catalog | Orders
- `#/dashboard/website` — E-Business Platform page studio
- `#/dashboard/social` — Social studio
- `#/dashboard/communications` — Support inbox
- `#/dashboard/finance` — Stripe / Paystack / EFT / Cash
- `#/dashboard/clients` — Client directory
- `#/dashboard/profile` — Account, team, notifications
- `#/w/flour-and-flame` — public Home
- `#/w/flour-and-flame/book` — Book
- `#/w/flour-and-flame/buy` — Buy (`/shop` still aliases)
- `#/w/flour-and-flame/social` — Social

