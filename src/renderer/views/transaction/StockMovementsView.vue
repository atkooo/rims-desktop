<template>
  <div class="data-page transaction-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>Mutasi Stok</h1>
          <p class="subtitle">
            Kelola mutasi stok masuk dan keluar untuk semua produk.
          </p>
        </div>
        <div class="header-actions">
          <AppButton variant="secondary" :loading="loading" @click="loadData">
            Refresh Data
          </AppButton>
          <AppButton variant="primary" size="small" @click="goToReceipt">
            Penerimaan Stok
          </AppButton>
          <AppButton variant="primary" @click="goToOpname">
            Stock Opname
          </AppButton>
        </div>
      </div>
    </div>

    <section class="card-section">
      <div class="summary-grid">
        <div class="summary-card">
          <span>Total Record</span>
          <strong>{{ movements.length }}</strong>
        </div>
        <div class="summary-card">
          <span>Masuk</span>
          <strong>{{ stats.inbound }}</strong>
        </div>
        <div class="summary-card">
          <span>Keluar</span>
          <strong>{{ stats.outbound }}</strong>
        </div>
      </div>

      <div v-if="error" class="error-banner">
        {{ error }}
      </div>

      <div class="table-container">
        <AppTable
          :columns="columns"
          :rows="movements"
          :loading="loading"
          :searchable-keys="[
            'item_name',
            'product_type',
            'movement_type',
            'reference_type',
            'user_name',
            'notes',
          ]"
          row-key="id"
          :default-page-size="10"
        >
          <template #actions="{ row }">
            <AppButton
              variant="secondary"
              size="small"
              @click="openDetail(row)"
              title="Detail"
            >
              <Icon name="eye" :size="16" />
            </AppButton>
          </template>
        </AppTable>
      </div>
    </section>

    <!-- Stock Movement Detail Dialog -->
    <AppDialog
      v-model="showDetail"
      :title="selectedMovement ? `Detail Mutasi Stok` : 'Detail'"
      :show-footer="false"
      :max-width="600"
    >
      <div v-if="selectedMovement" class="detail-dialog">
        <div class="detail-cards">
          <!-- Card 1: Informasi Produk -->
          <div class="detail-card">
            <h4 class="card-title">Informasi Produk</h4>
            <div class="detail-list">
              <div class="detail-row">
                <label>Kode</label>
                <div class="detail-value">{{ selectedMovement.product_code || "-" }}</div>
              </div>
              <div class="detail-row">
                <label>Nama Produk</label>
                <div class="detail-value">{{ selectedMovement.item_name || "-" }}</div>
              </div>
              <div class="detail-row">
                <label>Jenis Produk</label>
                <div class="detail-value">
                  <span class="status-badge">{{ selectedMovement.product_type }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Card 2: Mutasi Stok -->
          <div class="detail-card">
            <h4 class="card-title">Mutasi Stok</h4>
            <div class="detail-list">
              <div class="detail-row">
                <label>Jenis Mutasi</label>
                <div class="detail-value">
                  <span class="status-badge" :class="selectedMovement.movement_type === 'IN' ? 'inbound' : 'outbound'">
                    {{ selectedMovement.movement_type === 'IN' ? 'Masuk (IN)' : 'Keluar (OUT)' }}
                  </span>
                </div>
              </div>
              <div class="detail-row">
                <label>Jumlah</label>
                <div class="detail-value">{{ selectedMovement.quantity || 0 }}</div>
              </div>
              <div class="detail-row">
                <label>Stok Sebelum</label>
                <div class="detail-value">{{ selectedMovement.stock_before || 0 }}</div>
              </div>
              <div class="detail-row">
                <label>Stok Sesudah</label>
                <div class="detail-value">{{ selectedMovement.stock_after || 0 }}</div>
              </div>
            </div>
          </div>

          <!-- Card 3: Referensi & Informasi -->
          <div class="detail-card">
            <h4 class="card-title">Referensi & Informasi</h4>
            <div class="detail-list">
              <div class="detail-row">
                <label>Tipe Referensi</label>
                <div class="detail-value">{{ selectedMovement.reference_type || "-" }}</div>
              </div>
              <div class="detail-row">
                <label>Ref ID</label>
                <div class="detail-value">{{ selectedMovement.reference_id || "-" }}</div>
              </div>
              <div class="detail-row">
                <label>Petugas</label>
                <div class="detail-value">{{ selectedMovement.user_name || "-" }}</div>
              </div>
              <div class="detail-row full-row">
                <label>Catatan</label>
                <div class="detail-value">{{ selectedMovement.notes || "-" }}</div>
              </div>
              <div class="detail-row">
                <label>Tanggal</label>
                <div class="detail-value">{{ formatDate(selectedMovement.created_at) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppDialog>
  </div>
</template>

<script>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import Icon from "@/components/ui/Icon.vue";
import { fetchStockMovements } from "@/services/transactions";
import { formatDateTime } from "@/utils/dateUtils";

export default {
  name: "StockMovementsView",
  components: { AppButton, AppTable, AppDialog, Icon },
  setup() {
    const router = useRouter();
    const movements = ref([]);
    const loading = ref(false);
    const error = ref("");
    const showDetail = ref(false);
    const selectedMovement = ref(null);

    const formatDate = (value) => (value ? formatDateTime(value) : "-");

    const columns = [
      { key: "item_name", label: "Produk", sortable: true },
      { key: "product_type", label: "Jenis", sortable: true },
      { key: "movement_type", label: "Tipe", sortable: true },
      { key: "quantity", label: "Qty", sortable: true, align: "center" },
      {
        key: "stock_before",
        label: "Sebelum",
        sortable: true,
        align: "center",
      },
      { key: "stock_after", label: "Sesudah", sortable: true, align: "center" },
      {
        key: "created_at",
        label: "Tanggal",
        format: formatDate,
        sortable: true,
      },
    ];

    const stats = computed(() => {
      const inbound = movements.value.filter(
        (row) => row.movement_type === "IN",
      ).length;
      const outbound = movements.value.filter(
        (row) => row.movement_type === "OUT",
      ).length;
      return { inbound, outbound };
    });

    const loadData = async () => {
      loading.value = true;
      error.value = "";
      try {
        movements.value = await fetchStockMovements();
      } catch (err) {
        error.value = err.message || "Gagal memuat mutasi stok.";
      } finally {
        loading.value = false;
      }
    };

    const goToReceipt = () => router.push("/stock/receipt");
    const goToOpname = () => router.push("/stock/opname");

    const openDetail = (movement) => {
      selectedMovement.value = movement;
      showDetail.value = true;
    };

    onMounted(loadData);

    return {
      movements,
      loading,
      error,
      columns,
      stats,
      loadData,
      goToReceipt,
      goToOpname,
      showDetail,
      selectedMovement,
      openDetail,
      formatDate,
    };
  },
};
</script>

<style scoped>
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background-color: #f9fafb;
  padding: 1.25rem;
  border-radius: 10px;
  border: 1px solid #e0e7ff;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.05);
}

.summary-card span {
  display: block;
  color: #4b5563;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

.summary-card strong {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
}

.table-container {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

/* Detail Dialog Styles */
.detail-dialog {
  padding: 0.5rem 0;
}

.detail-cards {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-card {
  background: #f9fafb;
  border-radius: 8px;
  padding: 1rem;
  border: 1px solid #e5e7eb;
}

.card-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.75rem 0;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.detail-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.375rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.detail-row:last-child {
  border-bottom: none;
}

.detail-row.full-row {
  grid-template-columns: 1fr;
  flex-direction: column;
  gap: 0.25rem;
}

.detail-row label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.4;
}

.detail-value {
  font-size: 0.875rem;
  color: #111827;
  font-weight: 500;
  line-height: 1.4;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
  background-color: #e5e7eb;
  color: #374151;
}

.status-badge.inbound {
  background-color: #d1fae5;
  color: #065f46;
}

.status-badge.outbound {
  background-color: #fee2e2;
  color: #991b1b;
}
</style>
