<template>
  <section class="page-section">
    <h1>RIMS Desktop</h1>
    <p>Aplikasi manajemen rental dan penjualan berbasis database RIMS.</p>
    <div class="grid">
      <article>
        <h2>Master Data</h2>
        <p>Kelola entitas dasar seperti kategori, barang, paket, dan pelanggan.</p>
      </article>
      <article>
        <h2>Transaksi</h2>
        <p>Pencatatan sewa, penjualan, booking, pergerakan stok, dan pembayaran.</p>
      </article>
      <article>
        <h2>Laporan & View</h2>
        <p>Akses ringkasan stok, sewa aktif, penjualan harian, dan pelanggan teratas.</p>
      </article>
      <article>
        <h2>Pengaturan</h2>
        <p>Atur parameter sistem, pantau riwayat backup, dan audit aktivitas pengguna.</p>
      </article>
    </div>
  </section>
</template>

<script>
export default {
  name: 'DashboardPage'
};
</script>

<style scoped>
.page-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

article {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  background: #fff;
}

article h2 {
  margin-top: 0;
  margin-bottom: 6px;
  font-size: 16px;
}

article p {
  margin: 0;
  color: #475569;
  font-size: 14px;
}
</style>

