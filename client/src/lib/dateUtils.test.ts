import { describe, it, expect } from "vitest";
import {
  toROCYear,
  toWesternYear,
  formatDateWithROC,
  formatDateShortROC,
  formatYearWithROC,
} from "./dateUtils";

describe("Date Utils - ROC Year Conversion", () => {
  it("should convert Western year to ROC year correctly", () => {
    expect(toROCYear(2026)).toBe(115);
    expect(toROCYear(2025)).toBe(114);
    expect(toROCYear(2024)).toBe(113);
    expect(toROCYear(2023)).toBe(112);
    expect(toROCYear(1912)).toBe(1);
  });

  it("should convert ROC year to Western year correctly", () => {
    expect(toWesternYear(115)).toBe(2026);
    expect(toWesternYear(114)).toBe(2025);
    expect(toWesternYear(113)).toBe(2024);
    expect(toWesternYear(112)).toBe(2023);
    expect(toWesternYear(1)).toBe(1912);
  });

  it("should format date with ROC year in full format", () => {
    const date = new Date("2026-02-05");
    const result = formatDateWithROC(date);
    expect(result).toContain("民國115");
    expect(result).toContain("2026年02月05日");
  });

  it("should format date with ROC year in short format", () => {
    const date = new Date("2026-02-05");
    const result = formatDateShortROC(date);
    expect(result).toBe("民115/02/05");
  });

  it("should format year with ROC and Western year", () => {
    const date = new Date("2026-02-05");
    const result = formatYearWithROC(date);
    expect(result).toBe("民115(2026)");
  });

  it("should handle string date input", () => {
    const result = formatYearWithROC("2026-02-05");
    expect(result).toBe("民115(2026)");
  });

  it("should handle edge case of year 1912 (ROC year 1)", () => {
    const date = new Date("1912-01-01");
    const result = formatYearWithROC(date);
    expect(result).toBe("民1(1912)");
  });
});
