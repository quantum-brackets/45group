"use client";

import { Suspense, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Typography } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { GridColDef } from "@mui/x-data-grid";
import { Formik } from "formik";
import moment from "moment";
import { FiSearch } from "react-icons/fi";
import Button from "~/components/button";
import DataGrid from "~/components/data-grid";
import { useCustomSearchParams } from "~/hooks/utils";
import LocationsService from "~/services/locations";
import { Location } from "~/db/schemas/locations";
import FormField from "~/components/fields/form-field";
import usePrompt from "~/hooks/prompt";
import { useDeleteLocation } from "~/hooks/locations";

const columns: GridColDef<Location>[] = [
  {
    field: "name",
    headerName: "Name",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "state",
    headerName: "State",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "city",
    headerName: "City",
    minWidth: 200,
    flex: 1,
  },
  {
    field: "created_at",
    headerName: "CREATED AT",
    minWidth: 200,
    flex: 1,
    valueFormatter: (value) => {
      return moment(value).format("MMMM D, YYYY");
    },
    sortComparator: (v1: string, v2: string) => {
      return new Date(v1).getTime() - new Date(v2).getTime();
    },
  },
];

export default function Locations() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { q, limit, offset } = useCustomSearchParams(["q", "limit", "offset"]);

  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations", { limit, offset, q }],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        q,
      });
      return LocationsService.getLocations({ params });
    },
  });

  const { mutateAsync: deleteLocation, isPending: isDeleting } = useDeleteLocation();

  const prompt = usePrompt();

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = await prompt({
        title: "Please confirm",
        description: "Are you sure you want delete this location?",
        isLoading: isDeleting,
      });

      if (confirmed) {
        await deleteLocation(id);
      }
    },
    [deleteLocation, isDeleting, prompt]
  );

  return (
    <main className="flex flex-col gap-8 tablet_768:gap-6">
      <header className="flex items-center justify-between">
        <Typography variant="h1">Locations</Typography>
        <Button href="/admin/locations/create">Create Locations</Button>
      </header>
      <main className="flex flex-col rounded-lg border">
        <header className="p-4">
          <h4 className="text-sm">All Locations</h4>
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
                  placeholder="Search for location..."
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
              <DataGrid<Location>
                rows={locations?.data}
                loading={isLoading}
                columns={columns}
                rowCount={locations?.count}
                menuComp={({ row: { id } }) => {
                  return (
                    <>
                      <button onClick={() => handleDelete(id)}>Delete</button>
                    </>
                  );
                }}
              />
            </Suspense>
          </div>
        </div>
      </main>
    </main>
  );
}
