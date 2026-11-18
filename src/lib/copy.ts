/**
 * Central copy repository for Pandian Store.
 * All user-facing strings follow these rules:
 * - Plain, specific language (no jargon: no markup, margin, cost basis, base unit, void)
 * - Active voice
 * - Exact verb CTAs ("Save purchase", not "SAVE PURCHASE")
 * - Shop terminology: stock, bill, wholesale shop, what you paid, selling price, profit
 * - Errors say what to do, not just what went wrong
 * - Bilingual: { en, ta } for every admin string
 */

export type BilingualString = { en: string; ta: string };

function bi(en: string, ta: string): BilingualString {
  return { en, ta };
}

export const copy = {
  shop: {
    name: "Pandian Store",
    tagline: "Fresh groceries for your family",
    taxInclusiveNote: "Prices include taxes. Pay on delivery or at the shop.",
    notAcceptingOrders:
      "We are not taking new orders right now. You can still browse our products.",
    minOrderWarning: (min: string) =>
      `Minimum order amount is ${min}. Add more items to place an order.`,
    freeDeliveryUnlocked: "You have unlocked free delivery!",
    freeDeliveryRemaining: (rem: string) =>
      `Add ${rem} more to get free delivery.`,
    paymentMethodNote: "Payment is cash or UPI on delivery or at the shop.",
  },

  storefront: {
    searchPlaceholder: "Search for rice, dal, oil, spices...",
    searchSuggestions: "Popular searches",
    noSearchResults: (query: string) =>
      `No products found for "${query}". Try checking your spelling or search by category.`,
    emptyCartTitle: "Your cart is empty",
    emptyCartDescription: "Add items from the store to fill your cart.",
    continueShopping: "Browse products",
    addToCart: "Add",
    addedToCart: "Added to cart",
    inStock: "In stock",
    lowStock: (qty: string) => `Only ${qty} left`,
    outOfStock: "Out of stock",
    saveAmount: (amount: string) => `Save ${amount}`,
    quickPicks: "Quick select:",
    trackOrderPrompt: "Enter your order number and phone to check status.",
    sendOrderRequest: "Send order request",
    orderRequestSent: "Order request sent",
    orderRequestConfirmation:
      "Your order request has been sent to Pandian Store. The shop will confirm it shortly.",
    sendOnWhatsApp: "Send order on WhatsApp",
  },

  admin: {
    // Navigation
    nav: {
      home: bi("Home", "முகப்பு"),
      orders: bi("Orders", "ஆர்டர்கள்"),
      buy: bi("Buy", "வாங்கு"),
      items: bi("Items", "பொருட்கள்"),
      shops: bi("Shops", "கடைகள்"),
      settings: bi("Settings", "அமைப்புகள்"),
    },

    // Privacy mode
    privacyMode: {
      enable: bi("Mask costs", "செலவை மறை"),
      disable: bi("Show costs", "செலவைக் காட்டு"),
      activeNote: bi(
        "Costs and profits are hidden.",
        "செலவு மற்றும் லாபம் மறைக்கப்பட்டுள்ளது."
      ),
    },

    // Home screen
    home: {
      title: bi("Pandian Store", "பாண்டியன் கடை"),
      searchPlaceholder: bi(
        "Search items, shops, bills...",
        "பொருட்கள், கடைகள் தேடுங்கள்..."
      ),
      takingOrders: bi("Taking orders", "ஆர்டர் வாங்குகிறோம்"),
      pausedOrders: bi("Orders paused", "ஆர்டர் நிறுத்தப்பட்டது"),
      newOrdersBtn: bi("New orders", "புதிய ஆர்டர்கள்"),
      recordPurchaseBtn: bi("Record a purchase", "வாங்கியதை பதிவு செய்"),
      checkItemBtn: bi("Check an item", "பொருள் பார்க்க"),
      needsAttention: bi("Needs attention", "கவனம் தேவை"),
      lowStockItem: (name: string, qty: string, unit: string) =>
        bi(`${name} — ${qty} ${unit} left`, `${name} — ${qty} ${unit} மட்டும் உள்ளது`),
      noLowStock: bi("All items are well-stocked.", "அனைத்து பொருட்களும் போதுமான அளவு உள்ளன."),
    },

    // Orders
    orders: {
      title: bi("Orders", "ஆர்டர்கள்"),
      tabNew: bi("New", "புதியவை"),
      tabInProgress: bi("In progress", "நடக்கிறது"),
      tabDone: bi("Done", "முடிந்தவை"),
      confirmOrder: bi("Confirm order", "ஆர்டர் உறுதிப்படுத்து"),
      startPacking: bi("Start packing", "பேக்கிங் தொடங்கு"),
      markReady: bi("Mark ready", "தயார் என குறி"),
      completeOrder: bi("Order delivered", "டெலிவரி முடிந்தது"),
      cancelOrder: bi("Cancel this order", "ஆர்டர் ரத்து செய்"),
      rejectOrder: bi("Can't accept", "ஏற்க முடியாது"),
      messageCustomer: bi("WhatsApp customer", "WhatsApp அனுப்பு"),
      delivery: bi("Delivery", "டெலிவரி"),
      pickup: bi("Pickup", "கடையில் வாங்க"),
      reasonPlaceholder: bi("Why? (shown to customer)", "காரணம்? (வாடிக்கையாளருக்கு தெரியும்)"),
      emptyNew: bi(
        "No new orders right now.",
        "இப்போது புதிய ஆர்டர்கள் இல்லை."
      ),
      emptyInProgress: bi(
        "No orders in progress.",
        "நடக்கும் ஆர்டர்கள் இல்லை."
      ),
      emptyDone: bi("No completed orders today.", "இன்று முடிந்த ஆர்டர்கள் இல்லை."),
    },

    // Buy flow (record purchase)
    buy: {
      title: bi("Record a purchase", "வாங்கியதை பதிவு செய்"),
      stepShop: bi("Which shop?", "எந்த கடை?"),
      stepItems: bi("What did you buy?", "என்ன வாங்கினீர்கள்?"),
      stepReview: bi("Review and save", "சரிபார்த்து சேமி"),
      shopSearchPlaceholder: bi("Search shops...", "கடை தேடுங்கள்..."),
      addNewShop: bi("Add a new shop", "புதிய கடை சேர்"),
      itemSearchPlaceholder: bi("Search items...", "பொருள் தேடுங்கள்..."),
      addNewItem: bi("New item", "புதிய பொருள்"),
      howMany: bi("How many?", "எத்தனை?"),
      howMuch: bi("How much did you pay?", "எவ்வளவு கொடுத்தீர்கள்?"),
      totalSwitch: bi("Total amount", "மொத்த தொகை"),
      perUnitSwitch: bi("Per unit", "ஒன்றுக்கு"),
      addMoreItems: bi("+ Add more items", "+ மேலும் பொருட்கள் சேர்"),
      extraDetails: bi("More details (optional)", "மேல் விவரங்கள் (விருப்பம்)"),
      billNumber: bi("Bill number", "பில் எண்"),
      extraCharges: bi("Transport / other charges", "போக்குவரத்து / மற்றவை"),
      notes: bi("Notes", "குறிப்புகள்"),
      savePurchase: bi("Save purchase", "வாங்கியதை சேமி"),
      purchaseSaved: bi("Purchase saved.", "வாங்கியது சேமிக்கப்பட்டது."),
      reviewPricesPrompt: bi(
        "Some prices changed. Do you want to update selling prices?",
        "சில விலைகள் மாறியுள்ளன. விற்பனை விலை மாற்றணுமா?"
      ),
      setNow: bi("Set prices now", "இப்போதே விலை வை"),
      skipForNow: bi("Skip for now", "பிறகு பார்க்கலாம்"),
    },

    // Items screen
    items: {
      title: bi("Items", "பொருட்கள்"),
      searchPlaceholder: bi("Search by name or Tamil name...", "பெயர் அல்லது தமிழில் தேடுங்கள்..."),
      filterAll: bi("All", "அனைத்தும்"),
      filterLow: bi("Running low", "குறைவாக உள்ளது"),
      filterOut: bi("Out of stock", "தீர்ந்தது"),
      filterNeedsPrice: bi("Needs price", "விலை வையுங்கள்"),
      emptyState: bi(
        "No items yet. Add items when you record a purchase.",
        "பொருட்கள் இல்லை. வாங்கும்போது சேர்க்கலாம்."
      ),
      stock: bi("in stock", "உள்ளது"),
      outOfStock: bi("Out of stock", "தீர்ந்தது"),
      noPrice: bi("No price set", "விலை இல்லை"),
    },

    // Item detail
    itemDetail: {
      editItem: bi("Edit item", "பொருளை திருத்து"),
      stockSection: bi("Stock", "சரக்கு"),
      addStock: bi("Add stock", "சரக்கு சேர்"),
      removeStock: bi("Remove stock", "சரக்கு குறை"),
      setStock: bi("Set exact amount", "சரியான அளவு வை"),
      reasonDamaged: bi("Damaged", "சேதமானது"),
      reasonExpired: bi("Expired", "காலாவதியானது"),
      reasonCorrection: bi("Count correction", "எண்ணிக்கை சரி செய்தல்"),
      priceSection: bi("Selling price", "விற்பனை விலை"),
      youPaid: bi("You paid", "கொடுத்தது"),
      youEarn: bi("You earn", "கிடைக்கும் லாபம்"),
      mrp: bi("MRP", "அதிகபட்ச விலை"),
      savePrice: bi("Save price", "விலை சேமி"),
      keepCurrentPrice: bi("Keep current price", "தற்போதைய விலை வை"),
      boughtFrom: bi("Bought from", "எங்கிருந்து வாங்கினீர்கள்"),
      aliases: bi("Also known as (nicknames)", "வேறு பெயர்கள்"),
      addAlias: bi("Add a nickname", "புனைப்பெயர் சேர்"),
      priceBelowCost: bi(
        "This price is below what you paid. You will lose money on each sale.",
        "இந்த விலை நீங்கள் கொடுத்ததை விட குறைவு. ஒவ்வொரு விற்பனையிலும் நஷ்டம் வரும்."
      ),
      sliderDisabled: bi(
        "Cannot set price: MRP is below your cost. Update MRP or cost first.",
        "விலை வைக்க முடியாது: MRP உங்கள் செலவை விட குறைவு."
      ),
    },

    // Shops screen
    shops: {
      title: bi("Shops", "கடைகள்"),
      searchPlaceholder: bi("Search shops...", "கடை தேடுங்கள்..."),
      addShop: bi("Add a shop", "கடை சேர்"),
      lastVisited: bi("Last visit", "கடைசி வருகை"),
      boughtHere: bi("Items bought here", "இங்கிருந்து வாங்கியவை"),
      callShop: bi("Call shop", "கடைக்கு அழை"),
      recordPurchaseHere: bi("Record a purchase from here", "இங்கிருந்து வாங்கியதை பதிவு செய்"),
      emptyState: bi(
        "No shops yet. Add a shop when you record your first purchase.",
        "கடைகள் இல்லை. முதல் வாங்குதல் பதிவு செய்யும்போது கடை சேர்க்கலாம்."
      ),
    },

    // Settings screen
    settings: {
      title: bi("Settings", "அமைப்புகள்"),
      shopSection: bi("Shop details", "கடை விவரங்கள்"),
      shopName: bi("Shop name", "கடை பெயர்"),
      phone: bi("Phone", "தொலைபேசி"),
      whatsapp: bi("WhatsApp", "WhatsApp"),
      address: bi("Address", "முகவரி"),
      hours: bi("Opening hours", "திறக்கும் நேரம்"),
      orderingSection: bi("Ordering", "ஆர்டர்"),
      deliveryOn: bi("Delivery", "டெலிவரி"),
      pickupOn: bi("Pickup", "கடையில் வாங்க"),
      minimumOrder: bi("Minimum order amount", "குறைந்த ஆர்டர் தொகை"),
      languageSection: bi("Language", "மொழி"),
      langBoth: bi("Both (Tamil + English)", "இரண்டும்"),
      langTamil: bi("Tamil only", "தமிழ் மட்டும்"),
      langEnglish: bi("English only", "ஆங்கிலம் மட்டும்"),
      viewStore: bi("View customer store", "வாடிக்கையாளர் கடை பார்க்க"),
      changePassword: bi("Change password", "கடவுச்சொல் மாற்று"),
      currentPassword: bi("Current password", "தற்போதைய கடவுச்சொல்"),
      newPassword: bi("New password", "புதிய கடவுச்சொல்"),
      saveSettings: bi("Save settings", "அமைப்புகளை சேமி"),
      settingsSaved: bi("Settings saved.", "அமைப்புகள் சேமிக்கப்பட்டன."),
      logout: bi("Log out", "வெளியேறு"),
    },

    // Voice search
    voice: {
      listening: bi("Listening...", "கேட்கிறேன்..."),
      heard: bi("I heard:", "கேட்டது:"),
      tapToSearch: bi("Tap to search by voice", "குரலால் தேட தட்டுங்கள்"),
      notSupported: bi(
        "Voice search is not supported on this browser.",
        "இந்த உலாவியில் குரல் தேடல் ஆதரிக்கப்படவில்லை."
      ),
    },
  },

  errors: {
    generic: "Something went wrong. Try again.",
    notFound: "This item was not found.",
    unauthorized: "Please log in to continue.",
    stockInsufficient: (item: string, available: string) =>
      `Only ${available} available for ${item}.`,
    cannotCancelSold:
      "Some of this stock has already been sold. Use a stock adjustment instead.",
    priceAboveMRP: (price: string, mrp: string) =>
      `₹${price} is above the MRP of ₹${mrp}. Lower the price to save.`,
    priceBelowCost: (price: string, cost: string) =>
      `₹${price} is below what you paid (₹${cost}). You will lose money.`,
    reasonRequired: "Please give a reason before continuing.",
  },
} as const;
