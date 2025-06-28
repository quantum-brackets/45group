import * as Yup from "yup";
import YupValidation from "~/utils/yup-validations";
import { DAY_OF_WEEK, SCHEDULE_TYPE } from "~/utils/constants";

const resourceType = ["lodge", "event", "dining"];

export const schedule = Yup.object({
  start_time: Yup.string().required("`start_time` is required"),
  end_time: Yup.string().required("`end_time` is required"),
  day_of_week: Yup.string()
    .lowercase()
    .oneOf(DAY_OF_WEEK, "`day_of_week` must be one of: " + DAY_OF_WEEK.join(", "))
    .required("`day_of_week` is required"),
});

export const resourceSchema = {
  location_id: Yup.string().uuid("Location id not valid"),
  name: Yup.string().required("`name` is required"),
  type: Yup.string()
    .oneOf(resourceType, `Type must be one of: ${resourceType.join(", ")}`)
    .required("`type` is required"),
  schedule_type: Yup.string()
    .lowercase()
    .oneOf(SCHEDULE_TYPE, `schedule_type must be one of: ${SCHEDULE_TYPE.join(", ")}`)
    .required("`schedule_type` is required"),
  description: Yup.string().required("`description` is required"),
  thumbnail: YupValidation.validateSingleFile({
    requiredMessage: "`thumbnail` is required",
    fileSizeMessage: "`thumbnail` must be less than 5MB",
  }),
  publish: Yup.boolean().optional(),
  schedules: Yup.array()
    .of(schedule)
    .min(1, "`schedules` must have at least one schedule")
    .when("schedule_type", {
      is: (value: string) => value !== "24/7",
      then: (schema) => schema.required("`schedules` is required when `schedule_type` is not 24/7"),
      otherwise: (schema) => schema.notRequired(),
    }),
};
