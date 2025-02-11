"use client";

import Image from "next/image";
import Link from "next/link";
import { Radio, RadioGroup, Skeleton } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { ResourceFormValues } from "~/app/(resources)/admin/resources/create/page";
import NoDataIllustration from "~/assets/illustrations/no-data.png";
import LocationsService from "~/services/locations";
import { Location } from "~/db/schemas/locations";

type Props = {
  setFieldValue: (field: keyof ResourceFormValues, value: any) => void;
  values: ResourceFormValues;
};

export default function LocationForm({ values, setFieldValue }: Props) {
  const { data: locations, isLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => LocationsService.getLocations<Location[]>(),
  });

  return (
    <main className="flex flex-col gap-4">
      <small className="text-zinc-700">Choose a location to create the resource.</small>
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton className="w-full" height={60} key={index} />
          ))}
        </div>
      ) : locations?.length ? (
        <RadioGroup
          className="flex flex-col gap-1"
          name="_location"
          value={values._location?.id || ""}
        >
          {locations.map(({ name, city, state, id }, index) => (
            <button
              key={index}
              className="ase-in-out flex items-start gap-4 rounded-lg p-4 py-3 transition duration-300 hover:bg-black/5"
              onClick={() => setFieldValue("_location", { id, name, city, state })}
              type="button"
            >
              <Radio
                value={id}
                onClick={() => setFieldValue("_location", { id, name, city, state })}
              />
              <div className="flex flex-col gap-1">
                <h4 className="text-start text-sm">{name}</h4>
                <small className="text-start text-xs text-zinc-600">
                  {city}, {state}
                </small>
              </div>
            </button>
          ))}
        </RadioGroup>
      ) : (
        <div className="min-h-40 w-full rounded-lg border border-dotted border-zinc-200 p-4">
          <div className="flex flex-col items-center gap-4">
            <Image src={NoDataIllustration} alt="No Data illustration" className="max-w-[300px]" />
            <small>
              No location found.{" "}
              <Link href={"/admin/locations/create"} className="text-primary hover:underline">
                Click here to create one.
              </Link>
            </small>
          </div>
        </div>
      )}
    </main>
  );
}
