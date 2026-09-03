# VELOUR Luxury eCommerce Model Context Protocol (MCP) Server

A production-grade Model Context Protocol (MCP) server providing AI agents (Google Antigravity, Claude Desktop, Cursor, etc.) with structured, typed access to the VELOUR fashion eCommerce REST API hosted at:

🌐 **`https://velour-ecommerce-be.onrender.com`**

---

## 🛠️ Tool Catalog (50+ Specialized Tools)

### 1. 🔐 Authentication & Identity
- `velour_auth_login` — Authenticate with email & password (auto-stores JWT for session)
- `velour_auth_signup` — Register new customer account
- `velour_auth_request_otp` — Request 6-digit OTP code (Email / WhatsApp)
- `velour_auth_verify_otp` — Verify OTP code and sign in
- `velour_auth_get_me` — Get profile of authenticated user
- `velour_auth_set_token` — Manually configure active Bearer JWT token

### 2. 👗 Products & Catalog
- `velour_products_list` — Query garments with multi-faceted filtering & pagination
- `velour_products_get` — Fetch product details by SKU ID or slug
- `velour_products_search` — Global text search across title, description & subcategory
- `velour_products_get_facets` — Available sizes, colors, subcategories & price range
- `velour_products_get_featured` — Homepage featured products
- `velour_products_get_new_arrivals` — Newest atelier additions
- `velour_products_get_trending` — High-demand trending silhouettes
- `velour_products_get_size_guide` — Sizing chart specifications & care instructions
- `velour_products_create` — **[ADMIN]** Introduce new garment with warehouse stock
- `velour_products_update` — **[ADMIN]** Update garment details, price & metadata
- `velour_products_delete` — **[ADMIN]** Delete garment from catalog

### 3. 🗂️ Categories & Subcategories
- `velour_categories_list` — Get active categories (Women, Men) and active subcategories
- `velour_categories_admin_list` — **[ADMIN]** List all registered categories with product counts
- `velour_categories_create` — **[ADMIN]** Create a category or subcategory
- `velour_categories_create_subcategory` — **[ADMIN]** Add subcategory under parent category
- `velour_categories_delete_subcategory` — **[ADMIN]** Delete subcategory from parent
- `velour_categories_delete` — **[ADMIN]** Delete category

### 4. 🛍️ Shopping Bag & Cart
- `velour_cart_get` — Retrieve active cart, free shipping progress & cross-sells
- `velour_cart_add_item` — Add garment to cart with size and quantity
- `velour_cart_update_item` — Update item quantity (0 removes item)
- `velour_cart_remove_item` — Remove specific item from cart
- `velour_cart_clear` — Empty shopping bag

### 5. 💳 Checkout, Orders & Tracking
- `velour_checkout` — Process transactional checkout & place order
- `velour_orders_list` — View past customer orders
- `velour_orders_get` — Get order details by order ID or number
- `velour_orders_track` — Live shipment progress, carrier & ETA
- `velour_orders_cancel` — Cancel order before dispatch and restock
- `velour_orders_admin_list_all` — **[ADMIN]** List all customer orders
- `velour_orders_admin_update_status` — **[ADMIN]** Update order fulfillment status
- `velour_orders_create_return` — Submit return request
- `velour_orders_admin_list_returns` — **[ADMIN]** List return requests across platform

### 6. 🏷️ Coupons & Promotions
- `velour_coupons_validate` — Validate promo code and calculate discount
- `velour_coupons_list` — List active public promotions
- `velour_coupons_admin_create` — **[ADMIN]** Create new promotional discount coupon
- `velour_coupons_admin_list_all` — **[ADMIN]** List all coupons with redemption statistics

### 7. 📦 Inventory Management
- `velour_inventory_get_low_stock` — **[ADMIN]** Get garments below threshold
- `velour_inventory_get_product_stock` — **[ADMIN]** Location/warehouse inventory breakdown
- `velour_inventory_adjust` — **[ADMIN]** Adjust stock and record audit StockMovement

### 8. ⭐ Ratings & Reviews
- `velour_reviews_get_product_reviews` — Get reviews and rating distribution
- `velour_reviews_create` — Submit product review and fit evaluation

### 9. 🤍 Wishlist
- `velour_wishlist_get` — View saved items
- `velour_wishlist_add` — Save product to wishlist
- `velour_wishlist_remove` — Remove from wishlist
- `velour_wishlist_move_to_cart` — Move saved piece directly into shopping bag

### 10. 📰 Brand Settings & Dynamic CMS
- `velour_settings_get_brand` — Get brand details, threshold, announcements
- `velour_settings_update_brand` — **[ADMIN]** Update brand settings
- `velour_cms_get_about` — Public About Us page & milestones
- `velour_cms_update_about` — **[ADMIN]** Update About Us storytelling
- `velour_cms_get_contact` — Public Contact Us concierge details & map
- `velour_cms_update_contact` — **[ADMIN]** Update Contact Us concierge details

### 11. 👑 Executive Admin
- `velour_admin_get_stats` — **[ADMIN]** Executive KPI metrics, gross revenue, low stock
- `velour_admin_list_users` — **[ADMIN]** Directory of registered users with spend totals
- `velour_admin_get_user_details` — **[ADMIN]** Complete user dossier (orders, addresses, reviews)
- `velour_admin_update_user` — **[ADMIN]** Update user role or personal info
- `velour_admin_invite_admin` — **[ADMIN]** Create & invite new Administrator user

---

## ⚙️ Configuration & Integration

### Google Antigravity
Configured in `~/.gemini/config/mcp_config.json`:
```json
{
  "mcpServers": {
    "velour-ecommerce": {
      "command": "node",
      "args": [
        "/Users/asadanwar/Desktop/learni/ecommerce-BE/mcp-server/dist/index.js"
      ],
      "env": {
        "VELOUR_API_URL": "https://velour-ecommerce-be.onrender.com"
      }
    }
  }
}
```

### Claude Desktop (`claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "velour-ecommerce": {
      "command": "node",
      "args": [
        "/Users/asadanwar/Desktop/learni/ecommerce-BE/mcp-server/dist/index.js"
      ],
      "env": {
        "VELOUR_API_URL": "https://velour-ecommerce-be.onrender.com"
      }
    }
  }
}
```

---

## 🚀 Building & Running Locally

```bash
cd /Users/asadanwar/Desktop/learni/ecommerce-BE/mcp-server
npm install
npm run build
npm start
```
