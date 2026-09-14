/* https — storefront configuration.
   Leave shopDomain/storefrontToken empty to run on the local catalog (js/catalog.local.js)
   with a browser-only bag. Fill them in to read products and run the cart through Shopify. */
window.HTTPS_CONFIG = {
  shopDomain: '',            // e.g. 'joinhttps.myshopify.com'
  storefrontToken: '',       // Storefront API access token (public, read-only + cart)
  apiVersion: '2026-04',
  country: 'NL',
  language: 'EN',
  productsFirst: 50,
  featuredTag: 'featured'    // products with this tag lead the home page (falls back to the first two)
};
