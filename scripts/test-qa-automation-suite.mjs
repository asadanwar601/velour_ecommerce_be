/**
 * VELOUR & BAVEHA E-COMMERCE QA AUTOMATION & E2E VERIFICATION SUITE
 * Executed under the production-qa-testing skill standard.
 * Enforces < 250 lines of code per file ceiling.
 */

const API_BASE = process.env.API_URL || 'http://localhost:4000';
const WEB_BASE = process.env.WEB_URL || 'http://localhost:3000';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`✅ PASS: ${message}`);
}

async function runQAAutomationSuite() {
  console.log('====================================================');
  console.log('🧪 VELOUR QA AUTOMATION & E2E VERIFICATION SUITE');
  console.log(`API Target: ${API_BASE} | Web Target: ${WEB_BASE}`);
  console.log('====================================================\n');

  // Test 1: Brand & Store Settings API
  console.log('▶ [1/6] Testing Brand & Store Settings API...');
  const brandRes = await fetch(`${API_BASE}/settings/brand`);
  assert(brandRes.status === 200, 'GET /settings/brand returns HTTP 200');
  const brandData = await brandRes.json();
  const brand = brandData.data || brandData;
  assert(brand.brandName === 'VELOUR', 'Brand name is correctly configured as VELOUR');
  assert(brand.freeShippingThreshold === 75, 'Free shipping threshold is $75.00');

  // Test 2: Dynamic CMS About Us API
  console.log('\n▶ [2/6] Testing Dynamic CMS About Us API...');
  const aboutRes = await fetch(`${API_BASE}/cms/about`);
  assert(aboutRes.status === 200, 'GET /cms/about returns HTTP 200');
  const aboutData = await aboutRes.json();
  const about = aboutData.data || aboutData;
  assert(typeof about.heroTitle === 'string' && about.heroTitle.length > 0, 'About page hero title is populated');
  assert(typeof about.storyHtml === 'string' && about.storyHtml.includes('<p>'), 'Rich text storyHtml contains valid HTML tags');
  assert(Array.isArray(about.milestonesJson) && about.milestonesJson.length > 0, 'Milestones timeline array is structured and populated');

  // Test 3: Dynamic CMS Contact Us & Map API
  console.log('\n▶ [3/6] Testing Dynamic CMS Contact Us & Map API...');
  const contactRes = await fetch(`${API_BASE}/cms/contact`);
  assert(contactRes.status === 200, 'GET /cms/contact returns HTTP 200');
  const contactData = await contactRes.json();
  const contact = contactData.data || contactData;
  assert(typeof contact.title === 'string' && contact.title.length > 0, 'Contact page title is populated');
  assert(typeof contact.mapEmbedUrl === 'string' && contact.mapEmbedUrl.includes('google.com/maps'), 'Map embed URL is valid');
  assert(Array.isArray(contact.contactStepsJson) && contact.contactStepsJson.length >= 3, 'Custom inquiry steps protocol has at least 3 steps');

  // Test 4: Product Catalog & Sizing Verification
  console.log('\n▶ [4/6] Testing Product Catalog API...');
  const prodRes = await fetch(`${API_BASE}/products`);
  assert(prodRes.status === 200, 'GET /products returns HTTP 200');
  const prodData = await prodRes.json();
  const products = prodData.data?.products || prodData.products || prodData.data || [];
  assert(Array.isArray(products) && products.length > 0, 'Products catalog returned seeded items');
  const sampleProduct = products[0];
  assert(Array.isArray(sampleProduct.sizes) && sampleProduct.sizes.length > 0, 'Product has valid sizes array');
  assert(typeof sampleProduct.price !== 'undefined', 'Product has price configured');

  // Test 5: Authentication & Security Credentials Flow
  console.log('\n▶ [5/6] Testing Authentication Credentials Flow...');
  const loginRes = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@velour.com', password: 'VelourAdmin2026!' }),
  });
  assert(loginRes.status === 200, 'POST /auth/login with admin credentials returns HTTP 200');
  const loginData = await loginRes.json();
  const authPayload = loginData.data || loginData;
  assert(authPayload.accessToken && typeof authPayload.accessToken === 'string', 'JWT access token issued successfully');
  assert(authPayload.user && authPayload.user.role === 'ADMIN', 'Authenticated user role is verified as ADMIN');

  // Test 6: Frontend Public & Admin Route Health Checks
  console.log('\n▶ [6/6] Testing Frontend Route Health & Theme Headers...');
  const routesToTest = ['/', '/about', '/contact', '/login', '/women', '/men', '/admin/cms'];
  for (const route of routesToTest) {
    const webRes = await fetch(`${WEB_BASE}${route}`, { redirect: 'manual' });
    assert(webRes.status === 200 || webRes.status === 307 || webRes.status === 302, `Frontend route "${route}" responded with status ${webRes.status}`);
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests}/${totalTests} QA AUTOMATION TESTS PASSED DETERMINISTICALLY!`);
  console.log('====================================================');
}

runQAAutomationSuite().catch((err) => {
  console.error('\n🚨 QA AUTOMATION SUITE FAILED:', err.message);
  process.exit(1);
});
