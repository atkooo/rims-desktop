export const schemaDefinitions = {
  categories: {
    kind: 'table',
    group: 'Master Data',
    title: 'Kategori',
    table: 'categories',
    description: 'Daftar kategori untuk mengelompokkan barang dan aksesoris.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'name', type: 'VARCHAR(100)', notes: 'NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'is_active', type: 'BOOLEAN', notes: 'DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  accessories: {
    kind: 'table',
    group: 'Master Data',
    title: 'Aksesoris',
    table: 'accessories',
    description: 'Informasi aksesoris yang tersedia untuk disewa atau dijual.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'code', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'name', type: 'VARCHAR(200)', notes: 'NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'purchase_price', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'rental_price_per_day', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'sale_price', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'stock_quantity', type: 'INTEGER', notes: 'DEFAULT 0' },
      { name: 'available_quantity', type: 'INTEGER', notes: 'DEFAULT 0' },
      { name: 'min_stock_alert', type: 'INTEGER', notes: 'DEFAULT 0' },
      { name: 'image_path', type: 'VARCHAR(255)' },
      { name: 'is_available_for_rent', type: 'BOOLEAN', notes: 'DEFAULT 1' },
      { name: 'is_available_for_sale', type: 'BOOLEAN', notes: 'DEFAULT 1' },
      { name: 'is_active', type: 'BOOLEAN', notes: 'DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  items: {
    kind: 'table',
    group: 'Master Data',
    title: 'Barang / Baju',
    table: 'items',
    description: 'Inventaris utama untuk barang yang dapat disewa maupun dijual.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'code', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'name', type: 'VARCHAR(200)', notes: 'NOT NULL' },
      { name: 'category_id', type: 'INTEGER', notes: 'NOT NULL · FK → categories(id)' },
      { name: 'description', type: 'TEXT' },
      { name: 'purchase_price', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'rental_price_per_day', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'sale_price', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'stock_quantity', type: 'INTEGER', notes: 'DEFAULT 0' },
      { name: 'available_quantity', type: 'INTEGER', notes: 'DEFAULT 0' },
      { name: 'min_stock_alert', type: 'INTEGER', notes: 'DEFAULT 0' },
      { name: 'image_path', type: 'VARCHAR(255)' },
      { name: 'is_available_for_rent', type: 'BOOLEAN', notes: 'DEFAULT 1' },
      { name: 'is_available_for_sale', type: 'BOOLEAN', notes: 'DEFAULT 1' },
      { name: 'is_active', type: 'BOOLEAN', notes: 'DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ],
    notes: ['Memiliki trigger trg_update_timestamp untuk memperbarui updated_at.']
  },
  bundles: {
    kind: 'table',
    group: 'Master Data',
    title: 'Paket / Bundling',
    table: 'bundles',
    description: 'Bundling barang/aksesoris untuk produk sewa atau jual.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'code', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'name', type: 'VARCHAR(200)', notes: 'NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'bundle_type', type: 'VARCHAR(50)', notes: "CHECK (bundle_type IN ('rental','sale'))" },
      { name: 'price', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'rental_price_per_day', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'stock_quantity', type: 'INTEGER', notes: 'DEFAULT 0' },
      { name: 'available_quantity', type: 'INTEGER', notes: 'DEFAULT 0' },
      { name: 'image_path', type: 'VARCHAR(255)' },
      { name: 'is_active', type: 'BOOLEAN', notes: 'DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  bundle_details: {
    kind: 'table',
    group: 'Master Data',
    title: 'Detail Paket',
    table: 'bundle_details',
    description: 'Komposisi item atau aksesoris di dalam sebuah paket.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'bundle_id', type: 'INTEGER', notes: 'NOT NULL · FK → bundles(id)' },
      { name: 'item_id', type: 'INTEGER', notes: 'FK → items(id)' },
      { name: 'accessory_id', type: 'INTEGER', notes: 'FK → accessories(id)' },
      { name: 'quantity', type: 'INTEGER', notes: 'DEFAULT 1' },
      { name: 'notes', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  customers: {
    kind: 'table',
    group: 'Master Data',
    title: 'Pelanggan',
    table: 'customers',
    description: 'Informasi pelanggan beserta statistik transaksi.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'code', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'name', type: 'VARCHAR(200)', notes: 'NOT NULL' },
      { name: 'phone', type: 'VARCHAR(20)' },
      { name: 'email', type: 'VARCHAR(100)' },
      { name: 'address', type: 'TEXT' },
      { name: 'id_card_number', type: 'VARCHAR(50)' },
      { name: 'notes', type: 'TEXT' },
      { name: 'total_transactions', type: 'INTEGER', notes: 'DEFAULT 0' },
      { name: 'is_active', type: 'BOOLEAN', notes: 'DEFAULT 1' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ],
    notes: ['Memiliki trigger trg_update_customer_timestamp untuk memperbarui updated_at.']
  },
  roles: {
    kind: 'table',
    group: 'Master Data',
    title: 'Peran Pengguna',
    table: 'roles',
    description: 'Daftar peran pengguna sistem.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'name', type: 'VARCHAR(20)', notes: "UNIQUE NOT NULL · CHECK (name IN ('admin','manager','staff'))" },
      { name: 'description', type: 'VARCHAR(200)' }
    ]
  },
  users: {
    kind: 'table',
    group: 'Master Data',
    title: 'Pengguna Sistem',
    table: 'users',
    description: 'Akun pengguna dengan pengaturan peran dan status.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'username', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'password_hash', type: 'VARCHAR(255)', notes: 'NOT NULL' },
      { name: 'full_name', type: 'VARCHAR(200)', notes: 'NOT NULL' },
      { name: 'email', type: 'VARCHAR(100)' },
      { name: 'role_id', type: 'INTEGER', notes: 'NOT NULL · FK → roles(id)' },
      { name: 'is_active', type: 'BOOLEAN', notes: 'DEFAULT 1' },
      { name: 'last_login', type: 'DATETIME' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  rental_transactions: {
    kind: 'table',
    group: 'Transaksi',
    title: 'Transaksi Sewa',
    table: 'rental_transactions',
    description: 'Catatan transaksi penyewaan lengkap dengan status pembayaran dan pengembalian.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'transaction_code', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'customer_id', type: 'INTEGER', notes: 'NOT NULL · FK → customers(id)' },
      { name: 'user_id', type: 'INTEGER', notes: 'NOT NULL · FK → users(id)' },
      { name: 'rental_date', type: 'DATE', notes: 'NOT NULL' },
      { name: 'planned_return_date', type: 'DATE', notes: 'NOT NULL' },
      { name: 'actual_return_date', type: 'DATE' },
      { name: 'total_days', type: 'INTEGER', notes: 'NOT NULL' },
      { name: 'subtotal', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'deposit', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'late_fee', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'discount', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'total_amount', type: 'DECIMAL(15,2)', notes: 'NOT NULL' },
      { name: 'payment_method', type: 'VARCHAR(20)', notes: "CHECK IN ('cash','transfer','card') DEFAULT 'cash'" },
      { name: 'payment_status', type: 'VARCHAR(20)', notes: "CHECK IN ('unpaid','partial','paid') DEFAULT 'unpaid'" },
      { name: 'paid_amount', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'status', type: 'VARCHAR(20)', notes: "CHECK IN ('active','returned','cancelled','overdue') DEFAULT 'active'" },
      { name: 'notes', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ],
    notes: ['Memiliki trigger trg_update_rental_timestamp untuk memperbarui updated_at.']
  },
  rental_transaction_details: {
    kind: 'table',
    group: 'Transaksi',
    title: 'Detail Transaksi Sewa',
    table: 'rental_transaction_details',
    description: 'Detail item yang disertakan dalam transaksi sewa.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'rental_transaction_id', type: 'INTEGER', notes: 'NOT NULL · FK → rental_transactions(id)' },
      { name: 'item_id', type: 'INTEGER', notes: 'NOT NULL · FK → items(id)' },
      { name: 'quantity', type: 'INTEGER', notes: 'NOT NULL' },
      { name: 'rental_price', type: 'DECIMAL(15,2)', notes: 'NOT NULL' },
      { name: 'subtotal', type: 'DECIMAL(15,2)', notes: 'NOT NULL' },
      { name: 'is_returned', type: 'BOOLEAN', notes: 'DEFAULT 0' },
      { name: 'return_condition', type: 'VARCHAR(50)', notes: "CHECK IN ('good','damaged','lost')" },
      { name: 'notes', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  sales_transactions: {
    kind: 'table',
    group: 'Transaksi',
    title: 'Transaksi Penjualan',
    table: 'sales_transactions',
    description: 'Transaksi penjualan barang termasuk status pembayaran.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'transaction_code', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'customer_id', type: 'INTEGER', notes: 'FK → customers(id)' },
      { name: 'user_id', type: 'INTEGER', notes: 'NOT NULL · FK → users(id)' },
      { name: 'sale_date', type: 'DATE', notes: 'NOT NULL' },
      { name: 'subtotal', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'discount', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'tax', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'total_amount', type: 'DECIMAL(15,2)', notes: 'NOT NULL' },
      { name: 'payment_method', type: 'VARCHAR(20)', notes: "CHECK IN ('cash','transfer','card') DEFAULT 'cash'" },
      { name: 'payment_status', type: 'VARCHAR(20)', notes: "CHECK IN ('unpaid','partial','paid') DEFAULT 'paid'" },
      { name: 'paid_amount', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'change_amount', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'notes', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  sales_transaction_details: {
    kind: 'table',
    group: 'Transaksi',
    title: 'Detail Transaksi Penjualan',
    table: 'sales_transaction_details',
    description: 'Detail item yang dijual dalam transaksi penjualan.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'sales_transaction_id', type: 'INTEGER', notes: 'NOT NULL · FK → sales_transactions(id)' },
      { name: 'item_id', type: 'INTEGER', notes: 'NOT NULL · FK → items(id)' },
      { name: 'quantity', type: 'INTEGER', notes: 'NOT NULL' },
      { name: 'sale_price', type: 'DECIMAL(15,2)', notes: 'NOT NULL' },
      { name: 'subtotal', type: 'DECIMAL(15,2)', notes: 'NOT NULL' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  bookings: {
    kind: 'table',
    group: 'Transaksi',
    title: 'Booking Barang',
    table: 'bookings',
    description: 'Pemesanan barang sebelum transaksi sewa berlangsung.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'booking_code', type: 'VARCHAR(50)', notes: 'UNIQUE NOT NULL' },
      { name: 'customer_id', type: 'INTEGER', notes: 'NOT NULL · FK → customers(id)' },
      { name: 'user_id', type: 'INTEGER', notes: 'NOT NULL · FK → users(id)' },
      { name: 'item_id', type: 'INTEGER', notes: 'NOT NULL · FK → items(id)' },
      { name: 'quantity', type: 'INTEGER', notes: 'NOT NULL' },
      { name: 'booking_date', type: 'DATE', notes: 'NOT NULL' },
      { name: 'planned_start_date', type: 'DATE', notes: 'NOT NULL' },
      { name: 'planned_end_date', type: 'DATE', notes: 'NOT NULL' },
      { name: 'estimated_price', type: 'DECIMAL(15,2)' },
      { name: 'deposit', type: 'DECIMAL(15,2)', notes: 'DEFAULT 0' },
      { name: 'status', type: 'VARCHAR(20)', notes: "CHECK IN ('pending','confirmed','cancelled','completed') DEFAULT 'pending'" },
      { name: 'notes', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' },
      { name: 'updated_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  stock_movements: {
    kind: 'table',
    group: 'Transaksi',
    title: 'Pergerakan Stok',
    table: 'stock_movements',
    description: 'Riwayat perubahan stok barang termasuk alasan dan referensi.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'item_id', type: 'INTEGER', notes: 'NOT NULL · FK → items(id)' },
      { name: 'movement_type', type: 'VARCHAR(20)', notes: "CHECK IN ('in','out','adjustment','damaged','lost')" },
      { name: 'reference_type', type: 'VARCHAR(30)' },
      { name: 'reference_id', type: 'INTEGER' },
      { name: 'quantity', type: 'INTEGER', notes: 'NOT NULL' },
      { name: 'stock_before', type: 'INTEGER', notes: 'NOT NULL' },
      { name: 'stock_after', type: 'INTEGER', notes: 'NOT NULL' },
      { name: 'user_id', type: 'INTEGER', notes: 'NOT NULL · FK → users(id)' },
      { name: 'notes', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  payments: {
    kind: 'table',
    group: 'Transaksi',
    title: 'Pembayaran',
    table: 'payments',
    description: 'Catatan pembayaran untuk transaksi sewa dan jual.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'transaction_type', type: 'VARCHAR(20)', notes: "CHECK IN ('rental','sale') NOT NULL" },
      { name: 'transaction_id', type: 'INTEGER', notes: 'NOT NULL' },
      { name: 'payment_date', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' },
      { name: 'amount', type: 'DECIMAL(15,2)', notes: 'NOT NULL' },
      { name: 'payment_method', type: 'VARCHAR(20)', notes: "CHECK IN ('cash','transfer','card') NOT NULL" },
      { name: 'reference_number', type: 'VARCHAR(100)' },
      { name: 'user_id', type: 'INTEGER', notes: 'NOT NULL · FK → users(id)' },
      { name: 'notes', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  system_settings: {
    kind: 'table',
    group: 'Pengaturan',
    title: 'Pengaturan Sistem',
    table: 'system_settings',
    description: 'Konfigurasi kunci sistem yang dapat diubah oleh admin.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'setting_key', type: 'VARCHAR(100)', notes: 'UNIQUE NOT NULL' },
      { name: 'setting_value', type: 'TEXT' },
      { name: 'description', type: 'TEXT' },
      { name: 'updated_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  backup_history: {
    kind: 'table',
    group: 'Pengaturan',
    title: 'Riwayat Backup',
    table: 'backup_history',
    description: 'Pencatatan file backup yang pernah dibuat.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'backup_file', type: 'VARCHAR(255)', notes: 'NOT NULL' },
      { name: 'backup_path', type: 'VARCHAR(500)' },
      { name: 'file_size', type: 'INTEGER' },
      { name: 'backup_type', type: 'VARCHAR(20)', notes: "CHECK IN ('manual','automatic') DEFAULT 'manual'" },
      { name: 'user_id', type: 'INTEGER', notes: 'FK → users(id)' },
      { name: 'status', type: 'VARCHAR(20)', notes: "CHECK IN ('success','failed') DEFAULT 'success'" },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  activity_logs: {
    kind: 'table',
    group: 'Pengaturan',
    title: 'Log Aktivitas',
    table: 'activity_logs',
    description: 'Audit trail tindakan pengguna di dalam sistem.',
    fields: [
      { name: 'id', type: 'INTEGER', notes: 'PRIMARY KEY AUTOINCREMENT' },
      { name: 'user_id', type: 'INTEGER', notes: 'NOT NULL · FK → users(id)' },
      { name: 'action', type: 'VARCHAR(50)', notes: 'NOT NULL' },
      { name: 'module', type: 'VARCHAR(50)', notes: 'NOT NULL' },
      { name: 'description', type: 'TEXT' },
      { name: 'ip_address', type: 'VARCHAR(45)' },
      { name: 'created_at', type: 'DATETIME', notes: 'DEFAULT CURRENT_TIMESTAMP' }
    ]
  },
  v_items_with_stock: {
    kind: 'view',
    group: 'Laporan',
    title: 'View · Item dengan Stok',
    table: 'v_items_with_stock',
    description: 'Ringkasan stok barang beserta nilai sewa dan jual.',
    fields: [
      { name: 'id', type: 'INTEGER' },
      { name: 'code', type: 'VARCHAR(50)' },
      { name: 'name', type: 'VARCHAR(200)' },
      { name: 'category_name', type: 'VARCHAR(100)' },
      { name: 'stock_quantity', type: 'INTEGER' },
      { name: 'available_quantity', type: 'INTEGER' },
      { name: 'rented_quantity', type: 'INTEGER' },
      { name: 'rental_price_per_day', type: 'DECIMAL(15,2)' },
      { name: 'sale_price', type: 'DECIMAL(15,2)' },
      { name: 'is_active', type: 'BOOLEAN' }
    ]
  },
  v_active_rentals: {
    kind: 'view',
    group: 'Laporan',
    title: 'View · Sewa Aktif',
    table: 'v_active_rentals',
    description: 'Daftar transaksi sewa yang masih aktif dan status keterlambatan.',
    fields: [
      { name: 'id', type: 'INTEGER' },
      { name: 'transaction_code', type: 'VARCHAR(50)' },
      { name: 'customer_name', type: 'VARCHAR(200)' },
      { name: 'rental_date', type: 'DATE' },
      { name: 'planned_return_date', type: 'DATE' },
      { name: 'total_amount', type: 'DECIMAL(15,2)' },
      { name: 'status', type: 'VARCHAR(20)' },
      { name: 'days_overdue', type: 'REAL' }
    ]
  },
  v_daily_sales: {
    kind: 'view',
    group: 'Laporan',
    title: 'View · Penjualan Harian',
    table: 'v_daily_sales',
    description: 'Ringkasan jumlah dan total penjualan per tanggal.',
    fields: [
      { name: 'sale_date', type: 'DATE' },
      { name: 'total_transactions', type: 'INTEGER' },
      { name: 'total_sales', type: 'DECIMAL(15,2)' },
      { name: 'total_discount', type: 'DECIMAL(15,2)' }
    ]
  },
  v_stock_alerts: {
    kind: 'view',
    group: 'Laporan',
    title: 'View · Peringatan Stok',
    table: 'v_stock_alerts',
    description: 'Daftar barang yang stoknya telah mencapai atau di bawah ambang batas.',
    fields: [
      { name: 'id', type: 'INTEGER' },
      { name: 'code', type: 'VARCHAR(50)' },
      { name: 'name', type: 'VARCHAR(200)' },
      { name: 'stock_quantity', type: 'INTEGER' },
      { name: 'min_stock_alert', type: 'INTEGER' }
    ]
  },
  v_top_customers: {
    kind: 'view',
    group: 'Laporan',
    title: 'View · Pelanggan Teratas',
    table: 'v_top_customers',
    description: '5 pelanggan dengan total transaksi terbanyak.',
    fields: [
      { name: 'name', type: 'VARCHAR(200)' },
      { name: 'phone', type: 'VARCHAR(20)' },
      { name: 'total_transactions', type: 'INTEGER' }
    ]
  }
};

export function getSchemaDefinition(key) {
  return schemaDefinitions[key] || null;
}

