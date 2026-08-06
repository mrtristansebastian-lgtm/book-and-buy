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
3. Buy pillar — Products catalog/orders, public shop cart/checkout — done (demo workspace state)
4. Website + Social studios
5. Support, finance, clients, payments
6. Hardening / mobile

See `docs/book-and-buy-vision.md`.

## Try Book + Buy

- `#/dashboard/services` — Catalog | Requests + manual booking
- `#/dashboard/staff` — Schedule day board
- `#/dashboard/products` — Catalog | Orders
- `#/w/flour-and-flame/book` — public booking flow
- `#/w/flour-and-flame/shop` — public storefront cart/checkout

