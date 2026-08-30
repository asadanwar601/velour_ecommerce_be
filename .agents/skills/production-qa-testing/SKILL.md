---
name: production-qa-testing
description: Enforces end-to-end testing automation, resilience stress-testing, security validation, CMS dynamic page verification, offline POS sync audits, and cross-theme regression checks across full-stack Next.js and NestJS applications.
---

# Production QA & End-to-End Test Automation Standards

## 1. Functional End-to-End Workflows

Every e-commerce release must undergo deterministic, automated functional validation covering the complete client and administrative lifecycle:

1. **Authentication & Identity Lifecycle**:
   - **Registration & Argon2id Hashing**: Validate user registration, password strength enforcement, and argon2id hash generation.
   - **MFA Step-Up & TOTP Challenge**: Verify RFC 6238 TOTP enrollment (`otplib`), multi-channel OTP verification (Email and WhatsApp), and backup code fallback.
   - **Session Security & Token Rotation**: Test cookie transport (`HttpOnly; Secure; SameSite=Strict`), refresh token exchange, and instant token blacklisting on logout.

2. **Commerce & POS Checkout Flow**:
   - **Cart Pricing Math**: Test subtotal calculation, coupon discounts, shipping threshold logic (\$75 complimentary tier), and tax calculations.
   - **Stock Reservation & Atomic Decrement**: Verify multi-location inventory deduction in PostgreSQL via Prisma transactions, preventing race conditions or overselling.
   - **Order Dispatch & Tracking**: Validate order status transitions (`PENDING` -> `PAID` -> `SHIPPED` -> `DELIVERED`), tracking number generation, and invoice snapshots.

---

## 2. Dynamic CMS, Content & UI Verification

1. **Admin CMS Verification**:
   - **About Us Storytelling**: Test dynamic hero headlines, banner images, rich text HTML rendering (`prose-luxury`), mission statement callouts, and chronological milestone timelines.
   - **Contact Us & Concierge**: Verify dynamic support email, phone numbers, operating hours, flagship address lines, and custom step-by-step instructions.
   - **Interactive Map Embeds**: Confirm responsive rendering of Google Maps iframe embeds with correct aspect ratio and no layout shifts.
   - **Floating WhatsApp Concierge**: Test floating click-to-chat widget URL generation (`https://wa.me/...`) with pre-filled luxury styling inquiries.

2. **Rich Text Formatting Integrity**:
   - Verify that rich text HTML from the admin editor renders securely with headings (`h3`, `h4`), lists (`ul`, `ol`), quotes (`blockquote`), and links (`a`) without breaking page containers or introducing XSS vulnerabilities.

---

## 3. Edge-Case, Resilience & Security Testing

1. **Rate Limiting & Anti-Brute-Force**:
   - Stress-test authentication routes (`/auth/login`, `/otp/request`, `/otp/verify`) to confirm NestJS `ThrottlerGuard` triggers HTTP 429 Too Many Requests upon burst attempts.
2. **Offline POS Resilience**:
   - Test offline transaction caching via IndexedDB or LocalStorage queues, verifying automatic FIFO replay and conflict resolution upon network reconnection.
3. **Database Integrity & Constraints**:
   - Test uniqueness constraints on SKUs, user emails, and order numbers, asserting graceful error handling.

---

## 4. Cross-Theme & UX Styling Compliance

1. **2-Option Theme Engine Verification**:
   - Audit all routes under both `data-theme="light"` and `data-theme="dark"`.
   - Verify that canvases, card surfaces, typography contrast, borders, and sticky header backdrops transition smoothly with zero layout jumps.
2. **Header Stacking Context & Clickability**:
   - Ensure sticky navbar (`z-50`), search overlay (`z-[1200]`), and cart drawer (`z-[999]`) maintain correct z-indexes without background image bleed or unclickable buttons.

---

## 5. Test Code Quality & 250-Line Hard Ceiling

- **Mandatory File Length Rule**: Every test script, E2E test suite, test runner helper, and mock fixture must remain strictly **under 250 lines of code**.
- If a test file exceeds 250 lines, it must be decomposed into modular domain suites (e.g., `auth.e2e-spec.ts`, `cart.e2e-spec.ts`, `cms.e2e-spec.ts`).
