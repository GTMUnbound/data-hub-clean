import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
} from "@tanstack/react-table";
import { ContactRecord } from "@/types";
import { useState } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { InlineTagEditor } from "@/components/InlineTagEditor";

const col = createColumnHelper<ContactRecord>();

interface DataTableProps {
  data: ContactRecord[];
  duplicateIds: Set<string>;
  onRowClick: (record: ContactRecord) => void;
  onUpdate: (id: string, updates: Partial<ContactRecord>) => void;
}

export function DataTable({ data, duplicateIds, onRowClick, onUpdate }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = [
    col.accessor("full_name", {
      header: "Name",
      cell: (info) => (
        <span className="font-medium text-foreground">{info.getValue()}</span>
      ),
    }),
    col.accessor("email", {
      header: "Email",
      cell: (info) => <span className="text-muted-foreground">{info.getValue()}</span>,
    }),
    col.accessor("company", { header: "Company" }),
    col.accessor("title", { header: "Title" }),
    col.accessor("city", { header: "City" }),
    col.accessor("country", { header: "Country" }),
    col.accessor("source", { header: "Source" }),
    col.accessor("tags", {
      header: "Tags",
      cell: (info) => (
        <InlineTagEditor
          tags={info.getValue()}
          onChange={(tags) => onUpdate(info.row.original.id, { tags })}
        />
      ),
      enableSorting: false,
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
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
                    className="text-left px-3 py-2.5 text-xs font-medium text-muted-foreground whitespace-nowrap select-none"
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
                className={`table-row-hover border-b ${duplicateIds.has(row.original.id) ? "bg-accent/40" : ""}`}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2.5 whitespace-nowrap max-w-[200px] truncate">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
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
