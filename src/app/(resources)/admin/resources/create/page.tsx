"use client";

import { useRef } from "react";
import { MenuItem, Typography } from "@mui/material";
import { Formik, FormikHelpers } from "formik";
import { useMutation, useQueries } from "@tanstack/react-query";
import * as Yup from "yup";
import { isAxiosError } from "axios";
import BackButton from "~/components/back-button";
import FormField from "~/components/fields/form-field";
import SelectField from "~/components/fields/select-field";
import MediaCard from "~/components/form/media-card";
import { cn, filterPrivateValues, readFileAsBase64 } from "~/utils/helpers";
import { notifyError, notifySuccess } from "~/utils/toast";
import FileUploadCard from "~/components/form/file-upload-card";
import AvailabitySection from "~/modules/create-resource/availability-section";
import FacilitiesSection from "~/modules/create-resource/facilities-section";
import RulesSection from "~/modules/create-resource/rules-section";
import Button from "~/components/button";
import GroupsSection from "~/modules/create-resource/groups-section";
import ResourcesService from "~/services/resources";
import LocationForm from "~/modules/create-resource/location-form";
import MultiMedia from "~/components/form/multi-media";

type FacilityFormValues = {
  _show_facility_form?: boolean;
  _facility: { name: string; description: string };
  _show_facilities?: boolean;
  facilities: (Omit<ResourceFacility, "id" | "created_at" | "updated_at"> & {
    id?: string;
    markedForDeletion?: boolean;
    checked?: boolean;
  })[];
};

type RuleFormValues = {
  _show_rule_form?: boolean;
  _rule: { name: string; description: string; category: "house_rules" | "cancellations" };
  _show_rules?: boolean;
  rules: (Omit<ResourceRule, "id" | "created_at" | "updated_at"> & {
    id?: string;
    markedForDeletion?: boolean;
    checked?: boolean;
  })[];
};

type AvailabilityFormValues = {
  _show_availabilities?: boolean;
  schedule_type: string;
};

type GroupFormValues = {
  _show_group_form?: boolean;
  _show_groups?: boolean;
  groups?: {
    [key: string]: number;
  };
  _group?: string;
  existing_groups?: {
    [key: string]: number;
  };
};

export type ResourceFormValues = {
  name: string;
  location: {
    id: string;
    name: string;
    city: string;
    state: string;
  } | null;
  _location?: {
    id: string;
    name: string;
    city: string;
    state: string;
  };
  description: string;
  type: "lodge" | "event" | "dining";
  thumbnail?: File;
  rule_form: RuleFormValues;
  facility_form: FacilityFormValues;
  availability_form: AvailabilityFormValues;
  group_form: GroupFormValues;
  _thumbnail_base64?: string;
  media: File[];
  _media_base64: string[];
  publish: boolean;
};

const initialValues: ResourceFormValues = {
  name: "",
  description: "",
  type: "lodge",
  location: null,
  media: [],
  availability_form: {
    schedule_type: "24/7",
  },
  rule_form: {
    rules: [],
    _rule: {
      name: "",
      description: "",
      category: "house_rules",
    },
  },
  facility_form: {
    facilities: [],
    _facility: {
      name: "",
      description: "",
    },
  },
  group_form: {
    groups: {},
  },
  publish: false,
  _media_base64: [],
};

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  location: Yup.string().required("Location is required"),
  address: Yup.string().required("Address is required"),
  description: Yup.string().required("Description is required"),
  type: Yup.string().oneOf(["lodge", "event", "dining"]).required("Resource type is required"),
});

export default function CreateResource() {
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const [
    { data: rules, isLoading: isRulesLoading },
    { data: facilities, isLoading: isFacilitiesLoading },
    { data: groups, isLoading: isGroupsLoading },
  ] = useQueries({
    queries: [
      {
        queryKey: ["resources-rules"],
        queryFn: ResourcesService.getResourceRules,
      },
      {
        queryKey: ["resources-facilities"],
        queryFn: ResourcesService.getResourceFacilities,
      },
      {
        queryKey: ["resources-groups"],
        queryFn: ResourcesService.getResourceGroups,
      },
    ],
  });

  const { mutateAsync: createResource } = useMutation({
    mutationFn: ResourcesService.createResource,
    onSuccess: () => {
      notifySuccess({ message: "Resource successfully created" });
    },
    onError: (error) => {
      if (isAxiosError(error)) {
        notifyError({ message: error.response?.data.error });
      }
    },
  });

  const handleThumbnailSelect = async (
    files: FileList | null,
    setFieldValue: FormikHelpers<ResourceFormValues>["setFieldValue"]
  ) => {
    const file = files?.[0];
    if (file) {
      try {
        const base64 = await readFileAsBase64(file);
        setFieldValue("thumbnail", file);
        setFieldValue("_thumbnail_base64", base64);
      } catch (error) {
        notifyError({
          message: "Failed to process thumbnail image",
        });
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header>
        <BackButton href="/admin/resources" text="Back to Resources" />
      </header>
      <Formik
        initialValues={{
          ...initialValues,
          facility_form: {
            ...initialValues.facility_form,
            facilities: facilities as FacilityFormValues["facilities"],
          },
          rule_form: { ...initialValues.rule_form, rules: rules as RuleFormValues["rules"] },
          group_form: {
            ...initialValues.group_form,
            groups: groups?.reduce(
              (acc, group) => ({
                ...acc,
                [group.name]: group.num,
              }),
              {}
            ),
          },
        }}
        onSubmit={async (values) => {
          const submissionValues = filterPrivateValues(values);
          console.log(submissionValues);
          await createResource(submissionValues);
        }}
        enableReinitialize
        validationSchema={validationSchema}
        validateOnBlur={false}
      >
        {({ handleSubmit, setFieldValue, values, isSubmitting, setFieldError }) => (
          <form
            method="POST"
            onSubmit={handleSubmit}
            className={cn("flex flex-col pb-8", {
              "gap-6": values.location,
              "gap-2": !values.location,
            })}
          >
            <header className="flex items-center justify-between gap-8">
              <Typography variant="h1">Create Resource</Typography>
              {values.location ? (
                <div className="flex items-center gap-4">
                  <Button
                    type="submit"
                    onClick={async () => await setFieldValue("publish", false)}
                    // disabled={values.publish}
                    variant="outlined"
                    color="info"
                    loading={isSubmitting}
                  >
                    Save as draft
                  </Button>
                  <Button
                    type="submit"
                    // disabled={values.publish}
                    loading={isSubmitting}
                    onClick={async () => await setFieldValue("publish", true)}
                  >
                    Publish Resource
                  </Button>
                </div>
              ) : (
                <div>
                  <Button
                    type="button"
                    disabled={!values._location}
                    loading={isSubmitting}
                    onClick={async () =>
                      values._location && (await setFieldValue("location", { ...values._location }))
                    }
                  >
                    Next
                  </Button>
                </div>
              )}
            </header>
            {values.location ? (
              <main className="flex flex-col gap-8">
                <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-4">
                  <div className="flex justify-between gap-8">
                    <h5 className="text-sm">{values.location.name}</h5>
                    <button
                      className="text-sm text-primary hover:underline"
                      onClick={() => {
                        if (!values.location) return;
                        setFieldValue("location", null);
                        setFieldValue("_location", values.location);
                      }}
                    >
                      Change
                    </button>
                  </div>
                  <p className="text-xs text-zinc-700">
                    {values.location.city}, {values.location.state}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-8 tablet:grid-cols-1 largeTabletAndBelow:gap-6 [@media(max-width:1060px)]:grid-cols-1">
                  <div className="flex flex-col gap-4">
                    <FormField name="name" label="Name" required placeholder="Enter a name" />
                    <FormField
                      name="description"
                      label="Description"
                      required
                      placeholder="Enter a description"
                      multiline
                      rows={5}
                    />
                    <SelectField
                      label="Type of resource"
                      required
                      name="type"
                      placeholder="Choose a type of resource"
                      className="capitalize"
                    >
                      <MenuItem value={"lodge"}>Lodge</MenuItem>
                      <MenuItem value={"event"}>Event</MenuItem>
                      <MenuItem value={"dining"}>Dining</MenuItem>
                    </SelectField>
                    <RulesSection
                      isLoading={isRulesLoading}
                      values={values.rule_form}
                      setFieldValue={(field: keyof RuleFormValues, value: any) => {
                        setFieldValue(`rule_form.${String(field)}`, value);
                      }}
                      setFieldError={(field: keyof RuleFormValues, message: string) => {
                        setFieldError(`rule_form.${String(field)}`, message);
                      }}
                    />
                    <FacilitiesSection
                      isLoading={isFacilitiesLoading}
                      values={values.facility_form}
                      setFieldValue={(field: keyof FacilityFormValues, value: any) => {
                        setFieldValue(`facility_form.${String(field)}`, value);
                      }}
                      setFieldError={(field: keyof FacilityFormValues, message: string) => {
                        setFieldError(`facility_form.${String(field)}`, message);
                      }}
                    />
                    <AvailabitySection
                      values={values.availability_form}
                      setFieldValue={(field: keyof AvailabilityFormValues, message: string) => {
                        setFieldValue(`availability_form.${String(field)}`, message);
                      }}
                    />
                    <GroupsSection
                      isLoading={isGroupsLoading}
                      values={values.group_form}
                      setFieldValue={(field: keyof GroupFormValues, message: string) => {
                        setFieldValue(`group_form.${String(field)}`, message);
                      }}
                      setFieldError={(field: keyof GroupFormValues, message: string) => {
                        setFieldError(`group_form.${String(field)}`, message);
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-6 divide-y">
                    <div>
                      <FileUploadCard
                        title="Thumbnail"
                        description="Used to represent your resource."
                        inputRef={thumbnailInputRef}
                        onFileSelect={(files) => handleThumbnailSelect(files, setFieldValue)}
                      />
                      {values.thumbnail && values._thumbnail_base64 && (
                        <div className="mt-4 flex flex-col gap-2">
                          <MediaCard
                            file={values.thumbnail}
                            base64={values._thumbnail_base64}
                            onDelete={() => {
                              setFieldValue("thumbnail", undefined);
                              setFieldValue("_thumbnail_base64", undefined);
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <div className="pt-6">
                      <MultiMedia<ResourceFormValues>
                        values={values}
                        setFieldValue={setFieldValue}
                        title="Media"
                        description="Add images of resource."
                      />
                    </div>
                  </div>
                </div>
              </main>
            ) : (
              <LocationForm values={values} setFieldValue={setFieldValue} />
            )}
          </form>
        )}
      </Formik>
    </div>
  );
}
