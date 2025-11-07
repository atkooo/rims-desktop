<template>
  <aside class="sidebar">
    <h3>RIMS</h3>
    <nav>
      <router-link to="/" active-class="active">
        <Icon name="dashboard" class="icon" /> Dashboard
      </router-link>
      <div v-for="group in groups" :key="group.title" class="group">
        <div class="group-title">{{ group.title }}</div>
        <router-link
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          active-class="active"
        >
          <Icon :name="item.icon" class="icon" /> {{ item.label }}
        </router-link>
      </div>
    </nav>
  </aside>
</template>
<script>
import Icon from './Icon.vue';

const groups = [
  {
    title: 'Master Data',
    items: [
      { to: '/master/categories', label: 'Kategori', icon: 'tag' },
      { to: '/master/accessories', label: 'Aksesoris', icon: 'box' },
      { to: '/master/items', label: 'Barang', icon: 'box' },
      { to: '/master/bundles', label: 'Paket', icon: 'clipboard' },
      { to: '/master/bundle-details', label: 'Detail Paket', icon: 'clipboard' },
      { to: '/master/customers', label: 'Pelanggan', icon: 'users' },
      { to: '/master/roles', label: 'Peran', icon: 'user' },
      { to: '/master/users', label: 'Pengguna', icon: 'user' }
    ]
  },
  {
    title: 'Transaksi',
    items: [
      { to: '/transactions/rentals', label: 'Transaksi Sewa', icon: 'key' },
      { to: '/transactions/rental-details', label: 'Detail Sewa', icon: 'clipboard' },
      { to: '/transactions/sales', label: 'Transaksi Penjualan', icon: 'money' },
      { to: '/transactions/sales-details', label: 'Detail Penjualan', icon: 'file' },
      { to: '/transactions/bookings', label: 'Booking Barang', icon: 'clipboard' },
      { to: '/transactions/stock-movements', label: 'Pergerakan Stok', icon: 'chart-bar' },
      { to: '/transactions/payments', label: 'Pembayaran', icon: 'money' }
    ]
  },
  {
    title: 'Laporan & View',
    items: [
      { to: '/reports/items-with-stock', label: 'Item dengan Stok', icon: 'chart-bar' },
      { to: '/reports/active-rentals', label: 'Sewa Aktif', icon: 'chart-line' },
      { to: '/reports/daily-sales', label: 'Penjualan Harian', icon: 'chart-line' },
      { to: '/reports/stock-alerts', label: 'Peringatan Stok', icon: 'chart-bar' },
      { to: '/reports/top-customers', label: 'Pelanggan Teratas', icon: 'users' }
    ]
  },
  {
    title: 'Pengaturan',
    items: [
      { to: '/settings/system', label: 'Pengaturan Sistem', icon: 'settings' },
      { to: '/settings/backup-history', label: 'Riwayat Backup', icon: 'save' },
      { to: '/settings/activity-logs', label: 'Log Aktivitas', icon: 'clipboard' }
    ]
  }
];

export default {
  components: { Icon },
  data() {
    return {
      groups
    };
  }
};
</script>
<style>
.sidebar {
  width: 240px;
  background: #ffffff;
  color: #0f172a;
  padding: 16px;
  border-right: 1px solid var(--border);
}

.sidebar h3 {
  margin: 0 0 10px;
  font-size: 18px;
  letter-spacing: .5px;
  color: #111827;
}

.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sidebar a {
  color: #334155;
  display: block;
  padding: 8px 10px;
  border-radius: 8px;
  text-decoration: none;
  transition: background .15s, color .15s;
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
  margin-right: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
}

.group {
  margin-top: 6px;
}

.group-title {
  color: #64748b;
  font-size: 12px;
  margin: 10px 6px 6px;
  text-transform: uppercase;
  letter-spacing: .08em;
}
</style>
