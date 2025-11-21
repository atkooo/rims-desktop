<template>
  <div class="data-page report-export-page">
    <div class="page-header">
      <div class="header-content">
        <div>
          <h1>{{ reportTitle }}</h1>
          <p class="subtitle">{{ reportDescription }}</p>
        </div>
      </div>
    </div>

    <section class="card-section">
      <div class="export-card">
        <div class="export-info">
          <h3>Export Laporan</h3>
          <p>Pilih format export untuk membuka di aplikasi pihak ketiga (Crystal Reports, Excel, dll)</p>
        </div>

        <div class="filter-section">
          <h4>Pilih Report</h4>
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
            <h4 style="width: 100%; margin-bottom: 0.5rem;">Filter Periode</h4>
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
      </div>

      <div class="info-card">
        <h4>Informasi Laporan</h4>
        <div class="info-grid">
          <div class="info-item">
            <span>Nama Laporan:</span>
            <strong>{{ reportTitle }}</strong>
          </div>
          <div class="info-item">
            <span>Format Tersedia:</span>
            <strong>Excel (.xlsx)</strong>
          </div>
          <div class="info-item">
            <span>Keterangan:</span>
            <strong>File dapat dibuka dengan aplikasi pihak ketiga untuk preview dan cetak</strong>
          </div>
        </div>
      </div>
    </section>
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
.report-export-page {
  padding: 2rem;
}

.export-card {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 1.5rem;
}

.export-info {
  margin-bottom: 2rem;
}

.export-info h3 {
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
  color: #111827;
}

.export-info p {
  color: #6b7280;
  font-size: 0.95rem;
}

.filter-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.filter-section h4 {
  font-size: 1rem;
  margin-bottom: 1rem;
  color: #111827;
  font-weight: 600;
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
}

.filter-group-full {
  width: 100%;
  min-width: 300px;
}

.filter-group label {
  font-size: 0.875rem;
  color: #4b5563;
  font-weight: 500;
}

.filter-select,
.filter-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  background-color: white;
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
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.export-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.info-card {
  background: #f9fafb;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
}

.info-card h4 {
  font-size: 1.125rem;
  margin-bottom: 1rem;
  color: #111827;
}

.info-grid {
  display: grid;
  gap: 1rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item span {
  color: #6b7280;
  font-size: 0.9rem;
}

.info-item strong {
  color: #111827;
  font-weight: 600;
}

.success-banner {
  background-color: #d1fae5;
  color: #065f46;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.export-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.export-actions button {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
</style>

