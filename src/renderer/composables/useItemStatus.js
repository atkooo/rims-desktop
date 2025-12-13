/**
 * Composable for formatting item status with dynamic quantities
 */

export function useItemStatus() {
  /**
   * Format status label with quantity
   * @param {string} status - Status code (AVAILABLE, RENTED, MAINTENANCE, OUT_OF_STOCK)
   * @param {number} availableQuantity - Available quantity
   * @param {number} rentedQuantity - Rented quantity
   * @returns {string} Formatted status label
   */
  const formatStatusLabel = (status, availableQuantity = 0, rentedQuantity = 0) => {
    switch (status) {
      case "AVAILABLE":
        return `Tersedia ${availableQuantity}`;
      case "RENTED":
        return `Disewa ${rentedQuantity}`;
      case "MAINTENANCE":
        return "Maintenance";
      case "OUT_OF_STOCK":
        return "Habis";
      default:
        return status || "Tersedia 0";
    }
  };

  /**
   * Get status class for styling
   * @param {string} status - Status code
   * @returns {string} CSS class name
   */
  const getStatusClass = (status) => {
    const statusMap = {
      AVAILABLE: "available",
      OUT_OF_STOCK: "out-of-stock",
      RENTED: "rented",
      MAINTENANCE: "maintenance",
    };
    return statusMap[status] || "";
  };

  /**
   * Get status badge info (label and class)
   * @param {object} item - Item object with status, available_quantity, rented_quantity
   * @returns {object} { label, class }
   */
  const getStatusBadge = (item) => {
    const status = item.status || "AVAILABLE";
    const availableQuantity = item.available_quantity || 0;
    const rentedQuantity = item.rented_quantity || 0;

    return {
      label: formatStatusLabel(status, availableQuantity, rentedQuantity),
      class: getStatusClass(status),
    };
  };

  return {
    formatStatusLabel,
    getStatusClass,
    getStatusBadge,
  };
}


