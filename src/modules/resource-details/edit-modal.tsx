"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { DialogActions, DialogContent, DialogTitle, MenuItem } from "@mui/material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Formik } from "formik";
import * as Yup from "yup";
import { FiEdit } from "react-icons/fi";
import Modal from "~/components/modal";
import FormField from "~/components/fields/form-field";
import SelectField from "~/components/fields/select-field";
import { filterPrivateValues } from "~/utils/helpers";
import { notifySuccess } from "~/utils/toast";
import Button from "~/components/button";
import { useUpdateResource } from "~/hooks/resources";
import { Resource } from "~/db/schemas/resources";
import LocationsService from "~/services/locations";
import { Location } from "~/db/schemas";

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
  const { data: locations, isLoading: isLocationLoading } = useQuery({
    queryKey: ["locations"],
    queryFn: () => LocationsService.getLocations<Location[]>(),
  });

  const resourceType = useMemo(() => {
    return RESOURCE_TYPES.find(({ hidden_value }) => resource?.type === hidden_value)?.value;
  }, [resource?.type]);
  const location = useMemo(() => {
    return locations?.find(({ id }) => resource?.location_id === id);
  }, [locations, resource?.location_id]);

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
              _type: resourceType,
              type: resource?.type || "",
              _location: location ? `${location.name}, ${location.city}, ${location.state}` : "",
            } as InitialValues
          }
          onSubmit={async (values) => {
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
                  handleClose();
                },
              }
            );
          }}
          enableReinitialize
          validationSchema={validationSchema}
        >
          {({ setFieldValue, handleSubmit, isSubmitting }) => (
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
                  </SelectField>
                  <SelectField
                    label="Location"
                    name="_location"
                    placeholder="Choose a location"
                    isLoading={isLocationLoading}
                    data={locations}
                    onClick={(e) => e.stopPropagation()}
                    emptyStateText={"No location found"}
                  >
                    {locations?.map(({ name, id, city, state }) => (
                      <MenuItem
                        value={`${name}, ${city}, ${state}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setFieldValue("location_id", id);
                        }}
                        key={id}
                        className="flex flex-col justify-start"
                      >
                        <p>{name}</p>
                        <small>
                          {city}, {state}
                        </small>
                      </MenuItem>
                    ))}
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
