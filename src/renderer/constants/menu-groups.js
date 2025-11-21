export const menuGroups = [
  {
    title: "Transaksi",
    items: [
      {
        to: "/transactions/rentals",
        label: "Sewa & Pengembalian",
        icon: "rotate-cw",
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
        icon: "credit-card",
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
        icon: "warehouse",
        permission: "transactions.stock-movements.view",
      },
      {
        to: "/stock/alerts",
        label: "Alert Stok Minimal",
        icon: "bell",
        permission: "transactions.stock-movements.view",
      },
    ],
  },
  {
    title: "Laporan",
    items: [
      {
        to: "/reports/executive",
        label: "Laporan Eksekutif",
        icon: "bar-chart",
        permission: "reports.transactions.view",
      },
      {
        to: "/reports/finance",
        label: "Laporan Finance",
        icon: "dollar-sign",
        permission: "reports.transactions.view",
      },
      {
        to: "/reports/stock",
        label: "Laporan Stok",
        icon: "chart-bar",
        permission: "reports.stock.view",
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
        icon: "package",
        permission: "master.items.view",
      },
      {
        to: "/master/bulk-labels",
        label: "Generate Label Barcode",
        icon: "barcode",
        permission: "master.items.generate-barcode",
      },
      {
        to: "/master/item-sizes",
        label: "Ukuran Item",
        icon: "ruler",
        permission: "master.item-sizes.view",
      },
      {
        to: "/master/accessories",
        label: "Aksesoris & Add-on",
        icon: "gift",
        permission: "master.accessories.view",
      },
      {
        to: "/master/bundles",
        label: "Paket & Koleksi",
        icon: "grid",
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
        icon: "percent",
        permission: "master.discount-groups.view",
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
        icon: "file-text",
        permission: "settings.activity-logs.view",
      },
      {
        to: "/master/user-role-management",
        label: "User & Role Management",
        icon: "shield",
        permission: ["users.view", "roles.view"],
      },
    ],
  },
];
