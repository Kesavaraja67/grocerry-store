# Pandian Store — Shop Owner Guide (கடை உரிமையாளர் கையேடு)

Welcome to the **Pandian Store** Owner Portal (`/admin`). This guide is written in simple, plain language to help you run your daily shop operations smoothly.

---

## 1. Quick Start & Logging In

1. Open your browser and navigate to `/admin`.
2. Enter your email and password (initial credentials provided in `.env`).
3. After logging in, you will see your **Dashboard** (`/admin`) with today's summary:
   - **New orders**: Incoming requests from customers waiting for confirmation.
   - **Low stock**: Items running low that need wholesale purchase.
   - **Stock valuation**: Total purchase value of current inventory.
   - **Prices to review**: Products where new wholesale purchase prices require selling price updates.

> **Tip:** You will stay logged in for 14 days on this device.

---

## 2. Privacy Mode (மறைவுப் பயன்முறை)

If customers or visitors are standing near your counter or looking at your screen, turn on **Privacy Mode**:

- Click the **"Privacy mode"** (Eye icon) button in the top bar.
- When active, all wholesale purchase costs, markup percentages, and estimated profit amounts are blurred out.
- The selling prices remain visible so you can still check customer prices.
- Click it again (**"Costs masked"**) anytime to reveal costs.

---

## 3. Recording Wholesale Purchases (மொத்த கொள்முதல் பதிவு)

When you return from the wholesale market (or receive a delivery from a wholesale merchant):

1. Go to **Purchases** (`/admin/purchases`) and click **"Record Purchase"** (or tap **"Buy"** in the mobile navigation).
2. **Select Wholesale Store (Supplier)**:
   - Choose the supplier from the dropdown, or click **"+ Add Wholesale Store"** to quickly add a new merchant with their phone and area.
3. **Date & Bill Number**:
   - Set the purchase bill date and optional bill/invoice number.
4. **Add Items**:
   - For each item, search for the product name (in English or Tamil).
   - If it's a new item not yet in your system, click **"+ Add Product"** to create it on the spot.
   - **Units & Pack Helper**:
     - If you bought loose or base units (e.g., 50 kg of rice), enter `50` and select `kg`.
     - If you bought in wholesale packs (e.g., 2 boxes of 24 pieces each), use the **Pack Helper**: enter `2` boxes, and `24` pieces per box. The system automatically converts this to `48 pieces` for inventory.
   - **Line Total & Rate**:
     - Enter either what you paid in total for the line or the rate per unit; the system automatically calculates the other.
5. **Extra Charges (ஏற்றுக்கூலி, வண்டி வாடகை)**:
   - If you paid transport, cartage, or auto loading charges for this bill (e.g., ₹200), enter it in **"Extra charges"**.
   - The system automatically and proportionally allocates this extra charge across all items on the bill so your true unit cost is 100% accurate.
6. **Save Purchase**:
   - Click **"Save Purchase"**.
   - If any item's purchase price has changed, a **"Review Selling Prices"** window will appear immediately, showing recommended selling prices with your standard profit margins.

---

## 4. Managing Customer Orders (வாடிக்கையாளர் ஆர்டர்கள்)

Customers submit order requests through the storefront (`/`).

### Order Status Stages:

1. **New Request (`PLACED` / புதியவை)**:
   - Customer has submitted the cart with their phone number and delivery address (or store pickup).
   - Click **"Accept Order"**: The system verifies you have enough stock, reserves the stock, and records the cost.
   - **Need to change quantity?** If a customer requested 2 kg but you only have 1 kg, click **"Adjust Items"** before accepting to modify quantities or remove items.
   - If you cannot fulfill the order, click **"Reject"** and pick a reason (e.g., "Out of stock").
2. **Accepted (`ACCEPTED` / ஏற்றுக்கொள்ளப்பட்டது)**:
   - Order is confirmed and stock is reserved.
   - Click **"Start Packing"** when you begin weighing and bagging the items.
3. **Being Packed (`PROCESSING` / பேக்கிங்)**:
   - Items are being weighed, bagged, and boxed.
   - Click **"Mark Ready"** once packed and packaged.
4. **Ready (`READY` / தயார்)**:
   - Order is ready for customer pickup at counter, or ready for delivery person to take.
   - When delivered or collected, click **"Complete Order"**.
5. **Cancelled (`CANCELLED` / ரத்து)**:
   - If a customer calls to cancel after acceptance, click **"Cancel Order"**.
   - The system **automatically restores the reserved stock** back to your inventory!

### Communicating with Customers:

- Every order screen has a **"WhatsApp Customer"** button. Clicking it opens a pre-composed WhatsApp message with the customer's name, order number, current status, item breakdown, and total bill amount.
- Click **"Call"** to phone the customer directly.

### Printing Order Slips (A5 / Thermal):

- Click **"Print Slip"** on any order card or detail screen.
- A clean, professional **Order Slip** opens.
- Press **Ctrl + P** (or tap **"Print Order Slip"**) to print on standard A5 or thermal receipt paper.
- The order slip shows the shop name, phone, customer address, items list, and total amount. It strictly hides internal wholesale costs.

---

## 5. Pricing Engine & Profit Margins (விலை நிர்ணயம்)

Navigate to **Pricing** (`/admin/pricing`) to review and adjust your catalog prices:

- **Markup vs. Margin**:
  - **Markup** is the percentage added on top of what you paid (e.g., buy at ₹100 + 20% markup = ₹120 selling price).
  - **Margin** is the percentage of profit in the final rupee collected (₹20 profit on ₹120 = 16.7% margin).
- **Price Suggestions**:
  - The pricing engine gives you 3 calculated suggestions:
    - **Low** (competitive neighbourhood price)
    - **Recommended** (your standard category markup, typically 12% to 20%)
    - **High** (premium price)
- **MRP Guard**:
  - The system will never allow a selling price higher than the Maximum Retail Price (MRP).
- **Below-Cost Alert**:
  - If you enter a price below what you paid, a clear red warning appears to prevent accidental losses.
- **Cost Basis Toggle**:
  - You can base your pricing on either **Latest Purchase Cost** (replacement cost) or **Moving Average Cost** (weighted ledger average).

---

## 6. Inventory & Stock Adjustments (சரக்கு இருப்பு)

Navigate to **Inventory** (`/admin/inventory`) to track stock levels:

- **Filter by Status**: View In Stock, Low Stock (below threshold), or Out of Stock items.
- **Adjust Stock**:
  - If goods are damaged by rain, rodent, or expired, click **"Adjust Stock"**.
  - Choose **Remove**, enter the quantity, select the reason (**Damaged**, **Expired**, or **Count Correction**), and add an optional note.
  - The ledger keeps a permanent chronological record of every movement.

---

## 7. Daily Routine Checklist

- **Morning (7:00 AM)**:
  - Check **Dashboard** (`/admin`) for pending overnight orders.
  - Check **Low Stock** alerts to write your market purchase list.
- **Midday**:
  - Record wholesale purchase bills from market trips.
  - Review and confirm incoming customer delivery requests.
  - Print order slips and bag items.
- **Evening (9:00 PM)**:
  - Check completed orders and total collection.
  - If you are closing for a festival or holiday, go to **Settings** (`/admin/settings`) and toggle **"Accept Online Orders"** to Paused.
