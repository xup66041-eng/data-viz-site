import { describe, it, expect } from "vitest";

function toROCYear(year: number): number {
  return year - 1911;
}

function toWesternYear(rocYear: number): number {
  return rocYear + 1911;
}

function formatYearWithROC(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const rocYear = toROCYear(year);
  return `民${rocYear}(${year})`;
}

function formatDateShortROC(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rocYear = toROCYear(year);
  return `民${rocYear}/${month}/${day}`;
}

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

  it("should format year with ROC and Western year", () => {
    const date = new Date("2026-02-05");
    const result = formatYearWithROC(date);
    expect(result).toMatch(/民\d+\(\d{4}\)/);
  });

  it("should format date with ROC year in short format", () => {
    const date = new Date("2026-02-05");
    const result = formatDateShortROC(date);
    expect(result).toMatch(/民\d+\/\d{2}\/\d{2}/);
  });

  it("should handle string date input", () => {
    const result = formatYearWithROC("2026-02-05");
    expect(result).toMatch(/民\d+\(\d{4}\)/);
  });

  it("should format various years correctly", () => {
    const date2023 = new Date("2023-06-15");
    const result2023 = formatYearWithROC(date2023);
    expect(result2023).toContain("2023");
    
    const date2024 = new Date("2024-12-25");
    const result2024 = formatYearWithROC(date2024);
    expect(result2024).toContain("2024");
  });

  it("should format dates with proper padding", () => {
    const date = new Date("2026-02-05");
    const result = formatDateShortROC(date);
    expect(result).toMatch(/民\d+\/\d{2}\/\d{2}/);
  });
});
