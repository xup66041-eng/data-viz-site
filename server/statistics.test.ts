import { describe, expect, it } from "vitest";

// Mock data for statistics calculation
interface DataPoint {
  value: string;
}

function calculateStatistics(points: DataPoint[]) {
  if (points.length === 0) {
    return null;
  }

  const values = points.map(p => parseFloat(p.value));
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const avgValue = values.reduce((a, b) => a + b, 0) / values.length;
  
  // Calculate trend
  let trend = 'stable';
  if (points.length >= 2) {
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.05) {
      trend = 'up';
    } else if (secondAvg < firstAvg * 0.95) {
      trend = 'down';
    }
  }

  return {
    minValue: minValue.toString(),
    maxValue: maxValue.toString(),
    avgValue: avgValue.toFixed(2),
    trend,
    dataCount: points.length,
  };
}

describe("Statistics Calculation", () => {
  it("should return null for empty data points", () => {
    const result = calculateStatistics([]);
    expect(result).toBeNull();
  });

  it("should calculate correct min, max, and average values", () => {
    const points: DataPoint[] = [
      { value: "10" },
      { value: "20" },
      { value: "30" },
      { value: "40" },
    ];
    
    const result = calculateStatistics(points);
    
    expect(result).not.toBeNull();
    expect(result?.minValue).toBe("10");
    expect(result?.maxValue).toBe("40");
    expect(result?.avgValue).toBe("25.00");
    expect(result?.dataCount).toBe(4);
  });

  it("should detect upward trend", () => {
    const points: DataPoint[] = [
      { value: "10" },
      { value: "12" },
      { value: "30" },
      { value: "35" },
    ];
    
    const result = calculateStatistics(points);
    
    expect(result?.trend).toBe("up");
  });

  it("should detect downward trend", () => {
    const points: DataPoint[] = [
      { value: "40" },
      { value: "35" },
      { value: "10" },
      { value: "8" },
    ];
    
    const result = calculateStatistics(points);
    expect(result?.trend).toBe("down");
  });

  it("should detect stable trend", () => {
    const points: DataPoint[] = [
      { value: "20" },
      { value: "21" },
      { value: "20" },
      { value: "21" },
    ];
    
    const result = calculateStatistics(points);
    
    expect(result?.trend).toBe("stable");
  });

  it("should handle single data point", () => {
    const points: DataPoint[] = [{ value: "42" }];
    
    const result = calculateStatistics(points);
    
    expect(result?.minValue).toBe("42");
    expect(result?.maxValue).toBe("42");
    expect(result?.avgValue).toBe("42.00");
    expect(result?.trend).toBe("stable");
  });

  it("should handle decimal values", () => {
    const points: DataPoint[] = [
      { value: "10.5" },
      { value: "20.3" },
      { value: "15.7" },
    ];
    
    const result = calculateStatistics(points);
    
    expect(result?.minValue).toBe("10.5");
    expect(result?.maxValue).toBe("20.3");
    expect(parseFloat(result?.avgValue || "0")).toBeCloseTo(15.5, 1);
  });
});
