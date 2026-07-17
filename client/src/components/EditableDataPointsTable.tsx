import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';

interface DataPoint {
  id?: number;
  cardId?: number;
  itemName: string;
  period: string;
  value: string;
  notes?: string | null;
  createdAt?: Date;
}

interface EditableDataPointsTableProps {
  dataPoints: DataPoint[];
  itemNames: Array<{ id: number; name: string }>;
  onDataChange: (dataPoints: DataPoint[]) => void;
  onAddRow?: () => void;
  onDeleteRow?: (index: number) => void;
  onSave?: (dataPoints: DataPoint[]) => void;
}

export function EditableDataPointsTable({
  dataPoints: initialDataPoints,
  itemNames,
  onDataChange,
  onAddRow,
  onDeleteRow,
  onSave,
}: EditableDataPointsTableProps) {
  const [dataPoints, setDataPoints] = useState<DataPoint[]>(initialDataPoints);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [focusedCell, setFocusedCell] = useState<{ row: number; col: string } | null>(null);

  useEffect(() => {
    setDataPoints(initialDataPoints);
  }, [initialDataPoints]);

  const handleCellChange = (index: number, field: keyof DataPoint, value: string) => {
    const newDataPoints = [...dataPoints];
    newDataPoints[index] = {
      ...newDataPoints[index],
      [field]: value,
    };
    setDataPoints(newDataPoints);
    onDataChange(newDataPoints);
  };

  const handleAddRow = () => {
    const newDataPoints = [
      ...dataPoints,
      {
        itemName: '',
        period: '',
        value: '',
        notes: '',
      },
    ];
    setDataPoints(newDataPoints);
    onDataChange(newDataPoints);
    if (onAddRow) onAddRow();
  };

  const handleDeleteRow = (index: number) => {
    const newDataPoints = dataPoints.filter((_, i) => i !== index);
    setDataPoints(newDataPoints);
    onDataChange(newDataPoints);
    if (onDeleteRow) onDeleteRow(index);
  };

  const handleSave = () => {
    if (onSave) {
      onSave(dataPoints);
    }
  };

  return (
    <div className="space-y-4">
      {/* Excel-style table with checkerboard pattern */}
      <div className="border rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            {/* Header */}
            <thead>
              <tr className="bg-blue-50 border-b-2 border-blue-200">
                <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 border-r border-blue-200 w-32">
                  項目名稱
                </th>
                <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 border-r border-blue-200 w-24">
                  年度
                </th>
                <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 border-r border-blue-200 w-24">
                  數值
                </th>
                <th className="px-4 py-3 text-left font-semibold text-sm text-gray-700 border-r border-blue-200 w-32">
                  備註
                </th>
                <th className="px-4 py-3 text-center font-semibold text-sm text-gray-700 w-12">
                  操作
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {dataPoints.map((dp, index) => (
                <tr
                  key={index}
                  className={`border-b border-gray-200 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  } hover:bg-blue-100`}
                >
                  {/* Item Name - Dropdown */}
                  <td className="px-4 py-2 border-r border-gray-200">
                    <Select
                      value={dp.itemName}
                      onValueChange={(value) => handleCellChange(index, 'itemName', value)}
                    >
                      <SelectTrigger
                        className={`h-9 text-sm border-0 rounded-md ${
                          focusedCell?.row === index && focusedCell?.col === 'itemName'
                            ? 'ring-2 ring-blue-500 bg-white'
                            : 'bg-transparent'
                        }`}
                        onFocus={() => setFocusedCell({ row: index, col: 'itemName' })}
                        onBlur={() => setFocusedCell(null)}
                      >
                        <SelectValue placeholder="選擇項目" />
                      </SelectTrigger>
                      <SelectContent>
                        {itemNames.map((name) => (
                          <SelectItem key={name.id} value={name.name}>
                            {name.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Period - Text Input */}
                  <td className="px-4 py-2 border-r border-gray-200">
                    <Input
                      type="text"
                      value={dp.period}
                      onChange={(e) => handleCellChange(index, 'period', e.target.value)}
                      placeholder="113"
                      className={`h-9 text-sm border-0 rounded-md ${
                        focusedCell?.row === index && focusedCell?.col === 'period'
                          ? 'ring-2 ring-blue-500 bg-white'
                          : 'bg-transparent'
                      }`}
                      onFocus={() => setFocusedCell({ row: index, col: 'period' })}
                      onBlur={() => setFocusedCell(null)}
                    />
                  </td>

                  {/* Value - Number Input */}
                  <td className="px-4 py-2 border-r border-gray-200">
                    <Input
                      type="number"
                      value={dp.value}
                      onChange={(e) => handleCellChange(index, 'value', e.target.value)}
                      placeholder="0"
                      className={`h-9 text-sm border-0 rounded-md ${
                        focusedCell?.row === index && focusedCell?.col === 'value'
                          ? 'ring-2 ring-blue-500 bg-white'
                          : 'bg-transparent'
                      }`}
                      onFocus={() => setFocusedCell({ row: index, col: 'value' })}
                      onBlur={() => setFocusedCell(null)}
                    />
                  </td>

                  {/* Notes - Text Input */}
                  <td className="px-4 py-2 border-r border-gray-200">
                    <Input
                      type="text"
                      value={dp.notes || ''}
                      onChange={(e) => handleCellChange(index, 'notes', e.target.value)}
                      placeholder="備註"
                      className={`h-9 text-sm border-0 rounded-md ${
                        focusedCell?.row === index && focusedCell?.col === 'notes'
                          ? 'ring-2 ring-blue-500 bg-white'
                          : 'bg-transparent'
                      }`}
                      onFocus={() => setFocusedCell({ row: index, col: 'notes' })}
                      onBlur={() => setFocusedCell(null)}
                    />
                  </td>

                  {/* Delete Button */}
                  <td className="px-4 py-2 text-center">
                    <Button
                      onClick={() => handleDeleteRow(index)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 hover:bg-red-100"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button onClick={handleAddRow} variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          新增行
        </Button>
        {onSave && (
          <Button onClick={handleSave} size="sm" className="bg-blue-500 hover:bg-blue-600">
            保存更改
          </Button>
        )}
      </div>

      {dataPoints.length === 0 && (
        <div className="text-center text-gray-500 py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          沒有數據點，點擊「新增行」開始添加
        </div>
      )}
    </div>
  );
}
