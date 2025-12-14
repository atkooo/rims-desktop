export const menuGroups = [
  {
    title: "Stok & Gudang",
    items: [
      {
        to: "/transactions/stock-movements",
        label: "Manajemen Stok",
        icon: "warehouse",
      },
      {
        to: "/stock/receipt",
        label: "Penerimaan Stok",
        icon: "download",
      },
      {
        to: "/stock/opname",
        label: "Stock Opname",
        icon: "clipboard",
      },
      {
        to: "/stock/alerts",
        label: "Alert Stok Minimal",
        icon: "bell",
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
      },
      {
        to: "/reports/finance",
        label: "Laporan Finance",
        icon: "dollar-sign",
      },
      {
        to: "/reports/stock",
        label: "Laporan Stok",
        icon: "chart-bar",
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
      },
      {
        to: "/master/items",
        label: "Manajemen Item",
        icon: "package",
      },
      {
        to: "/master/bulk-labels",
        label: "Generate Label Barcode",
        icon: "barcode",
      },
      {
        to: "/master/item-sizes",
        label: "Ukuran Item",
        icon: "ruler",
      },
      {
        to: "/master/accessories",
        label: "Aksesoris & Add-on",
        icon: "gift",
      },
      {
        to: "/master/bundles",
        label: "Paket & Koleksi",
        icon: "grid",
      },
      {
        to: "/master/discount-groups",
        label: "Grup Diskon",
        icon: "percent",
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
      },
      {
        to: "/settings/backup-history",
        label: "Riwayat Backup",
        icon: "save",
      },
      {
        to: "/settings/activity-logs",
        label: "Log Aktivitas",
        icon: "file-text",
      },
      {
        to: "/settings/sync-service",
        label: "Sync Service",
        icon: "refresh-cw",
      },
      {
        to: "/master/user-role-management",
        label: "User & Role Management",
        icon: "shield",
      },
    ],
  },
];
