export const menuGroups = [
  {
    title: "Transaksi",
    items: [
      {
        to: "/transactions/rentals",
        label: "Sewa & Pengembalian",
        icon: "key",
        permission: "transactions.rentals.view",
      },
      {
        to: "/transactions/sales",
        label: "Penjualan Toko",
        icon: "shopping-bag",
        permission: "transactions.sales.view",
      },
      {
        to: "/transactions/cashier",
        label: "Buka Kasir",
        icon: "money",
        permission: "transactions.cashier.manage",
      },
    ],
  },
  {
    title: "Stok & Gudang",
    items: [
      {
        to: "/transactions/stock-movements",
        label: "Manajemen Stok",
        icon: "layers",
        permission: "transactions.stock-movements.view",
      },
      {
        to: "/reports/items-with-stock",
        label: "Peringatan Stok",
        icon: "box",
        permission: "reports.items-stock.view",
      },
    ],
  },
  {
    title: "Data Master",
    items: [
      {
        to: "/master/categories",
        label: "Kategori Produk",
        icon: "tag",
        permission: "master.categories.view",
      },
      {
        to: "/master/items",
        label: "Manajemen Item",
        icon: "box",
        permission: "master.items.view",
      },
      {
        to: "/master/item-sizes",
        label: "Ukuran Item",
        icon: "layers",
        permission: "master.item-sizes.view",
      },
      {
        to: "/master/accessories",
        label: "Aksesoris & Add-on",
        icon: "layers",
        permission: "master.accessories.view",
      },
      {
        to: "/master/bundles",
        label: "Paket & Koleksi",
        icon: "clipboard",
        permission: "master.bundles.view",
      },
      {
        to: "/master/customers",
        label: "Pelanggan",
        icon: "users",
        permission: "master.customers.view",
      },
      {
        to: "/master/discount-groups",
        label: "Grup Diskon",
        icon: "tag",
        permission: "master.discount-groups.view",
      },
    ],
  },
  {
    title: "Laporan & Insight",
    items: [
      {
        to: "/reports/daily-sales",
        label: "Ringkasan Penjualan",
        icon: "chart-bar",
        permission: "reports.daily-sales.view",
      },
      {
        to: "/reports/top-customers",
        label: "Pelanggan Teratas",
        icon: "users",
        permission: "reports.top-customers.view",
      },
    ],
  },
  {
    title: "Administrasi",
    items: [
      {
        to: "/settings/system",
        label: "Pengaturan Sistem",
        icon: "settings",
        permission: "settings.view",
      },
      {
        to: "/settings/backup-history",
        label: "Riwayat Backup",
        icon: "save",
        permission: "settings.backup.view",
      },
      {
        to: "/settings/activity-logs",
        label: "Log Aktivitas",
        icon: "clipboard",
        permission: "settings.activity-logs.view",
      },
      {
        to: "/master/user-role-management",
        label: "User & Role Management",
        icon: "users",
        permission: ["users.view", "roles.view"],
      },
    ],
  },
];
