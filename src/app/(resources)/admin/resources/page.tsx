"use client";

import { Suspense, useCallback } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Avatar, Chip, Typography } from "@mui/material";
import { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import { useQuery } from "@tanstack/react-query";
import { Formik } from "formik";
import nProgress from "nprogress";
import { FiEdit, FiSearch } from "react-icons/fi";
import { TbTrash } from "react-icons/tb";
import { MdOutlineBedroomChild, MdEvent, MdRestaurantMenu } from "react-icons/md";
import Button from "~/components/button";
import DataGrid from "~/components/data-grid";
import FormField from "~/components/fields/form-field";
import { useCustomSearchParams } from "~/hooks/utils";
import ResourceService from "~/services/resources";
import { Resource } from "~/db/schemas/resources";
import { cn } from "~/utils/helpers";
import usePrompt from "~/hooks/prompt";
import { useDeleteResource } from "~/hooks/resources";

const columns: GridColDef<Resource>[] = [
  {
    field: "__",
    headerName: "",
    sortable: false,
    minWidth: 10,
    renderCell: ({ row: { name, thumbnail } }) => {
      return (
        <div className="flex h-full items-center justify-center">
          <figure
            className={cn("relative size-12 rounded-md border border-zinc-200", {
              "!bg-primary": !thumbnail,
            })}
          >
            <Image
              alt={`${name}`}
              src={thumbnail || ""}
              fill
              sizes="100%"
              className="h-full w-full object-contain p-[2px]"
            />
          </figure>
        </div>
      );
    },
  },
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
    renderCell: ({ value }: GridRenderCellParams<Resource, Resource["type"]>) => {
      switch (value) {
        case "lodge":
          return (
            <Chip
              label="Rooms"
              icon={<MdOutlineBedroomChild className="text-base" />}
              color="info"
              variant="outlined"
            />
          );
        case "dining":
          return (
            <Chip
              label="Dining"
              icon={<MdRestaurantMenu className="text-base" />}
              color="info"
              variant="outlined"
            />
          );
        default:
          return (
            <Chip
              label="Events"
              icon={<MdEvent className="text-base" />}
              color="info"
              variant="outlined"
            />
          );
      }
    },
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 200,
    flex: 1,
    renderCell: ({ row: { status } }) => {
      if (status === "published") {
        return <Chip label="Published" color="success" />;
      }
      return <Chip label="Draft" variant="outlined" />;
    },
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
    title: "Rooms",
    icon: <MdOutlineBedroomChild className="text-base text-white" />,
    status: {
      draft: 50,
      published: 100,
    },
  },
  {
    title: "Events",
    icon: <MdEvent className="text-base text-white" />,
    status: {
      draft: 50,
      published: 100,
    },
  },
  {
    title: "Dining",
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
  const router = useRouter();

  const { q, limit, offset } = useCustomSearchParams(["q", "limit", "offset"]);

  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources", { limit, offset, q }],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
        q,
      });
      return ResourceService.getResources({ params });
    },
  });

  const { mutateAsync: deleteResource, isPending: isDeleting } = useDeleteResource();

  const prompt = usePrompt();

  const handleDelete = useCallback(
    async (id: string) => {
      const confirmed = await prompt({
        title: "Please confirm",
        description: "Are you sure you want delete this resource?",
        isLoading: isDeleting,
      });

      if (confirmed) {
        await deleteResource(id);
      }
    },
    [deleteResource, isDeleting, prompt]
  );

  function goToDetails(id: string) {
    nProgress.start();
    router.push(`/admin/resources/${id}`);
  }

  return (
    <main className="flex flex-col gap-10 tablet_768:gap-6">
      <header className="flex items-center justify-between">
        <Typography variant="h1">Resources</Typography>
        <Button href="/admin/resources/create">Create Resources</Button>
      </header>
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-3 gap-6">
          {cards.map(({ title, icon, status }, index) => (
            <div className="flex flex-col gap-8 rounded-lg bg-primary p-4" key={index}>
              <div className="flex items-center gap-2">
                <span className="w-fit rounded bg-white/10 p-1">{icon}</span>
                <small className="font-medium text-white">{title}</small>
              </div>
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
                q,
              }}
              enableReinitialize
              onSubmit={(values) => {
                const params = new URLSearchParams(searchParams);
                for (const [key, value] of Object.entries(values)) {
                  params.set(key, value);
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
                    className="max-w-[300px]"
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
                  onRowClick={({ id }) => goToDetails(id as string)}
                  menuComp={({ row: { id } }) => (
                    <>
                      <button onClick={() => goToDetails(id)}>
                        <FiEdit />
                        <span>Edit</span>
                      </button>
                      <button onClick={() => handleDelete(id)}>
                        <TbTrash />
                        <span>Delete</span>
                      </button>
                    </>
                  )}
                />
              </Suspense>
            </div>
          </div>
        </main>
      </div>
    </main>
  );
}
