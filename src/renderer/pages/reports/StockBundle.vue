<template>
  <div>
    <h1>Stok Paket/Bundling</h1>
    <table class="stock-table">
      <thead>
        <tr>
          <th>Kode Paket</th>
          <th>Nama Paket</th>
          <th>Jenis</th>
          <th>Stok Total</th>
          <th>Stok Tersedia</th>
          <th>Harga Jual</th>
          <th>Harga Sewa/Hari</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="loading">
          <td colspan="7">Memuat data...</td>
        </tr>
        <tr v-else-if="bundles.length === 0">
          <td colspan="7">Tidak ada paket tersedia.</td>
        </tr>
        <tr v-else v-for="b in bundles" :key="b.id">
          <td>{{ b.code }}</td>
          <td>{{ b.name }}</td>
          <td>{{ b.bundle_type === 'sewa' ? 'Sewa' : 'Penjualan' }}</td>
          <td>{{ b.stock_quantity }}</td>
          <td>{{ b.available_quantity }}</td>
          <td>{{ formatCurrency(b.price) }}</td>
          <td>{{ b.rental_price_per_day ? formatCurrency(b.rental_price_per_day) : '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
const { ipcRenderer } = require('electron');

export default {
  name: 'StockBundle',
  data() {
    return {
      bundles: [],
      loading: true,
    };
  },
  mounted() {
    this.loadBundles();
  },
  methods: {
    async loadBundles() {
      try {
        const rows = await ipcRenderer.invoke('db:getBundles');
        // ensure numeric fields are numbers
        this.bundles = rows.map(r => ({
          ...r,
          price: r.price ? Number(r.price) : 0,
          rental_price_per_day: r.rental_price_per_day ? Number(r.rental_price_per_day) : 0,
          stock_quantity: Number(r.stock_quantity || 0),
          available_quantity: Number(r.available_quantity || 0),
        }));
      } catch (err) {
        console.error('Failed to load bundles', err);
        this.bundles = [];
      } finally {
        this.loading = false;
      }
    },
    formatCurrency(value) {
      if (value === null || value === undefined) return '-';
      try {
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
      } catch (e) {
        return value;
      }
    }
  }
};
</script>

<style>
.stock-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 16px;
}

.stock-table th,
.stock-table td {
  border: 1px solid #e5e7eb;
  padding: 8px 12px;
  text-align: left;
}

.stock-table th {
  background: #f3f4f6;
  color: #374151;
}
</style>
