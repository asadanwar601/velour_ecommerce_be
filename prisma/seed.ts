import {
  PrismaClient,
  ParentCategory,
  Role,
  LocationType,
  StockMovementType,
  DiscountType,
  FitRating,
  OrderStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting VELOUR idempotent database seed...');
  console.log('ℹ️  Using upsert — existing records are preserved, only missing ones are created.');

  // 1. Brand Settings (upsert — preserves admin edits)
  await prisma.brandSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      brandName: 'VELOUR',
      tagline: 'Quiet Luxury & Modern Atelier',
      logoUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=400&q=80',
      iconUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=128&q=80',
      faviconUrl: 'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=64&q=80',
      supportEmail: 'care@velour.com',
      supportPhone: '+1 (800) 555-0199',
      freeShippingThreshold: 75.0,
      announcementBarText: 'Complimentary Express Shipping on Orders Over $75 • Atelier Gift Packaging Included',
      announcementBarActive: true,
    },
  });
  console.log('🏛️  Upserted default BrandSetting (VELOUR).');

  // 2. Create seed users (upsert by email — preserves passwords/OAuth users)
  const passwordSalt = await bcrypt.genSalt(12);
  const adminPasswordHash = await bcrypt.hash('VelourAdmin2026!', passwordSalt);
  const customerPasswordHash = await bcrypt.hash('CustomerPass2026!', passwordSalt);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@velour.com' },
    update: {},
    create: {
      email: 'admin@velour.com',
      password: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'Velour',
      role: Role.ADMIN,
      phone: '+15550001122',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@velour.com' },
    update: {},
    create: {
      email: 'customer@velour.com',
      password: customerPasswordHash,
      firstName: 'Elena',
      lastName: 'Rostova',
      role: Role.CUSTOMER,
      phone: '+15550003344',
      birthday: new Date('1996-06-18T00:00:00.000Z'),
      preferences: {
        categoryPreference: 'women',
        vipNotifications: true,
        smsAlerts: true,
      },
      addresses: {
        create: [
          {
            label: 'Home (Primary)',
            recipientName: 'Elena Rostova',
            phone: '+15550003344',
            line1: '742 Evergreen Terrace',
            line2: 'Apt 4B',
            city: 'New York',
            state: 'NY',
            zip: '10001',
            country: 'US',
            isDefault: true,
          },
          {
            label: 'Studio / Office',
            recipientName: 'Elena Rostova (Atelier Studio)',
            phone: '+15550003344',
            line1: '520 Broadway',
            line2: 'Suite 800',
            city: 'New York',
            state: 'NY',
            zip: '10012',
            country: 'US',
            isDefault: false,
          },
        ],
      },
    },
  });

  console.log(`👤 Upserted Users: Admin (${admin.email}), Customer (${customer.email})`);


  // 3. Default Warehouse Location (upsert by name)
  const existingWarehouse = await prisma.location.findFirst({
    where: { name: 'Velour Central Warehouse' },
  });
  const warehouse = existingWarehouse ?? await prisma.location.create({
    data: {
      name: 'Velour Central Warehouse',
      type: LocationType.WAREHOUSE,
      address: '100 Logistics Blvd, Secaucus, NJ 07094',
    },
  });

  console.log(`📍 Created Location: ${warehouse.name}`);

  // 4. Create Categories
  const categoryData = [
    // Women
    { name: 'Outerwear', slug: 'women-outerwear', parent: ParentCategory.WOMEN },
    { name: 'Dresses', slug: 'women-dresses', parent: ParentCategory.WOMEN },
    { name: 'Knitwear', slug: 'women-knitwear', parent: ParentCategory.WOMEN },
    { name: 'Tops & Shirts', slug: 'women-tops-and-shirts', parent: ParentCategory.WOMEN },
    { name: 'Trousers', slug: 'women-trousers', parent: ParentCategory.WOMEN },
    { name: 'Tailoring', slug: 'women-tailoring', parent: ParentCategory.WOMEN },
    // Men
    { name: 'Outerwear', slug: 'men-outerwear', parent: ParentCategory.MEN },
    { name: 'Tailoring', slug: 'men-tailoring', parent: ParentCategory.MEN },
    { name: 'Knitwear', slug: 'men-knitwear', parent: ParentCategory.MEN },
    { name: 'Shirts', slug: 'men-shirts', parent: ParentCategory.MEN },
    { name: 'Trousers & Denim', slug: 'men-trousers-and-denim', parent: ParentCategory.MEN },
    { name: 'Basics', slug: 'men-basics', parent: ParentCategory.MEN },
  ];

  for (const cat of categoryData) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }
  console.log(`🏷️  Upserted ${categoryData.length} categories.`);

  // 5. Seed Promotional Coupons (upsert by code — preserves usage counts)
  const coupons = [
    {
      code: 'WELCOME10',
      description: '10% off your first luxury order',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 10.0,
      minOrderValue: 50.0,
      maxDiscount: 100.0,
      isActive: true,
      usageLimit: 1000,
    },
    {
      code: 'VELOUR20',
      description: '20% exclusive Atelier discount on orders over $150',
      discountType: DiscountType.PERCENTAGE,
      discountValue: 20.0,
      minOrderValue: 150.0,
      maxDiscount: 200.0,
      isActive: true,
      usageLimit: 500,
    },
    {
      code: 'LUXURY50',
      description: '$50 off luxury wardrobe purchases over $250',
      discountType: DiscountType.FIXED,
      discountValue: 50.0,
      minOrderValue: 250.0,
      isActive: true,
      usageLimit: 200,
    },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }
  console.log(`🎟️  Upserted ${coupons.length} promotional discount coupons.`);



  // 6. Seed 24 BASE_PRODUCTS with colors, materials, careInstructions, and sizeGuide
  const rawProducts = [
    // ─── WOMEN (12 Products) ──────────────────────────────────────────
    {
      id: 'w-double-breasted-wool-coat',
      slug: 'w-double-breasted-wool-coat',
      name: 'Double-Breasted Wool Overcoat',
      category: ParentCategory.WOMEN,
      subcategory: 'Outerwear',
      price: 340.0,
      compareAtPrice: 425.0,
      description:
        'Crafted from heavy double-faced Italian virgin wool, this tailored overcoat boasts wide peak lapels, horn buttons, and a relaxed, structured silhouette designed to drape cleanly over winter layers.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Camel', 'Charcoal', 'Oatmeal'],
      materials: '100% Italian Virgin Wool (550 GSM), Cupro Lining',
      careInstructions: 'Specialist dry clean only. Cool iron with pressing cloth. Do not tumble dry.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1539533018447-63fcce2678e3?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
      featured: true,
      isNew: false,
      trending: true,
    },
    {
      id: 'w-structured-linen-blazer',
      slug: 'w-structured-linen-blazer',
      name: 'Structured Studio Linen Blazer',
      category: ParentCategory.WOMEN,
      subcategory: 'Tailoring',
      price: 260.0,
      compareAtPrice: null,
      description:
        'A sharp single-breasted blazer cut from breathable heavyweight European flax. Features sculpted shoulder padding, neat flap pockets, and a timeless sand hue.',
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['Sand', 'Black', 'Ivory'],
      materials: '100% European Flax Linen, 100% Cotton Half-Lining',
      careInstructions: 'Dry clean only. Steam iron on reverse.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80',
      featured: true,
      isNew: true,
      trending: false,
    },
    {
      id: 'w-cashmere-crewneck-sweater',
      slug: 'w-cashmere-crewneck-sweater',
      name: 'Cashmere Ribbed Crewneck',
      category: ParentCategory.WOMEN,
      subcategory: 'Knitwear',
      price: 195.0,
      compareAtPrice: null,
      description:
        'Spun from Grade-A Mongolian cashmere with a subtle chunky gauge. Finished with delicate ribbing at the neck, cuffs, and hem for an effortless modern drape.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Oatmeal', 'Dusty Rose', 'Heather Grey'],
      materials: '100% Grade-A Mongolian Cashmere (2-ply 12gg)',
      careInstructions: 'Hand wash cold with cashmere shampoo or gentle dry clean. Dry flat.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: true,
      trending: true,
    },
    {
      id: 'w-silk-bias-midi-dress',
      slug: 'w-silk-bias-midi-dress',
      name: 'Silk Georgette Bias Midi Dress',
      category: ParentCategory.WOMEN,
      subcategory: 'Dresses',
      price: 290.0,
      compareAtPrice: 350.0,
      description:
        'Cut on the bias to skim the natural contours of the body. Features an understated scoop neckline, low back detail, and a fluid silhouette with raw hem finishing.',
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['Noir', 'Olive Green', 'Champagne'],
      materials: '100% Mulberry Silk Georgette (19mm)',
      careInstructions: 'Eco dry clean only. Steam gently.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
      featured: true,
      isNew: false,
      trending: true,
    },
    {
      id: 'w-high-waisted-pleated-trouser',
      slug: 'w-high-waisted-pleated-trouser',
      name: 'High-Waisted Pleated Trousers',
      category: ParentCategory.WOMEN,
      subcategory: 'Trousers',
      price: 185.0,
      compareAtPrice: null,
      description:
        'Tailored from crease-resistant wool-blend twill. Double front pleats create a fluid wide-leg profile that sits cleanly over boots or minimalist loafers.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Charcoal', 'Navy', 'Ecru'],
      materials: '60% Wool, 38% Polyester, 2% Elastane',
      careInstructions: 'Dry clean only. Hang on clamp hanger.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: true,
      trending: false,
    },
    {
      id: 'w-oversized-poplin-shirt',
      slug: 'w-oversized-poplin-shirt',
      name: 'Crisp Organic Cotton Poplin Shirt',
      category: ParentCategory.WOMEN,
      subcategory: 'Tops & Shirts',
      price: 145.0,
      compareAtPrice: null,
      description:
        'An architectural take on the menswear classic. Tailored with dropped shoulders, exaggerated mother-of-pearl buttons, and a curved hem with high side slits.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Optic White', 'Sky Blue Stripe', 'Soft Lilac'],
      materials: '100% GOTS Certified Organic Cotton Poplin (120s 2-ply)',
      careInstructions: 'Machine wash 30°C delicate. Warm iron while damp.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: false,
      trending: true,
    },
    {
      id: 'w-minimalist-trench-coat',
      slug: 'w-minimalist-trench-coat',
      name: 'Water-Repellent Minimal Trench',
      category: ParentCategory.WOMEN,
      subcategory: 'Outerwear',
      price: 360.0,
      compareAtPrice: null,
      description:
        'A streamlined update on the heritage trench. Rendered in a Japanese technical gabardine with a removable waist tie, clean storm flap, and deep welt pockets.',
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['Stone Beige', 'Midnight Navy', 'Olive'],
      materials: '100% Japanese Technical Cotton Gabardine (Water-Repellent)',
      careInstructions: 'Dry clean only. Reproof finish periodically.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1591369822096-ffd140ec948f?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1554412933-514a83d2f3c8?auto=format&fit=crop&w=900&q=80',
      featured: true,
      isNew: true,
      trending: true,
    },
    {
      id: 'w-draped-column-dress',
      slug: 'w-draped-column-dress',
      name: 'Sculpted Draped Column Dress',
      category: ParentCategory.WOMEN,
      subcategory: 'Dresses',
      price: 240.0,
      compareAtPrice: 310.0,
      description:
        'Modern minimalism at its finest. Features asymmetrical side gathering, a clean boatneck, and a soft matte jersey fabric that moves gracefully with every step.',
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['Espresso', 'Black', 'Terracotta'],
      materials: '95% Modal Jersey, 5% Spandex (Heavyweight)',
      careInstructions: 'Hand wash cold or dry clean. Do not wring.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: false,
      trending: false,
    },
    {
      id: 'w-wool-mockneck-knit',
      slug: 'w-wool-mockneck-knit',
      name: 'Fine Merino Mockneck Knit',
      category: ParentCategory.WOMEN,
      subcategory: 'Knitwear',
      price: 165.0,
      compareAtPrice: null,
      description:
        'Ultra-fine Australian Merino wool spun into a lightweight, second-skin layer. Perfect for year-round layering under blazers and leather outerwear.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Ivory', 'Black', 'Caramel'],
      materials: '100% Extra-Fine Australian Merino Wool (19.5 Micron)',
      careInstructions: 'Hand wash cold or wool cycle. Reshape while wet.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: true,
      trending: false,
    },
    {
      id: 'w-relaxed-silk-blouse',
      slug: 'w-relaxed-silk-blouse',
      name: 'Sandwashed Silk Camp Collar Blouse',
      category: ParentCategory.WOMEN,
      subcategory: 'Tops & Shirts',
      price: 210.0,
      compareAtPrice: null,
      description:
        '100% mulberry silk treated with an artisanal sandwashed finish for a velvety matte touch. Relaxed Cuban collar with tonal shell buttons.',
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['Sand', 'Sage', 'Midnight'],
      materials: '100% Mulberry Silk (Sandwashed 16mm)',
      careInstructions: 'Gentle dry clean only. Low heat iron inside out.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=900&q=80',
      featured: true,
      isNew: false,
      trending: false,
    },
    {
      id: 'w-straight-leg-crepe-pant',
      slug: 'w-straight-leg-crepe-pant',
      name: 'Tailored Crepe Cigarette Pants',
      category: ParentCategory.WOMEN,
      subcategory: 'Trousers',
      price: 175.0,
      compareAtPrice: null,
      description:
        'Crisp ankle-grazing trousers in dense Japanese matte crepe. Clean waistband with concealed zip and subtle center pressed creases.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Black', 'Off-White', 'Mushroom'],
      materials: '72% Acetate, 28% Polyester Heavy Crepe',
      careInstructions: 'Dry clean only.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: true,
      trending: true,
    },
    {
      id: 'w-wool-vest-waistcoat',
      slug: 'w-wool-vest-waistcoat',
      name: 'Tailored Wool Suiting Vest',
      category: ParentCategory.WOMEN,
      subcategory: 'Tailoring',
      price: 160.0,
      compareAtPrice: null,
      description:
        'Sleek suiting waistcoat with an adjustable back buckle, v-neckline, and neat welt front pockets. Can be styled solo or as a three-piece suit foundation.',
      sizes: ['XS', 'S', 'M', 'L'],
      colors: ['Black', 'Grey Glen Plaid', 'Camel'],
      materials: '100% Super-110s Wool, Bemberg Cupro Backing',
      careInstructions: 'Dry clean only.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: false,
      trending: true,
    },

    // ─── MEN (12 Products) ────────────────────────────────────────────
    {
      id: 'm-unstructured-wool-blazer',
      slug: 'm-unstructured-wool-blazer',
      name: 'Unstructured Wool Flannel Blazer',
      category: ParentCategory.MEN,
      subcategory: 'Tailoring',
      price: 320.0,
      compareAtPrice: 395.0,
      description:
        'Softly tailored with zero shoulder padding for a relaxed, natural silhouette. Crafted in Biella, Italy from brushed super-120s wool flannel with patch pockets and horn buttons.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Navy', 'Charcoal Melange', 'Olive'],
      materials: '100% Super-120s Wool Flannel (Biella, Italy)',
      careInstructions: 'Dry clean only. Brush with horsehair garment brush.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80',
      featured: true,
      isNew: true,
      trending: true,
    },
    {
      id: 'm-heavyweight-leather-jacket',
      slug: 'm-heavyweight-leather-jacket',
      name: 'Minimalist Lambskin Leather Blouson',
      category: ParentCategory.MEN,
      subcategory: 'Outerwear',
      price: 480.0,
      compareAtPrice: null,
      description:
        'Supple full-grain lambskin with a clean shirt collar, concealed two-way matte zipper, and cupro interior lining. A modern heirloom built to patina richly with age.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Obsidian Black', 'Espresso Brown'],
      materials: '100% Full-Grain Vegetable-Tanned Italian Lambskin',
      careInstructions: 'Specialist leather clean only. Condition annually with natural wax balm.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?auto=format&fit=crop&w=900&q=80',
      featured: true,
      isNew: false,
      trending: true,
    },
    {
      id: 'm-raw-selvedge-denim',
      slug: 'm-raw-selvedge-denim',
      name: '14oz Japanese Selvedge Denim',
      category: ParentCategory.MEN,
      subcategory: 'Trousers & Denim',
      price: 210.0,
      compareAtPrice: null,
      description:
        'Woven on vintage shuttle looms in Okayama from organic long-staple cotton. Classic straight fit with chainstitched hems, custom oxidized rivets, and leather back patch.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Indigo Raw', 'Washed Indigo', 'Washed Black'],
      materials: '100% Okayama Ring-Spun Cotton (14oz Red-Line Selvedge)',
      careInstructions: 'Wash inside-out in cold water or soak. Hang dry to maintain fades.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: true,
      trending: true,
    },
    {
      id: 'm-chunky-waffle-sweater',
      slug: 'm-chunky-waffle-sweater',
      name: 'Chunky Merino Waffle Crewneck',
      category: ParentCategory.MEN,
      subcategory: 'Knitwear',
      price: 180.0,
      compareAtPrice: 225.0,
      description:
        'Thick textural honeycomb knit spun from pure untreated Merino wool. Features raglan sleeves, sturdy ribbed collar, and substantial thermal weight.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Ecru', 'Forest Green', 'Slate Grey'],
      materials: '100% Extra-Fine Merino Wool (5-gauge chunky waffle)',
      careInstructions: 'Hand wash cold or gentle wool wash. Dry flat.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=80',
      featured: true,
      isNew: false,
      trending: false,
    },
    {
      id: 'm-relaxed-oxford-shirt',
      slug: 'm-relaxed-oxford-shirt',
      name: 'Garment-Dyed Heavy Oxford Shirt',
      category: ParentCategory.MEN,
      subcategory: 'Shirts',
      price: 135.0,
      compareAtPrice: null,
      description:
        'Woven from substantial 8oz cotton Oxford cloth, then garment-dyed for a broken-in softness and subtle depth of color. Relaxed button-down collar and box pleat.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Classic White', 'Washed Blue', 'Sage'],
      materials: '100% Combed Long-Staple Cotton Oxford (8oz)',
      careInstructions: 'Machine wash 40°C. Medium iron.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: true,
      trending: false,
    },
    {
      id: 'm-heavy-pima-tee',
      slug: 'm-heavy-pima-tee',
      name: 'Heavyweight Pima Cotton Tee',
      category: ParentCategory.MEN,
      subcategory: 'Basics',
      price: 65.0,
      compareAtPrice: null,
      description:
        'Crafted from 280 GSM Peruvian long-staple Pima cotton. Dense yet exceptionally soft, featuring a reinforced collar that retains its shape wash after wash.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['White', 'Black', 'Heather Grey', 'Vintage Navy'],
      materials: '100% Peruvian Long-Staple Pima Cotton (280 GSM)',
      careInstructions: 'Machine wash warm, tumble dry low.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: false,
      trending: true,
    },
    {
      id: 'm-cashmere-overcoat',
      slug: 'm-cashmere-overcoat',
      name: 'Tailored Cashmere-Wool Balmacaan',
      category: ParentCategory.MEN,
      subcategory: 'Outerwear',
      price: 450.0,
      compareAtPrice: 550.0,
      description:
        'A classic single-breasted Balmacaan coat with raglan sleeves, fly-front button closure, and deep storm collar. Blended with 20% cashmere for cloud-like softness.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Camel', 'Dark Navy', 'Charcoal'],
      materials: '80% Italian Virgin Wool, 20% Mongolian Cashmere',
      careInstructions: 'Specialist dry clean only. Hang on broad wooden hanger.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?auto=format&fit=crop&w=900&q=80',
      featured: true,
      isNew: true,
      trending: true,
    },
    {
      id: 'm-single-pleat-wool-trouser',
      slug: 'm-single-pleat-wool-trouser',
      name: 'Single-Pleat Flannel Dress Trousers',
      category: ParentCategory.MEN,
      subcategory: 'Tailoring',
      price: 195.0,
      compareAtPrice: null,
      description:
        'Impeccably tailored trousers with side adjusters and a gentle taper toward the cuff. Woven in wool flannel for cold-weather elegance.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Charcoal Grey', 'Navy', 'Brown Melange'],
      materials: '100% Italian Wool Flannel',
      careInstructions: 'Dry clean only. Press with wool setting.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: false,
      trending: false,
    },
    {
      id: 'm-merino-rollneck-sweater',
      slug: 'm-merino-rollneck-sweater',
      name: 'Fine Gauge Merino Rollneck',
      category: ParentCategory.MEN,
      subcategory: 'Knitwear',
      price: 155.0,
      compareAtPrice: null,
      description:
        'Knitted from 100% extra-fine 19.5-micron Merino wool. Highly breathable, naturally temperature-regulating, and tailored to sit sleekly under tailoring.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['Black', 'Off-White', 'Camel', 'Bordeaux'],
      materials: '100% Extra-Fine Merino Wool (16-gauge fine knit)',
      careInstructions: 'Hand wash cold or gentle wool wash.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1576566588028-4147f3842f27?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: true,
      trending: true,
    },
    {
      id: 'm-linen-band-collar-shirt',
      slug: 'm-linen-band-collar-shirt',
      name: 'Relaxed Linen Grandad Collar Shirt',
      category: ParentCategory.MEN,
      subcategory: 'Shirts',
      price: 125.0,
      compareAtPrice: null,
      description:
        'Pure washed Normandy linen with a clean band collar, seamless placket, and relaxed straight hem with side vents. Effortless warm-weather tailoring.',
      sizes: ['S', 'M', 'L', 'XL'],
      colors: ['White', 'Natural Linen', 'Soft Sage'],
      materials: '100% Normandy Pure Washed Linen',
      careInstructions: 'Machine wash 30°C. Air dry for natural lived-in texture.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1554568218-0f1715e72254?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: false,
      trending: false,
    },
    {
      id: 'm-relaxed-chino-trouser',
      slug: 'm-relaxed-chino-trouser',
      name: 'Wide-Leg Washed Cotton Chinos',
      category: ParentCategory.MEN,
      subcategory: 'Trousers & Denim',
      price: 140.0,
      compareAtPrice: null,
      description:
        'Constructed from durable 100% cotton drill with a washed peach-skin finish. Roomy thigh tapering slightly to the ankle for a contemporary silhouette.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Khaki Sand', 'Olive Drab', 'Navy'],
      materials: '100% Heavy Cotton Drill with garment peach-skin wash',
      careInstructions: 'Machine wash warm with like colors.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: true,
      trending: false,
    },
    {
      id: 'm-supima-henley-shirt',
      slug: 'm-supima-henley-shirt',
      name: 'Long-Sleeve Supima Waffle Henley',
      category: ParentCategory.MEN,
      subcategory: 'Basics',
      price: 90.0,
      compareAtPrice: null,
      description:
        'Midweight thermal waffle knit crafted from American-grown Supima cotton. Mother-of-pearl 3-button placket and snug ribbed cuffs.',
      sizes: ['XS', 'S', 'M', 'L', 'XL'],
      colors: ['Ecru', 'Heather Grey', 'Charcoal'],
      materials: '100% American Supima Cotton (Waffle Knit)',
      careInstructions: 'Machine wash cold, lay flat or tumble dry low.',
      primaryImageUrl:
        'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
      hoverImageUrl:
        'https://images.unsplash.com/photo-1520975954732-35dd22299614?auto=format&fit=crop&w=900&q=80',
      featured: false,
      isNew: false,
      trending: true,
    },
  ];

  for (const prod of rawProducts) {
    const productData = {
      id: prod.id,
      slug: prod.slug,
      name: prod.name,
      category: prod.category,
      subcategory: prod.subcategory,
      price: prod.price,
      compareAtPrice: prod.compareAtPrice,
      description: prod.description,
      sizes: prod.sizes,
      colors: prod.colors,
      materials: prod.materials,
      careInstructions: prod.careInstructions,
      primaryImageUrl: prod.primaryImageUrl,
      hoverImageUrl: prod.hoverImageUrl,
      featured: prod.featured,
      isNew: prod.isNew,
      trending: prod.trending,
    };
    const product = await prisma.product.upsert({
      where: { id: prod.id },
      update: {},
      create: productData,
    });

    // Seed inventory only if it doesn't already exist for this product+location
    const existingInventory = await prisma.inventoryItem.findUnique({
      where: { productId_locationId: { productId: product.id, locationId: warehouse.id } },
    });
    if (!existingInventory) {
      const initialQuantity = 50;
      await prisma.inventoryItem.create({
        data: {
          productId: product.id,
          locationId: warehouse.id,
          quantity: initialQuantity,
          lowStockThreshold: 5,
        },
      });
      await prisma.stockMovement.create({
        data: {
          productId: product.id,
          locationId: warehouse.id,
          type: StockMovementType.RESTOCK,
          quantity: initialQuantity,
          reason: 'Initial catalogue stocking',
        },
      });
    }
  }

  console.log(`👗 Upserted ${rawProducts.length} products with initial inventory & audit logs.`);


  // 7. Seed Verified Customer Product Reviews
  const reviewsData = [
    {
      productId: 'w-double-breasted-wool-coat',
      userName: 'Elena Rostova',
      userEmail: 'customer@velour.com',
      userId: customer.id,
      rating: 5,
      title: 'Incomparable quality & drape',
      comment:
        'The Italian virgin wool is dense and heavy yet moves so fluidly. The structured shoulders give it that high-fashion architectural profile. Worth every penny.',
      fitRating: FitRating.TRUE_TO_SIZE,
      isVerifiedPurchase: true,
    },
    {
      productId: 'w-double-breasted-wool-coat',
      userName: 'Camille L.',
      rating: 5,
      title: 'Timeless winter investment',
      comment: 'Wore this in Paris at 2°C and stayed exceptionally warm without feeling bulky.',
      fitRating: FitRating.TRUE_TO_SIZE,
      isVerifiedPurchase: true,
    },
    {
      productId: 'w-cashmere-crewneck-sweater',
      userName: 'Sophia M.',
      rating: 5,
      title: 'Insanely soft cashmere',
      comment: 'No pilling after 3 weeks of wear. The ribbed collar sits beautifully.',
      fitRating: FitRating.TRUE_TO_SIZE,
      isVerifiedPurchase: true,
    },
    {
      productId: 'm-heavyweight-leather-jacket',
      userName: 'Alexander K.',
      rating: 5,
      title: 'Heirloom level craftsmanship',
      comment: 'The full-grain lambskin is butter-soft right out of the box. Matte zipper hardware is super sleek.',
      fitRating: FitRating.TRUE_TO_SIZE,
      isVerifiedPurchase: true,
    },
    {
      productId: 'm-unstructured-wool-blazer',
      userName: 'Julian V.',
      rating: 5,
      title: 'The perfect effortless blazer',
      comment: 'Zero padding means it conforms naturally to your shoulders. Pairs with raw denim or dress trousers.',
      fitRating: FitRating.TRUE_TO_SIZE,
      isVerifiedPurchase: true,
    },
  ];

  // 7. Reviews (only create if that review (title+product) doesn't exist)
  for (const r of reviewsData) {
    const exists = await prisma.review.findFirst({
      where: { productId: r.productId, title: r.title },
    });
    if (!exists) await prisma.review.create({ data: r });
  }
  console.log(`⭐ Upserted ${reviewsData.length} customer product reviews.`);

  // 8. Customer Wishlist (only create if not already present)
  const existingWishlist = await prisma.wishlist.findUnique({ where: { userId: customer.id } });
  if (!existingWishlist) {
    await prisma.wishlist.create({
      data: {
        userId: customer.id,
        items: {
          create: [
            { productId: 'w-silk-bias-midi-dress' },
            { productId: 'w-minimalist-trench-coat' },
          ],
        },
      },
    });
    console.log(`❤️  Created initial wishlist for ${customer.email}.`);
  }

  // 9. Sample Order (only if this order number doesn't exist)
  const existingOrder = await prisma.order.findUnique({ where: { orderNumber: 'VLR-2026-10842' } });
  if (!existingOrder) {
    const sampleOrder = await prisma.order.create({
      data: {
        userId: customer.id,
        orderNumber: 'VLR-2026-10842',
        status: OrderStatus.SHIPPED,
        subtotal: '535.00',
        shipping: '0.00',
        discount: '53.50',
        total: '481.50',
        promoCode: 'WELCOME10',
        carrier: 'FedEx Luxury Express',
        trackingNumber: 'VLR-TRK-784920',
        estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        giftPackaging: true,
        giftNote: 'To Elena, from New York with love.',
        shippingAddress: {
          line1: '742 Evergreen Terrace',
          line2: 'Apt 4B',
          city: 'New York',
          state: 'NY',
          zip: '10001',
          country: 'US',
        },
        contactName: 'Elena Rostova',
        contactEmail: 'customer@velour.com',
        contactPhone: '+15550003344',
        items: {
          create: [
            { productId: 'w-double-breasted-wool-coat', size: 'S', quantity: 1, price: '340.00' },
            { productId: 'w-cashmere-crewneck-sweater', size: 'S', quantity: 1, price: '195.00' },
          ],
        },
      },
    });
    console.log(`📦 Created sample order ${sampleOrder.orderNumber} with live tracking & items.`);
  }

  console.log('✅ VELOUR idempotent database seed completed — existing data fully preserved!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
