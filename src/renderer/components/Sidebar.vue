<template>
  <aside class="sidebar">
    <h3>RIMS</h3>
    <nav>
      <router-link to="/" active-class="active">
        <Icon name="dashboard" class="icon" /> Dashboard
      </router-link>
      <div class="group">
        <div class="group-title">Master Data</div>
        <router-link to="/master/items" active-class="active">
          <Icon name="box" class="icon" /> Barang/Baju
        </router-link>
        <router-link to="/master/accessories" active-class="active">
          <Icon name="star" class="icon" /> Aksesoris
        </router-link>
        <router-link to="/master/categories" active-class="active">
          <Icon name="tag" class="icon" /> Kategori
        </router-link>
        <router-link to="/master/bundles" active-class="active">
          <Icon name="layers" class="icon" /> Paket/Bundling
        </router-link>
        <router-link to="/master/customers" active-class="active">
          <Icon name="users" class="icon" /> Pelanggan
        </router-link>
        <router-link to="/master/users" active-class="active">
          <Icon name="user" class="icon" /> Pengguna
        </router-link>
      </div>
      <div class="group">
        <div class="group-title">Transaksi</div>
        <router-link to="/transactions/sale" active-class="active">
          <Icon name="money" class="icon" /> Penjualan Baru
        </router-link>
        <router-link to="/transactions/sales" active-class="active">
          <Icon name="file" class="icon" /> Daftar Penjualan
        </router-link>
        <router-link to="/transactions/rental" active-class="active">
          <Icon name="key" class="icon" /> Sewa Baru
        </router-link>
        <router-link to="/transactions/rentals" active-class="active">
          <Icon name="clipboard" class="icon" /> Daftar Sewa
        </router-link>
      </div>
      <div class="group">
        <div class="group-title">Stok</div>
        <router-link to="/stock/items" active-class="active">
          <Icon name="archive" class="icon" /> Stok Barang
        </router-link>
        <router-link to="/stock/bundles" active-class="active">
          <Icon name="layers" class="icon" /> Stok Paket
        </router-link>
      </div>
      <div class="group">
        <div class="group-title">Laporan</div>
        <router-link to="/reports/sales" active-class="active">
          <Icon name="chart-line" class="icon" /> Penjualan
        </router-link>
        <router-link to="/reports/rentals" active-class="active">
          <Icon name="chart-bar" class="icon" /> Sewa
        </router-link>
        <router-link to="/reports/stock" active-class="active">
          <Icon name="archive" class="icon" /> Stok
        </router-link>
        <router-link to="/reports/bundles" active-class="active">
          <Icon name="layers" class="icon" /> Paket
        </router-link>
      </div>
      <div class="group">
        <div class="group-title">Pengaturan</div>
        <router-link to="/settings/system" active-class="active">
          <Icon name="settings" class="icon" /> Sistem
        </router-link>
        <router-link to="/settings/backup" active-class="active">
          <Icon name="save" class="icon" /> Backup
        </router-link>
      </div>
    </nav>
  </aside>
</template>
<script>
import Icon from './ui/Icon.vue';

export default { components: { Icon } };
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
