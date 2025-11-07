export const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(
    value || 0
  );

export const formatDate = (date) => new Date(date).toLocaleDateString("id-ID");
