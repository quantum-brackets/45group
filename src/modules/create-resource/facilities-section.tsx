"use client";

import { FormikHelpers } from "formik";
import { ResourceFormValues } from "~/app/(resources)/admin/resources/create/page";
import Button from "~/components/button";
import FormField from "~/components/fields/form-field";
import CollapseSection from "~/components/resources-form/collapse-section";
import SelectCard from "~/components/resources-form/select-card";

type Props = {
  setFieldValue: FormikHelpers<ResourceFormValues>["setFieldValue"];
  values: ResourceFormValues;
};

export default function FacilitiesSection({ setFieldValue, values }: Props) {
  function closeForm() {
    setFieldValue("_show_facility_form", false);
    setFieldValue("_facility", "");
  }

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
        {Array.from({ length: 5 }).map((_, index) => (
          <SelectCard checked={!!(index % 2)} onDelete={() => {}} onChange={() => {}} key={index} />
        ))}
      </div>
      {values._show_facility_form && (
        <div className="flex flex-col items-center gap-4">
          <FormField name="_facility" placeholder="Type in a facility" label="Facility" />
          <div className="flex w-full items-center justify-between gap-8">
            <Button type="button" variant="outlined" onClick={closeForm}>
              Cancel
            </Button>
            <Button type="button" onClick={closeForm}>
              Add
            </Button>
          </div>
        </div>
      )}
    </CollapseSection>
  );
}
