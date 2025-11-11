export const menuGroups = [
  {
    title: "Transaksi",
    items: [
      {
        to: "/transactions/rentals",
        label: "Sewa & Pengembalian",
        icon: "key",
      },

      {
        to: "/transactions/sales",
        label: "Penjualan Toko",
        icon: "shopping-bag",
      },

      {
        to: "/transactions/bookings",
        label: "Booking Jadwal",
        icon: "calendar",
      },
      {
        to: "/transactions/payments",
        label: "Pembayaran & Invoice",
        icon: "credit-card",
      },
    ],
  },
  {
    title: "Stok & Gudang",
    items: [
      {
        to: "/transactions/stock-movements",
        label: "Pergerakan Stok",
        icon: "layers",
      },
      { to: "/reports/items-with-stock", label: "Item & Stok", icon: "box" },
      { to: "/reports/stock-alerts", label: "Peringatan Stok", icon: "bell" },
    ],
  },
  {
    title: "Data Master",
    items: [
      { to: "/master/categories", label: "Kategori Produk", icon: "tag" },
      { to: "/master/items", label: "Katalog Barang", icon: "box" },
      { to: "/master/item-sizes", label: "Ukuran Item", icon: "layers" },
      {
        to: "/master/accessories",
        label: "Aksesoris & Add-on",
        icon: "layers",
      },
      { to: "/master/bundles", label: "Paket & Koleksi", icon: "clipboard" },
      { to: "/master/customers", label: "Pelanggan", icon: "users" },
    ],
  },
  {
    title: "Laporan & Insight",
    items: [
      {
        to: "/reports/daily-sales",
        label: "Ringkasan Penjualan",
        icon: "chart-bar",
      },
      {
        to: "/reports/top-customers",
        label: "Pelanggan Teratas",
        icon: "users",
      },
    ],
  },
  {
    title: "Administrasi",
    items: [
      { to: "/settings/system", label: "Pengaturan Sistem", icon: "settings" },
      { to: "/settings/backup-history", label: "Riwayat Backup", icon: "save" },
      {
        to: "/settings/activity-logs",
        label: "Log Aktivitas",
        icon: "clipboard",
      },
      { to: "/master/roles", label: "Role & Hak Akses", icon: "user" },
      { to: "/master/users", label: "User Internal", icon: "users" },
    ],
  },
];
