/**
 * QA AUTOMATION SUITE: ADMIN WORKFLOWS
 * Enforces production-qa-testing skill standard (< 250 LOC).
 */

export async function runAdminQASuite(apiBase, logAssert) {
  console.log('\n═══════════════════════════════════════════════════');
  console.log('👑 [SUITE 1/2] ADMIN WORKFLOWS & FORM SUBMISSIONS');
  console.log('═══════════════════════════════════════════════════');

  // 1. Admin Authentication
  const loginRes = await fetch(`${apiBase}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@velour.com', password: 'VelourAdmin2026!' }),
  });
  logAssert(loginRes.status === 200, 'Admin Login credentials authenticated');
  const loginData = await loginRes.json();
  const token = loginData.data?.accessToken || loginData.accessToken;
  logAssert(!!token, 'Admin Bearer JWT token issued');
  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // 2. Admin Category Form Submission
  const testCatSlug = `qa-test-cat-${Date.now()}`;
  const catRes = await fetch(`${apiBase}/categories`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      name: 'QA Atelier Collection',
      parent: 'WOMEN',
      slug: testCatSlug,
      description: 'Automated test luxury collection category',
    }),
  });
  logAssert(catRes.status === 201 || catRes.status === 200, 'Admin Category Form submission: POST /categories (201)');
  const catData = await catRes.json();
  const createdCat = catData.data?.category || catData.category || catData.data;

  // 3. Admin Subcategory Form Submission
  const subcatRes = await fetch(`${apiBase}/categories/women/subcategories`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ name: `QA Silk Scarves ${Date.now()}` }),
  });
  logAssert(subcatRes.status === 201 || subcatRes.status === 200, 'Admin Subcategory Form submission: POST /categories/women/subcategories');
  const subcatData = await subcatRes.json();
  const createdSubcat = subcatData.data?.category || subcatData.category || subcatData.data;

  // 4. Admin Product Creation Form Submission
  const testProdId = `qa-test-garment-${Date.now()}`;
  const prodRes = await fetch(`${apiBase}/products`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      id: testProdId,
      name: 'QA Handcrafted Cashmere Overcoat',
      category: 'WOMEN',
      subcategory: 'Outerwear',
      price: 495.0,
      compareAtPrice: 595.0,
      description: 'Test garment crafted for end-to-end automated QA audit.',
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['Charcoal', 'Oatmeal'],
      materials: '100% Grade-A Mongolian Cashmere',
      images: [
        'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=1000&q=80',
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1000&q=80',
      ],
      tags: ['Featured on Homepage', 'QA Verified'],
      featured: true,
      initialStock: 30,
    }),
  });
  logAssert(prodRes.status === 201, 'Admin Product Form submission: POST /products (201 Created)');
  const prodData = await prodRes.json();
  const createdProduct = prodData.data || prodData;
  logAssert(createdProduct.id === testProdId, 'Admin Product ID verified in database response');

  // 5. Admin Product Update Form Submission
  const updateRes = await fetch(`${apiBase}/products/${testProdId}`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      price: 520.0,
      trending: true,
    }),
  });
  logAssert(updateRes.status === 200, 'Admin Product Edit Form submission: PATCH /products/:id (200 OK)');

  // 6. Admin Inventory Stock Adjustment Form Submission
  const invAdjustRes = await fetch(`${apiBase}/inventory/adjust`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      productId: testProdId,
      quantityDelta: 10,
      reason: 'QA Restock verification adjustment',
    }),
  });
  logAssert(invAdjustRes.status === 200 || invAdjustRes.status === 201, 'Admin Inventory Adjustment: POST /inventory/adjust');

  // 7. Admin Coupon Creation & Validation
  const testCouponCode = `QA${Math.floor(1000 + Math.random() * 9000)}`;
  const couponRes = await fetch(`${apiBase}/coupons/admin`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      code: testCouponCode,
      discountType: 'PERCENTAGE',
      discountValue: 15.0,
      minOrderValue: 100.0,
      description: 'QA Promotional Discount Test',
    }),
  });
  logAssert(couponRes.status === 201 || couponRes.status === 200, `Admin Coupon Form submission: Created ${testCouponCode}`);

  // 8. Admin Brand Settings Form Submission
  const brandPatchRes = await fetch(`${apiBase}/settings/brand`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      brandName: 'VELOUR',
      freeShippingThreshold: 75.0,
      announcementBarText: 'Complimentary Global Express Delivery on All Orders Over $75',
      announcementBarActive: true,
    }),
  });
  logAssert(brandPatchRes.status === 200, 'Admin Brand Settings Form: PATCH /settings/brand (200 OK)');

  // 9. Admin CMS About Us Form Submission
  const cmsAboutPatchRes = await fetch(`${apiBase}/cms/about`, {
    method: 'PATCH',
    headers: authHeaders,
    body: JSON.stringify({
      heroTitle: 'Timeless Tailoring & Sustainable Fiber Craft',
      storyHtml: '<p>Every Velour piece is individually measured, hand-cut, and tailored.</p>',
    }),
  });
  logAssert(cmsAboutPatchRes.status === 200, 'Admin CMS Story Editor Form: PATCH /cms/about (200 OK)');

  // 10. Admin User Accounts List & Filter Audit
  const usersListRes = await fetch(`${apiBase}/admin/users?role=ALL`, {
    headers: authHeaders,
  });
  logAssert(usersListRes.status === 200, 'Admin User Management Directory: GET /admin/users (200 OK)');

  return { testProdId, createdCatId: createdCat?.id, createdSubcatId: createdSubcat?.id, testCouponCode };
}
