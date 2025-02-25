"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { MenuItem, Typography } from "@mui/material";
import { Formik, FormikHelpers } from "formik";
import { useQueries } from "@tanstack/react-query";
import * as Yup from "yup";
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
import LocationForm from "~/modules/create-resource/location-form";
import MultiMedia from "~/components/form/multi-media";
import {
  useAddResourceFacility,
  useAddResourceGroup,
  useAddResourceRule,
  useCreateResource,
  useUpdateResource,
  useUploadResourceMedia,
} from "~/hooks/resources";
import { DAY_OF_WEEK } from "~/utils/constants";
import {
  AvailabilityFormValues,
  FacilityFormValues,
  GroupFormValues,
  ResourceFormValues,
  RuleFormValues,
} from "~/types/resource";
import RuleService from "~/services/rules";
import FacilityService from "~/services/facilities";
import GroupService from "~/services/groups";
import { useCreateFacility, useDeleteFacility } from "~/hooks/facilities";
import { useCreateRule, useDeleteRule } from "~/hooks/rules";
import { useCreateGroup, useDeleteGroup } from "~/hooks/groups";

const initialValues: ResourceFormValues = {
  name: "",
  description: "",
  type: "lodge",
  location: null,
  media: [],
  availability_form: {
    schedule_type: "24/7",
    custom: Object.fromEntries(
      DAY_OF_WEEK.map((day) => [
        day,
        {
          start_time: "12:00 AM",
          end_time: "11:59 PM",
        },
      ])
    ) as AvailabilityFormValues["custom"],
    weekdays: {
      start_time: "12:00 AM",
      end_time: "11:59 PM",
    },
    weekends: {
      start_time: "12:00 AM",
      end_time: "11:59 PM",
    },
  },
  rule_form: {
    rules: {},
    _rule: {
      name: "",
      description: "",
      category: "house_rules",
    },
  },
  facility_form: {
    facilities: {},
    _facility: {
      name: "",
      description: "",
    },
  },
  group_form: {
    groups: {},
    _group: "",
  },
  publish: false,
  _media_base64: [],
};

const validationSchema = Yup.object({
  name: Yup.string().required("Name is required"),
  description: Yup.string().required("Description is required"),
  type: Yup.string().oneOf(["lodge", "event", "dining"]).required("Resource type is required"),
});

const processDeletedItems = <T extends { markedForDeletion?: boolean }>(
  items?: Record<string, T>
): [string, T][] => {
  if (!items) return [];
  return Object.entries(items).filter(([_, item]) => item.markedForDeletion);
};

const processExistingItems = <T extends { id?: string }>(
  items?: Record<string, T>
): [string, T][] => {
  if (!items) return [];
  return Object.entries(items).filter(([_, item]) => item.id);
};

export default function CreateResource() {
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [
    { data: rules, isLoading: isRulesLoading },
    { data: facilities, isLoading: isFacilitiesLoading },
    { data: groups, isLoading: isGroupsLoading },
  ] = useQueries({
    queries: [
      {
        queryKey: ["rules"],
        queryFn: RuleService.getRules,
      },
      {
        queryKey: ["facilities"],
        queryFn: FacilityService.getFacilities,
      },
      {
        queryKey: ["groups"],
        queryFn: GroupService.getGroups,
      },
    ],
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

  const { mutateAsync: createResource } = useCreateResource();
  const { mutateAsync: updateResource } = useUpdateResource();
  const { mutateAsync: uploadResourceMedia } = useUploadResourceMedia();

  const { mutateAsync: addRule } = useAddResourceRule();
  const { mutateAsync: addFacility } = useAddResourceFacility();
  const { mutateAsync: addGroup } = useAddResourceGroup();

  const { mutateAsync: deleteFacility } = useDeleteFacility();
  const { mutateAsync: deleteRule } = useDeleteRule();
  const { mutateAsync: deleteGroup } = useDeleteGroup();

  const { mutateAsync: createFacility } = useCreateFacility();
  const { mutateAsync: createRule } = useCreateRule();
  const { mutateAsync: createGroup } = useCreateGroup();

  return (
    <div className="flex flex-col gap-4">
      <header>
        <BackButton href="/admin/resources" text="Back to Resources" />
      </header>
      <Formik
        initialValues={
          {
            ...initialValues,
            facility_form: {
              ...initialValues.facility_form,
              facilities: facilities?.reduce(
                (acc, facility) => ({
                  ...acc,
                  [facility.name]: facility,
                }),
                {}
              ),
            },
            rule_form: {
              ...initialValues.rule_form,
              rules: rules?.reduce(
                (acc, rule) => ({
                  ...acc,
                  [rule.name]: rule,
                }),
                {}
              ),
            },
            group_form: {
              ...initialValues.group_form,
              groups: groups?.reduce(
                (acc, group) => ({
                  ...acc,
                  [group.name]: {
                    ...group,
                    value: 0,
                  },
                }),
                {}
              ),
            },
          } as ResourceFormValues
        }
        onSubmit={async (values) => {
          const {
            rule_form: { rules },
            facility_form: { facilities },
            group_form: { groups },
            media: medias,
            location,
            thumbnail,
            availability_form: { schedule_type, custom, weekdays, weekends },
            ...submissionValues
          } = filterPrivateValues(values);

          if (!thumbnail) return notifyError({ message: "Thumbnail is required" });
          if (!medias.length) return notifyError({ message: "At least one media is required" });
          if (!location) return notifyError({ message: "Location not chosen" });

          let schedules: Record<"start_time" | "end_time" | "day_of_week", string>[] = [];

          switch (schedule_type) {
            case "custom":
              schedules = Object.entries(custom).map(([key, value]) => ({
                ...value,
                day_of_week: key,
              }));
              break;
            case "weekdays":
              schedules = DAY_OF_WEEK.slice(0, 5).map((day) => ({ ...weekdays, day_of_week: day }));
            case "weekends":
              schedules = DAY_OF_WEEK.slice(-2).map((day) => ({ ...weekends, day_of_week: day }));
          }

          const { id: resourceId } = await createResource({
            ...submissionValues,
            thumbnail,
            schedule_type,
            location_id: location?.id,
            schedules,
          });

          await uploadResourceMedia({
            id: resourceId,
            data: { medias },
          });

          const deletedRules = processDeletedItems<(typeof rules)[number]>(rules);
          const deletedFacilities = processDeletedItems<(typeof facilities)[number]>(facilities);
          const deletedGroups = processDeletedItems(groups);

          const newRules = rules
            ? Object.entries(rules).filter(([_, { id, checked }]) => !id && checked)
            : [];
          const newFacilities = facilities
            ? Object.entries(facilities).filter(([_, { id, checked }]) => !id && checked)
            : [];
          const newGroups = groups ? Object.entries(groups).filter(([_, { id }]) => !id) : [];

          const oldRules = processExistingItems<(typeof rules)[number]>(rules);
          const oldFacilities = processExistingItems<(typeof facilities)[number]>(facilities);
          const oldGroups = processExistingItems(groups);

          console.log(oldRules, oldFacilities, oldGroups, "oldies");

          await Promise.all([
            ...(deletedRules.length > 0
              ? deletedRules.map(([_, rule]) => rule.id && deleteRule(rule.id))
              : []),
            ...(deletedFacilities.length > 0
              ? deletedFacilities.map(([_, facility]) => facility.id && deleteFacility(facility.id))
              : []),
            ...(deletedGroups.length > 0
              ? deletedGroups.map(([_, group]) => group.id && deleteGroup(group.id))
              : []),
          ]);

          const [rulesRes, facilitiesRes, groupsRes] = await Promise.all([
            newRules.length
              ? Promise.all(
                  newRules.map(([_, { name, description, category }]) =>
                    createRule({ name, category, description })
                  )
                )
              : Promise.resolve([]),
            newFacilities.length
              ? Promise.all(
                  newFacilities.map(([_, { name, description }]) =>
                    createFacility({ name, description })
                  )
                )
              : Promise.resolve([]),
            newGroups.length
              ? Promise.all(newGroups.map(([key]) => createGroup({ name: key })))
              : Promise.resolve([]),
          ]);

          const ruleIds = [
            ...oldRules.map(([_, { id }]) => id),
            ...rulesRes.filter(Boolean).map(({ id }) => id),
          ];

          const facilityIds = [
            ...oldFacilities.map(([_, { id }]) => id),
            ...facilitiesRes.filter(Boolean).map(({ id }) => id),
          ];

          const groupIds = [
            ...oldGroups.map(([_, { id, value: num }]) => ({ id, num })),
            ...groupsRes.filter(Boolean).map(({ id, name }) => ({
              id,
              num: groups?.[name]?.["value"] || 0,
            })),
          ];

          await Promise.all([
            rulesRes.length
              ? addRule({ id: resourceId, data: { rule_ids: ruleIds as string[] } })
              : Promise.resolve(),
            facilitiesRes.length
              ? addFacility({ id: resourceId, data: { facility_ids: facilityIds as string[] } })
              : Promise.resolve(),
            groupsRes.length
              ? addGroup({
                  id: resourceId,
                  data: { group_ids: groupIds as { id: string; num: number }[] },
                })
              : Promise.resolve(),
          ]);

          notifySuccess({ message: "Resource successfully created" });
          router.push("/admin/resources");
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
                    disabled={isSubmitting && values.publish}
                    variant="outlined"
                    color="info"
                    loading={isSubmitting && !values.publish}
                  >
                    Save as draft
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting && !values.publish}
                    loading={isSubmitting && values.publish}
                    onClick={() => setFieldValue("publish", true)}
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
                    onClick={() =>
                      values._location && setFieldValue("location", { ...values._location })
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
