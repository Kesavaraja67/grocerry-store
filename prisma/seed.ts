import { PrismaClient, UnitDimension, CostBasis } from "@prisma/client";
import bcrypt from "bcryptjs";
import { shopSeedConfig, INITIAL_OWNER } from "../config/shop.seed";

const prisma = new PrismaClient();

const CANONICAL_UNITS = [
  { code: "kg", label: "Kilogram", symbol: "kg", dimension: UnitDimension.WEIGHT, factorToBase: 1, isBaseable: true, sortOrder: 1 },
  { code: "g", label: "Gram", symbol: "g", dimension: UnitDimension.WEIGHT, factorToBase: 0.001, isBaseable: false, sortOrder: 2 },
  { code: "litre", label: "Litre", symbol: "L", dimension: UnitDimension.VOLUME, factorToBase: 1, isBaseable: true, sortOrder: 3 },
  { code: "ml", label: "Millilitre", symbol: "ml", dimension: UnitDimension.VOLUME, factorToBase: 0.001, isBaseable: false, sortOrder: 4 },
  { code: "piece", label: "Piece", symbol: "pc", dimension: UnitDimension.COUNT, factorToBase: 1, isBaseable: true, sortOrder: 5 },
  { code: "packet", label: "Packet", symbol: "pkt", dimension: UnitDimension.COUNT, factorToBase: 1, isBaseable: true, sortOrder: 6 },
  { code: "bottle", label: "Bottle", symbol: "btl", dimension: UnitDimension.COUNT, factorToBase: 1, isBaseable: true, sortOrder: 7 },
  { code: "dozen", label: "Dozen", symbol: "dz", dimension: UnitDimension.COUNT, factorToBase: 12, isBaseable: false, sortOrder: 8 },
  { code: "box", label: "Box", symbol: "box", dimension: UnitDimension.PACK, factorToBase: null, isBaseable: false, sortOrder: 9 },
  { code: "carton", label: "Carton", symbol: "ctn", dimension: UnitDimension.PACK, factorToBase: null, isBaseable: false, sortOrder: 10 },
  { code: "bag", label: "Bag", symbol: "bag", dimension: UnitDimension.PACK, factorToBase: null, isBaseable: false, sortOrder: 11 },
  { code: "can", label: "Can", symbol: "can", dimension: UnitDimension.PACK, factorToBase: null, isBaseable: false, sortOrder: 12 },
  { code: "case", label: "Case", symbol: "case", dimension: UnitDimension.PACK, factorToBase: null, isBaseable: false, sortOrder: 13 },
];

const CANONICAL_CATEGORIES = [
  { name: "Rice and Grains", slug: "rice-and-grains", iconKey: "grains", tint: "#EBF2ED", sortOrder: 1, lowMarkup: 5, recommendedMarkup: 8, highMarkup: 12 },
  { name: "Pulses and Dals", slug: "pulses-and-dals", iconKey: "pulses", tint: "#FDF6E9", sortOrder: 2, lowMarkup: 6, recommendedMarkup: 10, highMarkup: 14 },
  { name: "Oils and Ghee", slug: "oils-and-ghee", iconKey: "oils", tint: "#FEF9E7", sortOrder: 3, lowMarkup: 4, recommendedMarkup: 7, highMarkup: 10 },
  { name: "Spices and Masala", slug: "spices-and-masala", iconKey: "spices", tint: "#FBEFEF", sortOrder: 4, lowMarkup: 10, recommendedMarkup: 15, highMarkup: 22 },
  { name: "Snacks and Biscuits", slug: "snacks-and-biscuits", iconKey: "snacks", tint: "#F8F3EA", sortOrder: 5, lowMarkup: 8, recommendedMarkup: 12, highMarkup: 16 },
  { name: "Tea, Coffee and Beverages", slug: "tea-coffee-beverages", iconKey: "beverages", tint: "#F3EFEA", sortOrder: 6, lowMarkup: 7, recommendedMarkup: 11, highMarkup: 15 },
  { name: "Dairy and Eggs", slug: "dairy-and-eggs", iconKey: "dairy", tint: "#F5F9F6", sortOrder: 7, lowMarkup: 5, recommendedMarkup: 8, highMarkup: 12 },
  { name: "Household and Personal Care", slug: "household-and-personal-care", iconKey: "household", tint: "#EBF1F5", sortOrder: 8, lowMarkup: 10, recommendedMarkup: 14, highMarkup: 20 },
];

export async function seedProduction() {
  console.log("Seeding canonical units...");
  for (const u of CANONICAL_UNITS) {
    await prisma.unit.upsert({
      where: { code: u.code },
      update: u,
      create: u,
    });
  }

  console.log("Seeding canonical categories...");
  for (const c of CANONICAL_CATEGORIES) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: c,
      create: c,
    });
  }

  console.log("Seeding shop settings singleton...");
  await prisma.shopSettings.upsert({
    where: { id: 1 },
    update: shopSeedConfig,
    create: { id: 1, ...shopSeedConfig },
  });

  console.log("Seeding initial owner account...");
  const hashedPassword = await bcrypt.hash(INITIAL_OWNER.password, 10);
  await prisma.user.upsert({
    where: { email: INITIAL_OWNER.email },
    update: {
      name: INITIAL_OWNER.name,
      passwordHash: hashedPassword,
    },
    create: {
      email: INITIAL_OWNER.email,
      name: INITIAL_OWNER.name,
      passwordHash: hashedPassword,
      forcedPasswordChange: true,
    },
  });

  console.log("Production seed completed successfully.");
}

export async function resetDemo() {
  console.log("Cleaning demo data...");
  await prisma.orderEvent.deleteMany({});
  await prisma.orderItemCost.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.stockMovement.deleteMany({});
  await prisma.priceHistory.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.productCost.deleteMany({});
  await prisma.productImage.deleteMany({});
  await prisma.product.deleteMany({});
  console.log("Demo data cleaned.");
}

export async function seedDemo() {
  await seedProduction();

  console.log("Seeding demo wholesale suppliers...");
  const s1 = await prisma.supplier.create({
    data: {
      name: "Sri Murugan Wholesale Mandi",
      phone: "+91 90000 00010",
      area: "South Gate Wholesale Market",
      address: "No. 44, Rice Market Lane, South Gate, Madurai",
      notes: "Primary supplier for Ponni rice, idli rice, and wholesale pulses.",
    },
  });

  const s2 = await prisma.supplier.create({
    data: {
      name: "Raja & Sons Grain Traders",
      phone: "+91 90000 00011",
      area: "Central Grain Market",
      address: "Shop 102, Grain Merchant Complex, Madurai",
      notes: "Known for premium toor dal and wheat flour bags.",
    },
  });

  const s3 = await prisma.supplier.create({
    data: {
      name: "Meenakshi Oil Mill & Agencies",
      phone: "+91 90000 00012",
      area: "Industrial Estate",
      address: "Plot 8, Mill Road, Industrial Estate, Madurai",
      notes: "Direct cold-pressed gingelly oil, groundnut oil, and sunflower oil tins.",
    },
  });

  const s4 = await prisma.supplier.create({
    data: {
      name: "Evergreen FMCG Distributors",
      phone: "+91 90000 00013",
      area: "Ring Road Hub",
      address: "Godown 3, Ring Road Logistics Park, Madurai",
      notes: "Packet tea, coffee, biscuits, soaps, and detergent cartons.",
    },
  });

  const kg = await prisma.unit.findUniqueOrThrow({ where: { code: "kg" } });
  const litre = await prisma.unit.findUniqueOrThrow({ where: { code: "litre" } });
  const packet = await prisma.unit.findUniqueOrThrow({ where: { code: "packet" } });
  const piece = await prisma.unit.findUniqueOrThrow({ where: { code: "piece" } });

  const catGrains = await prisma.category.findUniqueOrThrow({ where: { slug: "rice-and-grains" } });
  const catPulses = await prisma.category.findUniqueOrThrow({ where: { slug: "pulses-and-dals" } });
  const catOils = await prisma.category.findUniqueOrThrow({ where: { slug: "oils-and-ghee" } });
  const catSpices = await prisma.category.findUniqueOrThrow({ where: { slug: "spices-and-masala" } });
  const catSnacks = await prisma.category.findUniqueOrThrow({ where: { slug: "snacks-and-biscuits" } });
  const catBeverages = await prisma.category.findUniqueOrThrow({ where: { slug: "tea-coffee-beverages" } });
  const catDairy = await prisma.category.findUniqueOrThrow({ where: { slug: "dairy-and-eggs" } });
  const catHousehold = await prisma.category.findUniqueOrThrow({ where: { slug: "household-and-personal-care" } });

  console.log("Seeding demo products...");

  const demoProducts = [
    // Grains
    { name: "Ponni Boiled Rice (Loose)", nameTamil: "பொன்னி புழுங்கல் அரிசி", slug: "ponni-boiled-rice-loose", catId: catGrains.id, unitId: kg.id, sellStep: 0.25, min: 0.25, max: 25, price: 62, mrp: 68, cost: 55, stock: 120, featured: true },
    { name: "Idli Rice (Loose)", nameTamil: "இட்லி அரிசி", slug: "idli-rice-loose", catId: catGrains.id, unitId: kg.id, sellStep: 0.25, min: 0.25, max: 25, price: 44, mrp: 48, cost: 38, stock: 80, featured: false },
    { name: "Raw Rice (Pacharisi)", nameTamil: "பச்சரிசி", slug: "raw-rice-pacharisi", catId: catGrains.id, unitId: kg.id, sellStep: 0.25, min: 0.25, max: 25, price: 58, mrp: 64, cost: 50, stock: 65, featured: false },
    { name: "Wheat Flour / Chakki Atta", nameTamil: "கோதுமை மாவு", slug: "wheat-flour-atta", catId: catGrains.id, unitId: kg.id, sellStep: 0.5, min: 0.5, max: 20, price: 46, mrp: 52, cost: 40, stock: 90, featured: true },
    { name: "Roasted Rava / Sooji", nameTamil: "வறுத்த ரவை", slug: "roasted-rava-sooji", catId: catGrains.id, unitId: kg.id, sellStep: 0.25, min: 0.25, max: 10, price: 48, mrp: 54, cost: 41, stock: 45, featured: false },
    { name: "Aval / Poha (Medium)", nameTamil: "அவல்", slug: "aval-poha-medium", catId: catGrains.id, unitId: kg.id, sellStep: 0.25, min: 0.25, max: 10, price: 52, mrp: 58, cost: 44, stock: 35, featured: false },

    // Pulses
    { name: "Toor Dal (First Quality)", nameTamil: "துவரம் பருப்பு", slug: "toor-dal-first-quality", catId: catPulses.id, unitId: kg.id, sellStep: 0.25, min: 0.25, max: 15, price: 165, mrp: 180, cost: 145, stock: 55, featured: true },
    { name: "Urad Dal (White Whole)", nameTamil: "உளுத்தம் பருப்பு", slug: "urad-dal-white-whole", catId: catPulses.id, unitId: kg.id, sellStep: 0.25, min: 0.25, max: 15, price: 135, mrp: 148, cost: 118, stock: 40, featured: true },
    { name: "Moong Dal (Yellow Split)", nameTamil: "பாசிப்பருப்பு", slug: "moong-dal-yellow-split", catId: catPulses.id, unitId: kg.id, sellStep: 0.25, min: 0.25, max: 10, price: 125, mrp: 138, cost: 108, stock: 30, featured: false },
    { name: "Chana Dal (Bengal Gram)", nameTamil: "கடலைப் பருப்பு", slug: "chana-dal-bengal-gram", catId: catPulses.id, unitId: kg.id, sellStep: 0.25, min: 0.25, max: 15, price: 92, mrp: 102, cost: 80, stock: 48, featured: false },
    { name: "Fried Gram / Pottukadalai", nameTamil: "பொட்டுக் கடலை", slug: "fried-gram-pottukadalai", catId: catPulses.id, unitId: kg.id, sellStep: 0.25, min: 0.25, max: 10, price: 110, mrp: 122, cost: 95, stock: 25, featured: false },

    // Oils
    { name: "Gingelly / Sesame Oil (Pure)", nameTamil: "நல்லெண்ணெய்", slug: "gingelly-sesame-oil-pure", catId: catOils.id, unitId: litre.id, sellStep: 0.5, min: 0.5, max: 10, price: 290, mrp: 320, cost: 260, stock: 35, featured: true },
    { name: "Groundnut Oil (Cold Pressed)", nameTamil: "கடலை எண்ணெய்", slug: "groundnut-oil-cold-pressed", catId: catOils.id, unitId: litre.id, sellStep: 0.5, min: 0.5, max: 10, price: 210, mrp: 230, cost: 188, stock: 45, featured: true },
    { name: "Sunflower Oil (1L Pouch)", nameTamil: "சூரியகாந்தி எண்ணெய்", slug: "sunflower-oil-1l-pouch", catId: catOils.id, unitId: packet.id, sellStep: 1, min: 1, max: 12, price: 142, mrp: 155, cost: 130, stock: 60, featured: false },
    { name: "Pure Cow Ghee (500 ml)", nameTamil: "பசு நெய்", slug: "pure-cow-ghee-500ml", catId: catOils.id, unitId: packet.id, sellStep: 1, min: 1, max: 6, price: 340, mrp: 365, cost: 305, stock: 20, featured: false },

    // Spices
    { name: "Guntur Red Chilli Powder (500g)", nameTamil: "மிளகாய்த் தூள்", slug: "red-chilli-powder-500g", catId: catSpices.id, unitId: packet.id, sellStep: 1, min: 1, max: 10, price: 180, mrp: 200, cost: 150, stock: 30, featured: true },
    { name: "Pure Turmeric Powder (250g)", nameTamil: "மஞ்சள் தூள்", slug: "turmeric-powder-250g", catId: catSpices.id, unitId: packet.id, sellStep: 1, min: 1, max: 10, price: 75, mrp: 85, cost: 62, stock: 40, featured: false },
    { name: "Cumin Seeds / Jeera (250g)", nameTamil: "சீரகம்", slug: "cumin-seeds-jeera-250g", catId: catSpices.id, unitId: packet.id, sellStep: 1, min: 1, max: 5, price: 110, mrp: 125, cost: 92, stock: 22, featured: false },
    { name: "Mustard Seeds / Kadugu (250g)", nameTamil: "கடுகு", slug: "mustard-seeds-kadugu-250g", catId: catSpices.id, unitId: packet.id, sellStep: 1, min: 1, max: 5, price: 38, mrp: 45, cost: 30, stock: 35, featured: false },
    { name: "Round Tamarind / Puli (500g)", nameTamil: "புளி", slug: "round-tamarind-puli-500g", catId: catSpices.id, unitId: packet.id, sellStep: 1, min: 1, max: 10, price: 115, mrp: 130, cost: 95, stock: 28, featured: false },
    { name: "Crystal Sea Salt / Kal Uppu (1kg)", nameTamil: "கல் உப்பு", slug: "crystal-sea-salt-1kg", catId: catSpices.id, unitId: packet.id, sellStep: 1, min: 1, max: 10, price: 18, mrp: 22, cost: 14, stock: 80, featured: false },
    { name: "Refined White Sugar (1kg)", nameTamil: "சர்க்கரை", slug: "refined-white-sugar-1kg", catId: catSpices.id, unitId: packet.id, sellStep: 1, min: 1, max: 20, price: 44, mrp: 48, cost: 39, stock: 110, featured: true },

    // Snacks
    { name: "Marie Gold Biscuits (250g)", nameTamil: "மாரி கோல்டு பிஸ்கட்", slug: "marie-gold-biscuits-250g", catId: catSnacks.id, unitId: packet.id, sellStep: 1, min: 1, max: 10, price: 35, mrp: 38, cost: 30, stock: 50, featured: false },
    { name: "Milk Bikis Classic (200g)", nameTamil: "மில்க் பிகிஸ்", slug: "milk-bikis-classic-200g", catId: catSnacks.id, unitId: packet.id, sellStep: 1, min: 1, max: 10, price: 30, mrp: 32, cost: 26, stock: 42, featured: false },
    { name: "Madurai Mixture (Spicy, 250g)", nameTamil: "மதுரை மிக்ஸர்", slug: "madurai-mixture-spicy-250g", catId: catSnacks.id, unitId: packet.id, sellStep: 1, min: 1, max: 6, price: 75, mrp: 85, cost: 62, stock: 18, featured: true },

    // Beverages
    { name: "Chakra Gold Tea (250g)", nameTamil: "சக்ரா கோல்ட் டீ", slug: "chakra-gold-tea-250g", catId: catBeverages.id, unitId: packet.id, sellStep: 1, min: 1, max: 8, price: 165, mrp: 180, cost: 142, stock: 35, featured: true },
    { name: "Narasu's Filter Coffee Powder (200g)", nameTamil: "நரசுஸ் காபி தூள்", slug: "narasus-filter-coffee-200g", catId: catBeverages.id, unitId: packet.id, sellStep: 1, min: 1, max: 6, price: 130, mrp: 142, cost: 112, stock: 24, featured: true },

    // Dairy
    { name: "Farm Fresh Eggs (Pack of 6)", nameTamil: "நாட்டுக்கோழி முட்டை", slug: "farm-fresh-eggs-pack-6", catId: catDairy.id, unitId: packet.id, sellStep: 1, min: 1, max: 6, price: 42, mrp: 45, cost: 36, stock: 30, featured: false },
    { name: "Aavin Standardized Milk (500ml)", nameTamil: "ஆவின் பால்", slug: "aavin-milk-500ml", catId: catDairy.id, unitId: packet.id, sellStep: 1, min: 1, max: 8, price: 24, mrp: 24, cost: 22, stock: 40, featured: false },

    // Household
    { name: "Rin Detergent Bar (250g)", nameTamil: "ரின் சோப்பு", slug: "rin-detergent-bar-250g", catId: catHousehold.id, unitId: piece.id, sellStep: 1, min: 1, max: 12, price: 20, mrp: 22, cost: 17, stock: 60, featured: false },
    { name: "Vim Dishwash Bar (300g)", nameTamil: "விம் பார்", slug: "vim-dishwash-bar-300g", catId: catHousehold.id, unitId: piece.id, sellStep: 1, min: 1, max: 10, price: 28, mrp: 30, cost: 23, stock: 55, featured: false },
  ];

  for (const item of demoProducts) {
    const p = await prisma.product.create({
      data: {
        slug: item.slug,
        name: item.name,
        nameTamil: item.nameTamil,
        categoryId: item.catId,
        baseUnitId: item.unitId,
        sellStep: item.sellStep,
        minQty: item.min,
        maxQty: item.max,
        sellingPrice: item.price,
        mrp: item.mrp,
        stockQty: item.stock,
        isPublished: true,
        isFeatured: item.featured,
        cost: {
          create: {
            lastCost: item.cost,
            lastCostAt: new Date(Date.now() - 7 * 86400 * 1000),
            avgCost: item.cost,
            costBasis: CostBasis.LATEST,
            pricedAtCost: item.cost,
          },
        },
        movements: {
          create: {
            type: "OPENING",
            quantityChange: item.stock,
            stockAfter: item.stock,
            reason: "OPENING_STOCK",
            note: "Initial store stock verification",
          },
        },
      },
    });

    await prisma.priceHistory.create({
      data: {
        productId: p.id,
        newPrice: item.price,
        costUsed: item.cost,
        markupPercent: ((item.price - item.cost) / item.cost) * 100,
      },
    });
  }

  // Flag 2 products with "price to review" (cost changed, pricedAtCost mismatch)
  const rice = await prisma.product.findUniqueOrThrow({ where: { slug: "ponni-boiled-rice-loose" } });
  await prisma.productCost.update({
    where: { productId: rice.id },
    data: {
      lastCost: 59, // Supplier increased from 55 to 59
      lastSupplierId: s1.id,
    },
  });

  const oil = await prisma.product.findUniqueOrThrow({ where: { slug: "gingelly-sesame-oil-pure" } });
  await prisma.productCost.update({
    where: { productId: oil.id },
    data: {
      lastCost: 275, // Supplier increased from 260 to 275
      lastSupplierId: s3.id,
    },
  });

  console.log("Seeding demo purchases...");
  // Purchase from Sri Murugan Wholesale Mandi
  await prisma.purchase.create({
    data: {
      supplierId: s1.id,
      purchaseDate: new Date(Date.now() - 14 * 86400 * 1000),
      invoiceNo: "SM-9821",
      subtotal: 5500,
      extraCharges: 150,
      total: 5650,
      notes: "Transport shared with other grain merchants.",
      status: "ACTIVE",
      items: {
        create: [
          {
            productId: rice.id,
            quantity: 100,
            unitId: kg.id,
            baseQty: 100,
            lineAmount: 5500,
            extraShare: 150,
            unitCost: 56.5,
          },
        ],
      },
    },
  });

  console.log("Seeding demo orders...");
  const order1 = await prisma.order.create({
    data: {
      orderNumber: "PS-1001",
      idempotencyKey: "11111111-1111-1111-1111-111111111111",
      status: "PLACED",
      fulfilment: "DELIVERY",
      customerName: "Senthil Kumar",
      customerPhone: "9000000001",
      addressLine: "14, West Masi Street",
      area: "Simmakkal",
      pincode: "625001",
      notes: "Please deliver after 6 PM.",
      subtotal: 310,
      deliveryFee: 20,
      total: 330,
      items: {
        create: [
          {
            productId: rice.id,
            productName: rice.name,
            unitLabel: "kg",
            quantity: 2,
            unitPrice: 62,
            lineTotal: 124,
          },
        ],
      },
      events: {
        create: {
          status: "PLACED",
          note: "Order request received from website",
        },
      },
    },
  });

  await prisma.order.create({
    data: {
      orderNumber: "PS-1002",
      idempotencyKey: "22222222-2222-2222-2222-222222222222",
      status: "ACCEPTED",
      fulfilment: "PICKUP",
      customerName: "Kavitha Rajan",
      customerPhone: "9000000002",
      subtotal: 535,
      deliveryFee: 0,
      total: 535,
      items: {
        create: [
          {
            productId: oil.id,
            productName: oil.name,
            unitLabel: "L",
            quantity: 1,
            unitPrice: 290,
            lineTotal: 290,
          },
        ],
      },
      events: {
        create: [
          { status: "PLACED", note: "Customer submitted request" },
          { status: "ACCEPTED", note: "Stock verified and accepted by shop" },
        ],
      },
    },
  });

  console.log("Demo seed complete! 32 products, suppliers, purchases, orders created.");
}

async function main() {
  const isDemo = process.env.SEED_DEMO === "true";
  const isReset = process.env.RESET_DEMO === "true";

  if (isReset) {
    await resetDemo();
  } else if (isDemo) {
    await seedDemo();
  } else {
    await seedProduction();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

