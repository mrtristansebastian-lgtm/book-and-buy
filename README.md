# Book and Buy

Greenfield rebuild of the Book and Buy owner workspace and public pages.

## Stack

- React 18 + Vite + TypeScript + Tailwind
- Firebase (Auth, Firestore, Storage, Functions) — optional until `.env.local` is set
- Exact native accent gradient system under `src/design/`

## Develop

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`

- Auth entry: `#/`
- Owner workspace: `#/dashboard/overview`
- Demo owner dashboard: `#/demo` (Flour & Flame)
- Public demo site: `#/w/flour-and-flame`

Without `VITE_FIREBASE_CONFIG`, the app runs in **local mode** (localStorage workspace + demo). Copy `.env.example` to `.env.local` and paste your Firebase web config JSON to enable Auth, Firestore public slug load, and callable helpers under `src/shared/firebase/`.

## Rebuild phases

1. Foundation + shells — done
2. Book pillar — done
3. Buy pillar — done
4. E-Business Platform — done
5. Run — Support, Clients, Profile/Team, Finance — done
6. Hardening — onboarding, client portal, health/smoke, Capacitor stub — done
7. Pro section depth — demo → dashboard, write-through persist, Overview/Book/Buy/E-Business/Run polish — done
8. Live E-Business studio — shared public renderer, polished Home/Book/Buy/Social, Shopify-style live device mockups — done
9. Inline E-Business editor — View/Edit on-canvas editing, rich Home (about/why/venue/map/reviews), section tray — done
10. Firebase track — Storage image upload (with local fallback), Firestore publish on Publish, Google Calendar link after booking, Places Place ID + import stub; full Places callable still needs API key deploy

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
- `#/demo` — Flour & Flame **owner dashboard**
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
