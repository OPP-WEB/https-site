# https — site

Static front end (plain HTML/CSS/JS, no build step) with a thin store layer that can run on
**Shopify's Storefront API** or on a **local catalog** while the shop is not connected.

## Run locally

```bash
python3 -m http.server 8791 --directory .
```

## Pages

| file | what |
|---|---|
| `index.html` | signal → discovery → featured pieces (from catalog) → closing → map → join |
| `pieces.html` | all products, tile grid, grows with the catalog |
| `piece.html?handle=…` | one product: gallery, price, add to bag, specs, why-a-cap, closing line |
| `story.html` | the brand story; pieces grid at the end comes from the catalog |
| `bag.html` | cart lines, quantities, total, checkout |
| `the-01.html`, `the-02.html` | redirects kept for old links → `piece.html?handle=the-01` … |

## Store layer (`js/shop.js`)

`window.httpsShop` is the only thing pages talk to:

```
products()            → [product]
product(handle)       → product | null
featured(n)           → products tagged `featured` (falls back to the first n)
cart()                → { id, checkoutUrl, count, subtotal, lines[] }
add(variantId, qty)   → cart
setQuantity(lineId, qty) → cart   (qty 0 removes the line)
onChange(fn)          → called after every cart change
money({amount,currency}) → "€34,95"
pieceUrl(product)     → "piece.html?handle=…"
```

Both backends return the same product shape:

```
{ id, handle, title, subtitle, line, edition, colour, size, description,
  price:{amount,currency}, available, variantId, featured,
  images:[{url,alt}], specs:[[key,value],…] }
```

### Connecting Shopify

1. In Shopify admin install the **Headless** channel (or create a custom app with Storefront API
   access) and copy the **public Storefront access token**.
2. Fill `js/config.js`:
   ```js
   shopDomain: 'your-store.myshopify.com',
   storefrontToken: '…',
   ```
3. Products then come from Shopify; the bag becomes a Shopify cart and **Checkout →** opens
   Shopify's checkout (`cart.checkoutUrl`). While a Shopify product is still incomplete, any empty
   field (images, subtitle, specs, description) is borrowed from the entry with the same handle in
   `js/catalog.local.js`. Price and availability always come from Shopify.

Product content the design expects, as **product metafields** (Settings → Custom data → Products). Namespace `https` is preferred, but Shopify's default `custom` namespace works too:

| key | type | example |
|---|---|---|
| `subtitle` | single line text | `Distressed cap` |
| `line` | single line text | `The first connection.` |
| `edition` | single line text | `First production` |
| `colour` | single line text | `Charcoal` |
| `size` | single line text | `one size` |
| `specs` | multi-line text (or JSON) | one per line: `finish: distressed washed` |

Image **alt text** is used as the gallery caption (`front`, `side`, `buckle`, …).
Tag a product `featured` to lead the home page (first two featured products are shown).

### Adding a product before Shopify is connected

Add an entry to `js/catalog.local.js`. No page needs to change.

## Not wired yet

- **Join form** (`index.html`): stores the address in the browser only. Point it at Shopify
  customer capture (or Klaviyo/Mailchimp) when ready.
- **Map**: loads `d3` + `topojson` from unpkg and world-atlas from jsDelivr at runtime.
