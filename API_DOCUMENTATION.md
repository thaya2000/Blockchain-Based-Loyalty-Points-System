# Blockchain Loyalty Platform - API Documentation

## Base URL
```
http://localhost:3001/api
```

## Authentication
Currently no authentication required. In production, implement JWT or similar.

---

## Products API

### 1. List Products
```http
GET /api/products
```

**Query Parameters:**
- `merchantId` (optional): Filter by merchant UUID
- `available` (optional): Filter by availability (true/false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "merchantId": "uuid",
      "name": "Product Name",
      "description": "Product description",
      "imageUrl": "https://...",
      "priceSol": 1000000,
      "priceLoyaltyPoints": 50000,
      "loyaltyPointsReward": 100,
      "stockQuantity": 50,
      "isAvailable": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "businessName": "Merchant Name"
    }
  ]
}
```

### 2. Get Product by ID
```http
GET /api/products/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "merchantId": "uuid",
    "name": "Product Name",
    "description": "Product description",
    "imageUrl": "https://...",
    "priceSol": 1000000,
    "priceLoyaltyPoints": 50000,
    "loyaltyPointsReward": 100,
    "stockQuantity": 50,
    "isAvailable": true,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "businessName": "Coffee Shop",
    "walletAddress": "ABC...XYZ"
  }
}
```

### 3. Create Product
```http
POST /api/products
```

**Request Body:**
```json
{
  "merchantId": "uuid",
  "name": "Product Name",
  "description": "Product description",
  "imageUrl": "https://...",
  "priceSol": 1000000,
  "priceLoyaltyPoints": 50000,
  "loyaltyPointsReward": 100,
  "stockQuantity": 50
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Product object */ }
}
```

### 4. Update Product
```http
PATCH /api/products/:id
```

**Request Body (all fields optional):**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "imageUrl": "https://...",
  "priceSol": 1200000,
  "priceLoyaltyPoints": 60000,
  "loyaltyPointsReward": 120,
  "stockQuantity": 45,
  "isAvailable": false
}
```

### 5. Delete Product
```http
DELETE /api/products/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

---

## Orders API

### 1. List Orders
```http
GET /api/orders
```

**Query Parameters:**
- `customerWallet` (optional): Filter by customer wallet address
- `merchantId` (optional): Filter by merchant UUID
- `status` (optional): Filter by order status (pending, confirmed, fulfilled, cancelled)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "orderNumber": "ORD-ABC123",
      "customerWallet": "ABC...XYZ",
      "merchantId": "uuid",
      "productId": "uuid",
      "paymentType": "sol",
      "amountPaid": 1000000,
      "loyaltyPointsEarned": 100,
      "txSignature": "5abc...xyz",
      "status": "confirmed",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "fulfilledAt": "2024-01-01T01:00:00.000Z",
      "updatedAt": "2024-01-01T01:00:00.000Z",
      "productName": "Coffee",
      "merchantName": "Coffee Shop"
    }
  ]
}
```

### 2. Get Order by ID
```http
GET /api/orders/:id
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-ABC123",
    "customerWallet": "ABC...XYZ",
    "merchantId": "uuid",
    "productId": "uuid",
    "paymentType": "sol",
    "amountPaid": 1000000,
    "loyaltyPointsEarned": 100,
    "txSignature": "5abc...xyz",
    "status": "confirmed",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "fulfilledAt": "2024-01-01T01:00:00.000Z",
    "updatedAt": "2024-01-01T01:00:00.000Z",
    "productName": "Coffee",
    "productImage": "https://...",
    "merchantName": "Coffee Shop",
    "merchantWallet": "DEF...XYZ"
  }
}
```

### 3. Create Order (Initiate Purchase)
```http
POST /api/orders
```

**Request Body:**
```json
{
  "customerWallet": "ABC...XYZ",
  "productId": "uuid",
  "paymentType": "sol"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "orderNumber": "ORD-ABC123",
    "customerWallet": "ABC...XYZ",
    "merchantId": "uuid",
    "productId": "uuid",
    "paymentType": "sol",
    "amountPaid": 1000000,
    "loyaltyPointsEarned": 100,
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "merchantWallet": "DEF...XYZ"
  }
}
```

### 4. Update Order
```http
PATCH /api/orders/:id
```

**Request Body:**
```json
{
  "status": "confirmed",
  "txSignature": "5abc...xyz"
}
```

**Response:**
```json
{
  "success": true,
  "data": { /* Order object */ }
}
```

---

## Admin API

### 1. Get Pending Merchants
```http
GET /api/admin/merchants/pending
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "walletAddress": "ABC...XYZ",
      "businessName": "Coffee Shop",
      "contactEmail": "shop@example.com",
      "contactPhone": "+1234567890",
      "businessAddress": "123 Main St",
      "category": "food_beverage",
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

### 2. Get All Merchants
```http
GET /api/admin/merchants
```

**Query Parameters:**
- `status` (optional): Filter by status (pending, approved, rejected)

**Response:**
```json
{
  "success": true,
  "data": [ /* Array of merchant objects */ ]
}
```

### 3. Approve Merchant
```http
POST /api/admin/merchants/:id/approve
```

**Response:**
```json
{
  "success": true,
  "data": { /* Merchant object with status: "approved" */ },
  "message": "Merchant \"Coffee Shop\" approved successfully"
}
```

### 4. Reject Merchant
```http
POST /api/admin/merchants/:id/reject
```

**Response:**
```json
{
  "success": true,
  "data": { /* Merchant object with status: "rejected" */ },
  "message": "Merchant \"Coffee Shop\" rejected"
}
```

### 5. Get Platform Statistics
```http
GET /api/admin/stats
```

**Response:**
```json
{
  "success": true,
  "data": {
    "merchants": {
      "total": 15,
      "approved": 10,
      "pending": 3,
      "rejected": 2
    },
    "products": {
      "total": 47
    },
    "orders": {
      "total": 123,
      "confirmed": 100,
      "fulfilled": 85,
      "totalSolRevenue": 50000000
    }
  }
}
```

---

## Merchants API (Existing)

### 1. Register Merchant
```http
POST /api/merchants
```

**Request Body:**
```json
{
  "walletAddress": "ABC...XYZ",
  "businessName": "Coffee Shop",
  "contactEmail": "shop@example.com",
  "contactPhone": "+1234567890",
  "businessAddress": "123 Main St",
  "category": "food_beverage"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "walletAddress": "ABC...XYZ",
    "businessName": "Coffee Shop",
    "contactEmail": "shop@example.com",
    "contactPhone": "+1234567890",
    "businessAddress": "123 Main St",
    "category": "food_beverage",
    "status": "pending",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### 2. Get Merchant by Wallet
```http
GET /api/merchants/:walletAddress
```

---

## Users API (Existing)

### 1. Get or Create User
```http
GET /api/users/:walletAddress
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "walletAddress": "ABC...XYZ",
    "username": "user123",
    "email": "user@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200 OK` - Successful GET/PATCH request
- `201 Created` - Successful POST request (resource created)
- `400 Bad Request` - Invalid request body or parameters
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Data Types

### Payment Types
- `sol` - Payment with SOL cryptocurrency
- `loyalty_points` - Payment with loyalty points

### Order Status
- `pending` - Order created, awaiting blockchain transaction
- `confirmed` - Transaction confirmed on blockchain
- `fulfilled` - Merchant marked order as fulfilled
- `cancelled` - Order cancelled

### Merchant Status
- `pending` - Awaiting admin approval
- `approved` - Can create products and accept orders
- `rejected` - Application rejected

### Merchant Categories
- `food_beverage`
- `retail`
- `services`
- `entertainment`
- `health_wellness`
- `other`

---

## Notes

1. **Amounts**: All SOL amounts are in lamports (1 SOL = 1,000,000,000 lamports)
2. **Loyalty Points**: Integer values representing token amounts
3. **Wallet Addresses**: Solana public key as base58 string
4. **UUIDs**: All IDs use UUID v4 format
5. **Timestamps**: ISO 8601 format in UTC
6. **Stock Management**: When order status is updated to "confirmed", product stock automatically decreases by 1
