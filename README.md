# Restaurant & Café Suite (demo)

Interactive demo of an ordering suite for cafés, restaurants and bars, served at
https://cictnardc.net/portfolio/restaurant-suite/. English, French and Arabic.

| Screen | File | What it does |
| --- | --- | --- |
| Demo page | `index.html` | Every screen side by side, billing mode, simulated busy service |
| Waiter tablet | `waiter.html` | Floor plan, alerts, orders with modifiers and notes |
| Station screen | `station.html?station=kitchen\|coffee\|bar` | Each station sees only its items; start, ready, recall |
| Cashier | `cashier.html` | Bills, split by item or equally, card or cash, invoice journal, day report |
| Guest menu | `menu.html?table=4` | What the QR code on a table opens |

## How it runs

Plain HTML, CSS and JavaScript, no build step. The shared state lives in
localStorage and changes reach other tabs and frames through a BroadcastChannel
(`js/store.js`). In the real system the same state lives on the venue's server
(ASP.NET Core, PostgreSQL) and the same change events go out over SignalR, so the
screens do not change, only the transport.

## Billing modes, one data model

`js/invoice.js` builds every bill the same way (sequence number, VAT per line from
VAT-inclusive prices, UBL 2.1 structure) and only the last step depends on the mode:

- **register**: the venue's existing compliant POS prints the tax receipt; the suite keeps the bill.
- **provider**: the invoice goes to an e-invoicing provider's API, which signs and reports it to ZATCA.
- **zatca**: the suite is the onboarded device: invoice counter (ICV), previous invoice hash (PIH),
  hash, signature, QR code (TLV tags 1 to 8), reporting to Fatoora within 24 hours.

A venue can move from one mode to another without losing history. In the demo the
signing key is made in the browser (P-256 standing in for ZATCA's secp256k1), there is
no X.509 CSID, and nothing is sent anywhere: receipts are marked as demo.

Sample venue, VAT number (ZATCA's test number) and data are invented.

## Local preview

    python3 -m http.server 8000   # then open http://localhost:8000/

Arabic uses IBM Plex Sans Arabic, served from `/portfolio/assets/fonts/` on the site.
`vendor/qrcode.js` is qrcode-generator by Kazuhiko Arase (MIT).
