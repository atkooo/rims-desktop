<template>
  <AppDialog v-model="showDialog" title="Stock Opname" :max-width="900">
    <div class="stock-opname-dialog">
      <div class="page-header">
        <div>
          <h1>Stock Opname</h1>
          <p class="subtitle">
            Gunakan Stock Opname untuk menyelaraskan stok riil dengan catatan mutasi secara otomatis.
            Sistem akan menghitung selisih berdasarkan log prioritas dan memperbaiki item sesuai hasil audit.
          </p>
        </div>
        <div class="header-actions">
          <AppButton
            size="small"
            variant="secondary"
            :loading="loading"
            @click="loadMismatches"
          >
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
        <div v-else-if="statusMessage" class="status-message success">
          {{ statusMessage }}
        </div>

        <div class="table-wrapper">
          <AppTable
            :columns="columns"
            :rows="mismatches"
            :loading="loading"
            :searchable-keys="['code', 'name']"
            :default-page-size="10"
            row-key="id"
          >
            <template #actions="{ row }">
                <AppButton
                  size="small"
                  variant="secondary"
                  :loading="repairingKey === getRowKey(row)"
                  @click="repairRow(row)"
                >
                Perbaiki
              </AppButton>
            </template>
          </AppTable>
          <p v-if="!loading && !mismatches.length" class="empty-state">
            Tidak ada selisih stok. Mutasi otomatis sudah sinkron.
          </p>
        </div>
      </section>
    </div>
  </AppDialog>
</template>

<script>
import { ref, computed, watch } from "vue";
import AppDialog from "@/components/ui/AppDialog.vue";
import AppButton from "@/components/ui/AppButton.vue";
import AppTable from "@/components/ui/AppTable.vue";
import {
  fetchStockMismatches,
  repairAccessoryStock,
  repairBundleStock,
  repairItemStock,
  repairAllMismatchedItems,
} from "@/services/stock";

export default {
  name: "StockOpnameDialog",
  components: {
    AppDialog,
    AppButton,
    AppTable,
  },
  props: {
    modelValue: Boolean,
  },
  emits: ["update:modelValue", "repaired"],
  setup(props, { emit }) {
    const mismatches = ref([]);
    const loading = ref(false);
    const error = ref("");
    const statusMessage = ref("");
    const repairingKey = ref(null);
    const repairingAll = ref(false);
    const showDialog = computed({
      get: () => props.modelValue,
      set: (value) => emit("update:modelValue", value),
    });

    const productTypeLabels = {
      item: "Item",
      accessory: "Aksesoris",
      bundle: "Bundle",
    };
    const getProductLabel = (row) => productTypeLabels[row?.product_type] || productTypeLabels.item;
    const getRowKey = (row) => `${row?.product_type || "item"}-${row?.id}`;
    const columns = [
      { key: "code", label: "Kode", sortable: true },
      {
        key: "product_type",
        label: "Tipe Produk",
        sortable: true,
        format: (_, row) => getProductLabel(row),
      },
      { key: "name", label: "Nama Produk", sortable: true },
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
        const data = await fetchStockMismatches();
        mismatches.value = data.map((row) => ({
          ...row,
        }));
      } catch (err) {
        error.value = err.message || "Gagal memuat hasil Stock Opname.";
      } finally {
        loading.value = false;
      }
    };

    const repairRow = async (row) => {
      const rowKey = getRowKey(row);
      repairingKey.value = rowKey;
      error.value = "";
      statusMessage.value = "";
      try {
        const repairFunctions = {
          item: repairItemStock,
          accessory: repairAccessoryStock,
          bundle: repairBundleStock,
        };
        const repairFn = repairFunctions[row.product_type] || repairItemStock;
        await repairFn(row.id);
        statusMessage.value = `Stok ${getProductLabel(row)} ${row.name || row.code} diselaraskan dengan log mutasi.`;
        emit("repaired");
        await loadMismatches();
      } catch (err) {
        error.value = err.message || "Gagal memperbaiki stok.";
      } finally {
        repairingKey.value = null;
      }
    };

    const handleRepairAll = async () => {
      if (!mismatches.value.length) return;
      repairingAll.value = true;
      error.value = "";
      statusMessage.value = "";
      try {
        const result = await repairAllMismatchedItems();
        statusMessage.value = `Perbaikan selesai: ${result.repaired} sukses, ${result.failed} gagal.`;
        emit("repaired");
        await loadMismatches();
      } catch (err) {
        error.value = err.message || "Gagal memperbaiki semua selisih stok.";
      } finally {
        repairingAll.value = false;
      }
    };

    watch(
      () => props.modelValue,
      (value) => {
        if (value) {
          loadMismatches();
        }
      },
    );

    return {
      showDialog,
      columns,
      mismatches,
      loading,
      error,
      statusMessage,
      repairingKey,
      repairingAll,
      repairRow,
      handleRepairAll,
      loadMismatches,
      getRowKey,
    };
  },
};
</script>

<style scoped>
.stock-opname-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #111827;
}

.header-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.subtitle {
  margin: 0;
  color: #475569;
  font-size: 0.95rem;
}

.error-banner {
  background-color: #fee2e2;
  color: #991b1b;
  padding: 0.75rem 1rem;
  border-radius: 6px;
}

.status-message {
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-weight: 500;
  color: #0f766e;
  background-color: #d1fae5;
  margin-bottom: 0.5rem;
}

.table-wrapper {
  margin-top: 1rem;
  max-height: 400px;
  overflow: auto;
}

.empty-state {
  margin-top: 1rem;
  color: #6b7280;
}
</style>
