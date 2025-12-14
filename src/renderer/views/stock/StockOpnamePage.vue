<template>
  <div class="data-page master-page stock-opname-page">
    <div class="page-header">
      <div>
        <h1>Stock Opname</h1>
        <p class="subtitle">
          Sinkronkan stok riil dengan mutasi otomatis melalui perhitungan semua
          movement.
        </p>
      </div>
      <div class="header-actions">
        <AppButton size="small" variant="secondary" :loading="loading" @click="loadMismatches">
          Muat Ulang
        </AppButton>
        <AppButton
          size="small"
          variant="primary"
          :loading="repairingAll"
          :disabled="!mismatches.length"
          @click="handleRepairAll"
        >
          Perbaiki Semua
        </AppButton>
      </div>
    </div>

    <section class="card-section form-section">
      <div v-if="error" class="error-banner">
        {{ error }}
      </div>
      <div v-else-if="statusMessage" class="status-message">
        {{ statusMessage }}
      </div>
      <AppTable
        :columns="columns"
        :rows="mismatches"
        :loading="loading"
        :searchable-keys="['code', 'name']"
        row-key="id"
        :default-page-size="10"
      >
        <template #actions="{ row }">
          <AppButton
            size="small"
            variant="secondary"
            :loading="repairingId === row.id"
            @click="repairRow(row)"
          >
            Perbaiki
          </AppButton>
        </template>
      </AppTable>
      <p v-if="!loading && !mismatches.length" class="empty-state">
        Semua stok sudah sesuai dengan catatan mutasi.
      </p>
    </section>
  </div>
</template>

<script>
import { onMounted, ref } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import {
  fetchStockMismatches,
  repairItemStock,
  repairAllMismatchedItems,
} from "@/services/stock";

export default {
  name: "StockOpnamePage",
  components: {
    AppButton,
    AppTable,
  },
  setup() {
    const mismatches = ref([]);
    const loading = ref(false);
    const error = ref("");
    const statusMessage = ref("");
    const repairingId = ref(null);
    const repairingAll = ref(false);

    const columns = [
      { key: "code", label: "Kode", sortable: true },
      { key: "name", label: "Nama Item", sortable: true },
      {
        key: "current_stock_quantity",
        label: "Stok Saat Ini",
        align: "right",
      },
      {
        key: "calculated_stock_quantity",
        label: "Stok Berdasarkan Log",
        align: "right",
      },
      {
        key: "stock_difference",
        label: "Selisih Stok",
        align: "right",
        format: (_, row) =>
          (row.calculated_stock_quantity || 0) -
          (row.current_stock_quantity || 0),
      },
      {
        key: "current_available_quantity",
        label: "Tersedia Saat Ini",
        align: "right",
      },
      {
        key: "calculated_available_quantity",
        label: "Tersedia Berdasarkan Log",
        align: "right",
      },
      {
        key: "available_difference",
        label: "Selisih Ketersediaan",
        align: "right",
        format: (_, row) =>
          (row.calculated_available_quantity || 0) -
          (row.current_available_quantity || 0),
      },
    ];

    const loadMismatches = async () => {
      loading.value = true;
      error.value = "";
      statusMessage.value = "";
      try {
        mismatches.value = await fetchStockMismatches();
      } catch (err) {
        error.value = err.message || "Gagal memuat hasil Stock Opname.";
      } finally {
        loading.value = false;
      }
    };

    const repairRow = async (row) => {
      repairingId.value = row.id;
      error.value = "";
      statusMessage.value = "";
      try {
        await repairItemStock(row.id);
        statusMessage.value = `Stok ${row.name || row.code} diselaraskan.`;
        await loadMismatches();
      } catch (err) {
        error.value = err.message || "Gagal memperbaiki stok.";
      } finally {
        repairingId.value = null;
      }
    };

    const handleRepairAll = async () => {
      if (!mismatches.value.length) return;
      repairingAll.value = true;
      error.value = "";
      statusMessage.value = "";
      try {
        const result = await repairAllMismatchedItems();
        statusMessage.value = `Perbaikan selesai (${result.repaired} sukses, ${result.failed} gagal).`;
        await loadMismatches();
      } catch (err) {
        error.value = err.message || "Gagal memperbaiki semua selisih stok.";
      } finally {
        repairingAll.value = false;
      }
    };

    onMounted(loadMismatches);

    return {
      mismatches,
      loading,
      error,
      statusMessage,
      repairingId,
      repairingAll,
      columns,
      loadMismatches,
      repairRow,
      handleRepairAll,
    };
  },
};
</script>

<style scoped>
.stock-opname-page {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.form-section {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 1.25rem;
  background: #fff;
}

.error-banner {
  background: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.status-message {
  background: #dcfce7;
  color: #046c4e;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
  font-weight: 500;
}

.table-wrapper {
  margin-top: 1rem;
}

.empty-state {
  margin-top: 1rem;
  color: #6b7280;
}

.subtitle {
  margin: 0;
  color: #475569;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.status-chip {
  font-size: 0.75rem;
}
</style>
