import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ContactRecord } from "@/types";
import Papa from "papaparse";
import { Download } from "lucide-react";

interface ExportDialogProps {
  open: boolean;
  onClose: () => void;
  records: ContactRecord[];
  fileName?: string;
}

const ALL_COLUMNS: { key: keyof ContactRecord; label: string }[] = [
  { key: "full_name", label: "Full Name" },
  { key: "email", label: "Email" },
  { key: "company", label: "Company" },
  { key: "title", label: "Title" },
  { key: "city", label: "City" },
  { key: "country", label: "Country" },
  { key: "source", label: "Source" },
  { key: "tags", label: "Tags" },
  { key: "notes", label: "Notes" },
  { key: "id", label: "System ID" },
];

export function ExportDialog({ open, onClose, records, fileName = "export" }: ExportDialogProps) {
  const [selectedColumns, setSelectedColumns] = useState<Set<keyof ContactRecord>>(
    new Set(ALL_COLUMNS.filter(c => c.key !== "id").map(c => c.key))
  );

  const toggleColumn = (key: keyof ContactRecord) => {
    const next = new Set(selectedColumns);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelectedColumns(next);
  };

  const handleExport = () => {
    const columns = ALL_COLUMNS.filter(c => selectedColumns.has(c.key));
    
    const exportData = records.map(record => {
      const row: any = {};
      columns.forEach(col => {
        const val = record[col.key];
        if (col.key === "tags" && Array.isArray(val)) {
          row[col.label] = val.join(", ");
        } else {
          row[col.label] = val ?? "";
        }
      });
      return row;
    });

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Settings</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select the columns you want to include in the CSV export.
          </p>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 py-4">
          {ALL_COLUMNS.map((col) => (
            <div key={col.key} className="flex items-center space-x-2">
              <Checkbox
                id={`col-${col.key}`}
                checked={selectedColumns.has(col.key)}
                onCheckedChange={() => toggleColumn(col.key)}
              />
              <Label
                htmlFor={`col-${col.key}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {col.label}
              </Label>
            </div>
          ))}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setSelectedColumns(new Set(ALL_COLUMNS.map(c => c.key)))}
            >
              Select All
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setSelectedColumns(new Set())}
            >
              Deselect All
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleExport} className="gap-1.5">
              <Download className="h-4 w-4" />
              Export {records.length} Records
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
