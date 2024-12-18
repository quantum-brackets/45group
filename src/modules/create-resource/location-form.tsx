"use client";

import Image from "next/image";
import { Radio, RadioGroup } from "@mui/material";
import Link from "next/link";
import { ResourceFormValues } from "~/app/(resources)/admin/resources/create/page";
import NoDataIllustration from "~/assets/illustrations/no-data.png";

type Props = {
  setFieldValue: (field: keyof ResourceFormValues, value: any) => void;
  values: ResourceFormValues;
};

export default function LocationForm({ values, setFieldValue }: Props) {
  return (
    <main className="flex flex-col gap-4">
      <small className="text-zinc-700">Choose a location to create the resource.</small>
      {!Array.from({ length: 3 }) && Array.from({ length: 3 }).length > 0 ? (
        <RadioGroup className="flex flex-col gap-1" name="_location" value={values._location}>
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="ase-in-out flex items-start gap-6 rounded-lg p-4 transition duration-300 hover:bg-black/5"
            >
              <Radio value={index + 1} onClick={() => setFieldValue("_location", index + 1)} />
              <div className="flex flex-col gap-2">
                <h4 className="text-sm">Location</h4>
                <small className="text-zinc-600">A very long detailed address.</small>
              </div>
            </div>
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
