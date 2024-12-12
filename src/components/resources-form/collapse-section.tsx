"use client";

import { ReactNode } from "react";
import { Collapse } from "@mui/material";
import { FormikHelpers } from "formik";
import { FaMinus, FaPlus } from "react-icons/fa6";
import Button from "../button";
import { ResourceFormValues } from "~/app/(resources)/admin/resources/create/page";

type Props = {
  name: keyof ResourceFormValues;
  children: ReactNode;
  title: string;
  values: ResourceFormValues;
  subtitle: string;
  setFieldValue: (
    field: keyof ResourceFormValues,
    value: any,
    shouldValidate?: boolean
  ) => ReturnType<FormikHelpers<ResourceFormValues>["setFieldValue"]>;
  addBtn?: {
    show: boolean;
    onClick: () => void;
    text: string;
  };
};

export default function CollapseSection({
  name,
  title,
  subtitle,
  children,
  values,
  addBtn,
  setFieldValue,
}: Props) {
  return (
    <div className="col-span-2 mt-2 flex w-full flex-col gap-2">
      <button
        className="flex items-center justify-between gap-8"
        type="button"
        onClick={() => setFieldValue(name, !values[name])}
      >
        <h4 className={`text-base`}>{title}</h4>
        {values[name] ? (
          <FaMinus className="text-base text-zinc-600" />
        ) : (
          <FaPlus className="text-base text-zinc-600" />
        )}
      </button>
      <Collapse in={values[name] as boolean} timeout="auto">
        <div className="flex flex-col gap-6">
          <small className="text-xs text-zinc-500">{subtitle}</small>
          {children}
          {addBtn && addBtn.show && (
            <Button
              type="button"
              onClick={addBtn.onClick}
              color="inherit"
              variant="outlined"
              size="large"
            >
              {addBtn.text}
            </Button>
          )}
        </div>
      </Collapse>
    </div>
  );
}
