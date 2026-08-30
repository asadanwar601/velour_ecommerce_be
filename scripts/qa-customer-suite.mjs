/**
 * QA AUTOMATION SUITE: CUSTOMER & PUBLIC USER WORKFLOWS
 * Enforces production-qa-testing skill standard (< 250 LOC).
 */

export async function runCustomerQASuite(apiBase, webBase, logAssert, adminFixtures) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('🛍️ [SUITE 2/2] CUSTOMER JOURNEY & STOREFRONT FORMS');
  console.log('═══════════════════════════════════════════════════');

  const { testProdId, testCouponCode } = adminFixtures;

  // 1. Storefront Catalogue Browsing
  const prodsRes = await fetch(`${apiBase}/products?category=women`);
  logAssert(prodsRes.status === 200, 'Customer PLP Catalogue browsing: GET /products?category=women');
  const prodsData = await prodsRes.json();
  const productsList = prodsData.data?.products || prodsData.products || prodsData.data || [];
  logAssert(Array.isArray(productsList) && productsList.length > 0, 'Customer Catalog contains active garments');

  // 2. Product Detail Page & Sizing Lookup
  const targetId = testProdId || productsList[0]?.id;
  const prodDetailRes = await fetch(`${apiBase}/products/${targetId}`);
  logAssert(prodDetailRes.status === 200, `Customer PDP View: GET /products/${targetId}`);
  const prodDetailData = await prodDetailRes.json();
  const product = prodDetailData.data || prodDetailData;
  logAssert(product.name && typeof product.price === 'number', 'Product detail has structured title and numeric price');

  // 3. Faceted Filter Query
  const facetsRes = await fetch(`${apiBase}/products/facets?category=women`);
  logAssert(facetsRes.status === 200, 'Customer Facets & Taxonomy Query: GET /products/facets');

  // 4. Promo Coupon Validation Form
  const couponCheckCode = testCouponCode || 'WELCOME10';
  const couponValidateRes = await fetch(`${apiBase}/coupons/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: couponCheckCode, orderTotal: 500 }),
  });
  logAssert(couponValidateRes.status === 200 || couponValidateRes.status === 201, `Customer Coupon Validation: ${couponCheckCode}`);

  // 5. Checkout & Order Placement Form Submission
  const orderNumber = `QA-ORD-${Date.now()}`;
  const checkoutRes = await fetch(`${apiBase}/orders/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderNumber,
      contactName: 'Elena Rostova',
      contactEmail: 'customer@velour.com',
      contactPhone: '+15550003344',
      promoCode: couponCheckCode,
      giftPackaging: true,
      giftNote: 'Automated QA verification delivery.',
      shippingAddress: {
        line1: '742 Evergreen Terrace',
        city: 'New York',
        state: 'NY',
        zip: '10001',
        country: 'US',
      },
      items: [
        {
          productId: targetId,
          size: 'M',
          quantity: 1,
          price: product.price || 495.0,
        },
      ],
    }),
  });
  logAssert(checkoutRes.status === 200 || checkoutRes.status === 201, 'Customer Checkout & Order Form submission: POST /orders/checkout');
  const checkoutData = await checkoutRes.json();
  const createdOrder = checkoutData.data || checkoutData;
  logAssert(createdOrder.orderNumber === orderNumber || !!createdOrder.id, 'Checkout confirmed with generated Order ID');

  // 6. Order Tracking Lookup Form
  const trackRes = await fetch(`${apiBase}/orders/tracking/${createdOrder.id || orderNumber}`);
  logAssert(trackRes.status === 200, 'Customer Order Live Tracking Lookup: GET /orders/tracking/:id');

  // 7. Product Review & Rating Form Submission
  const reviewRes = await fetch(`${apiBase}/reviews`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      productId: targetId,
      userName: 'Elena R.',
      rating: 5,
      title: 'Exquisite Drapery and Weight',
      comment: 'The cashmere is extraordinarily soft and conforms naturally to winter layering.',
      fitRating: 'TRUE_TO_SIZE',
      isVerifiedPurchase: true,
    }),
  });
  logAssert(reviewRes.status === 201 || reviewRes.status === 200, 'Customer Product Review Form submission: POST /reviews');

  // 8. Public Dynamic CMS Pages Health
  const aboutCmsRes = await fetch(`${apiBase}/cms/about`);
  logAssert(aboutCmsRes.status === 200, 'Public About Us Dynamic CMS verification');

  const contactCmsRes = await fetch(`${apiBase}/cms/contact`);
  logAssert(contactCmsRes.status === 200, 'Public Contact Us & Concierge CMS verification');

  // 9. Frontend Route Health (if web base is accessible)
  if (webBase) {
    const webRoutes = ['/', '/about', '/contact', '/login', '/women', '/men'];
    for (const r of webRoutes) {
      try {
        const pageRes = await fetch(`${webBase}${r}`, { redirect: 'manual' });
        logAssert(pageRes.status === 200 || pageRes.status === 307 || pageRes.status === 302, `Storefront Route Health: ${r} (${pageRes.status})`);
      } catch {
        // Local web server might be optional if testing API directly
      }
    }
  }
}
