import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { ContactRecord } from "@/types";
import { useAddRecords } from "@/hooks/useRecords";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Loader2 } from "lucide-react";

const FIELDS: (keyof ContactRecord)[] = [
  "full_name", "email", "company", "title", "city", "country", "source", "tags", "notes",
];

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  listId: string;
}

type Step = "upload" | "preview" | "mapping";

export function ImportDialog({ open, onClose, listId }: ImportDialogProps) {
  const addRecords = useAddRecords();
  const [step, setStep] = useState<Step>("upload");
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  const reset = () => {
    setStep("upload");
    setCsvData([]);
    setHeaders([]);
    setMapping({});
  };

  const onDrop = useCallback((files: File[]) => {
    const file = files[0];
    if (!file) return;
    Papa.parse(file, {
      complete: (result) => {
        const rows = result.data as string[][];
        if (rows.length < 2) return;
        const hdrs = rows[0].map((h) => h.trim());
        setHeaders(hdrs);
        setCsvData(rows.slice(1).filter((r) => r.some((c) => c.trim())));

        // Auto-map columns
        const autoMap: Record<string, string> = {};
        hdrs.forEach((h) => {
          const lower = h.toLowerCase().replace(/[^a-z]/g, "");
          const match = FIELDS.find(
            (f) => f.replace("_", "").includes(lower) || lower.includes(f.replace("_", ""))
          );
          if (match) autoMap[h] = match;
          else autoMap[h] = "custom";
        });
        setMapping(autoMap);
        setStep("preview");
      },
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "text/plain": [".txt"] },
    maxFiles: 1,
  });

  const doImport = async () => {
    const records: Omit<ContactRecord, "id">[] = csvData.map((row) => {
      const rec: any = { tags: [], notes: "", custom_fields: {} };
      headers.forEach((h, idx) => {
        const field = mapping[h];
        if (field && field !== "skip" && row[idx] !== undefined) {
          if (field === "tags") {
            rec.tags = row[idx].split(",").map((t: string) => t.trim()).filter(Boolean);
          } else if (field === "custom") {
            if (row[idx].trim()) rec.custom_fields[h] = row[idx].trim();
          } else {
            rec[field] = row[idx].trim();
          }
        }
      });
      // Fill blanks
      FIELDS.forEach((f) => {
        if (!(f in rec)) rec[f] = f === "tags" ? [] : "";
      });
      return rec as Omit<ContactRecord, "id">;
    });

    await addRecords.mutateAsync({ listId, records });
    reset();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" ? "Import CSV" : step === "preview" ? "Preview Data" : "Map Columns"}
          </DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-primary bg-accent" : "border-border hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Drop a CSV file here, or click to browse
            </p>
          </div>
        )}

        {step === "preview" && (
          <div className="flex-1 overflow-auto">
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b bg-secondary">
                    {headers.map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b">
                      {row.map((cell, j) => (
                        <td key={j} className="px-3 py-1.5 whitespace-nowrap max-w-[200px] truncate">{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Showing first {Math.min(10, csvData.length)} of {csvData.length} rows
            </p>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-3 overflow-auto flex-1">
            {headers.map((h) => (
              <div key={h} className="flex items-center gap-3">
                <span className="text-sm w-40 truncate text-muted-foreground">{h}</span>
                <span className="text-muted-foreground">→</span>
                <Select
                  value={mapping[h] || "skip"}
                  onValueChange={(v) => setMapping((m) => ({ ...m, [h]: v === "skip" ? "" : v }))}
                >
                  <SelectTrigger className="w-48 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip">Skip</SelectItem>
                    <SelectItem value="custom">Create Custom Field</SelectItem>
                    {FIELDS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={reset}>Back</Button>
              <Button onClick={() => setStep("mapping")}>Map Columns</Button>
            </>
          )}
          {step === "mapping" && (
            <>
              <Button variant="outline" onClick={() => setStep("preview")}>Back</Button>
              <Button onClick={doImport} disabled={addRecords.isPending} className="gap-1.5">
                {addRecords.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {addRecords.isPending ? "Importing…" : `Import ${csvData.length} rows`}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
