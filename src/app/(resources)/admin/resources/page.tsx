"use client";

import { Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Typography } from "@mui/material";
import { GridColDef } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { Formik } from "formik";
import { FiSearch } from "react-icons/fi";
import { MdOutlineBedroomChild, MdEvent, MdRestaurantMenu } from "react-icons/md";
import Button from "~/components/button";
import DataGrid from "~/components/data-grid";
import FormField from "~/components/fields/form-field";
import { useCustomSearchParams } from "~/hooks/utils";
import ResourcesService from "~/services/resources";
import { Resource } from "~/db/schemas/resources";

const columns: GridColDef<Resource>[] = [
  {
    field: "name",
    headerName: "Name",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "type",
    headerName: "Type",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "schedule_type",
    headerName: "Availability",
    minWidth: 200,
    flex: 1,
  },
];

const cards = [
  {
    icon: <MdOutlineBedroomChild className="text-base text-white" />,
    status: {
      draft: 50,
      published: 100,
    },
  },
  {
    icon: <MdEvent className="text-base text-white" />,
    status: {
      draft: 50,
      published: 100,
    },
  },
  {
    icon: <MdRestaurantMenu className="text-base text-white" />,
    status: {
      draft: 50,
      published: 100,
    },
  },
];

export default function Resources() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { q, limit, offset } = useCustomSearchParams(["q", "limit", "offset"]);

  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources", { limit, offset, q }],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        q,
      });
      return ResourcesService.getResources({ params });
    },
  });

  return (
    <main className="flex flex-col gap-10 tablet_768:gap-6">
      <header className="flex items-center justify-between">
        <Typography variant="h1">Resources</Typography>
        <Button href="/admin/resources/create">Create Resources</Button>
      </header>
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-3 gap-6">
          {cards.map(({ icon, status }, index) => (
            <div className="flex flex-col gap-8 rounded-lg bg-primary p-4" key={index}>
              <span className="w-fit rounded bg-white/10 p-1">{icon}</span>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <h6 className="text-xs text-white">Draft</h6>
                  <p className="text-base font-semibold text-white">{status.draft}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <h6 className="text-xs text-white">Published</h6>
                  <p className="text-base font-semibold text-white">{status.published}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <main className="flex flex-col rounded-lg border">
          <header className="p-4">
            <h4 className="text-sm">All Resources</h4>
          </header>
          <div className="flex flex-col gap-4 rounded-lg border-t p-4 pb-0">
            <Formik
              initialValues={{
                q: "",
              }}
              onSubmit={(values) => {
                const params = new URLSearchParams(searchParams);
                for (const [key, value] of Object.entries(values)) {
                  if (value) params.set(key, value);
                }
                window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
              }}
            >
              {({ handleSubmit, submitForm }) => (
                <form onSubmit={handleSubmit}>
                  <FormField
                    name="q"
                    startAdornment={<FiSearch className="text-xl text-black/70" />}
                    placeholder="Search for resources..."
                    className="max-w-[250px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        submitForm();
                      }
                    }}
                  />
                </form>
              )}
            </Formik>
            <div className="overflow-hidden rounded-lg">
              <Suspense fallback={null}>
                <DataGrid
                  rows={resources?.data}
                  loading={isLoading}
                  columns={columns}
                  rowCount={resources?.count}
                />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
