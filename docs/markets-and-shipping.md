# Markets and shipping

Markets and Shipping are separate owner settings. Legacy `servesCountries` is read non-destructively until the first market edit, then remains synchronized for directory compatibility. A specific country's disabled market overrides an enabled rest-of-world market. New countries and profiles start disabled.

Markets default to all products and services, including future additions. Selected mode supports complete products, individual variant IDs and complete services. Shipping profiles support all or selected products/variants, flat/free rates, optional inclusive free-shipping thresholds and delivery estimate copy. A specific profile overrides a general profile; multiple specific matches are rejected rather than priced ambiguously. Each used profile is charged once per order. The free threshold uses the merchandise subtotal, not services or shipping.

Public shops ask the buyer to select their country explicitly. This is not an IP-based or legally verified residency check. Product checkout collects a free-form delivery address; no address verification, carrier integration, labels, tax engine or calculated carrier rates are provided by this batch. Services do not require shipping.

Server booking creation enforces enabled markets and service availability. Product creation now uses published-business ownership, canonical product/variant prices, market eligibility, current stock checks, server shipping calculations and transactionally saved orders with retry receipts. Pending requests do not reserve inventory. Shipping settings do not change existing orders retroactively. Online payment totals use the saved order rather than caller-supplied amounts.

Order arrays join booking arrays as server-owned settings fields. Background workspace saves strip both, and the existing owner settings listener receives both. Owner/admin order updates use a revision-checked callable; manual payment marking is limited to cash and historical EFT. Failed production calls do not fall back to demo success. Deploy Functions and rules together after review; do not deploy the new UI with old Functions/rules. Production transactions, rules and payment-provider integration still need emulator/real-environment verification before release.

No changes are pushed or deployed by this batch. Local policy and price tests are in `tests/markets.test.mjs` and `tests/market-orders.test.mjs`.
