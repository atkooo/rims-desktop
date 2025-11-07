<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1>Paket / Bundling</h1>
        <p class="subtitle">Data berasal langsung dari tabel <code>bundles</code> di database.</p>
      </div>
      <button type="button" class="refresh" @click="loadBundles" :disabled="loading">
        <span v-if="loading">Memuat...</span>
        <span v-else>Muat Ulang</span>
      </button>
    </header>

    <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

    <div class="content">
      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Kode</th>
              <th>Nama</th>
              <th>Jenis</th>
              <th>Harga Sewa/Hari</th>
              <th>Harga Jual</th>
              <th>Stok</th>
              <th>Tersedia</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="bundle in bundles"
              :key="bundle.id"
              :class="{ active: selectedBundle && selectedBundle.id === bundle.id }"
              @click="selectBundle(bundle)"
            >
              <td>{{ bundle.code }}</td>
              <td>{{ bundle.name }}</td>
              <td>{{ formatBundleType(bundle.bundle_type) }}</td>
              <td>{{ formatCurrency(bundle.rental_price_per_day) }}</td>
              <td>{{ formatCurrency(bundle.price) }}</td>
              <td>{{ bundle.stock_quantity }}</td>
              <td>{{ bundle.available_quantity }}</td>
            </tr>
            <tr v-if="!loading && bundles.length === 0">
              <td colspan="7" class="empty">Belum ada data paket.</td>
            </tr>
            <tr v-if="loading">
              <td colspan="7" class="empty">Mengambil data paket...</td>
            </tr>
          </tbody>
        </table>
      </div>

      <aside class="details" v-if="selectedBundle">
        <header>
          <h2>Detail Paket</h2>
          <p>{{ selectedBundle.name }} ({{ selectedBundle.code }})</p>
        </header>
        <ul class="meta">
          <li><strong>Jenis</strong><span>{{ formatBundleType(selectedBundle.bundle_type) }}</span></li>
          <li><strong>Harga Jual</strong><span>{{ formatCurrency(selectedBundle.price) }}</span></li>
          <li><strong>Harga Sewa/Hari</strong><span>{{ formatCurrency(selectedBundle.rental_price_per_day) }}</span></li>
          <li><strong>Stok</strong><span>{{ selectedBundle.stock_quantity }}</span></li>
          <li><strong>Tersedia</strong><span>{{ selectedBundle.available_quantity }}</span></li>
        </ul>

        <section class="details-section">
          <h3>Komposisi Paket</h3>
          <p v-if="detailsLoading" class="muted">Memuat detail...</p>
          <p v-else-if="detailsError" class="error">{{ detailsError }}</p>
          <ul v-else-if="bundleDetails.length" class="detail-list">
            <li v-for="detail in bundleDetails" :key="detail.id">
              <div class="title">
                {{ detail.item_name || detail.accessory_name || 'Item Tidak Dikenal' }}
              </div>
              <div class="info">Jumlah: {{ detail.quantity }} — {{ detail.notes || 'Tanpa catatan' }}</div>
            </li>
          </ul>
          <p v-else class="muted">Belum ada detail untuk paket ini.</p>
        </section>
      </aside>

      <aside v-else class="details placeholder">
        <p>Pilih salah satu paket untuk melihat detail komposisinya.</p>
      </aside>
    </div>
  </section>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { invoke, isIpcAvailable } from '../../services/ipc.js';

export default {
  name: 'BundlesPage',
  setup() {
    const bundles = ref([]);
    const loading = ref(false);
    const errorMessage = ref('');
    const selectedId = ref(null);
    const detailsLoading = ref(false);
    const detailsError = ref('');
    const bundleDetails = ref([]);

    const selectedBundle = computed(() =>
      bundles.value.find((bundle) => bundle.id === selectedId.value) || null
    );

    const formatCurrency = (value) => {
      if (value == null) return '-';
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
      }).format(Number(value));
    };

    const formatBundleType = (type) => {
      if (!type) return '-';
      return type === 'rental' ? 'Sewa' : type === 'sale' ? 'Jual' : type;
    };

    const loadBundles = async () => {
      if (!isIpcAvailable()) {
        errorMessage.value = 'IPC Electron tidak tersedia. Jalankan melalui shell Electron.';
        return;
      }

      loading.value = true;
      errorMessage.value = '';
      try {
        const result = await invoke('db:getBundles');
        bundles.value = result || [];
        if (result?.length && !selectedId.value) {
          selectedId.value = result[0].id;
          await loadBundleDetails(selectedId.value);
        } else if (!result?.length) {
          selectedId.value = null;
          bundleDetails.value = [];
        }
      } catch (error) {
        console.error('Gagal memuat paket', error);
        errorMessage.value = error?.message || 'Gagal memuat data paket.';
      } finally {
        loading.value = false;
      }
    };

    const loadBundleDetails = async (bundleId) => {
      if (!bundleId) return;
      detailsLoading.value = true;
      detailsError.value = '';
      try {
        bundleDetails.value = await invoke('db:getBundleDetails', bundleId);
      } catch (error) {
        console.error('Gagal memuat detail paket', error);
        detailsError.value = error?.message || 'Gagal memuat detail paket.';
      } finally {
        detailsLoading.value = false;
      }
    };

    const selectBundle = async (bundle) => {
      if (!bundle || bundle.id === selectedId.value) return;
      selectedId.value = bundle.id;
      await loadBundleDetails(bundle.id);
    };

    onMounted(() => {
      loadBundles();
    });

    return {
      bundles,
      loading,
      errorMessage,
      selectedBundle,
      bundleDetails,
      detailsLoading,
      detailsError,
      loadBundles,
      selectBundle,
      formatCurrency,
      formatBundleType
    };
  }
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.page-header h1 {
  margin: 0 0 4px;
}

.subtitle {
  margin: 0;
  color: #475569;
}

.refresh {
  border: 1px solid var(--border);
  background: #f8fafc;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
}

.refresh:disabled {
  opacity: 0.6;
  cursor: wait;
}

.content {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
}

.table-wrapper {
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 12px;
  border-bottom: 1px solid #e2e8f0;
  text-align: left;
}

th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
}

tr:hover {
  background: #f1f5f9;
}

tr.active {
  background: #eef2ff;
}

.empty {
  text-align: center;
  color: #64748b;
}

.details {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: #fff;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.details header h2 {
  margin: 0 0 4px;
}

.details header p {
  margin: 0;
  color: #475569;
}

.meta {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.meta li {
  display: flex;
  justify-content: space-between;
  color: #334155;
}

.meta strong {
  font-weight: 600;
}

.details-section {
  border-top: 1px solid #e2e8f0;
  padding-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.detail-list li {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 10px;
  border-radius: 8px;
}

.detail-list .title {
  font-weight: 600;
}

.detail-list .info {
  color: #475569;
  font-size: 13px;
}

.error {
  color: #dc2626;
}

.muted {
  color: #64748b;
}

.placeholder {
  align-items: center;
  justify-content: center;
  color: #475569;
}

@media (max-width: 960px) {
  .content {
    grid-template-columns: 1fr;
  }
}
</style>
