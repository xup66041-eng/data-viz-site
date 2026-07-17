import { describe, expect, it } from "vitest";

interface TableData {
  rowLabels: string[];
  columnLabels: string[];
  data: number[][];
}

function parseTableData(input: string): TableData | null {
  try {
    const lines = input
      .trim()
      .split("\n")
      .filter((line) => line.trim());

    if (lines.length < 2) {
      throw new Error("表格至少需要 2 行");
    }

    const headerLine = lines[0];
    const headerCells = headerLine.split(/\t|,/).map((cell) => cell.trim());
    const columnLabels = headerCells.slice(1);

    if (columnLabels.length === 0) {
      throw new Error("無法解析列標籤");
    }

    const rowLabels: string[] = [];
    const data: number[][] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(/\t|,/).map((cell) => cell.trim());

      if (cells.length < 2) {
        continue;
      }

      const rowLabel = cells[0];
      const values = cells.slice(1).map((cell) => {
        const num = parseFloat(cell);
        if (isNaN(num)) {
          throw new Error(`無效的數值: "${cell}"`);
        }
        return num;
      });

      if (values.length !== columnLabels.length) {
        throw new Error(`行 "${rowLabel}" 的數據列數不匹配`);
      }

      rowLabels.push(rowLabel);
      data.push(values);
    }

    if (rowLabels.length === 0) {
      throw new Error("無法解析任何數據行");
    }

    return { rowLabels, columnLabels, data };
  } catch (err) {
    return null;
  }
}

describe("Table Data Parser", () => {
  it("should parse tab-separated table data", () => {
    const input = `年度	112-02	113	114
諸詢業務	1390	3008	5507
蒐蒐動物處理	461	766	731`;

    const result = parseTableData(input);

    expect(result).not.toBeNull();
    expect(result?.columnLabels).toEqual(["112-02", "113", "114"]);
    expect(result?.rowLabels).toEqual(["諸詢業務", "蒐蒐動物處理"]);
    expect(result?.data).toEqual([
      [1390, 3008, 5507],
      [461, 766, 731],
    ]);
  });

  it("should parse comma-separated table data", () => {
    const input = `年度,112-02,113,114
諸詢業務,1390,3008,5507
蒐蒐動物處理,461,766,731`;

    const result = parseTableData(input);

    expect(result).not.toBeNull();
    expect(result?.columnLabels).toEqual(["112-02", "113", "114"]);
    expect(result?.data.length).toBe(2);
  });

  it("should handle whitespace correctly", () => {
    const input = `年度	  112-02  	  113  	  114  
  諸詢業務  	1390	3008	5507`;

    const result = parseTableData(input);

    expect(result).not.toBeNull();
    expect(result?.columnLabels).toEqual(["112-02", "113", "114"]);
  });

  it("should reject table with no data rows", () => {
    const input = `年度	112-02	113	114`;

    const result = parseTableData(input);

    expect(result).toBeNull();
  });

  it("should reject table with mismatched column count", () => {
    const input = `年度	112-02	113	114
諸詢業務	1390	3008`;

    const result = parseTableData(input);

    expect(result).toBeNull();
  });

  it("should reject table with invalid numbers", () => {
    const input = `年度	112-02	113	114
諸詢業務	abc	3008	5507`;

    const result = parseTableData(input);

    expect(result).toBeNull();
  });

  it("should handle decimal numbers", () => {
    const input = `年度	Q1	Q2	Q3
銷售	1390.5	3008.25	5507.75`;

    const result = parseTableData(input);

    expect(result).not.toBeNull();
    expect(result?.data[0]).toEqual([1390.5, 3008.25, 5507.75]);
  });

  it("should skip empty lines", () => {
    const input = `年度	112-02	113	114

諸詢業務	1390	3008	5507

蒐蒐動物處理	461	766	731`;

    const result = parseTableData(input);

    expect(result).not.toBeNull();
    expect(result?.rowLabels.length).toBe(2);
  });
});
