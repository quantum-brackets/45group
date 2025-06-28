import { useState } from "react";
import { useParams } from "next/navigation";
import { DialogActions } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import { Formik } from "formik";
import { FiEdit } from "react-icons/fi";
import Button from "~/components/button";
import Modal from "~/components/modal";
import { useAddResourceRule, useRemoveResourceRule } from "~/hooks/resources";
import { useCreateRule, useDeleteRule } from "~/hooks/rules";
import RulesSection from "~/modules/create-resource/rules-section";
import RuleService from "~/services/rules";
import { RuleFormValues } from "~/types/resource";
import { processDeletedItems, processExistingItems } from "~/utils/helpers";
import { notifySuccess } from "~/utils/toast";

const initialValues = {
  rules: {},
  _rule: {
    name: "",
    description: "",
    category: "house_rules",
  },
};

export default function EditModal() {
  const { id } = useParams<{ id: string }>();
  const [isOpen, toggleModal] = useState(false);

  const handleOpen = () => toggleModal(true);
  const handleClose = () => toggleModal(false);

  const { data: rules, isLoading } = useQuery({
    queryKey: ["rules"],
    queryFn: RuleService.getRules,
  });

  const { mutateAsync: addRule } = useAddResourceRule();
  const { mutateAsync: removeRule } = useRemoveResourceRule();
  const { mutateAsync: createRule } = useCreateRule();
  const { mutateAsync: deleteRule } = useDeleteRule();

  return (
    <>
      <button onClick={handleOpen}>
        <FiEdit />
        <span>Edit details</span>
      </button>
      {isOpen && (
        <Modal
          open={isOpen}
          onClose={handleClose}
          exitIcon={{
            display: true,
          }}
          maxWidth={"sm"}
          scroll="paper"
        >
          <Formik
            initialValues={
              {
                ...initialValues,
                rules:
                  rules?.reduce(
                    (acc, rule) => ({
                      ...acc,
                      [rule.name]: rule,
                    }),
                    {}
                  ) || {},
              } as RuleFormValues
            }
            onSubmit={async ({ rules }) => {
              const deletedRules = processDeletedItems<(typeof rules)[number]>(rules);

              if (deletedRules.length)
                await Promise.all(deletedRules.map(([_, rule]) => rule.id && deleteRule(rule.id)));

              const oldRules = processExistingItems<(typeof rules)[number]>(rules);
              const newRules = rules
                ? Object.entries(rules).filter(([_, { id, checked }]) => !id && checked)
                : [];

              const rulesRes = await Promise.all(
                newRules.map(([_, { name, description, category }]) =>
                  createRule({ name, category, description })
                )
              );

              await addRule(
                {
                  id,
                  data: {
                    rule_ids: [
                      ...oldRules.map(([_, { id }]) => id),
                      ...rulesRes.filter(Boolean).map(({ id }) => id),
                    ] as string[],
                  },
                },
                {
                  onSuccess: () => {
                    notifySuccess({ message: "Resource rules updated" });
                    handleClose();
                  },
                }
              );
            }}
            enableReinitialize
            validateOnBlur={false}
          >
            {({ values, setFieldValue, setFieldError, isSubmitting, handleSubmit }) => (
              <form onSubmit={handleSubmit} method={"post"}>
                <RulesSection
                  isLoading={isLoading}
                  values={values}
                  keepOpen
                  setFieldValue={(field: keyof RuleFormValues, value: any) => {
                    setFieldValue(`${String(field)}`, value);
                  }}
                  setFieldError={(field: keyof RuleFormValues, message: string) => {
                    setFieldError(`${String(field)}`, message);
                  }}
                />
                <DialogActions className="!mt-4 border-t">
                  <Button type="button" variant="outlined" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" loading={isSubmitting}>
                    Save
                  </Button>
                </DialogActions>
              </form>
            )}
          </Formik>
        </Modal>
      )}
    </>
  );
}
