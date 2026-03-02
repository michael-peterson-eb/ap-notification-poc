import * as React from 'react';
import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';

type Props<T> = {
  data: T[];
  columns: ColumnDef<T, any>[];
  emptyText?: string;

  wrapperClassName?: string;
  heightClassName?: string;

  onScroll?: React.UIEventHandler<HTMLDivElement>;
  scrollRef?: React.RefObject<HTMLDivElement>;

  footer?: React.ReactNode;
};

export function DataTable<T>({ data, columns, emptyText = 'No results.', wrapperClassName = '', heightClassName = 'h-[440px]', onScroll, scrollRef, footer }: Props<T>) {
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });

  const [atTop, setAtTop] = React.useState(true);
  const [atBottom, setAtBottom] = React.useState(false);

  const handleInternalScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;

    const isAtTop = el.scrollTop <= 0;
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

    setAtTop(isAtTop);
    setAtBottom(isAtBottom);

    onScroll?.(e);
  };

  React.useEffect(() => {
    const el = scrollRef?.current;
    if (!el) return;

    const isAtTop = el.scrollTop <= 0;
    const isAtBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;

    setAtTop(isAtTop);
    setAtBottom(isAtBottom);
  }, [data.length, scrollRef]);

  return (
    <div
      className={[
        heightClassName,
        'relative overflow-hidden rounded-xl',
        // border + background like the mock (very light)
        'border border-[#D1D9E6]',
        'bg-[linear-gradient(0deg,rgba(29,100,232,0.01),rgba(29,100,232,0.01)),linear-gradient(180deg,#FFF_0%,#FDFDFD_100%)]',
        // mock shadow
        'shadow-[0_4px_8px_0_rgba(0,0,0,0.08),0_6px_30px_-4px_rgba(29,100,232,0.25)]',
        wrapperClassName,
      ].join(' ')}>
      {/* fades are inside the same rounded container so they clip correctly */}
      <div
        className={[
          'pointer-events-none absolute left-0 right-0 top-[39px] h-10 z-30',
          'bg-gradient-to-b from-[#FDFDFD] to-transparent',
          'transition-opacity duration-200',
          atTop ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
      />

      <div
        className={[
          'pointer-events-none absolute left-0 right-0 bottom-0 h-10 z-30',
          'bg-gradient-to-t from-[#FDFDFD] to-transparent',
          'transition-opacity duration-200',
          atBottom ? 'opacity-0' : 'opacity-100',
        ].join(' ')}
      />

      <div ref={scrollRef} className="h-full overflow-auto [&::-webkit-scrollbar]:hidden" onScroll={handleInternalScroll}>
        {/* Important: keep table transparent so you don't get inner edges */}
        <Table className="w-full bg-transparent">
          <TableHeader className="bg-transparent border-b border-[#D1D9E6]">
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id} className="hover:bg-transparent">
                {hg.headers.map((h, idx) => (
                  <TableHead
                    key={h.id}
                    className={[
                      'text-[#405172] font-semibold uppercase text-xs',
                      'sticky top-0 z-40 bg-[#F0F3FF]', // <-- critical: bg on every TH
                      'shadow-[0_1px_0_rgba(0,0,0,0.08)]',
                      idx === 0 ? 'rounded-tl-xl !pl-4' : '',
                      idx === hg.headers.length - 1 ? 'rounded-tr-xl pr-4' : '',
                    ].join(' ')}>
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="border-b border-[#EEF3FF] hover:bg-[#F6F8FF]">
                  {row.getVisibleCells().map((cell, idx) => (
                    <TableCell key={cell.id} className={[idx === 0 ? 'px-0 !pl-4' : '', idx === row.getVisibleCells().length - 1 ? 'pr-4' : ''].join(' ')}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {footer ? <div>{footer}</div> : null}
      </div>
    </div>
  );
}
