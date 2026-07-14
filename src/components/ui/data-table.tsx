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
    <div className={cn("overflow-hidden rounded-lg border border-slate-200 bg-white", className)}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={cn("whitespace-nowrap px-4 py-3 text-start font-bold", column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-slate-50/70">
                {columns.map((column) => (
                  <td key={column.key} className={cn("px-4 py-3 align-middle text-slate-700", column.className)}>
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 ? <div className="p-8 text-center text-sm text-slate-500">{empty ?? "No records"}</div> : null}
    </div>
  );
}
