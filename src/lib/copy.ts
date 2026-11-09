/**
 * Central copy repository for Pandian Store.
 * All user-facing strings follow Section 13 rules:
 * - Plain, specific language
 * - Active voice
 * - Exact verb CTAs
 * - Shop terminology (stock, bill, wholesale store, what you paid, selling price, profit)
 * - Clear error and state descriptions without apologies or developer jargon
 */

export const copy = {
  shop: {
    name: "Pandian Store",
    tagline: "Fresh groceries for your family",
    taxInclusiveNote: "Prices include taxes. Pay on delivery or at the shop.",
    notAcceptingOrders: "We are not taking new orders right now. You can still browse our products.",
    minOrderWarning: (min: string) => `Minimum order amount is ${min}. Add more items to place an order.`,
    freeDeliveryUnlocked: "You have unlocked free delivery!",
    freeDeliveryRemaining: (rem: string) => `Add ${rem} more to get free delivery.`,
    paymentMethodNote: "Payment is cash or UPI on delivery or at the shop.",
  },

  storefront: {
    searchPlaceholder: "Search for rice, dal, oil, spices...",
    searchSuggestions: "Popular searches",
    noSearchResults: (query: string) => `No products found for "${query}". Try checking your spelling or search by category.`,
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
    orderRequestConfirmation: "Your order request has been sent to Pandian Store. The shop will confirm it shortly.",
    sendOnWhatsApp: "Send order on WhatsApp",
  },

  admin: {
    privacyMode: {
      enable: "Mask costs",
      disable: "Show costs",
      activeNote: "Privacy mode is on: costs, markups, and profits are masked.",
    },
    dashboard: {
      newOrdersTitle: "New orders",
      lowStockTitle: "Low stock items",
      monthlyPurchasesTitle: "Purchases this month",
      stockValueTitle: "Total stock value",
      pricesToReviewTitle: "Prices to review",
      pauseOrders: "Pause online orders",
      resumeOrders: "Accept online orders",
    },
    purchases: {
      newTitle: "Record purchase",
      supplierLabel: "Wholesale store",
      selectSupplier: "Select or add wholesale store",
      addNewSupplier: "Add new wholesale store",
      productLabel: "Product",
      selectProduct: "Search product (English or Tamil)",
      addNewProduct: "Add new product",
      quantityLabel: "Quantity",
      unitLabel: "Unit",
      packContentsLabel: (packName: string, baseName: string) => `Each ${packName} contains`,
      rateLabel: "Rate per entered unit",
      lineTotalLabel: "Line total (what you paid)",
      extraChargesLabel: "Extra charges (transport, loading)",
      savePurchase: "Save purchase",
      purchaseSaved: "Purchase saved successfully",
      reviewPricesTitle: "Review selling prices",
      applySelectedPrices: "Apply selected prices",
      skipForNow: "Skip for now (review later)",
      costComparison: {
        higher: (pct: string) => `${pct}% higher than last purchase`,
        lower: (pct: string) => `${pct}% lower than last purchase`,
        same: "Same as last purchase",
      },
    },
    pricing: {
      title: "Selling prices & markups",
      helperText: "Markup is the percentage added to what you paid. Margin is the percentage of profit in the final price.",
      costBasisLatest: "Using latest purchase cost",
      costBasisAverage: "Using average purchase cost",
      applyRecommended: "Apply recommended prices to selected items",
      belowCostWarning: "Warning: Selling price is below purchase cost.",
      aboveMRPError: "Error: Selling price cannot exceed MRP.",
    },
    orders: {
      title: "Customer orders",
      acceptOrder: "Accept order",
      rejectOrder: "Reject order",
      startProcessing: "Start packing",
      markReady: "Mark ready for pickup / delivery",
      completeOrder: "Complete order",
      cancelOrder: "Cancel order",
      printSlip: "Print order slip",
      messageCustomer: "Message on WhatsApp",
    },
  },

  errors: {
    generic: "Something went wrong. Please try again.",
    notFound: "The requested item was not found.",
    unauthorized: "Please log in to continue.",
    stockInsufficient: (item: string, available: string) => `Only ${available} available for ${item}.`,
    cannotVoidSold: "Some of this stock is already sold. Use a stock adjustment instead.",
  },
} as const;

