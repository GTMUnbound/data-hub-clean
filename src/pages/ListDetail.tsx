import { useParams, useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { ContactRecord, DuplicateRule } from "@/types";
import { RowSelectionState } from "@tanstack/react-table";
import { DataTable } from "@/components/DataTable";
import { RecordPanel } from "@/components/RecordPanel";
import { ImportDialog } from "@/components/ImportDialog";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { AiChat } from "@/components/AiChat";
import { ExportDialog } from "@/components/ExportDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Upload, Download } from "lucide-react";
import Papa from "papaparse";
import {
  useRecords,
  useUpdateRecord,
  useDeleteRecords,
  useBulkTagRecords,
} from "@/hooks/useRecords";
import { useLists } from "@/hooks/useLists";

const ListDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Data ────────────────────────────────────────────────────
  const { data: lists = [] } = useLists();
  const list = lists.find((l) => l.id === id);

  const { data: records = [], isLoading: recordsLoading } = useRecords(id);
  const updateRecord = useUpdateRecord(id);
  const deleteRecords = useDeleteRecords(id);
  const bulkTagRecords = useBulkTagRecords(id);

  // ── UI state ─────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [duplicateRule, setDuplicateRule] = useState<DuplicateRule>("none");
  const [hideDuplicates, setHideDuplicates] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<(ContactRecord & { is_duplicate: boolean }) | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportData, setExportData] = useState<ContactRecord[]>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const [filterCity, setFilterCity] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterHasEmail, setFilterHasEmail] = useState(false);

  // ── Derived data ─────────────────────────────────────────────
  const cities = useMemo(() => [...new Set(records.map((r) => r.city).filter(Boolean))].sort(), [records]);
  const countries = useMemo(() => [...new Set(records.map((r) => r.country).filter(Boolean))].sort(), [records]);
  const allTags = useMemo(() => [...new Set(records.flatMap((r) => r.tags))].sort(), [records]);

  const duplicateIds = useMemo(() => {
    if (duplicateRule === "none") return new Set<string>();
    const seen = new Map<string, string>();
    const dupes = new Set<string>();
    records.forEach((r) => {
      const key =
        duplicateRule === "email"
          ? r.email.toLowerCase()
          : `${r.full_name.toLowerCase()}|${r.company.toLowerCase()}`;
      if (seen.has(key)) {
        dupes.add(r.id);
        dupes.add(seen.get(key)!);
      } else {
        seen.set(key, r.id);
      }
    });
    return dupes;
  }, [records, duplicateRule]);

  const filtered = useMemo(() => {
    let data = records as (ContactRecord & { is_duplicate: boolean })[];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.company.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q)
      );
    }
    if (filterCity) data = data.filter((r) => r.city === filterCity);
    if (filterCountry) data = data.filter((r) => r.country === filterCountry);
    if (filterTag) data = data.filter((r) => r.tags.includes(filterTag));
    if (filterHasEmail) data = data.filter((r) => r.email && r.email.includes("@"));
    if (hideDuplicates && duplicateRule !== "none") {
      const seen = new Set<string>();
      data = data.filter((r) => {
        const key =
          duplicateRule === "email"
            ? r.email.toLowerCase()
            : `${r.full_name.toLowerCase()}|${r.company.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return data;
  }, [records, search, filterCity, filterCountry, filterTag, filterHasEmail, hideDuplicates, duplicateRule]);

  const selectedIds = Object.keys(rowSelection).filter((k) => rowSelection[k]);

  const handleExport = () => {
    setExportData(filtered);
    setExportOpen(true);
  };
  
  const handleBulkExport = () => {
    setExportData(filtered.filter((r) => selectedIds.includes(r.id)));
    setExportOpen(true);
  };

  // ── Mutations ────────────────────────────────────────────────
  const handleBulkDelete = () => {
    deleteRecords.mutate(selectedIds, {
      onSuccess: () => setRowSelection({}),
    });
  };

  const handleBulkTag = (tags: string[]) => {
    bulkTagRecords.mutate(
      { recordIds: selectedIds, tags },
      { onSuccess: () => setRowSelection({}) }
    );
  };

  const handleUpdate = (recordId: string, updates: Partial<ContactRecord>) => {
    updateRecord.mutate({ recordId, updates });
    if (selectedRecord?.id === recordId) {
      setSelectedRecord((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  // ── AI filter action handler ──────────────────────────────────
  const handleAiFilter = (field: string, value: string) => {
    switch (field) {
      case "city":        setFilterCity(value);    break;
      case "country":     setFilterCountry(value); break;
      case "tag":
      case "tags":        setFilterTag(value);     break;
      case "search":      setSearch(value);        break;
      case "has_email":   setFilterHasEmail(true); break;
    }
  };

  // ── Not found ────────────────────────────────────────────────
  if (!recordsLoading && !list) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center text-muted-foreground">
        List not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="border-b bg-background px-6 py-3.5 flex items-center gap-4 shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="h-8 w-8 hover:bg-secondary">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Logo" className="h-6 w-auto" onError={(e) => e.currentTarget.style.display = 'none'} />
          <div className="h-4 w-px bg-border mx-1" />
          <div className="min-w-0">
            {recordsLoading ? (
              <div className="h-4 bg-secondary rounded w-40 animate-pulse" />
            ) : (
              <>
                <h1 className="text-sm font-semibold truncate leading-none mb-0.5">{list?.name}</h1>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{records.length} records</p>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)} className="gap-1.5">
            <Upload className="h-3.5 w-3.5" />
            Import CSV
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </div>
      </header>

      {/* Toolbar */}
      <div className="border-b bg-background px-6 py-2.5 flex items-center gap-3 flex-wrap shrink-0">
        <Input
          placeholder="Search name, company, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 h-8 text-sm"
        />
        <Select value={filterCity || "all"} onValueChange={(v) => setFilterCity(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="City" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All cities</SelectItem>
            {cities.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCountry || "all"} onValueChange={(v) => setFilterCountry(v === "all" ? "" : v)}>
          <SelectTrigger className="w-32 h-8 text-xs"><SelectValue placeholder="Country" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All countries</SelectItem>
            {countries.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterTag || "all"} onValueChange={(v) => setFilterTag(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Tag" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
          <Switch checked={filterHasEmail} onCheckedChange={setFilterHasEmail} className="scale-75" />
          Has email
        </label>
        <div className="ml-auto flex items-center gap-3">
          <Select value={duplicateRule} onValueChange={(v) => setDuplicateRule(v as DuplicateRule)}>
            <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Duplicate rule" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No duplicate rule</SelectItem>
              <SelectItem value="email">Duplicate: Email</SelectItem>
              <SelectItem value="name_company">Duplicate: Name + Company</SelectItem>
            </SelectContent>
          </Select>
          {duplicateRule !== "none" && (
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
              <Switch checked={hideDuplicates} onCheckedChange={setHideDuplicates} className="scale-75" />
              Hide dupes
            </label>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      <BulkActionsBar
        selectedCount={selectedIds.length}
        onDelete={handleBulkDelete}
        onTag={handleBulkTag}
        onExport={handleBulkExport}
        onClear={() => setRowSelection({})}
      />

      {/* Table + Panel */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-auto">
          {recordsLoading ? (
            <div className="p-8 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-10 bg-secondary/50 rounded animate-pulse" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No records yet. Import a CSV to get started.
            </div>
          ) : (
            <DataTable
              data={filtered}
              duplicateIds={duplicateIds}
              onRowClick={setSelectedRecord}
              onUpdate={handleUpdate}
              rowSelection={rowSelection}
              onRowSelectionChange={setRowSelection}
            />
          )}
        </div>
        {selectedRecord && (
          <RecordPanel
            record={selectedRecord}
            onClose={() => setSelectedRecord(null)}
            onUpdate={(updates) => handleUpdate(selectedRecord.id, updates)}
          />
        )}
      </div>

      {id && <ImportDialog open={importOpen} onClose={() => setImportOpen(false)} listId={id} />}
      
      <ExportDialog 
        open={exportOpen} 
        onClose={() => setExportOpen(false)} 
        records={exportData} 
        fileName={list?.name} 
      />

      {/* AI Chat */}
      {id && (
        <AiChat
          records={records}
          listName={list?.name ?? ""}
          listId={id}
          onFilter={handleAiFilter}
        />
      )}
    </div>
  );
};

export default ListDetail;
