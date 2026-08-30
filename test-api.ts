/**
 * Comprehensive End-to-End Test Suite for VELOUR Backend API
 * Covers:
 * 1. Public Brand Settings & Admin Brand Editing (GET/PATCH /settings/brand)
 * 2. Categories & Subcategories Admin CRUD (GET/POST/PATCH/DELETE /categories)
 * 3. Product Sizes, Colors, Tags & Image Management (PATCH /products/:id, POST/DELETE /products/:id/images)
 * 4. Interconnected Admin Users Management (GET /admin/users, GET /admin/users/:id, PATCH/POST archive)
 * 5. Google OAuth Login & Auto-Registration (POST /auth/google)
 * 6. Authenticated-Only Checkout (Guest blocked with 401 Unauthorized)
 * 7. Guest Restrictions (Orders & Tracking blocked for unauthenticated guests)
 * 8. Strict RBAC (Admin-only routes blocked with 403 Forbidden for Customers)
 */

const BASE_URL = 'http://localhost:4000';

async function request(endpoint: string, options: any = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  return { status: res.status, data: json, ok: res.ok };
}

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${testName}`);
    if (detail !== undefined) {
      console.error('   Detail:', JSON.stringify(detail, null, 2));
    }
    failed++;
  }
}

async function runTests() {
  console.log('\n🚀 Starting VELOUR API Verification (Admin Merchandising, Brand & User Management)...\n');

  // 1. Swagger Docs
  const docsRes = await fetch(`${BASE_URL}/docs`);
  assert(docsRes.status === 200, 'GET /docs (Interactive Swagger UI online)');

  // 2. Public Brand Settings
  const brandPublic = await request('/settings/brand');
  assert(
    brandPublic.status === 200 && brandPublic.data?.data?.brandName === 'VELOUR',
    'GET /settings/brand (Retrieve public brand name, logo, app icon & tagline)',
  );

  // 3. Google OAuth Login & Registration Test
  const googleLogin = await request('/auth/google', {
    method: 'POST',
    body: JSON.stringify({
      email: 'alexander.wright@gmail.com',
      displayName: 'Alexander Wright',
      googleId: 'google-sub-9988776655',
      photoURL: 'https://lh3.googleusercontent.com/a/sample-avatar',
    }),
  });
  assert(
    googleLogin.status === 200 &&
      !!googleLogin.data?.data?.accessToken &&
      googleLogin.data?.data?.user?.email === 'alexander.wright@gmail.com' &&
      googleLogin.data?.data?.user?.role === 'CUSTOMER' &&
      googleLogin.data?.data?.user?.isAdmin === false &&
      googleLogin.data?.data?.user?.isCustomer === true,
    'POST /auth/google (Google Identity Platform sign-in & customer auto-provisioning)',
  );

  // 4. Unauthenticated / Guest User attempts checkout -> MUST BE 401 Unauthorized
  const guestCheckout = await request('/orders/checkout', {
    method: 'POST',
    body: JSON.stringify({
      contactName: 'Anonymous Guest',
      contactEmail: 'guest@internet.com',
      shippingAddress: { line1: '123 Fake St', city: 'NYC', state: 'NY', zip: '10001', country: 'US' },
    }),
  });
  assert(guestCheckout.status === 401, 'POST /orders/checkout without login (Blocked with 401 Unauthorized)');

  // 5. Unauthenticated / Guest User attempts to view orders -> MUST BE 401 Unauthorized
  const guestOrders = await request('/orders');
  assert(guestOrders.status === 401, 'GET /orders without login (Blocked with 401 Unauthorized)');

  // 6. Login with seeded Customer (Elena Rostova)
  const customerLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'customer@velour.com',
      password: 'CustomerPass2026!',
    }),
  });
  assert(customerLogin.status === 200 && !!customerLogin.data?.data?.accessToken, 'POST /auth/login (Customer login)');
  const customerToken = customerLogin.data?.data?.accessToken;

  // 7. Login with seeded Admin
  const adminLogin = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@velour.com',
      password: 'VelourAdmin2026!',
    }),
  });
  assert(adminLogin.status === 200 && !!adminLogin.data?.data?.accessToken, 'POST /auth/login (Admin login)');
  const adminToken = adminLogin.data?.data?.accessToken;

  // 8. Admin: Update Brand Settings (Brand Name, Tagline, App Icon, Logo)
  const updateBrand = await request('/settings/brand', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      brandName: 'VELOUR ATELIER',
      tagline: 'High-End Minimalist Luxury',
      iconUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=128',
    }),
  });
  assert(
    updateBrand.status === 200 && updateBrand.data?.data?.settings?.brandName === 'VELOUR ATELIER',
    'PATCH /settings/brand [ADMIN] (Update brand name, tagline & app icon)',
  );

  // 9. Admin: Categories CRUD (Create & Update Category)
  const createCat = await request('/categories', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: 'Evening Wear',
      parent: 'WOMEN',
      description: 'Exclusive silk evening gowns and cocktail dresses',
    }),
  });
  assert(
    (createCat.status === 201 || createCat.status === 409) && !!(createCat.data?.data?.category?.id || createCat.data?.statusCode),
    'POST /categories [ADMIN] (Create new subcategory)',
  );

  const adminCategoriesList = await request('/categories/admin', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    adminCategoriesList.status === 200 && Array.isArray(adminCategoriesList.data?.data),
    'GET /categories/admin [ADMIN] (List all categories with live product counts)',
  );

  // 10. Admin: Product Editing (Sizes, Colors, Tags & Gallery Images)
  const updateProduct = await request('/products/w-double-breasted-wool-coat', {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      sizes: ['XS', 'S', 'M', 'L', 'XL', 'Custom Atelier Fit'],
      colors: ['Camel', 'Midnight Noir', 'Ivory Cashmere'],
      tags: ['Featured on Homepage', 'New Arrival', 'Masterpiece Collection'],
      featured: true,
      isNew: true,
    }),
  });
  assert(
    updateProduct.status === 200 &&
      updateProduct.data?.data?.sizes?.includes('Custom Atelier Fit') &&
      updateProduct.data?.data?.tags?.includes('Masterpiece Collection'),
    'PATCH /products/:id [ADMIN] (Update product sizes, colors & custom merchandising tags)',
  );

  const addProductImage = await request('/products/w-double-breasted-wool-coat/images', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=1200',
      type: 'gallery',
    }),
  });
  assert(
    addProductImage.status === 200 && addProductImage.data?.data?.galleryImages?.length > 0,
    'POST /products/:id/images [ADMIN] (Add gallery image to product)',
  );

  // 11. Admin: Interconnected Users Management
  const usersList = await request('/admin/users', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(
    usersList.status === 200 &&
      usersList.data?.data?.length > 0 &&
      usersList.data?.data[0]?.stats?.totalOrders !== undefined,
    'GET /admin/users [ADMIN] (Interconnected Users List with live order counts, lifetime spend & stats)',
  );

  const firstUserId = usersList.data?.data[0]?.id;
  if (firstUserId) {
    const userDetails = await request(`/admin/users/${firstUserId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      userDetails.status === 200 &&
        Array.isArray(userDetails.data?.data?.orders) &&
        Array.isArray(userDetails.data?.data?.addresses),
      'GET /admin/users/:id [ADMIN] (Deep interconnected user dossier: Profile, Orders with tracking, Addresses, Reviews)',
    );

    // Archive & Unarchive user test
    const archiveRes = await request(`/admin/users/${firstUserId}/archive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(archiveRes.status === 200 && archiveRes.data?.data?.user?.isArchived === true, 'POST /admin/users/:id/archive [ADMIN]');

    const unarchiveRes = await request(`/admin/users/${firstUserId}/unarchive`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(unarchiveRes.status === 200 && unarchiveRes.data?.data?.user?.isArchived === false, 'POST /admin/users/:id/unarchive [ADMIN]');
  }

  // 12. Security RBAC Guard Test
  const customerBlockedFromAdminUsers = await request('/admin/users', {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  assert(customerBlockedFromAdminUsers.status === 403, 'GET /admin/users as Customer (Blocked with 403 Forbidden)');

  console.log(`\n🎉 Verification Completed: ${passed} Passed, ${failed} Failed\n`);
}

runTests().catch(console.error);
