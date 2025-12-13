<template>
  <div class="data-page master-page">
    <div class="page-header">
      <div>
        <h1>{{ reportTitle }}</h1>
        <p class="subtitle">{{ reportDescription }}</p>
      </div>
    </div>

    <div class="detail-container">
      <!-- Baris 1: Export Form & Informasi Laporan (2 card) -->
      <div class="cards-row">
        <!-- Card 1: Export Form -->
        <section class="card-section">
          <h3 class="column-title">Export Laporan</h3>
          
          <div class="filter-section">
            <div class="filter-row">
              <div class="filter-group filter-group-full">
                <label>Jenis Laporan:</label>
                <select v-model="selectedReport" class="filter-select">
                  <option value="">-- Pilih Jenis Laporan --</option>
                  <option
                    v-for="report in availableReports"
                    :key="report.value"
                    :value="report.value"
                  >
                    {{ report.label }}
                  </option>
                </select>
              </div>
            </div>

            <div v-if="selectedReport && hasDateFilter" class="filter-row" style="margin-top: 1rem;">
              <div class="filter-group">
                <label>Periode:</label>
                <select v-model="filters.period" class="filter-select">
                  <option value="daily">Harian</option>
                  <option value="monthly">Bulanan</option>
                  <option value="custom">Custom (Range Tanggal)</option>
                </select>
              </div>
              <div v-if="filters.period === 'custom'" class="filter-group">
                <label>Dari Tanggal:</label>
                <input
                  v-model="filters.dateFrom"
                  type="date"
                  class="filter-input"
                />
              </div>
              <div v-if="filters.period === 'custom'" class="filter-group">
                <label>Sampai Tanggal:</label>
                <input
                  v-model="filters.dateTo"
                  type="date"
                  class="filter-input"
                />
              </div>
            </div>
          </div>

          <div class="export-actions">
            <AppButton
              variant="secondary"
              :loading="previewing"
              @click="previewReport"
            >
              <Icon name="eye" :size="16" />
              Preview
            </AppButton>
            <AppButton
              variant="primary"
              :loading="exporting"
              @click="exportReport('excel')"
            >
              Export Excel
            </AppButton>
          </div>

          <div v-if="success" class="success-banner">
            {{ success }}
          </div>
        </section>

        <!-- Card 2: Informasi Laporan -->
        <section class="card-section">
          <h3 class="column-title">Informasi Laporan</h3>
          <div class="detail-list">
            <div class="detail-row">
              <label>Nama Laporan</label>
              <div class="detail-value">{{ reportTitle }}</div>
            </div>
            <div class="detail-row">
              <label>Format Tersedia</label>
              <div class="detail-value">Excel (.xlsx)</div>
            </div>
            <div class="detail-row full-row">
              <label>Keterangan</label>
              <div class="detail-value">File dapat dibuka dengan aplikasi pihak ketiga untuk preview dan cetak</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from "vue";
import AppButton from "@/components/ui/AppButton.vue";
import Icon from "@/components/ui/Icon.vue";
import { exportReportData, previewReport as previewReportService } from "@/services/reports";
import { useNotification } from "@/composables/useNotification";

export default {
  name: "ReportExportView",
  components: { AppButton, Icon },
  props: {
    reportType: {
      type: String,
      required: true,
    },
    reportTitle: {
      type: String,
      required: true,
    },
    reportDescription: {
      type: String,
      default: "Export laporan untuk dibuka di aplikasi pihak ketiga",
    },
  },
  setup(props) {
    const exporting = ref(false);
    const previewing = ref(false);
    const success = ref("");
    const selectedReport = ref("");
    const { showSuccess, showError } = useNotification();

    // Define available reports based on category
    const reportDefinitions = {
      executive: [
        { value: "rental-transactions", label: "Transaksi Rental", hasDate: true },
        { value: "sales-transactions", label: "Transaksi Penjualan", hasDate: true },
        { value: "daily-revenue", label: "Pendapatan Harian", hasDate: true },
        { value: "revenue-by-cashier", label: "Pendapatan per Kasir", hasDate: true },
      ],
      finance: [
        { value: "payments", label: "Laporan Pembayaran", hasDate: true },
      ],
      stock: [
        { value: "stock-items", label: "Stok Items", hasDate: false },
        { value: "stock-accessories", label: "Stok Aksesoris", hasDate: false },
        { value: "stock-bundles", label: "Stok Bundles", hasDate: false },
        { value: "stock-movements", label: "Mutasi Stok", hasDate: false },
        { value: "low-stock-alert", label: "Low Stock Alert", hasDate: false },
        { value: "stock-by-category", label: "Stok per Kategori", hasDate: false },
      ],
    };

    const availableReports = computed(() => {
      return reportDefinitions[props.reportType] || [];
    });

    const hasDateFilter = computed(() => {
      if (!selectedReport.value) return false;
      const report = availableReports.value.find((r) => r.value === selectedReport.value);
      return report ? report.hasDate : false;
    });

    // Initialize filters
    const filters = ref({
      period: "daily", // daily, monthly, custom
      dateFrom: "",
      dateTo: "",
    });

    const exportReport = async (format) => {
      exporting.value = true;
      success.value = "";

      try {
        // Validate report selection
        if (!selectedReport.value) {
          showError("Harap pilih jenis laporan terlebih dahulu");
          exporting.value = false;
          return;
        }

        // Validate custom date range
        if (hasDateFilter.value && filters.value.period === "custom") {
          if (!filters.value.dateFrom || !filters.value.dateTo) {
            showError("Harap pilih range tanggal");
            exporting.value = false;
            return;
          }
          if (new Date(filters.value.dateFrom) > new Date(filters.value.dateTo)) {
            showError("Tanggal mulai tidak boleh lebih besar dari tanggal akhir");
            exporting.value = false;
            return;
          }
        }

        // Prepare filter parameters
        const filterParams = {
          period: hasDateFilter.value ? filters.value.period : "daily",
          dateFrom: hasDateFilter.value ? (filters.value.dateFrom || null) : null,
          dateTo: hasDateFilter.value ? (filters.value.dateTo || null) : null,
        };

        const result = await exportReportData(
          selectedReport.value,
          format,
          filterParams
        );
        if (result.success) {
          success.value = `File berhasil diexport ke: ${result.filePath}`;
          showSuccess("File berhasil diexport");
        } else {
          showError(result.error || "Gagal mengexport laporan");
        }
      } catch (err) {
        console.error("Error exporting report:", err);
        showError(err.message || "Gagal mengexport laporan");
      } finally {
        exporting.value = false;
      }
    };

    const previewReport = async () => {
      previewing.value = true;
      success.value = "";

      try {
        // Validate report selection
        if (!selectedReport.value) {
          showError("Harap pilih jenis laporan terlebih dahulu");
          previewing.value = false;
          return;
        }

        // Validate custom date range
        if (hasDateFilter.value && filters.value.period === "custom") {
          if (!filters.value.dateFrom || !filters.value.dateTo) {
            showError("Harap pilih range tanggal");
            previewing.value = false;
            return;
          }
          if (new Date(filters.value.dateFrom) > new Date(filters.value.dateTo)) {
            showError("Tanggal mulai tidak boleh lebih besar dari tanggal akhir");
            previewing.value = false;
            return;
          }
        }

        // Prepare filter parameters
        const filterParams = {
          period: hasDateFilter.value ? filters.value.period : "daily",
          dateFrom: hasDateFilter.value ? (filters.value.dateFrom || null) : null,
          dateTo: hasDateFilter.value ? (filters.value.dateTo || null) : null,
        };

        const result = await previewReportService(
          selectedReport.value,
          filterParams
        );
        if (result.success) {
          showSuccess("File preview dibuka di aplikasi eksternal");
        } else {
          showError(result.error || "Gagal membuka preview");
        }
      } catch (err) {
        console.error("Error previewing report:", err);
        showError(err.message || "Gagal membuka preview");
      } finally {
        previewing.value = false;
      }
    };

    return {
      exporting,
      previewing,
      success,
      filters,
      selectedReport,
      availableReports,
      hasDateFilter,
      exportReport,
      previewReport,
    };
  },
};
</script>

<style scoped>
.detail-container {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.cards-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
}

.card-section {
  background: white;
  border-radius: 8px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.column-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid #e5e7eb;
}

.filter-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.filter-row {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 150px;
  flex: 1;
}

.filter-group-full {
  width: 100%;
  min-width: 300px;
}

.filter-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.filter-select,
.filter-input {
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: border-color 0.2s;
}

.filter-select:hover,
.filter-input:hover {
  border-color: #9ca3af;
}

.filter-select:focus,
.filter-input:focus {
  outline: none;
  border-color: #4f46e5;
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.export-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
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
  font-size: 0.8rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.4;
}

.detail-value {
  font-size: 0.9rem;
  color: #111827;
  font-weight: 500;
  line-height: 1.4;
}

.success-banner {
  background-color: #d1fae5;
  color: #065f46;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-top: 0.5rem;
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .cards-row {
    grid-template-columns: 1fr;
  }
}
</style>

