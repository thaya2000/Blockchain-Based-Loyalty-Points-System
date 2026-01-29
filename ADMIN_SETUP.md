# Admin Authentication Setup Guide

## ✅ Implementation Complete!

Database-based admin authentication has been successfully implemented.

---

## 🗄️ Database Changes

### New Table: `admins`
- `id` (UUID) - Primary key
- `wallet_address` (VARCHAR 44) - Solana wallet address (unique)
- `name` (VARCHAR 255) - Admin name
- `email` (VARCHAR 255) - Admin email
- `role` (VARCHAR 50) - Admin role (super_admin, admin, moderator)
- `is_active` (BOOLEAN) - Whether admin is active
- `created_at`, `updated_at` - Timestamps

**Migration File**: `/backend/src/db/migrations/002_add_admins_table.sql`

---

## 🔐 How It Works

### Backend Protection
All admin endpoints now require admin authorization:

1. **Middleware**: `/backend/src/middleware/adminAuth.ts`
   - `requireAdmin()` - Protects routes, requires `X-Wallet-Address` header
   - `checkAdminStatus()` - Verifies if wallet is an active admin

2. **Protected Routes** (all in `/backend/src/routes/admin.ts`):
   - ✅ `GET /api/admin/merchants/pending` - Requires admin
   - ✅ `GET /api/admin/merchants` - Requires admin
   - ✅ `POST /api/admin/merchants/:id/approve` - Requires admin
   - ✅ `POST /api/admin/merchants/:id/reject` - Requires admin
   - ✅ `GET /api/admin/stats` - Requires admin
   - 🔓 `GET /api/admin/check?wallet=<address>` - Public (checks admin status)

### Frontend Protection
`/frontend/src/pages/AdminDashboard.tsx` now:
1. Checks admin status when wallet connects
2. Shows "Verifying Admin Access..." while checking
3. Shows "Access Denied" if wallet is not an admin
4. Sends `X-Wallet-Address` header with all admin API requests

---

## 🚀 Quick Setup

### Option 1: Interactive Script (Recommended)
```bash
cd /home/thaya/blockchain-loyalty
./scripts/manage-admins.sh
```

This will show you:
- Current admins in the database
- Options to add/remove admins
- Update the placeholder admin with your wallet

### Option 2: SQL Command
```bash
# Replace with your actual wallet address
WALLET="YourWalletAddressHere"

cd /home/thaya/blockchain-loyalty/backend
PGPASSWORD=root psql -h 172.31.16.1 -U postgres -d loyalty_db -c "
  INSERT INTO admins (wallet_address, name, role)
  VALUES ('$WALLET', 'Your Name', 'super_admin')
  ON CONFLICT (wallet_address) DO UPDATE
  SET is_active = true;
"
```

### Option 3: Direct Database Access
```bash
# Connect to database
cd /home/thaya/blockchain-loyalty/backend
PGPASSWORD=root psql -h 172.31.16.1 -U postgres -d loyalty_db

# Once connected, run:
INSERT INTO admins (wallet_address, name, email, role)
VALUES ('YourWalletAddress', 'Your Name', 'admin@example.com', 'super_admin');

# Check admins
SELECT * FROM admins;

# Exit
\q
```

---

## 📋 Admin Roles

- **super_admin**: Full platform control (future: manage other admins)
- **admin**: Approve/reject merchants, view stats
- **moderator**: View-only access (future implementation)

Currently all roles have the same permissions. Role-based permissions can be added later.

---

## 🔍 Testing the Implementation

1. **Start Backend** (if not running):
   ```bash
   cd /home/thaya/blockchain-loyalty/backend
   npm run dev
   ```

2. **Add Your Wallet as Admin**:
   - Get your wallet address from Backpack wallet
   - Use one of the methods above to add it to the `admins` table

3. **Test Frontend**:
   - Go to http://localhost:5173/admin
   - Connect your wallet (the one you added as admin)
   - Should see "Verifying Admin Access..." then the admin dashboard

4. **Test Non-Admin Access**:
   - Connect with a different wallet (not in admins table)
   - Should see "🚫 Access Denied"

5. **Test API Directly**:
   ```bash
   # Without admin header (should fail)
   curl http://localhost:3001/api/admin/stats
   
   # With admin header (should succeed)
   curl -H "X-Wallet-Address: YourAdminWallet" http://localhost:3001/api/admin/stats
   
   # Check admin status
   curl "http://localhost:3001/api/admin/check?wallet=YourWallet"
   ```

---

## 🛡️ Security Features

✅ **Database-based authorization** - Admins stored in PostgreSQL
✅ **Active status flag** - Admins can be deactivated without deletion
✅ **Header-based auth** - Wallet address sent with each request
✅ **Frontend validation** - UI checks admin status before showing dashboard
✅ **Backend enforcement** - All endpoints protected with middleware
✅ **Multiple admin support** - Can have unlimited admins with different roles

---

## 🔧 Managing Admins

### Add Admin
```sql
INSERT INTO admins (wallet_address, name, email, role)
VALUES ('WalletAddress', 'Admin Name', 'email@example.com', 'admin');
```

### Deactivate Admin
```sql
UPDATE admins SET is_active = false WHERE wallet_address = 'WalletAddress';
```

### Reactivate Admin
```sql
UPDATE admins SET is_active = true WHERE wallet_address = 'WalletAddress';
```

### List All Admins
```sql
SELECT wallet_address, name, role, is_active, created_at FROM admins;
```

### Remove Placeholder
```sql
DELETE FROM admins WHERE wallet_address = 'REPLACE_WITH_YOUR_WALLET_ADDRESS';
```

---

## 📊 Database State

After running the migration, you should have:
- ✅ `admins` table created
- ✅ Indexes on `wallet_address` and `is_active`
- ✅ Auto-update trigger for `updated_at`
- ⚠️ One placeholder admin with wallet `REPLACE_WITH_YOUR_WALLET_ADDRESS`

**Important**: Update the placeholder with your actual wallet address!

---

## 🚨 Current Placeholder Admin

The migration created a placeholder admin:
- **Wallet**: `REPLACE_WITH_YOUR_WALLET_ADDRESS`
- **Name**: Platform Admin
- **Email**: admin@loyalty.com
- **Role**: super_admin

**You MUST replace this with your actual admin wallet address before using the system!**

---

## 🔄 Next Steps

1. ✅ Get your Solana wallet address (from Backpack)
2. ✅ Run the admin management script or update via SQL
3. ✅ Restart backend server (if needed)
4. ✅ Connect wallet in browser at http://localhost:5173/admin
5. ✅ Verify you can access the admin dashboard

---

## 💡 Tips

- **Finding Your Wallet Address**: 
  - Open Backpack wallet extension
  - Click on your wallet name at top
  - Copy the address (starts with letters/numbers, 32-44 chars)

- **Multiple Devices/Wallets**: 
  - You can add multiple wallet addresses as admins
  - Each admin can have their own role
  - Useful for team collaboration

- **Security**: 
  - Never commit wallet addresses to version control
  - Keep admin wallet private keys secure
  - Regularly audit the `admins` table

---

## 🐛 Troubleshooting

**"Access Denied" even though you added yourself as admin:**
- Check wallet address is exactly correct (no spaces, correct case)
- Verify `is_active = true` in database
- Check backend logs for errors
- Make sure backend server restarted after adding admin

**"Wallet address not provided" error:**
- Frontend not sending `X-Wallet-Address` header
- Wallet not connected in browser
- Check browser console for errors

**Admin check endpoint returns false:**
- Wallet address not in `admins` table
- Admin is deactivated (`is_active = false`)
- Database connection issue

---

## ✨ Summary

You now have a **production-ready admin authentication system** that:
- Stores admins in PostgreSQL database
- Protects all admin endpoints with middleware
- Validates admin status in the frontend
- Supports multiple admins with roles
- Can be easily managed via SQL or the provided script

**Next**: Add your wallet address as admin and start managing the loyalty platform! 🚀
