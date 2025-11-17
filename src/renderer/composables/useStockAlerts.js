import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  getLowStockItems,
  getStockStatusSummary,
  getCriticalStockItems,
  updateMinStockAlert,
} from "@/services/stockAlerts";
import { useNotification } from "./useNotification";

export function useStockAlerts() {
  const { showNotification } = useNotification();
  const lowStockItems = ref([]);
  const statusSummary = ref({
    total_items: 0,
    out_of_stock: 0,
    critical: 0,
    warning: 0,
    sufficient: 0,
    not_set: 0,
  });
  const criticalItems = ref([]);
  const loading = ref(false);
  const error = ref(null);
  let checkInterval = null;

  // Computed properties
  const hasLowStock = computed(() => {
    return (
      statusSummary.value.out_of_stock > 0 ||
      statusSummary.value.critical > 0 ||
      statusSummary.value.warning > 0
    );
  });

  const criticalCount = computed(() => {
    return statusSummary.value.out_of_stock + statusSummary.value.critical;
  });

  const warningCount = computed(() => {
    return statusSummary.value.warning;
  });

  // Fetch low stock items
  const fetchLowStockItems = async () => {
    try {
      loading.value = true;
      error.value = null;
      const items = await getLowStockItems();
      lowStockItems.value = items;
      return items;
    } catch (err) {
      error.value = err.message || "Gagal memuat data stok rendah";
      console.error("Error fetching low stock items:", err);
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Fetch status summary
  const fetchStatusSummary = async () => {
    try {
      const summary = await getStockStatusSummary();
      statusSummary.value = summary;
      return summary;
    } catch (err) {
      console.error("Error fetching status summary:", err);
      throw err;
    }
  };

  // Fetch critical stock items
  const fetchCriticalStock = async () => {
    try {
      const items = await getCriticalStockItems();
      criticalItems.value = items;
      return items;
    } catch (err) {
      console.error("Error fetching critical stock:", err);
      throw err;
    }
  };

  // Update min stock alert
  const updateMinStock = async (id, type, minStockAlert) => {
    try {
      loading.value = true;
      error.value = null;
      const updated = await updateMinStockAlert({ id, type, minStockAlert });
      
      // Refresh data
      await Promise.all([
        fetchLowStockItems(),
        fetchStatusSummary(),
        fetchCriticalStock(),
      ]);

      showNotification({
        type: "success",
        title: "Berhasil",
        message: "Batas minimal stok berhasil diperbarui",
      });

      return updated;
    } catch (err) {
      error.value = err.message || "Gagal memperbarui batas minimal stok";
      showNotification({
        type: "error",
        title: "Error",
        message: error.value,
      });
      throw err;
    } finally {
      loading.value = false;
    }
  };

  // Check for stock alerts and show notifications
  const checkStockAlerts = async (showNotifications = true) => {
    try {
      await Promise.all([
        fetchStatusSummary(),
        fetchCriticalStock(),
      ]);

      if (showNotifications && criticalItems.value.length > 0) {
        const criticalCount = criticalItems.value.length;
        const outOfStockCount = criticalItems.value.filter(
          (item) => item.stock_quantity <= 0
        ).length;

        if (outOfStockCount > 0) {
          showNotification({
            type: "error",
            title: "Stok Habis",
            message: `${outOfStockCount} item stok habis dan perlu restock segera!`,
            duration: 5000,
          });
        } else if (criticalCount > 0) {
          showNotification({
            type: "warning",
            title: "Peringatan Stok",
            message: `${criticalCount} item stok rendah dan perlu restock!`,
            duration: 5000,
          });
        }
      }
    } catch (err) {
      console.error("Error checking stock alerts:", err);
    }
  };

  // Start periodic checking
  const startPeriodicCheck = (intervalMs = 60000) => {
    // Check immediately
    checkStockAlerts(true);

    // Then check periodically
    checkInterval = setInterval(() => {
      checkStockAlerts(true);
    }, intervalMs);
  };

  // Stop periodic checking
  const stopPeriodicCheck = () => {
    if (checkInterval) {
      clearInterval(checkInterval);
      checkInterval = null;
    }
  };

  // Initialize - fetch all data
  const initialize = async () => {
    try {
      loading.value = true;
      await Promise.all([
        fetchLowStockItems(),
        fetchStatusSummary(),
        fetchCriticalStock(),
      ]);
    } catch (err) {
      console.error("Error initializing stock alerts:", err);
    } finally {
      loading.value = false;
    }
  };

  // Auto cleanup on unmount
  onUnmounted(() => {
    stopPeriodicCheck();
  });

  return {
    // State
    lowStockItems,
    statusSummary,
    criticalItems,
    loading,
    error,
    hasLowStock,
    criticalCount,
    warningCount,

    // Methods
    fetchLowStockItems,
    fetchStatusSummary,
    fetchCriticalStock,
    updateMinStock,
    checkStockAlerts,
    startPeriodicCheck,
    stopPeriodicCheck,
    initialize,
  };
}

