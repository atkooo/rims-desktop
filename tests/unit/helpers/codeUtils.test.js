const {
  normalizeCode,
  generateTransactionCode,
  toInteger,
} = require("../../../src/main/helpers/codeUtils");

describe("CodeUtils", () => {
  describe("normalizeCode", () => {
    test("should return uppercase code if provided", () => {
      expect(normalizeCode("test-code")).toBe("TEST-CODE");
      expect(normalizeCode("  test  ")).toBe("TEST");
    });

    test("should generate code from name if code is empty", () => {
      const code = normalizeCode("", "Test Item");
      expect(code).toMatch(/^ITM-TEST-ITEM/);
    });

    test("should sanitize name when generating code", () => {
      const code = normalizeCode("", "Test Item Name!");
      expect(code).toMatch(/^ITM-TEST-ITEM-NAME/);
      expect(code).not.toContain("!");
    });

    test("should use prefix when generating code", () => {
      const code = normalizeCode("", "Test", "CUS");
      expect(code).toMatch(/^CUS-/);
    });

    test("should use timestamp fallback if no name provided", () => {
      const code = normalizeCode("", "");
      expect(code).toMatch(/^ITM-\d+$/);
    });
  });

  describe("generateTransactionCode", () => {
    test("should generate rental transaction code", () => {
      const code = generateTransactionCode("RENTAL");
      // Format: RNT + YY + MM + DD + 4 random digits = 13 characters
      expect(code).toMatch(/^RNT\d{2}\d{2}\d{2}\d{4}$/);
      expect(code.startsWith("RNT")).toBe(true);
      expect(code.length).toBe(13);
    });

    test("should generate sale transaction code", () => {
      const code = generateTransactionCode("SALE");
      // Format: SLS + YY + MM + DD + 4 random digits = 13 characters
      expect(code).toMatch(/^SLS\d{2}\d{2}\d{2}\d{4}$/);
      expect(code.startsWith("SLS")).toBe(true);
      expect(code.length).toBe(13);
    });

    test("should generate unique codes", () => {
      const code1 = generateTransactionCode("RENTAL");
      const code2 = generateTransactionCode("RENTAL");
      // Codes should be different (unless generated in same millisecond)
      expect(code1).not.toBe(code2);
    });
  });

  describe("toInteger", () => {
    test("should convert valid numbers to integer", () => {
      expect(toInteger(10)).toBe(10);
      expect(toInteger("10")).toBe(10);
      expect(toInteger(10.5)).toBe(10);
    });

    test("should return 0 for invalid values", () => {
      expect(toInteger("abc")).toBe(0);
      expect(toInteger(null)).toBe(0);
      expect(toInteger(undefined)).toBe(0);
      expect(toInteger(NaN)).toBe(0);
    });
  });
});

