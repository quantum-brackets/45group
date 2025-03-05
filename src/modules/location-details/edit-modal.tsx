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
import { useUpdateLocation } from "~/hooks/locations";
import { filterPrivateValues } from "~/utils/helpers";
import { notifySuccess } from "~/utils/toast";
import Button from "~/components/button";
import { Location } from "~/db/schemas/locations";

type InitialValues = {
  name: string;
  description: string;
  city: string;
  _cities?: string[];
  state: string;
};

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
  const location = queryClient.getQueryData<Location>(["locations", id]);

  const { mutateAsync: updateLocation } = useUpdateLocation();

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
        disableEnforceFocus
      >
        <Formik
          initialValues={
            {
              name: location?.name || "",
              description: location?.description || "",
              city: location?.city || "",
              state: location?.state || "",
              _cities: statesData.find(({ state }) => location?.state === state)?.cities,
            } as InitialValues
          }
          onSubmit={async (values) => {
            const submissionValues = filterPrivateValues(values);
            await updateLocation(
              {
                id,
                data: {
                  ...submissionValues,
                },
              },
              {
                onSuccess: () => {
                  notifySuccess({ message: "Location successfully updated" });
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
                  <div className="grid grid-cols-2 gap-4">
                    <SelectField
                      label="State"
                      name="state"
                      placeholder="Choose a state"
                      MenuProps={{ disablePortal: true }}
                    >
                      {statesData.map(({ state, cities }, index) => (
                        <MenuItem
                          value={state}
                          key={index}
                          onClick={() => {
                            setFieldValue("_cities", cities);
                            setFieldValue("city", "");
                          }}
                        >
                          {state}
                        </MenuItem>
                      ))}
                    </SelectField>
                    <SelectField
                      label="City"
                      name="city"
                      placeholder="Choose a city"
                      emptyStateText="State has not been selected."
                      MenuProps={{ disablePortal: true }}
                    >
                      {values._cities &&
                        values._cities.map((city, index) => (
                          <MenuItem value={city} key={index}>
                            {city}
                          </MenuItem>
                        ))}
                    </SelectField>
                  </div>
                  <FormField
                    name="description"
                    label="Description"
                    placeholder="Enter a description"
                    multiline
                    rows={5}
                  />
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
