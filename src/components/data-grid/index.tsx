"use client";

import { ReactNode, useMemo } from "react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import {
  GridColDef,
  DataGrid as MuiDataGrid,
  DataGridProps as MuiDataGridProps,
} from "@mui/x-data-grid";
import NoData from "~/assets/illustrations/no-data.png";
import { cn } from "~/utils/helpers";
import ActionMenu from "./action-menu";

type Props<T extends { id: string }> = MuiDataGridProps & {
  addSNColumn?: boolean;
  menuComp?: (props: { row: T; handleClose: () => void }) => ReactNode;
};

const DEFAULT_PAGE_SIZE = 10;

export default function DataGrid<T extends { id: string }>({
  sx,
  initialState,
  pageSizeOptions = [10, 50, 100],
  disableColumnMenu = true,
  disableRowSelectionOnClick = true,
  slots,
  rowCount = 0,
  rows = [],
  columns,
  menuComp,
  className,
  addSNColumn = true,
  ...props
}: Props<T>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const offset = parseInt(searchParams.get("offset") ?? "0");
  const limit = parseInt(searchParams.get("limit") ?? DEFAULT_PAGE_SIZE.toString());

  const paginationModel = useMemo(
    () => ({
      page: Math.floor(offset / limit),
      pageSize: limit,
    }),
    [limit, offset]
  );

  const enhancedColumns = useMemo(() => {
    const baseColumns = [...columns];

    if (menuComp) {
      baseColumns.push({
        field: "_",
        headerName: "",
        minWidth: 60,
        align: "center",
        sortable: false,
        renderCell: ({ row }) => <ActionMenu row={row} menuComp={menuComp} />,
      } as GridColDef<T>);
    }

    if (addSNColumn) {
      return [
        {
          field: "id",
          headerName: "SN",
          minWidth: 10,
          renderCell: ({ api, row }) => {
            const { page, pageSize } = paginationModel;
            const { getAllRowIds } = api;
            return getAllRowIds().indexOf(row.id) + 1 + page * pageSize;
          },
        },
        ...baseColumns,
      ];
    }

    return baseColumns;
  }, [columns, menuComp, addSNColumn, paginationModel]);

  return (
    <MuiDataGrid
      {...props}
      sx={{
        overflowX: "auto",
        flex: 1,
        borderWidth: "0px",
        "&.MuiDataGrid-root .MuiDataGrid-cell:focus-within": {
          outline: "none !important",
        },
        "& .MuiDataGrid-columnHeaders": {
          backgroundColor: "#ededed96",
          "& .MuiDataGrid-columnHeaderTitle": {
            fontWeight: 700,
            fontSize: "0.8rem",
            textTransform: "uppercase",
          },
        },
        "& .MuiDataGrid-row": {
          cursor: props.onRowClick ? "pointer" : undefined,
        },
        "& .MuiDataGrid-overlayWrapper": {
          "& .MuiDataGrid-overlayWrapperInner": {
            backgroundColor: "white",
          },
        },
        "& .MuiDataGrid-footerContainer": {
          backgroundColor: "white",
          "& .MuiTablePagination-selectLabel": {
            fontSize: "0.8rem",
          },
        },
        ...sx,
      }}
      columns={enhancedColumns}
      className={cn(`!min-h-[500px] !shadow-none`, className)}
      slots={{
        noRowsOverlay: () => {
          return (
            <div className="flex h-full w-full items-center justify-center">
              <Image
                src={NoData}
                className="w-full max-w-[300px]"
                alt={"empty state illustration"}
              />
            </div>
          );
        },
        ...slots,
      }}
      initialState={{
        pagination: { paginationModel: { pageSize: DEFAULT_PAGE_SIZE, page: 0 } },
        ...initialState,
      }}
      pageSizeOptions={pageSizeOptions}
      disableColumnMenu={disableColumnMenu}
      disableRowSelectionOnClick={disableRowSelectionOnClick}
      rowCount={rowCount}
      rows={rows}
      paginationModel={paginationModel}
      onPaginationModelChange={({ page, pageSize }) => {
        if (props.loading) return;

        const params = new URLSearchParams(searchParams);

        params.set("limit", pageSize.toString());
        params.set("offset", (page * pageSize).toString());

        window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
      }}
      paginationMode="server"
    />
  );
}
