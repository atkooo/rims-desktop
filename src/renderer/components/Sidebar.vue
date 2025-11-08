<template>
  <aside :class="['sidebar', { 'sidebar--collapsed': collapsed }]">
    <div class="sidebar__brand">
      <div class="sidebar__logo">R</div>
      <div class="sidebar__brand-text" v-if="!collapsed">
        <h3>RIMS Desktop</h3>
        <span>Rental & Sales</span>
      </div>
    </div>
    <nav>
      <router-link
        to="/"
        active-class="active"
        :title="collapsed ? 'Dashboard' : null"
      >
        <Icon name="dashboard" class="icon" />
        <span v-if="!collapsed">Dashboard</span>
      </router-link>
      <div v-for="group in groups" :key="group.title" class="group">
        <div class="group-title" v-if="!collapsed">{{ group.title }}</div>
        <router-link
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          active-class="active"
          :title="collapsed ? item.label : null"
        >
          <Icon :name="item.icon" class="icon" />
          <span v-if="!collapsed">{{ item.label }}</span>
        </router-link>
      </div>
    </nav>
  </aside>
</template>

<script>
import Icon from "./Icon.vue";

const groups = [
  {
    title: "Transaksi",
    items: [
      { to: "/transactions/rentals", label: "Transaksi Sewa", icon: "key" },
      {
        to: "/transactions/sales",
        label: "Transaksi Penjualan",
        icon: "money",
      },
      { to: "/transactions/payments", label: "Pembayaran", icon: "money" },
    ],
  },
  {
    title: "Detail Transaksi",
    items: [
      {
        to: "/transactions/rental-details",
        label: "Detail Sewa",
        icon: "clipboard",
      },
      {
        to: "/transactions/sales-details",
        label: "Detail Penjualan",
        icon: "file",
      },
    ],
  },
  {
    title: "Booking",
    items: [
      {
        to: "/transactions/bookings",
        label: "Booking Barang",
        icon: "clipboard",
      },
    ],
  },
  {
    title: "Stok",
    items: [
      {
        to: "/transactions/stock-movements",
        label: "Pergerakan Stok",
        icon: "chart-bar",
      },
    ],
  },
  {
    title: "Laporan & View",
    items: [
      {
        to: "/reports/items-with-stock",
        label: "Item dengan Stok",
        icon: "chart-bar",
      },
      {
        to: "/reports/active-rentals",
        label: "Sewa Aktif",
        icon: "chart-line",
      },
      {
        to: "/reports/daily-sales",
        label: "Penjualan Harian",
        icon: "chart-line",
      },
      {
        to: "/reports/stock-alerts",
        label: "Peringatan Stok",
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
    title: "Master Data",
    items: [
      { to: "/master/categories", label: "Kategori", icon: "tag" },
      { to: "/master/accessories", label: "Aksesoris", icon: "box" },
      { to: "/master/items", label: "Barang", icon: "box" },
      { to: "/master/bundles", label: "Paket", icon: "clipboard" },
      {
        to: "/master/bundle-details",
        label: "Detail Paket",
        icon: "clipboard",
      },
      { to: "/master/customers", label: "Pelanggan", icon: "users" },
      { to: "/master/roles", label: "Role", icon: "user" },
      { to: "/master/users", label: "Users", icon: "user" },
    ],
  },
  {
    title: "Pengaturan",
    items: [
      { to: "/settings/system", label: "Pengaturan Sistem", icon: "settings" },
      { to: "/settings/backup-history", label: "Riwayat Backup", icon: "save" },
      {
        to: "/settings/activity-logs",
        label: "Log Aktivitas",
        icon: "clipboard",
      },
    ],
  },
];

export default {
  components: { Icon },
  props: {
    collapsed: { type: Boolean, default: false },
  },
  data() {
    return {
      groups,
    };
  },
};
</script>

<style>
.sidebar {
  width: 240px;
  flex: 0 0 240px;
  flex-shrink: 0;
  background: #ffffff;
  color: #0f172a;
  padding: 20px;
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition:
    width 0.25s ease,
    padding 0.25s ease;
}

.sidebar__brand {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 0 12px;
}

.sidebar__logo {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, #4338ca, #6366f1);
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.sidebar__brand-text h3 {
  margin: 0;
  font-size: 18px;
  letter-spacing: 0.5px;
  color: #111827;
}

.sidebar__brand-text span {
  color: #94a3b8;
  font-size: 12px;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar a {
  color: #334155;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  text-decoration: none;
  transition:
    background 0.15s,
    color 0.15s;
}

.sidebar a:hover {
  background: #f1f5f9;
  color: #111827;
}

.sidebar a.active {
  background: #e0e7ff;
  color: #111827;
  border: 1px solid #c7d2fe;
}

.sidebar a .icon {
  margin-right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
}

.group {
  margin-top: 6px;
}

.group-title {
  color: #64748b;
  font-size: 12px;
  margin: 10px 6px 6px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.sidebar--collapsed {
  width: 76px;
  flex: 0 0 76px;
  padding: 20px 12px;
}

.sidebar--collapsed .sidebar__brand {
  justify-content: center;
}

.sidebar--collapsed .sidebar__brand-text {
  display: none;
}

.sidebar--collapsed nav {
  gap: 0;
}

.sidebar--collapsed a {
  justify-content: center;
  padding: 10px 0;
}

.sidebar--collapsed a span {
  display: none;
}

.sidebar--collapsed .group-title {
  height: 0;
  margin: 0;
  opacity: 0;
  overflow: hidden;
}
</style>
