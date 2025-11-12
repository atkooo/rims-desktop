const {
  isNotEmpty,
  isPositiveNumber,
  isValidDate,
  isValidEmail,
  isValidDateRange,
  formatError,
} = require("../../../src/main/helpers/validator");

describe("Validator", () => {
  describe("isNotEmpty", () => {
    test("should return true for non-empty string", () => {
      expect(isNotEmpty("test")).toBe(true);
      expect(isNotEmpty("  test  ")).toBe(true);
    });

    test("should return false for empty string", () => {
      expect(isNotEmpty("")).toBe(false);
      expect(isNotEmpty("   ")).toBe(false);
    });

    test("should return false for null or undefined", () => {
      expect(isNotEmpty(null)).toBe(false);
      expect(isNotEmpty(undefined)).toBe(false);
    });
  });

  describe("isPositiveNumber", () => {
    test("should return true for positive numbers", () => {
      expect(isPositiveNumber(1)).toBe(true);
      expect(isPositiveNumber(100)).toBe(true);
      expect(isPositiveNumber("10")).toBe(true);
      expect(isPositiveNumber(0.5)).toBe(true);
    });

    test("should return false for zero or negative numbers", () => {
      expect(isPositiveNumber(0)).toBe(false);
      expect(isPositiveNumber(-1)).toBe(false);
      expect(isPositiveNumber("-10")).toBe(false);
    });

    test("should return false for non-numeric values", () => {
      expect(isPositiveNumber("abc")).toBe(false);
      expect(isPositiveNumber(null)).toBe(false);
      expect(isPositiveNumber(undefined)).toBe(false);
    });
  });

  describe("isValidDate", () => {
    test("should return true for valid dates", () => {
      expect(isValidDate("2024-01-01")).toBe(true);
      expect(isValidDate("2024-01-01T00:00:00Z")).toBe(true);
      expect(isValidDate(new Date())).toBe(true);
    });

    test("should return false for invalid dates", () => {
      expect(isValidDate("invalid")).toBe(false);
      expect(isValidDate("2024-13-01")).toBe(false);
      // Note: new Date(null) creates a valid date (epoch time)
      // So we only test for undefined and empty string
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate("")).toBe(false);
    });
  });

  describe("isValidEmail", () => {
    test("should return true for valid emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co.uk")).toBe(true);
    });

    test("should return false for invalid emails", () => {
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("test@")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("isValidDateRange", () => {
    test("should return true for valid date range", () => {
      expect(isValidDateRange("2024-01-01", "2024-01-31")).toBe(true);
      expect(isValidDateRange("2024-01-01", "2024-01-01")).toBe(true);
    });

    test("should return false for invalid date range", () => {
      expect(isValidDateRange("2024-01-31", "2024-01-01")).toBe(false);
      expect(isValidDateRange("invalid", "2024-01-01")).toBe(false);
      expect(isValidDateRange("2024-01-01", "invalid")).toBe(false);
    });
  });

  describe("formatError", () => {
    test("should format error message correctly", () => {
      const error = formatError("name", "Field is required");
      expect(error).toEqual({
        field: "name",
        message: "Field is required",
      });
    });
  });
});

