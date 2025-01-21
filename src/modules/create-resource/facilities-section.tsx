"use client";

import { memo } from "react";
import { Skeleton } from "@mui/material";
import { ResourceFormValues } from "~/app/(resources)/admin/resources/create/page";
import Button from "~/components/button";
import FormField from "~/components/fields/form-field";
import CollapseSection from "~/components/form/resources-form/collapse-section";
import SelectCard from "~/components/form/resources-form/select-card";

const FORM_KEY = "facility_form" as const;

type Field = keyof ResourceFormValues[typeof FORM_KEY];
type Values = ResourceFormValues[typeof FORM_KEY];

type Props = {
  isLoading: boolean;
  setFieldValue: (field: Field, value: any) => void;
  setFieldError: (field: Field, message: string) => void;
  values: Values;
};

const FacilityForm = memo(
  ({ onSubmit, onClose }: { onSubmit: () => void; onClose: () => void }) => (
    <div
      className="flex flex-col items-center gap-4"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          onSubmit();
        }
      }}
    >
      <FormField
        name={`${FORM_KEY}._facility.name`}
        placeholder="Type in a facility"
        label="Facility"
        required
      />
      <FormField
        name={`${FORM_KEY}._facility.description`}
        multiline
        rows={3}
        placeholder="Add a description"
        label="Description"
      />
      <div className="flex w-full items-center justify-between gap-8">
        <Button type="button" variant="outlined" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={onSubmit}>
          Add
        </Button>
      </div>
    </div>
  )
);

FacilityForm.displayName = "FacilityForm";

export default function FacilitiesSection({
  setFieldValue,
  values,
  setFieldError,
  isLoading,
}: Props) {
  function closeForm() {
    setFieldValue("_show_facility_form", false);
    setFieldValue("_facility", "");
  }

  function handleSubmit() {
    const newFacility = values._facility;
    if (!newFacility.name) return setFieldError("_facility.name" as Field, "Name is required");
    if (values.facilities[newFacility.name] !== undefined) {
      setFieldError("_facility.name" as Field, "Facility with this name already exists");
      return;
    }
    setFieldValue("facilities", {
      ...values.facilities,
      [newFacility.name]: { ...newFacility, checked: true, markedForDeletion: false },
    });
    closeForm();
  }

  function handleChange(name: string, checked: boolean) {
    setFieldValue("facilities", {
      ...values.facilities,
      [name]: { ...values.facilities[name], checked },
    });
  }

  function handleDelete(name: string) {
    const facilities = { ...values.facilities };
    const facility = values.facilities[name];
    if (facility.id) {
      setFieldValue("facilities", {
        ...values.facilities,
        [name]: { ...facility, markedForDeletion: true },
      });
    } else {
      delete facilities[name];
      setFieldValue("facilities", facilities);
    }
  }

  const visibleFacilities = values.facilities
    ? Object.entries(values.facilities).filter(([_, { markedForDeletion }]) => !markedForDeletion)
    : [];

  return (
    <CollapseSection
      name="_show_facilities"
      setFieldValue={setFieldValue}
      subtitle="Here you can choose the facilities this resource offer."
      title="Facilities"
      values={values}
      addBtn={{
        show: !values._show_facility_form,
        text: "Add a facility",
        onClick: () => {
          setFieldValue("_show_facility_form", true);
        },
      }}
    >
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-44 w-full" key={index} />
          ))}
        </div>
      ) : (
        <>
          <div className="flex w-full flex-col gap-1">
            {visibleFacilities?.map(([_, { name, description, checked }], index) => (
              <SelectCard
                name={name}
                description={description}
                checked={!!checked}
                onDelete={() => handleDelete(name)}
                onChange={(checked) => handleChange(name, checked)}
                key={index}
              />
            ))}
          </div>
          {values._show_facility_form && (
            <FacilityForm onSubmit={handleSubmit} onClose={closeForm} />
          )}
        </>
      )}
    </CollapseSection>
  );
}
