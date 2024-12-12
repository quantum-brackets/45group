"use client";

import { OutlinedInput } from "@mui/material";
import { FormikHelpers } from "formik";
import { FaMinus, FaPlus } from "react-icons/fa6";
import { ResourceFormValues } from "~/app/(resources)/admin/resources/create/page";
import Button from "~/components/button";
import FormField from "~/components/fields/form-field";
import CardMenu from "~/components/resources-form/card-menu";
import CollapseSection from "~/components/resources-form/collapse-section";

type Props = {
  setFieldValue: (
    field: keyof ResourceFormValues,
    value: any,
    shouldValidate?: boolean
  ) => ReturnType<FormikHelpers<ResourceFormValues>["setFieldValue"]>;
  values: ResourceFormValues;
};

export default function GroupsSection({ values, setFieldValue }: Props) {
  function closeForm() {
    setFieldValue("_show_group_form", false);
    setFieldValue("_group", "");
  }

  function onDelete() {}

  return (
    <CollapseSection
      name="_show_groups"
      setFieldValue={setFieldValue}
      subtitle="Here you can add groups"
      title="Groups"
      values={values}
      addBtn={{
        show: !values._show_group_form,
        text: "Add a group",
        onClick: () => {
          setFieldValue("_show_group_form", true);
        },
      }}
    >
      {values.groups && (
        <div className="flex flex-col gap-4">
          {Object.entries(values.groups).map(([key, value], index) => (
            <div
              className="flex w-full items-center justify-between gap-3 largeLaptop:gap-5"
              key={index}
            >
              <p className="text-sm capitalize largeLaptop:text-sm">{key}</p>
              <div className="flex items-center justify-between gap-4 largeLaptop:gap-4">
                <OutlinedInput
                  value={value}
                  onChange={(e) => {
                    const value = e.target.value;
                    setFieldValue("groups", {
                      ...values.existing_groups,
                      ...values.groups,
                      [key]: value,
                    });
                  }}
                  type="tel"
                  inputMode="numeric"
                  endAdornment={
                    <div className="flex items-center gap-2">
                      <Button
                        className="!w-fit !min-w-0 !p-[6px] largeLaptop:!p-[10px]"
                        variant="text"
                        size="small"
                        onClick={() => {
                          setFieldValue("groups", {
                            ...values.existing_groups,
                            ...values.groups,
                            [key]:
                              values.groups![key] === 0
                                ? values.groups![key]
                                : values.groups![key] - 1,
                          });
                        }}
                      >
                        <FaMinus className="text-xs text-black largeLaptop:text-sm" />
                      </Button>
                      <Button
                        className="!w-fit !min-w-0 !p-[6px] largeLaptop:!p-[10px]"
                        size="small"
                        variant="text"
                        onClick={() =>
                          setFieldValue("groups", {
                            ...values.existing_groups,
                            ...values.groups,
                            [key]: values.groups![key] + 1,
                          })
                        }
                      >
                        <FaPlus className="text-xs text-black largeLaptop:text-sm" />
                      </Button>
                    </div>
                  }
                />
                <CardMenu>
                  <button onClick={onDelete} type="button">
                    <span>Delete</span>
                  </button>
                </CardMenu>
              </div>
            </div>
          ))}
        </div>
      )}
      {values._show_group_form && (
        <div className="flex flex-col items-center gap-4">
          <FormField name="_group" placeholder="Type in a name" required label="Group" />
          <div className="flex w-full items-center justify-between gap-8">
            <Button type="button" variant="outlined" onClick={closeForm}>
              Cancel
            </Button>
            <Button
              disabled={!values._group}
              type="button"
              onClick={() => {
                if (!values._group) return;
                setFieldValue("groups", {
                  ...values.groups,
                  [values._group]: 0,
                });
                closeForm();
              }}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </CollapseSection>
  );
}
