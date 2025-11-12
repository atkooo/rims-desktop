# Sistem Role dan Permission RIMS Desktop

## Overview
Sistem role dan permission telah diimplementasikan untuk mengatur akses pengguna ke berbagai fitur aplikasi. Setiap role memiliki permission yang berbeda-beda sesuai dengan kebutuhan.

## Role yang Tersedia

### 1. Admin
- **Username**: `admin`
- **Password**: `Admin123!`
- **Akses**: Full access ke semua fitur aplikasi
- **Permission**: Semua permission tersedia

### 2. Manager
- **Username**: `manager`
- **Password**: `Manager123!`
- **Akses**: Akses moderat, tidak bisa mengelola user/role dan beberapa fitur delete
- **Permission**: Sebagian besar permission kecuali:
  - User management (view, create, update, delete)
  - Role management (view, create, update, delete, manage permissions)
  - Backup management
  - Delete operations pada master data

### 3. Staff
- **Username**: `staff`
- **Password**: `Staff123!`
- **Akses**: Akses dasar untuk transaksi dan melihat master data
- **Permission**: 
  - View dashboard
  - View master data (categories, items, accessories, bundles, customers, discount groups)
  - Transaction operations (rentals, sales, bookings)
  - View reports
  - View settings (tidak bisa manage backup)

### 4. Kasir
- **Username**: `kasir`
- **Password**: `Kasir123!`
- **Akses**: Akses terbatas hanya untuk transaksi
- **Permission**:
  - View dashboard
  - View items, accessories, bundles, customers, discount groups
  - Transaction operations (rentals, sales, bookings)
  - Manage cashier sessions
  - Tidak bisa melihat/mengelola master data lainnya, reports, atau settings

## Permission Structure

### Dashboard
- `dashboard.view` - Akses untuk melihat dashboard

### Master Data
- `master.categories.view` - Lihat kategori
- `master.categories.create` - Buat kategori
- `master.categories.update` - Update kategori
- `master.categories.delete` - Hapus kategori

- `master.items.view` - Lihat items
- `master.items.create` - Buat item
- `master.items.update` - Update item
- `master.items.delete` - Hapus item

- `master.item-sizes.view/create/update/delete` - Ukuran item
- `master.accessories.view/create/update/delete` - Aksesoris
- `master.bundles.view/create/update/delete` - Bundle
- `master.customers.view/create/update/delete` - Pelanggan
- `master.discount-groups.view/create/update/delete` - Grup diskon

### Transactions
- `transactions.rentals.view/create/update/delete/payment` - Transaksi rental
- `transactions.sales.view/create/update/delete/payment` - Transaksi penjualan
- `transactions.bookings.view/create/update/delete` - Booking
- `transactions.stock-movements.view/create/update/delete` - Pergerakan stok
- `transactions.cashier.manage` - Kelola sesi kasir

### Reports
- `reports.view` - Lihat laporan
- `reports.daily-sales.view` - Laporan penjualan harian
- `reports.items-stock.view` - Laporan stok item
- `reports.stock-alerts.view` - Peringatan stok
- `reports.top-customers.view` - Pelanggan teratas
- `reports.export` - Export laporan

### Settings
- `settings.view` - Lihat pengaturan
- `settings.update` - Update pengaturan
- `settings.backup.view` - Lihat riwayat backup
- `settings.backup.manage` - Kelola backup
- `settings.activity-logs.view` - Lihat log aktivitas

### User Management
- `users.view/create/update/delete` - Kelola user

### Role Management
- `roles.view/create/update/delete` - Kelola role
- `roles.permissions.manage` - Kelola permission role

## Implementasi

### Database
1. **Migration**: `src/database/migrations/security/20251114_007_create_permissions_tables.sql`
   - Table `permissions` - Daftar semua permission
   - Table `role_permissions` - Junction table untuk role dan permission

2. **Seeder**: 
   - `src/database/seeders/security/01_roles_and_users.sql` - Roles dan users
   - `src/database/seeders/security/02_permissions_and_role_permissions.sql` - Permissions dan role permissions

### Backend (Main Process)
1. **Helper**: `src/main/helpers/permissions.js`
   - `getUserPermissions(userId)` - Get semua permission user
   - `getRolePermissions(roleId)` - Get semua permission role
   - `hasPermission(userId, permissionSlug)` - Check permission user
   - `hasAnyPermission(userId, permissionSlugs)` - Check any permission
   - `hasAllPermissions(userId, permissionSlugs)` - Check all permissions

2. **Auth**: `src/main/auth.js`
   - Updated untuk load permissions saat login
   - IPC handlers untuk check permission

### Frontend (Renderer)
1. **Composable**: `src/renderer/composables/usePermissions.js`
   - `usePermissions()` - Composable untuk check permission di component
   - `hasPermissionSync(permissionSlug)` - Check permission secara synchronous
   - `hasAnyPermissionSync(permissionSlugs)` - Check any permission secara synchronous
   - `hasAllPermissionsSync(permissionSlugs)` - Check all permissions secara synchronous

2. **Router**: `src/renderer/router.js`
   - Route protection berdasarkan permission
   - Redirect ke dashboard jika tidak ada permission

3. **Menu**: `src/renderer/constants/menu-groups.js`
   - Menu items memiliki property `permission`
   - Sidebar filter menu berdasarkan permission user

4. **Sidebar**: `src/renderer/components/layout/Sidebar.vue`
   - Filter menu berdasarkan permission
   - Hide menu items yang tidak memiliki permission

## Cara Menggunakan

### Di Component Vue
```javascript
import { usePermissions } from "@/composables/usePermissions";

export default {
  setup() {
    const { hasPermissionSync, checkPermission } = usePermissions();
    
    // Check permission secara synchronous
    const canCreate = hasPermissionSync("master.items.create");
    
    // Check permission secara asynchronous
    const canDelete = await checkPermission("master.items.delete");
    
    return {
      canCreate,
      canDelete,
    };
  },
};
```

### Di Template Vue
```vue
<template>
  <button v-if="hasPermissionSync('master.items.create')" @click="createItem">
    Buat Item
  </button>
</template>

<script setup>
import { usePermissions } from "@/composables/usePermissions";
const { hasPermissionSync } = usePermissions();
</script>
```

### Di Router Guard
Router guard sudah otomatis check permission untuk setiap route. Jika user tidak memiliki permission, akan di-redirect ke dashboard.

## Migration & Seeder

Untuk menjalankan migration dan seeder:

```bash
# Run migration
npm run db:migrate

# Run seeder (akan otomatis dijalankan saat database pertama kali diinisialisasi)
# Atau bisa dijalankan manual melalui database initialization
```

## Catatan Penting

1. **Password Default**: Semua user default menggunakan password yang sama dengan username (dengan format `{Role}123!`)
2. **Permission Caching**: Permission di-cache di localStorage untuk performa yang lebih baik
3. **Route Protection**: Semua route dilindungi oleh permission check
4. **Menu Filtering**: Menu otomatis di-filter berdasarkan permission user
5. **Dynamic Routes**: Route dengan parameter (seperti `/transactions/rentals/:code`) akan check permission parent route

## Testing

Untuk test sistem permission:
1. Login dengan user yang berbeda (admin, manager, staff, kasir)
2. Cek apakah menu yang ditampilkan sesuai dengan role
3. Cek apakah route yang diakses sesuai dengan permission
4. Cek apakah action button (create, update, delete) sesuai dengan permission

