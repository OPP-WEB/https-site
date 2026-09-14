/* https — store layer.
   window.httpsShop exposes one API over two backends:
     - shopify: Storefront API (products + cart + checkoutUrl)
     - local:   js/catalog.local.js + a browser-only bag (no checkout)
   Product shape (both backends):
     { id, handle, title, subtitle, line, edition, colour, size, description,
       price:{amount:Number,currency}, available, variantId, featured, images:[{url,alt}], specs:[[k,v]] }
   Cart shape:
     { id, checkoutUrl, count, subtotal:{amount,currency},
       lines:[{ id, quantity, variantId, price:{amount,currency}, product:{handle,title,image,subtitle} }] } */
(function () {
  var cfg = window.HTTPS_CONFIG || {};
  var useShopify = !!(cfg.shopDomain && cfg.storefrontToken);
  var listeners = [];
  function emit() { listeners.forEach(function (fn) { try { fn(); } catch (e) {} }); window.dispatchEvent(new Event('https-cart')); }

  var SYMBOL = { EUR: '€', USD: '$', GBP: '£' };
  function money(m) {
    if (!m) return '';
    var sym = SYMBOL[m.currency] || (m.currency + ' ');
    return sym + Number(m.amount).toFixed(2).replace('.', ',');
  }

  /* ---------------- Shopify backend ---------------- */
  var PRODUCT_FIELDS = '\n    id handle title description availableForSale tags\n    featuredImage { url altText }\n    images(first: 20) { nodes { url altText } }\n    priceRange { minVariantPrice { amount currencyCode } }\n    variants(first: 20) { nodes { id title availableForSale price { amount currencyCode } selectedOptions { name value } } }\n    metafields(identifiers: [\n      {namespace: "https", key: "subtitle"}, {namespace: "https", key: "line"}, {namespace: "https", key: "edition"},\n      {namespace: "https", key: "colour"}, {namespace: "https", key: "size"}, {namespace: "https", key: "specs"},\n      {namespace: "custom", key: "subtitle"}, {namespace: "custom", key: "line"}, {namespace: "custom", key: "edition"},\n      {namespace: "custom", key: "colour"}, {namespace: "custom", key: "size"}, {namespace: "custom", key: "specs"}\n    ]) { namespace key value }\n  ';
  var CART_FIELDS = '\n    id checkoutUrl totalQuantity\n    cost { subtotalAmount { amount currencyCode } }\n    lines(first: 100) { nodes { id quantity\n      merchandise { ... on ProductVariant { id title price { amount currencyCode }\n        product { handle title featuredImage { url altText } sub: metafield(namespace: "https", key: "subtitle") { value } sub2: metafield(namespace: "custom", key: "subtitle") { value } } } } } }\n  ';

  async function gql(query, variables) {
    var res = await fetch('https://' + cfg.shopDomain + '/api/' + (cfg.apiVersion || '2026-04') + '/graphql.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': cfg.storefrontToken },
      body: JSON.stringify({ query: query, variables: variables || {} })
    });
    var json = await res.json();
    if (json.errors) throw new Error(json.errors.map(function (e) { return e.message; }).join('; '));
    return json.data;
  }
  function meta(node, key) {
    var all = (node.metafields || []).filter(function (x) { return x && x.key === key && x.value; });
    var m = all.find(function (x) { return x.namespace === 'https'; }) || all[0];
    return m ? m.value : '';
  }
  // specs: JSON [["key","value"],…] or plain lines "key: value" / "key — value"
  function parseSpecs(raw) {
    if (!raw) return [];
    try { var j = JSON.parse(raw); if (Array.isArray(j)) return j.map(function (r) { return Array.isArray(r) ? [String(r[0]), String(r[1])] : [String(r.key || r.name || ''), String(r.value || '')]; }); } catch (e) {}
    return raw.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean).map(function (l) {
      var m = l.match(/^([^:—–-]+?)\s*[:—–-]\s*(.+)$/);
      return m ? [m[1].trim(), m[2].trim()] : ['', l];
    });
  }
  // caption fallback when Shopify alt text is empty: match the upload's file name against the local
  // catalog (e.g. ".../04_back_<hash>.png" ↔ "assets/the-01/04_back.png"), else the same position
  function localCaption(url, local, i) {
    var imgs = local.images || [];
    var file = decodeURIComponent((url.split('?')[0].split('/').pop() || '')).toLowerCase();
    var hit = imgs.find(function (li) {
      var stem = (li.url.split('/').pop() || '').replace(/\.[a-z0-9]+$/i, '').toLowerCase();
      return stem && file.indexOf(stem) === 0;
    });
    return hit ? hit.alt : (imgs[i] ? imgs[i].alt : '');
  }
  function normalizeProduct(n) {
    var variant = (n.variants.nodes.find(function (v) { return v.availableForSale; }) || n.variants.nodes[0]) || null;
    var specs = parseSpecs(meta(n, 'specs'));
    var images = n.images.nodes.map(function (i) { return { url: i.url, alt: i.altText || '' }; });
    if (!images.length && n.featuredImage) images = [{ url: n.featuredImage.url, alt: n.featuredImage.altText || '' }];
    var price = variant ? variant.price : n.priceRange.minVariantPrice;
    // while a product is still being filled in on Shopify, borrow copy/images from the local catalog (same handle)
    var local = (window.HTTPS_LOCAL_CATALOG || []).find(function (l) { return l.handle === n.handle; }) || {};
    return {
      id: n.id, handle: n.handle, title: n.title || local.title,
      subtitle: meta(n, 'subtitle') || local.subtitle || '', line: meta(n, 'line') || local.line || '', edition: meta(n, 'edition') || local.edition || '',
      colour: meta(n, 'colour') || local.colour || '',
      size: meta(n, 'size') || (variant && variant.title !== 'Default Title' ? variant.title : (local.size || 'one size')),
      description: n.description || local.description || '',
      price: { amount: Number(price.amount), currency: price.currencyCode },
      available: !!(variant && variant.availableForSale) && n.availableForSale,
      variantId: variant ? variant.id : null,
      featured: (n.tags || []).indexOf(cfg.featuredTag || 'featured') !== -1 || !!local.featured,
      images: images.length ? images.map(function (im, i) { return { url: im.url, alt: im.alt || localCaption(im.url, local, i) }; }) : (local.images || []),
      specs: specs.length ? specs : (local.specs || [])
    };
  }
  function normalizeCart(c) {
    if (!c) return emptyCart();
    return {
      id: c.id, checkoutUrl: c.checkoutUrl, count: c.totalQuantity,
      subtotal: { amount: Number(c.cost.subtotalAmount.amount), currency: c.cost.subtotalAmount.currencyCode },
      lines: c.lines.nodes.map(function (l) {
        var v = l.merchandise, p = v.product;
        var local = (window.HTTPS_LOCAL_CATALOG || []).find(function (x) { return x.handle === p.handle; }) || {};
        return { id: l.id, quantity: l.quantity, variantId: v.id,
          price: { amount: Number(v.price.amount), currency: v.price.currencyCode },
          product: { handle: p.handle, title: p.title, subtitle: (p.sub && p.sub.value) || (p.sub2 && p.sub2.value) || local.subtitle || '', image: p.featuredImage ? p.featuredImage.url : (local.images && local.images[0] ? local.images[0].url : '') } };
      })
    };
  }
  function emptyCart() { return { id: null, checkoutUrl: null, count: 0, subtotal: { amount: 0, currency: 'EUR' }, lines: [] }; }

  var shopify = {
    name: 'shopify',
    _products: null,
    _cart: null,
    async products() {
      if (this._products) return this._products;
      var d = await gql('query Products($first: Int!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) { products(first: $first, sortKey: CREATED_AT) { nodes {' + PRODUCT_FIELDS + '} } }',
        { first: cfg.productsFirst || 50, country: cfg.country || 'NL', language: cfg.language || 'EN' });
      this._products = d.products.nodes.map(normalizeProduct);
      return this._products;
    },
    async product(handle) {
      var d = await gql('query Product($handle: String!, $country: CountryCode, $language: LanguageCode) @inContext(country: $country, language: $language) { product(handle: $handle) {' + PRODUCT_FIELDS + '} }',
        { handle: handle, country: cfg.country || 'NL', language: cfg.language || 'EN' });
      return d.product ? normalizeProduct(d.product) : null;
    },
    async cart() {
      if (this._cart) return this._cart;
      var id = null; try { id = localStorage.getItem('https_cart_id'); } catch (e) {}
      if (!id) return (this._cart = emptyCart());
      var d = await gql('query Cart($id: ID!) { cart(id: $id) {' + CART_FIELDS + '} }', { id: id });
      if (!d.cart) { try { localStorage.removeItem('https_cart_id'); } catch (e) {} return (this._cart = emptyCart()); }
      return (this._cart = normalizeCart(d.cart));
    },
    _store(cart) { this._cart = cart; try { if (cart.id) localStorage.setItem('https_cart_id', cart.id); else localStorage.removeItem('https_cart_id'); } catch (e) {} emit(); return cart; },
    async add(variantId, qty) {
      var cart = await this.cart();
      var lines = [{ merchandiseId: variantId, quantity: qty || 1 }];
      var d;
      if (!cart.id) {
        d = await gql('mutation CartCreate($lines: [CartLineInput!]) { cartCreate(input: { lines: $lines }) { cart {' + CART_FIELDS + '} userErrors { message } } }', { lines: lines });
        return this._store(normalizeCart(d.cartCreate.cart));
      }
      d = await gql('mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) { cartLinesAdd(cartId: $cartId, lines: $lines) { cart {' + CART_FIELDS + '} userErrors { message } } }', { cartId: cart.id, lines: lines });
      return this._store(normalizeCart(d.cartLinesAdd.cart));
    },
    async setQuantity(lineId, qty) {
      var cart = await this.cart(); if (!cart.id) return cart;
      var d;
      if (qty <= 0) {
        d = await gql('mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) { cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart {' + CART_FIELDS + '} userErrors { message } } }', { cartId: cart.id, lineIds: [lineId] });
        return this._store(normalizeCart(d.cartLinesRemove.cart));
      }
      d = await gql('mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: $cartId, lines: $lines) { cart {' + CART_FIELDS + '} userErrors { message } } }', { cartId: cart.id, lines: [{ id: lineId, quantity: qty }] });
      return this._store(normalizeCart(d.cartLinesUpdate.cart));
    }
  };

  /* ---------------- Local backend ---------------- */
  var LOCAL_KEY = 'https_bag';
  var local = {
    name: 'local',
    async products() { return (window.HTTPS_LOCAL_CATALOG || []).slice(); },
    async product(handle) { return (window.HTTPS_LOCAL_CATALOG || []).find(function (p) { return p.handle === handle; }) || null; },
    _read() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || '{}'); } catch (e) { return {}; } },
    _write(o) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(o)); } catch (e) {} emit(); },
    async cart() {
      var o = this._read(), products = await this.products(), lines = [], count = 0, total = 0, cur = 'EUR';
      Object.keys(o).forEach(function (vid) {
        var p = products.find(function (x) { return x.variantId === vid; }); if (!p || !o[vid]) return;
        lines.push({ id: vid, quantity: o[vid], variantId: vid, price: p.price,
          product: { handle: p.handle, title: p.title, subtitle: p.subtitle, image: p.images[0] ? p.images[0].url : '' } });
        count += o[vid]; total += p.price.amount * o[vid]; cur = p.price.currency;
      });
      return { id: 'local', checkoutUrl: null, count: count, subtotal: { amount: total, currency: cur }, lines: lines };
    },
    async add(variantId, qty) { var o = this._read(); o[variantId] = (o[variantId] || 0) + (qty || 1); this._write(o); return this.cart(); },
    async setQuantity(lineId, qty) { var o = this._read(); if (qty <= 0) delete o[lineId]; else o[lineId] = qty; this._write(o); return this.cart(); }
  };

  var backend = useShopify ? shopify : local;
  window.addEventListener('storage', function (e) { if (e.key === LOCAL_KEY || e.key === 'https_cart_id') { if (backend._cart) backend._cart = null; emit(); } });

  window.httpsShop = {
    mode: backend.name,
    money: money,
    products: function () { return backend.products(); },
    product: function (h) { return backend.product(h); },
    featured: async function (n) {
      var all = await backend.products();
      var f = all.filter(function (p) { return p.featured; });
      return (f.length ? f : all).slice(0, n || 2);
    },
    cart: function () { return backend.cart(); },
    add: function (variantId, qty) { return backend.add(variantId, qty); },
    setQuantity: function (lineId, qty) { return backend.setQuantity(lineId, qty); },
    onChange: function (fn) { listeners.push(fn); },
    pieceUrl: function (p) { return 'piece.html?handle=' + encodeURIComponent(p.handle); }
  };
})();
