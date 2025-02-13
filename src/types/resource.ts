import { Resource } from "~/db/schemas/resources";
import { ResourceRule } from "~/db/schemas/rules";

export type FacilityFormValues = {
  _show_facility_form?: boolean;
  _facility: { name: string; description: string };
  _show_facilities?: boolean;
  facilities: Record<
    string,
    {
      id?: string;
      name: string;
      markedForDeletion?: boolean;
      description?: string;
      checked?: boolean;
    }
  >;
};

export type RuleFormValues = {
  _show_rule_form?: boolean;
  _rule: { name: string; description: string; category: "house_rules" | "cancellations" };
  _show_rules?: boolean;
  rules: Record<
    string,
    Pick<ResourceRule, "category"> & {
      id?: string;
      name: string;
      markedForDeletion?: boolean;
      description?: string;
      checked?: boolean;
    }
  >;
};

export type AvailabilityFormValues = {
  _show_availabilities?: boolean;
  schedule_type: Resource["schedule_type"];
  custom: Record<
    DayOfWeek,
    {
      start_time: string;
      end_time: string;
    }
  >;
  weekdays: {
    start_time: string;
    end_time: string;
  };
  weekends: {
    start_time: string;
    end_time: string;
  };
};

export type GroupFormValues = {
  _show_group_form?: boolean;
  _show_groups?: boolean;
  groups?: {
    [key: string]: {
      id?: string;
      value: number;
      markedForDeletion?: boolean;
    };
  };
  _group?: string;
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
