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
import MediaCard from "~/components/resources-form/media-card";
import { filterPrivateValues } from "~/utils/helpers";
import { notifyError, notifySuccess } from "~/utils/toast";
import FileUploadSection from "~/components/resources-form/file-upload-section";
import AvailabitySection from "~/modules/create-resource/availability-section";
import FacilitiesSection from "~/modules/create-resource/facilities-section";
import RulesSection from "~/modules/create-resource/rules-section";
import Button from "~/components/button";
import GroupsSection from "~/modules/create-resource/groups-section";
import ResourcesService from "~/services/resources";

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
  _show_availabilities_form?: boolean;
  _availity?: string;
  _availability_anchor_el?: HTMLButtonElement | null;
  availabilities: {
    from: string;
    to: string;
    status: "available" | "unavailable";
  }[];
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

export type ResourceFormValues = AvailabilityFormValues &
  GroupFormValues & {
    name: string;
    location: string;
    address: string;
    description: string;
    type: "lodge" | "event" | "restaurant";
    thumbnail?: File;
    rule_form: RuleFormValues;
    facility_form: FacilityFormValues;
    _thumbnail_base64?: string;
    media: File[];
    _media_base64: string[];
    publish: boolean;
  };

const initialValues: ResourceFormValues = {
  name: "",
  location: "",
  address: "",
  description: "",
  type: "lodge",
  media: [],
  availabilities: [],
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
  publish: false,
  _media_base64: [],
};

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  location: Yup.string().required("Location is required"),
  address: Yup.string().required("Address is required"),
  description: Yup.string().required("Description is required"),
  type: Yup.string().oneOf(["lodge", "event", "restaurant"]).required("Resource type is required"),
});

export default function CreateResource() {
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  const results = useQueries({
    queries: [
      {
        queryKey: ["resources-rules"],
        queryFn: ResourcesService.getResourceRules,
      },
      {
        queryKey: ["resources-facilities"],
        queryFn: ResourcesService.getResourceFacilities,
      },
    ],
  });

  const isLoading = results.some((result) => result.isLoading);

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

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const [{ data: rules }, { data: facilities }] = results;

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

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

  const handleMediaSelect = async (
    files: FileList | null,
    values: ResourceFormValues,
    setFieldValue: FormikHelpers<ResourceFormValues>["setFieldValue"]
  ) => {
    if (!files || files.length === 0) return;

    try {
      const filePromises = Array.from(files).map(async (file) => ({
        file,
        base64: await readFileAsBase64(file),
      }));

      const results = await Promise.all(filePromises);

      const media: File[] = [];
      const mediaBase64: string[] = [];

      results.forEach(({ file, base64 }) => {
        const isExisting = values.media.some(
          (existingFile) => existingFile.name === file.name && existingFile.size === file.size
        );

        if (!isExisting) {
          media.push(file);
          mediaBase64.push(base64);
        }
      });

      setFieldValue("media", [...values.media, ...media]);
      setFieldValue("_media_base64", [...values._media_base64, ...mediaBase64]);
    } catch (error) {
      notifyError({
        message: error instanceof Error ? error.message : "Failed to process media files",
      });
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
          <form method="POST" onSubmit={handleSubmit} className="flex flex-col gap-6 pb-8">
            <header className="flex items-center justify-between gap-8">
              <Typography variant="h1">Create Resource</Typography>
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
            </header>
            <main className="flex flex-col gap-8">
              <div className="grid grid-cols-2 gap-8 tablet:grid-cols-1 largeTabletAndBelow:gap-6 [@media(max-width:1060px)]:grid-cols-1">
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="name" label="Name" required placeholder="Enter a name" />
                  <FormField
                    name="location"
                    label="Location"
                    required
                    placeholder="Enter a short location"
                  />
                  <FormField
                    name="address"
                    label="Address"
                    required
                    placeholder="Enter a detailed address"
                    multiline
                    rows={5}
                    wrapperClassName="col-span-2"
                  />
                  <FormField
                    name="description"
                    label="Description"
                    required
                    placeholder="Enter a description"
                    multiline
                    rows={5}
                    wrapperClassName="col-span-2"
                  />
                  <SelectField
                    label="Type of resource"
                    required
                    name="type"
                    placeholder="Choose a type of resource"
                    wrapperClassName="col-span-2"
                    className="capitalize"
                  >
                    <MenuItem value={"lodge"}>Lodge</MenuItem>
                    <MenuItem value={"event"}>Event</MenuItem>
                    <MenuItem value={"restaurant"}>Restaurant</MenuItem>
                  </SelectField>
                  <RulesSection
                    values={values.rule_form}
                    setFieldValue={(field: keyof RuleFormValues, value: any) => {
                      setFieldValue(`rule_form.${String(field)}`, value);
                    }}
                    setFieldError={(field: keyof RuleFormValues, message: string) => {
                      setFieldError(`rule_form.${String(field)}`, message);
                    }}
                  />
                  <FacilitiesSection
                    values={values.facility_form}
                    setFieldValue={(field: keyof FacilityFormValues, value: any) => {
                      setFieldValue(`facility_form.${String(field)}`, value);
                    }}
                    setFieldError={(field: keyof FacilityFormValues, message: string) => {
                      setFieldError(`facility_form.${String(field)}`, message);
                    }}
                  />
                  <AvailabitySection values={values} setFieldValue={setFieldValue} />
                  <GroupsSection values={values} setFieldValue={setFieldValue} />
                </div>
                <div className="flex flex-col gap-6 divide-y">
                  <div>
                    <FileUploadSection
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
                    <FileUploadSection
                      title="Media"
                      description="Add images of resource."
                      inputRef={mediaInputRef}
                      onFileSelect={(files) => handleMediaSelect(files, values, setFieldValue)}
                      multiple
                    />
                    <div className="mt-4 flex flex-col gap-2">
                      {values.media.map((file, index) => (
                        <MediaCard
                          file={file}
                          base64={values._media_base64[index]}
                          key={index}
                          onDelete={() => {
                            setFieldValue(
                              "media",
                              values.media.filter((_, idx) => idx !== index)
                            );
                            setFieldValue(
                              "_media_base64",
                              values._media_base64.filter((_, idx) => idx !== index)
                            );
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </main>
          </form>
        )}
      </Formik>
    </div>
  );
}
