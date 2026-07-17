import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { AlertCircle, Upload } from "lucide-react";
import { formatDateShortROC } from "@/lib/dateUtils";

interface TableData {
  rowLabels: string[];
  columnLabels: string[];
  data: number[][];
}

interface ParsedDataPoint {
  rowLabel: string;
  columnLabel: string;
  value: number;
  timestamp?: Date;
  itemName?: string;
  period?: string;
}

export function TableDataImporter({
  onImport,
}: {
  onImport: (data: ParsedDataPoint[]) => void;
}) {
  const [tableInput, setTableInput] = useState("");
  const [parsedData, setParsedData] = useState<TableData | null>(null);
  const [error, setError] = useState("");

  const parseTableData = (input: string): TableData | null => {
    try {
      setError("");
      
      // Split by lines and filter empty lines
      const lines = input
        .trim()
        .split("\n")
        .filter((line) => line.trim());

      if (lines.length < 2) {
        throw new Error("表格至少需要 2 行（標題行和數據行）");
      }

      // Parse header row (column labels)
      const headerLine = lines[0];
      const headerCells = headerLine.split(/\t|,/).map((cell) => cell.trim());

      // First cell is typically empty or contains row label header
      const columnLabels = headerCells.slice(1);

      if (columnLabels.length === 0) {
        throw new Error("無法解析列標籤");
      }

      // Parse data rows
      const rowLabels: string[] = [];
      const data: number[][] = [];

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(/\t|,/).map((cell) => cell.trim());

        if (cells.length < 2) {
          continue; // Skip incomplete rows
        }

        const rowLabel = cells[0];
        const values = cells.slice(1).map((cell) => {
          const num = parseFloat(cell);
          if (isNaN(num)) {
            throw new Error(`無效的數值: "${cell}" 在行 "${rowLabel}"`);
          }
          return num;
        });

        if (values.length !== columnLabels.length) {
          throw new Error(
            `行 "${rowLabel}" 的數據列數不匹配 (期望 ${columnLabels.length}, 得到 ${values.length})`
          );
        }

        rowLabels.push(rowLabel);
        data.push(values);
      }

      if (rowLabels.length === 0) {
        throw new Error("無法解析任何數據行");
      }

      return { rowLabels, columnLabels, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : "解析失敗";
      setError(message);
      toast.error(message);
      return null;
    }
  };

  const handleParse = () => {
    if (!tableInput.trim()) {
      setError("請輸入表格數據");
      return;
    }

    const parsed = parseTableData(tableInput);
    if (parsed) {
      setParsedData(parsed);
      toast.success("表格解析成功！");
    }
  };

  const handleImport = () => {
    if (!parsedData) {
      setError("請先解析表格數據");
      return;
    }

    const dataPoints: ParsedDataPoint[] = [];

    for (let i = 0; i < parsedData.rowLabels.length; i++) {
      for (let j = 0; j < parsedData.columnLabels.length; j++) {
        dataPoints.push({
          rowLabel: parsedData.rowLabels[i],
          columnLabel: parsedData.columnLabels[j],
          value: parsedData.data[i][j],
          itemName: parsedData.rowLabels[i],
          period: parsedData.columnLabels[j],
        });
      }
    }

    onImport(dataPoints);
    toast.success(`已導入 ${dataPoints.length} 個數據點（已自動清空舊數據）`);
    setTableInput("");
    setParsedData(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTableInput(text);
      toast.success("已粘貼剪貼板內容");
    } catch (err) {
      toast.error("無法訪問剪貼板");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            表格數據導入
          </CardTitle>
          <CardDescription>
            支援 CSV 或 Tab 分隔的表格數據。第一行為列標籤，第一列為行標籤。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="table-input">表格數據</Label>
            <Textarea
              id="table-input"
              placeholder="粘貼您的表格數據，例如：
年度	112-02	113	114
諸詢業務	1390	3008	5507
蒐蒐動物處理	461	766	731"
              value={tableInput}
              onChange={(e) => setTableInput(e.target.value)}
              className="min-h-48 font-mono text-sm"
            />
          </div>

          {error && (
            <div className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handlePaste} variant="outline" className="flex-1">
              粘貼
            </Button>
            <Button onClick={handleParse} className="flex-1">
              解析
            </Button>
          </div>

          {parsedData && (
            <div className="space-y-3 rounded-lg bg-muted/50 p-4">
              <div className="text-sm font-medium">預覽</div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold">行標籤:</span> {parsedData.rowLabels.join(", ")}
                </div>
                <div>
                  <span className="font-semibold">列標籤:</span> {parsedData.columnLabels.join(", ")}
                </div>
                <div>
                  <span className="font-semibold">數據點數:</span> {parsedData.data.length} × {parsedData.columnLabels.length} = {parsedData.data.length * parsedData.columnLabels.length}
                </div>
              </div>



              <Button onClick={handleImport} className="w-full">
                導入數據
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
