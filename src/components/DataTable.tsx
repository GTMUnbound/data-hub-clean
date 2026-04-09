import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  RowSelectionState,
} from "@tanstack/react-table";
import { ContactRecord } from "@/types";
import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { InlineTagEditor } from "@/components/InlineTagEditor";
import { EditableCell } from "@/components/EditableCell";

const col = createColumnHelper<ContactRecord>();

interface DataTableProps {
  data: ContactRecord[];
  duplicateIds: Set<string>;
  onRowClick: (record: ContactRecord) => void;
  onUpdate: (id: string, updates: Partial<ContactRecord>) => void;
  rowSelection: RowSelectionState;
  onRowSelectionChange: (selection: RowSelectionState) => void;
}

export function DataTable({ data, duplicateIds, onRowClick, onUpdate, rowSelection, onRowSelectionChange }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const customKeys = useMemo(() => {
    const keys = new Set<string>();
    data.forEach((r) => {
      if (r.custom_fields) {
        Object.keys(r.custom_fields).forEach((k) => keys.add(k));
      }
    });
    return Array.from(keys).sort();
  }, [data]);

  const columns = useMemo(() => {
    const baseColumns = [
      col.display({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
            aria-label="Select all"
            className="translate-y-[2px]"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(v) => row.toggleSelected(!!v)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select row"
            className="translate-y-[2px]"
          />
        ),
        enableSorting: false,
      }),
      col.accessor("full_name", {
        header: "Name",
        cell: (info) => (
          <div className="font-medium text-foreground w-full">
            <EditableCell value={info.getValue()} onUpdate={(v) => onUpdate(info.row.original.id, { full_name: v })} placeholder="Name" />
          </div>
        ),
      }),
      col.accessor("email", {
        header: "Email",
        cell: (info) => (
          <div className="text-muted-foreground w-full">
            <EditableCell value={info.getValue()} onUpdate={(v) => onUpdate(info.row.original.id, { email: v })} placeholder="Email" />
          </div>
        ),
      }),
      col.accessor("company", {
        header: "Company",
        cell: (info) => <EditableCell value={info.getValue()} onUpdate={(v) => onUpdate(info.row.original.id, { company: v })} placeholder="Company" />,
      }),
      col.accessor("title", {
        header: "Title",
        cell: (info) => <EditableCell value={info.getValue()} onUpdate={(v) => onUpdate(info.row.original.id, { title: v })} placeholder="Title" />,
      }),
      col.accessor("city", {
        header: "City",
        cell: (info) => <EditableCell value={info.getValue()} onUpdate={(v) => onUpdate(info.row.original.id, { city: v })} placeholder="City" />,
      }),
      col.accessor("country", {
        header: "Country",
        cell: (info) => <EditableCell value={info.getValue()} onUpdate={(v) => onUpdate(info.row.original.id, { country: v })} placeholder="Country" />,
      }),
      col.accessor("source", {
        header: "Source",
        cell: (info) => <EditableCell value={info.getValue()} onUpdate={(v) => onUpdate(info.row.original.id, { source: v })} placeholder="Source" />,
      }),
      col.accessor("tags", {
        header: "Tags",
        cell: (info) => (
          <div onClick={(e) => e.stopPropagation()}>
            <InlineTagEditor
              tags={info.getValue()}
              onChange={(tags) => onUpdate(info.row.original.id, { tags })}
            />
          </div>
        ),
        enableSorting: false,
      }),
    ];

    const dynamicColumns = customKeys.map(k => col.accessor((row: ContactRecord) => row.custom_fields?.[k] as string, {
      id: `custom_${k}`,
      header: k,
      cell: (info) => (
        <EditableCell
          value={info.getValue()}
          onUpdate={(v) => {
            const currentCustom = info.row.original.custom_fields || {};
            onUpdate(info.row.original.id, { custom_fields: { ...currentCustom, [k]: v } });
          }}
          placeholder={k}
        />
      )
    }));

    return [...baseColumns, ...dynamicColumns];
  }, [onUpdate, customKeys]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: (updater) => {
      const next = typeof updater === "function" ? updater(rowSelection) : updater;
      onRowSelectionChange(next);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getRowId: (row) => row.id,
    initialState: { pagination: { pageSize: 50 } },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="overflow-auto flex-1">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-background z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b">
                {hg.headers.map((header) => (
                  <th
                    key={header.id}
                    className={`text-left px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap select-none ${header.id === "select" ? "w-10" : ""}`}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                    style={{ cursor: header.column.getCanSort() ? "pointer" : "default" }}
                  >
                    <div className="flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        header.column.getIsSorted() === "asc" ? <ArrowUp className="h-3 w-3" /> :
                        header.column.getIsSorted() === "desc" ? <ArrowDown className="h-3 w-3" /> :
                        <ArrowUpDown className="h-3 w-3 opacity-30" />
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick(row.original)}
                className={`table-row-hover border-b ${row.getIsSelected() ? "bg-accent/60" : duplicateIds.has(row.original.id) ? "bg-accent/40" : ""}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={`px-3 py-2.5 whitespace-nowrap max-w-[200px] truncate ${cell.column.id === "select" ? "w-10" : ""}`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t bg-background px-4 py-2 flex items-center justify-between text-xs text-muted-foreground shrink-0">
        <span>
          {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–
          {Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)} of {data.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="px-2 py-1 rounded border disabled:opacity-30 hover:bg-secondary transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="px-2 py-1 rounded border disabled:opacity-30 hover:bg-secondary transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
