import type { ReactNode } from "react";

import { cn } from "@/utils/cn";

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  empty,
  className
}: {
  rows: T[];
  columns: Array<Column<T>>;
  empty?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("sketch-table overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y-2 divide-dashed divide-[var(--muted-line)] text-sm">
          <thead className="bg-[var(--paper-soft)] text-[var(--ink-soft)]">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("whitespace-nowrap px-4 py-3 text-start font-bold", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-[rgba(0,0,0,0.24)]">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-[rgba(0,0,0,0.04)]">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3 align-middle text-[var(--ink-soft)]", column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <div className="p-8 text-center text-sm text-[var(--graphite)]">{empty ?? "No records"}</div> : null}
    </div>
  );
}
