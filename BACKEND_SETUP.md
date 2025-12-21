# Backend Setup - Phase 1 Complete ✅

## What's Been Implemented

### ✅ Phase 1: Backend Foundation

#### Database Setup
- Prisma ORM with SQLite database
- Database schema with all required entities:
  - Admin (authentication)
  - Product (inventory)
  - Order (orders from online and POS)
  - OrderItem (order line items)
  - Sale (processed sales)
  - Notification (notifications stub)

#### Auth Module
- Admin login endpoint: `POST /api/auth/login`
- JWT token generation and verification
- Password hashing with bcrypt
- Auth middleware for protected routes

#### Products Module
- `GET /api/products` - List all products
- `POST /api/products` - Create product (admin only)
- `GET /api/products/[id]` - Get product by ID
- `PUT /api/products/[id]` - Update product (admin only)
- `POST /api/products/[id]/stock` - Increase/decrease stock (admin only)

#### Orders Module
- `GET /api/orders` - List all orders (admin only, can filter by status)
- `POST /api/orders` - Create order (from checkout or POS)
  - Online orders: status = PENDING
  - POS orders: status = PROCESSED (stock reduced immediately)
- `POST /api/orders/[id]/process` - Process pending order (admin only)
  - Validates stock availability
  - Reduces stock atomically
  - Creates sale record
  - Creates notification

#### Sales Module
- `GET /api/sales` - Get sales reports (admin only)
  - Supports date range filtering
  - Returns summary statistics
- `POST /api/sales/pos` - Create POS sale (admin only)
  - Validates and reduces stock immediately
  - Creates order with PROCESSED status
  - Creates sale record

#### Notifications Module (Stub)
- `GET /api/notifications` - List notifications (admin only)
- Notifications created automatically for:
  - ORDER_PLACED (when online order is created)
  - ORDER_PROCESSED (when order is processed)

## Setup Instructions

### 1. Environment Variables
Create a `.env` file with your Supabase connection string:
```
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
JWT_SECRET="your-secret-key-change-in-production"
```

**See `SUPABASE_SETUP.md` for detailed Supabase configuration instructions.**

### 2. Create Admin User
Run the seed script to create an admin user:
```bash
npm run db:seed
```

Default credentials:
- Email: `admin@luxelineage.com`
- Password: `admin123`

⚠️ **Change the password in production!**

### 3. Database Migrations
Run migrations to create tables in Supabase:
```bash
# For development
npm run db:migrate

# For production deployment
npm run db:migrate:deploy
```

**Note:** Make sure your `.env` file has the correct Supabase connection string before running migrations.

## API Usage Examples

### Login
```bash
POST /api/auth/login
Body: { "email": "admin@luxelineage.com", "password": "admin123" }
Response: { "token": "...", "admin": { "id": "...", "email": "..." } }
```

### Create Product (requires auth token)
```bash
POST /api/products
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "name": "Tailored Wool Blazer",
  "sku": "WB-001",
  "brand": "Hugo Boss",
  "price": 899,
  "stockQuantity": 45,
  "category": "Corporate Business Wear",
  "sizes": ["S", "M", "L"],
  "colors": ["Navy", "Black"]
}
```

### Create Online Order
```bash
POST /api/orders
Body: {
  "source": "ONLINE",
  "items": [
    { "productId": "...", "quantity": 1 }
  ],
  "total": 899,
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "shippingAddress": "123 Main St"
}
```

### Process Order (requires auth token)
```bash
POST /api/orders/[orderId]/process
Headers: { "Authorization": "Bearer <token>" }
```

### Create POS Sale (requires auth token)
```bash
POST /api/sales/pos
Headers: { "Authorization": "Bearer <token>" }
Body: {
  "items": [
    { "productId": "...", "quantity": 1 }
  ],
  "total": 899
}
```

## Next Steps (Phases 2-10)

The backend foundation is complete. Next steps according to the plan:

- **Phase 2**: Inventory/Products - ✅ Already implemented
- **Phase 3**: Orders - ✅ Already implemented  
- **Phase 4**: Order Processing - ✅ Already implemented
- **Phase 5**: Sales - ✅ Already implemented
- **Phase 6**: POS - ✅ Already implemented
- **Phase 7**: Reports - ✅ Already implemented
- **Phase 8**: Notifications - ✅ Stub implemented
- **Phase 9**: Validation & Safety - ⏳ Need to add DTOs and more validation
- **Phase 10**: Frontend Hookup - ⏳ Connect admin UI to these APIs

## Important Notes

1. **Stock Management**: 
   - Online orders do NOT reduce stock until processed
   - POS sales reduce stock immediately
   - Stock cannot go below zero

2. **Transactions**: 
   - Order processing uses database transactions
   - POS sales use database transactions
   - Ensures data consistency

3. **Security**: 
   - All admin endpoints require JWT authentication
   - Passwords are hashed with bcrypt
   - Change JWT_SECRET in production

4. **Database**: 
   - Using Supabase (PostgreSQL)
   - See `SUPABASE_SETUP.md` for configuration
   - Supports connection pooling for serverless

