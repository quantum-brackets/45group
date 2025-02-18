"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { DialogActions, DialogContent, DialogTitle, MenuItem } from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import { Formik } from "formik";
import * as Yup from "yup";
import { FiEdit } from "react-icons/fi";
import Modal from "~/components/modal";
import FormField from "~/components/fields/form-field";
import SelectField from "~/components/fields/select-field";
import statesData from "~/data/states.json";
import { filterPrivateValues } from "~/utils/helpers";
import { notifySuccess } from "~/utils/toast";
import Button from "~/components/button";
import { useUpdateResource } from "~/hooks/resources";
import { Resource } from "~/db/schemas/resources";

type InitialValues = {
  name: string;
  description: string;
  type: Resource["type"];
  _type?: Resource["type"];
};

const RESOURCE_TYPES = [
  {
    value: "Rooms",
    hidden_value: "lodge",
  },
  {
    value: "Events",
    hidden_value: "event",
  },
  {
    value: "Dining",
    hidden_value: "dining",
  },
];

const validationSchema = Yup.object({
  name: Yup.string().optional(),
  description: Yup.string().optional(),
  city: Yup.string().optional(),
  state: Yup.string().optional(),
});

export default function EditModal() {
  const { id } = useParams<{ id: string }>();

  const [isOpen, toggleModal] = useState(false);

  const handleOpen = () => toggleModal(true);
  const handleClose = () => toggleModal(false);

  const queryClient = useQueryClient();
  const resource = queryClient.getQueryData<Resource>(["resources", id]);

  const { mutateAsync: updateResource } = useUpdateResource();

  return (
    <>
      <button onClick={handleOpen}>
        <FiEdit />
        <span>Edit details</span>
      </button>
      <Modal
        open={isOpen}
        onClose={handleClose}
        exitIcon={{
          display: true,
        }}
        maxWidth={"sm"}
      >
        <Formik
          initialValues={
            {
              name: resource?.name || "",
              description: resource?.description || "",
              _type: resource?.type,
              type: resource?.type || "",
            } as InitialValues
          }
          onSubmit={async (values) => {
            console.log(values);

            const submissionValues = filterPrivateValues(values);
            await updateResource(
              {
                id,
                data: {
                  ...submissionValues,
                },
              },
              {
                onSuccess: () => {
                  notifySuccess({ message: "Resource successfully updated" });
                },
              }
            );
          }}
          enableReinitialize
          validationSchema={validationSchema}
        >
          {({ setFieldValue, values, handleSubmit, isSubmitting }) => (
            <form onSubmit={handleSubmit} method={"post"}>
              <DialogTitle className="!mb-2">Edit details</DialogTitle>
              <DialogContent>
                <div className="flex flex-col gap-4">
                  <FormField name="name" label="Name" placeholder="Enter a name" />
                  <FormField
                    name="description"
                    label="Description"
                    placeholder="Enter a description"
                    multiline
                    rows={5}
                  />
                  <SelectField
                    label="Type of resource"
                    name="_type"
                    placeholder="Choose a type of resource"
                  >
                    {RESOURCE_TYPES.map(({ value, hidden_value }, index) => (
                      <MenuItem
                        value={value}
                        onClick={() => setFieldValue("type", hidden_value)}
                        key={index}
                      >
                        {value}
                      </MenuItem>
                    ))}
                    <MenuItem value={"event"}>Event</MenuItem>
                    <MenuItem value={"dining"}>Dining</MenuItem>
                  </SelectField>
                </div>
              </DialogContent>
              <DialogActions>
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
    </>
  );
}
