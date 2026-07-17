import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface DataPoint {
  id?: string;
  itemName: string;
  period: string;
  value: string;
  notes?: string;
}

interface BatchImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImport: (dataPoints: DataPoint[]) => void;
  itemNames: string[];
}

export const BatchImportDialog: React.FC<BatchImportDialogProps> = ({
  open,
  onOpenChange,
  onImport,
  itemNames,
}) => {
  const [pastedData, setPastedData] = useState('');
  const [parsedData, setParsedData] = useState<DataPoint[]>([]);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Parse pasted data (supports CSV, tab-separated, or Excel paste format)
  const handleParse = () => {
    setError('');
    if (!pastedData.trim()) {
      setError('請貼上數據');
      return;
    }

    try {
      const lines = pastedData.trim().split('\n');
      const parsed: DataPoint[] = [];

      for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;

        // Split by tab or comma
        const parts = line.split(/\t|,/).map(p => p.trim());

        if (parts.length < 3) {
          setError(`行格式錯誤: "${line.substring(0, 50)}..."`);
          return;
        }

        const [itemName, period, value, ...notesParts] = parts;

        // Validate
        if (!itemName || !period || !value) {
          setError(`缺少必要欄位: "${line.substring(0, 50)}..."`);
          return;
        }

        // Validate period (should be a number like "115" or "113")
        if (!/^\d+$/.test(period)) {
          setError(`年度格式錯誤: "${period}" (應為數字)`);
          return;
        }

        // Validate value (should be a number)
        if (!/^-?\d+(\.\d+)?$/.test(value)) {
          setError(`數值格式錯誤: "${value}" (應為數字)`);
          return;
        }

        parsed.push({
          id: `temp-${Date.now()}-${parsed.length}`,
          itemName,
          period,
          value,
          notes: notesParts.join(',').trim() || undefined,
        });
      }

      if (parsed.length === 0) {
        setError('未找到有效的數據行');
        return;
      }

      setParsedData(parsed);
      setStep('preview');
    } catch (err) {
      setError(`解析錯誤: ${err instanceof Error ? err.message : '未知錯誤'}`);
    }
  };

  const handleImport = () => {
    if (parsedData.length === 0) {
      setError('沒有數據可導入');
      return;
    }
    onImport(parsedData);
    handleClose();
  };

  const handleClose = () => {
    setPastedData('');
    setParsedData([]);
    setError('');
    setStep('input');
    onOpenChange(false);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPastedData(text);
    } catch (err) {
      setError('無法從剪貼板讀取數據');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>批量導入數據</DialogTitle>
          <DialogDescription>
            {step === 'input'
              ? '貼上 CSV 或 Tab 分隔的數據（項目名稱、年度、數值）'
              : '預覽導入的數據，確認無誤後點擊「導入」'}
          </DialogDescription>
        </DialogHeader>

        {step === 'input' ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">數據格式：</label>
              <div className="bg-gray-50 p-3 rounded text-sm text-gray-600">
                <div>項目名稱 [Tab/逗號] 年度 [Tab/逗號] 數值</div>
                <div className="mt-2 text-xs">示例：</div>
                <div className="text-xs font-mono">
                  <div>後送醫療隻數	115	64</div>
                  <div>所內醫療隻數	115	69</div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="paste-area" className="text-sm font-medium">
                貼上數據：
              </label>
              <Textarea
                ref={textareaRef}
                id="paste-area"
                placeholder="在此貼上數據，或點擊下方「從剪貼板粘貼」按鈕"
                value={pastedData}
                onChange={(e) => setPastedData(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>{error}</div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handlePaste}
                variant="outline"
                className="flex-1"
              >
                <Upload className="w-4 h-4 mr-2" />
                從剪貼板粘貼
              </Button>
              <Button
                onClick={handleParse}
                className="flex-1"
                disabled={!pastedData.trim()}
              >
                預覽數據
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>找到 {parsedData.length} 行有效數據</div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="px-3 py-2 text-left font-medium">項目名稱</th>
                    <th className="px-3 py-2 text-left font-medium">年度</th>
                    <th className="px-3 py-2 text-left font-medium">數值</th>
                    <th className="px-3 py-2 text-left font-medium">備註</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedData.map((row, idx) => (
                    <tr
                      key={row.id}
                      className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                    >
                      <td className="px-3 py-2 border-r">{row.itemName}</td>
                      <td className="px-3 py-2 border-r">{row.period}</td>
                      <td className="px-3 py-2 border-r text-right">{row.value}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">
                        {row.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-sm text-gray-600">
              ⚠️ 導入後將直接替換現有數據，請確認無誤
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          {step === 'input' ? (
            <Button
              onClick={handleParse}
              disabled={!pastedData.trim()}
            >
              預覽數據
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setStep('input')}
              >
                返回編輯
              </Button>
              <Button onClick={handleImport}>
                導入數據
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
