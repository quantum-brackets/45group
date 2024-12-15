"use client";

import { memo } from "react";
import { ResourceFormValues } from "~/app/(resources)/admin/resources/create/page";
import Button from "~/components/button";
import FormField from "~/components/fields/form-field";
import CollapseSection from "~/components/resources-form/collapse-section";
import SelectCard from "~/components/resources-form/select-card";

const FORM_KEY = "facility_form" as const;

type Field = keyof ResourceFormValues[typeof FORM_KEY];
type Values = ResourceFormValues[typeof FORM_KEY];

type Props = {
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

export default function FacilitiesSection({ setFieldValue, values, setFieldError }: Props) {
  function closeForm() {
    setFieldValue("_show_facility_form", false);
    setFieldValue("_facility", "");
  }

  function handleSubmit() {
    const newFacility = values._facility;
    if (values.facilities.some((r) => r.name === newFacility.name && !r.markedForDeletion)) {
      setFieldError("_facility.name" as Field, "Facility with this name already exists");
      return;
    }

    setFieldValue("facilities", [
      ...values.facilities,
      { ...newFacility, checked: false, markedForDeletion: false },
    ]);
    closeForm();
  }

  function handleChange(index: number, checked: boolean) {
    const newFacilities = [...values.facilities];
    newFacilities[index] = { ...newFacilities[index], checked };
    setFieldValue("facilities", newFacilities);
  }

  function handleDelete(index: number) {
    const facility = values.facilities[index];
    if (facility.id) {
      const newFacilities = [...values.facilities];
      newFacilities[index] = { ...facility, markedForDeletion: true };
      setFieldValue("facilities", newFacilities);
    } else {
      setFieldValue(
        "facilities",
        values.facilities.filter((_, i) => i !== index)
      );
    }
  }

  const visibleFacilities = values.facilities?.filter((facility) => !facility.markedForDeletion);

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
      <div className="flex w-full flex-col gap-1">
        {visibleFacilities?.map((facility, index) => (
          <SelectCard
            name={facility.name}
            description={facility.description}
            checked={!!facility.checked}
            onDelete={() => handleDelete(index)}
            onChange={(checked) => handleChange(index, checked)}
            key={index}
          />
        ))}
      </div>
      {values._show_facility_form && <FacilityForm onSubmit={handleSubmit} onClose={closeForm} />}
    </CollapseSection>
  );
}
