"use client";

import { memo, useCallback } from "react";
import { MenuItem, Skeleton } from "@mui/material";
import { ResourceFormValues } from "~/app/(resources)/admin/resources/create/page";
import Button from "~/components/button";
import FormField from "~/components/fields/form-field";
import SelectField from "~/components/fields/select-field";
import CollapseSection from "~/components/form/resources-form/collapse-section";
import SelectCard from "~/components/form/resources-form/select-card";

const FORM_KEY = "rule_form" as const;

type Field = keyof ResourceFormValues[typeof FORM_KEY];
type Values = ResourceFormValues[typeof FORM_KEY];

type Props = {
  isLoading: boolean;
  setFieldValue: (field: Field, value: any) => void;
  setFieldError: (field: Field, message: string) => void;
  values: Values;
};

const RuleForm = memo(({ onSubmit, onClose }: { onSubmit: () => void; onClose: () => void }) => (
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
    <FormField name={`${FORM_KEY}._rule.name`} placeholder="Type in a rule" label="Rule" required />
    <SelectField
      label="Category"
      required
      name={`${FORM_KEY}._rule.category`}
      placeholder="Choose a category"
      className="capitalize"
    >
      <MenuItem value={"house_rules"}>House Rules</MenuItem>
      <MenuItem value={"cancellations"}>Cancellations</MenuItem>
    </SelectField>
    <FormField
      name={`${FORM_KEY}._rule.description`}
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
));

RuleForm.displayName = "RuleForm";

export default function RulesSection({ setFieldValue, values, setFieldError, isLoading }: Props) {
  function closeForm() {
    setFieldValue("_show_rule_form", false);
    setFieldValue("_rule", undefined);
  }

  function handleSubmit() {
    const newRule = values._rule;
    if (!newRule.name) return setFieldError("_rule.name" as Field, "Name is required");
    if (!newRule.category) return setFieldError("_rule.category" as Field, "Category is required");
    if (values.rules[newRule.name] !== undefined && !values.rules[newRule.name].markedForDeletion) {
      setFieldError("_rule.name" as Field, "Rule with this name already exists");
      return;
    }
    setFieldValue("rules", {
      ...values.rules,
      [newRule.name]: { ...newRule, checked: true, markedForDeletion: false },
    });
    closeForm();
  }

  function handleChange(name: string, checked: boolean) {
    setFieldValue("rules", {
      ...values.rules,
      [name]: { ...values.rules[name], checked },
    });
  }

  function handleDelete(name: string) {
    const rules = { ...values.rules };
    const facility = values.rules[name];
    if (facility.id) {
      setFieldValue("rules", {
        ...values.rules,
        [name]: { ...facility, markedForDeletion: true },
      });
    } else {
      delete rules[name];
      setFieldValue("rules", rules);
    }
  }

  const visibleRules = values.rules
    ? Object.entries(values.rules).filter(([_, { markedForDeletion }]) => !markedForDeletion)
    : [];

  return (
    <CollapseSection<Values>
      name="_show_rules"
      setFieldValue={setFieldValue}
      subtitle="Here you can choose the rules for this resource."
      title="Rules"
      values={values}
      addBtn={{
        show: !isLoading && !values._show_rule_form,
        text: "Add a rule",
        onClick: () => {
          setFieldValue("_show_rule_form", true);
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
            {visibleRules?.map(([_, { name, description, checked }], index) => (
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
          {values._show_rule_form && <RuleForm onSubmit={handleSubmit} onClose={closeForm} />}
        </>
      )}
    </CollapseSection>
  );
}
