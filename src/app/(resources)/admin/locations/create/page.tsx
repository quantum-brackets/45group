"use client";

import { MenuItem, Typography } from "@mui/material";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Formik } from "formik";
import * as Yup from "yup";
import BackButton from "~/components/back-button";
import Button from "~/components/button";
import LocationsService from "~/services/locations";
import { filterPrivateValues } from "~/utils/helpers";
import { notifyError, notifySuccess } from "~/utils/toast";
import MultiMedia from "~/components/form/multi-media";
import FormField from "~/components/fields/form-field";
import SelectField from "~/components/fields/select-field";
import statesData from "~/data/states.json";

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  state: Yup.string().required("State is required"),
  city: Yup.string().required("City is required"),
  description: Yup.string().optional(),
});

type InitialValues = {
  name: string;
  description: string;
  city: string;
  media: File[];
  _media_base64: string[];
  _cities?: string[];
};

const initialValues: InitialValues = {
  name: "",
  description: "",
  city: "",
  media: [],
  _media_base64: [],
};

export default function CreateLocation() {
  const { mutateAsync: createLocation } = useMutation({
    mutationFn: LocationsService.createLocation,
    onError: (error) => {
      if (isAxiosError(error)) {
        const data = error.response?.data;
        if (data.errors) {
          return notifyError({ message: data.errors[0].message });
        }
        notifyError({ message: data.error });
      }
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <header>
        <BackButton href="/admin/locations" text="Back to Locations" />
      </header>
      <Formik
        initialValues={initialValues}
        onSubmit={async ({ media, ...values }) => {
          const submissionValues = filterPrivateValues(values);

          if (!media.length) return notifyError({ message: "At least one media must be uploaded" });
          await createLocation(
            { ...submissionValues, images: media },
            {
              onSuccess: () => {
                notifySuccess({ message: "Location successfully created" });
              },
            }
          );
        }}
        // enableReinitialize
        validationSchema={validationSchema}
        validateOnBlur={false}
      >
        {({ handleSubmit, isSubmitting, setFieldValue, values }) => (
          <form method="POST" className="flex flex-col gap-6 pb-8" onSubmit={handleSubmit}>
            <header className="flex items-center justify-between gap-8">
              <Typography variant="h1">Create Location</Typography>
              <Button type="submit" loading={isSubmitting}>
                Create
              </Button>
            </header>
            <main className="grid grid-cols-2 gap-8 tablet:grid-cols-1 largeTabletAndBelow:gap-6 [@media(max-width:1060px)]:grid-cols-1">
              <div className="flex flex-col gap-4">
                <FormField name="name" label="Name" required placeholder="Enter a name" />
                <div className="grid grid-cols-2 gap-4">
                  <SelectField label="State" required name="state" placeholder="Choose a state">
                    {statesData.map(({ state, cities }, index) => (
                      <MenuItem
                        value={state}
                        key={index}
                        onClick={() => setFieldValue("_cities", cities)}
                      >
                        {state}
                      </MenuItem>
                    ))}
                  </SelectField>
                  <SelectField label="City" required name="city" placeholder="Choose a city">
                    {values._cities ? (
                      values._cities.map((city, index) => (
                        <MenuItem value={city} key={index}>
                          {city}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem value={"_"} disabled>
                        State has not been selected.
                      </MenuItem>
                    )}
                  </SelectField>
                </div>
                <FormField
                  name="description"
                  label="Description"
                  required
                  placeholder="Enter a description"
                  multiline
                  rows={5}
                />
              </div>
              <div>
                <MultiMedia<InitialValues>
                  values={values}
                  setFieldValue={setFieldValue}
                  title="Media"
                  description="Add images of the location."
                />
              </div>
            </main>
          </form>
        )}
      </Formik>
    </div>
  );
}
