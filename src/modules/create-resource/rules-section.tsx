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

export default function RulesSection({ setFieldValue, values }: Props) {
  function closeForm() {
    setFieldValue("_show_rule_form", false);
    setFieldValue("_rule", "");
  }

  return (
    <CollapseSection
      name="_show_rules"
      setFieldValue={setFieldValue}
      subtitle="Here you can choose the rules for this resource."
      title="Rules"
      values={values}
      addBtn={{
        show: !values._show_rule_form,
        text: "Add a rule",
        onClick: () => {
          setFieldValue("_show_rule_form", true);
        },
      }}
    >
      <div className="flex w-full flex-col gap-1">
        {Array.from({ length: 5 }).map((_, index) => (
          <SelectCard checked={!!(index % 2)} onDelete={() => {}} onChange={() => {}} key={index} />
        ))}
      </div>
      {values._show_rule_form && (
        <div className="flex flex-col items-center gap-4">
          <FormField name="_rule" placeholder="Type in a rule" label="Rule" />
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
