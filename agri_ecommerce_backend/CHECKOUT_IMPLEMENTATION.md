# Checkout Implementation - Stock Check & Deduction

## Overview
This implementation follows the correct e-commerce pattern where stock is only checked and deducted during checkout, not when adding items to cart.

## Database Tables

### Orders Table
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
    shipping_address_id INTEGER REFERENCES addresses(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Order Items Table
```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price_at_time DECIMAL(10,2) NOT NULL CHECK (price_at_time >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Checkout Flow

### 1. Add to Cart (No Stock Deduction)
- Items are added to `cart_items` table
- No stock validation or deduction
- Users can add items freely

### 2. Proceed to Checkout (Stock Check & Deduction)
When user clicks "Proceed to Checkout":

#### a. Check Current Stock
```sql
SELECT stock FROM products WHERE id = ?;
```

#### b. If Enough Stock, Proceed:
1. **Begin Transaction** (DB-level transaction for atomicity)
2. **Deduct Stock**:
   ```sql
   UPDATE products SET stock = stock - ? WHERE id = ?;
   ```
3. **Insert Order** into orders table
4. **Insert Order Items** into order_items table
5. **Clear User's Cart**
6. **Log Stock Changes** in stock_logs table
7. **Commit Transaction**

#### c. If Not Enough Stock:
- Show message: "Sorry, only X left in stock."
- Return detailed stock issues
- Allow user to update their cart
- No transaction committed

## API Endpoints

### POST /api/checkout
**Request:**
```json
{
  "shippingAddressId": 123  // Optional
}
```

**Success Response (201):**
```json
{
  "message": "Order placed successfully",
  "orderId": 456,
  "totalAmount": 299.99,
  "orderItems": [...]
}
```

**Stock Insufficient Response (400):**
```json
{
  "message": "Some items have insufficient stock",
  "stockIssues": [
    {
      "productId": 1,
      "productName": "Product Name",
      "requestedQuantity": 5,
      "availableStock": 3,
      "message": "Sorry, only 3 left in stock for Product Name"
    }
  ],
  "type": "stock_insufficient"
}
```

## Frontend Implementation

### Cart Component Features:
- **Checkout Button**: Triggers the checkout process
- **Stock Validation**: Shows stock issues dialog if insufficient stock
- **Loading State**: Shows "Processing..." during checkout
- **Error Handling**: Displays checkout errors
- **Success Flow**: Shows order confirmation and closes cart

### Stock Issues Dialog:
- Lists all products with insufficient stock
- Shows requested vs available quantities
- Allows user to close and update cart

## Benefits of This Approach

1. **No Premature Stock Locking**: Stock isn't locked when users add to cart
2. **Better User Experience**: Users can add items freely without stock restrictions
3. **Accurate Stock Management**: Stock is only deducted when orders are actually placed
4. **Concurrent User Support**: Multiple users can add the same product to their carts
5. **Atomic Transactions**: All operations (stock deduction, order creation, cart clearing) happen in a single transaction

## Setup Instructions

1. **Run Database Scripts:**
   ```bash
   psql -d your_database -f scripts/create_order_tables.sql
   ```

2. **Restart Backend Server:**
   The checkout endpoint is automatically available at `/api/checkout`

3. **Frontend Updates:**
   The Cart component now includes checkout functionality with stock validation

## Testing

### Test Scenarios:
1. **Normal Checkout**: Add items to cart, checkout successfully
2. **Stock Insufficient**: Add more items than available stock, attempt checkout
3. **Empty Cart**: Try to checkout with empty cart
4. **Concurrent Users**: Multiple users adding same product to cart

### Expected Behavior:
- Stock is only deducted during checkout
- Stock issues are clearly communicated to users
- Orders are created atomically
- Cart is cleared after successful checkout 