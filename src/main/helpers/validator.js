/**
 * Helper untuk validasi input
 */

// Validasi string tidak kosong
const isNotEmpty = (value) => {
  if (!value || value.trim() === "") {
    return false;
  }
  return true;
};

// Validasi angka positif
const isPositiveNumber = (value) => {
  const num = Number(value);
  return !isNaN(num) && num > 0;
};

// Validasi tanggal
const isValidDate = (value) => {
  const date = new Date(value);
  return date instanceof Date && !isNaN(date);
};

// Validasi email
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validasi rentang tanggal
const isValidDateRange = (startDate, endDate) => {
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return false;
  }
  return new Date(startDate) <= new Date(endDate);
};

// Format pesan error
const formatError = (field, message) => ({
  field,
  message,
});

// Validate and normalize discount group ID
const validateDiscountGroupId = async (discountGroupId) => {
  if (
    discountGroupId === undefined ||
    discountGroupId === null ||
    discountGroupId === ""
  ) {
    return null;
  }

  const id = Number(discountGroupId);
  if (!id) {
    return null;
  }

  const database = require("./database");
  const discountGroup = await database.queryOne(
    "SELECT id FROM discount_groups WHERE id = ?",
    [id],
  );

  if (!discountGroup) {
    throw new Error("Grup diskon tidak ditemukan");
  }

  return id;
};

module.exports = {
  isNotEmpty,
  isPositiveNumber,
  isValidDate,
  isValidEmail,
  isValidDateRange,
  formatError,
  validateDiscountGroupId,
};
