"use client";

import { ReactNode } from "react";
import { Collapse } from "@mui/material";
import { FaMinus, FaPlus } from "react-icons/fa6";
import Button from "../../button";
import { cn } from "~/utils/helpers";

type Props<T> = {
  name: keyof T;
  children: ReactNode;
  title: string;
  values: T;
  subtitle: string;
  keepOpen?: boolean;
  setFieldValue: (field: keyof T, value: any) => void;
  addBtn?: {
    show: boolean;
    onClick: () => void;
    text: string;
  };
};

export default function CollapseSection<T>({
  name,
  title,
  subtitle,
  children,
  values,
  addBtn,
  keepOpen,
  setFieldValue,
}: Props<T>) {
  return (
    <div className="col-span-2 mt-2 flex w-full flex-col gap-2">
      <button
        className={cn("flex items-center justify-between gap-8", {
          "cursor-default": keepOpen,
        })}
        type="button"
        onClick={() => setFieldValue(name, !values[name])}
      >
        <h4 className={`text-base`}>{title}</h4>
        {!keepOpen &&
          (values[name] ? (
            <FaMinus className="text-base text-zinc-600" />
          ) : (
            <FaPlus className="text-base text-zinc-600" />
          ))}
      </button>
      <Collapse in={keepOpen || (values[name] as boolean)} timeout="auto">
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
