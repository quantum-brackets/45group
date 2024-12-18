"use client";

import { MenuItem } from "@mui/material";
import { memo } from "react";
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

export default function RulesSection({ setFieldValue, values, setFieldError }: Props) {
  function closeForm() {
    setFieldValue("_show_rule_form", false);
    setFieldValue("_rule", undefined);
  }

  function handleSubmit() {
    const newRule = values._rule;
    if (values.rules.some((r) => r.name === newRule.name && !r.markedForDeletion)) {
      setFieldError("_rule.name" as Field, "Rule with this name already exists");
      return;
    }

    setFieldValue("rules", [
      ...values.rules,
      { ...newRule, checked: false, markedForDeletion: false },
    ]);
    closeForm();
  }

  function handleChange(index: number, checked: boolean) {
    const newRules = [...values.rules];
    newRules[index] = { ...newRules[index], checked };
    setFieldValue("rules", newRules);
  }

  function handleDelete(index: number) {
    const rule = values.rules[index];
    if (rule.id) {
      const newRules = [...values.rules];
      newRules[index] = { ...rule, markedForDeletion: true };
      setFieldValue("rules", newRules);
    } else {
      setFieldValue(
        "rules",
        values.rules.filter((_, i) => i !== index)
      );
    }
  }

  const visibleRules = values.rules?.filter((rule) => !rule.markedForDeletion);

  return (
    <CollapseSection<Values>
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
        {visibleRules?.map((rule, index) => (
          <SelectCard
            name={rule.name}
            description={rule.description}
            checked={!!rule.checked}
            onDelete={() => handleDelete(index)}
            onChange={(checked) => handleChange(index, checked)}
            key={index}
          />
        ))}
      </div>
      {values._show_rule_form && <RuleForm onSubmit={handleSubmit} onClose={closeForm} />}
    </CollapseSection>
  );
}
