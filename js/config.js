/* https — storefront configuration.
   Leave shopDomain/storefrontToken empty to run on the local catalog (js/catalog.local.js)
   with a browser-only bag. Fill them in to read products and run the cart through Shopify. */
window.HTTPS_CONFIG = {
  shopDomain: 'xxzrk2-d5.myshopify.com',            // e.g. 'joinhttps.myshopify.com'
  storefrontToken: 'd02cacd323b210827723c4a6ee0cc6f6',       // Storefront API access token (public, read-only + cart)
  apiVersion: '2026-04',
  country: 'NL',
  language: 'EN',
  productsFirst: 50,
  featuredTag: 'featured'    // products with this tag lead the home page (falls back to the first two)
};
