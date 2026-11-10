# Pandian Store — Client Demo Walkthrough Script

Use this script to demonstrate the complete, end-to-end functionality of Pandian Store to the shop owner or client.

---

## Demo Flow Overview

```
[1. Owner Login & Dashboard]
         ↓
[2. Record Wholesale Purchase (Pack Helper + Transport Fee)]
         ↓
[3. Pricing Suggestion Review & MRP Guard]
         ↓
[4. Customer Storefront Ordering & Guest Checkout]
         ↓
[5. Owner Order Management (Accept, Stock Deduction, Pack)]
         ↓
[6. Print Order Slip & WhatsApp Customer Notification]
         ↓
[7. Privacy Mode (One-click cost masking)]
```

---

## Step 1: Owner Login & Dashboard (2 mins)

1. Open `/admin/login`.
2. Log in using owner credentials (`owner@pandianstore.in`).
3. Point out the **Dashboard** metrics:
   - 5 simple summary cards: New Orders, Low Stock Items, Total Catalog Items, Stock Valuation, Prices to Review.
   - Explain: *"Everything you need to see when opening the shop in the morning is right here."*

---

## Step 2: Record a Wholesale Purchase (3 mins)

1. Click **Purchases** (`/admin/purchases`) or tap **"Buy"** in the bottom mobile nav.
2. Click **"Record Purchase"**.
3. Select supplier: **"Meenakshi Rice Mill"** (or click `+ Add Wholesale Store` to show inline addition).
4. Add line 1:
   - Product: **"Ponni Boiled Rice"** (show English + Tamil search).
   - Quantity: Use the **Pack Helper**:
     - 2 bags of 25 kg each = **50 kg**.
   - Price: Paid ₹2,400 total. Rate automatically computes to ₹48.00/kg.
5. Add line 2:
   - Product: **"Idli Rice"** — 25 kg @ ₹950 (₹38.00/kg).
6. Extra charges:
   - Enter **₹100** for auto cartage / loading.
   - Show how the ₹100 is allocated proportionally between Ponni Rice and Idli Rice so unit cost reflects true landing cost.
7. Click **"Save Purchase"**.
8. Notice the **"Review Selling Prices"** popup:
   - The system displays the new cost and suggests competitive selling prices based on the shop's default profit markup.

---

## Step 3: Selling Price & MRP Guard (2 mins)

1. Open **Pricing** (`/admin/pricing`).
2. Point out the **Markup vs. Margin** banner:
   - Simple explainer in plain English and Tamil.
3. Test the **MRP Guard**:
   - Try to set the selling price higher than the MRP.
   - Show that the system immediately blocks it with a clear notice: *"Selling price cannot exceed MRP."*
4. Test the **Below-Cost Warning**:
   - Try setting a price lower than what was paid.
   - Show the red below-cost warning protecting the owner against accidental losses.

---

## Step 4: Customer Storefront Experience (3 mins)

1. Open `/` in a new incognito window (as a customer).
2. Point out the Amazon-inspired but clean, Tamil-grocery friendly design:
   - Leaf green and turmeric warm palette.
   - Top category strip with icons.
   - Live debounced search: Type `dal` or `அரிசி` and see live product suggestions.
3. Add items to cart:
   - Click `+` on **Toor Dal** (shows quantity stepper `− 1kg +`).
   - Notice the cart icon in the top header and mobile bottom bar updates with a badge count.
4. Go to `/cart`:
   - Point out the **Free Delivery Progress Bar**: *"Add ₹120 more to unlock free delivery!"*
5. Proceed to `/checkout`:
   - Simple, single-page guest checkout (no confusing passwords or app downloads required).
   - Choose **Home Delivery**.
   - Enter customer name (`Murugan`), mobile number (`9842112345`), address (`18 North Street`).
   - Click **"Send Order Request"**.
6. The customer receives confirmation page (`/order-success/PS-1001`) with a direct **"Send on WhatsApp"** button.

---

## Step 5: Owner Accepts Order & Stock Automatically Deducts (3 mins)

1. Switch back to the `/admin/orders` portal.
2. The order **PS-1001** appears immediately under **"New Requests"** with a bright badge.
3. Click into the order:
   - Point out customer details, delivery address, phone, and item list.
   - Notice the owner cost column showing the item purchase cost and estimated gross margin.
4. Click **"Accept Order & Reserve Stock"**:
   - The system validates inventory in real time.
   - The stock is deducted immediately, and a `StockMovement` is recorded in the ledger.
5. Click **"Start Packing"**: Status moves to `Being Packed`.
6. Click **"Mark Ready"**: Status moves to `Ready for Delivery`.

---

## Step 6: Print Order Slip & WhatsApp Customer (2 mins)

1. Click **"Print Slip"**:
   - A clean A5 order slip opens ready for thermal or paper printing.
   - Point out: Shop address, phone, item quantities, total payable, and "Payment: Cash/UPI on delivery". Strictly zero wholesale cost leaks.
2. Click **"WhatsApp Customer"**:
   - Pre-fills a WhatsApp message to Murugan with his order details and status confirmation.

---

## Step 7: Privacy Mode Demo (1 min)

1. Return to the admin dashboard or inventory screen.
2. Look at the top bar and click **"Privacy mode"** (Eye icon).
3. Every wholesale purchase cost, profit figure, and markup percentage on the screen instantly blurs.
4. Explain: *"When a customer walks into the shop or an employee is helping at the counter, your profit and wholesale costs are 100% private."*

