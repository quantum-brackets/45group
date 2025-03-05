"use client";

import { Resource } from "~/db/schemas/resources";

type Props = {
  status: Resource["status"];
};

export default function ResourceStatusChip({ status }: Props) {
  switch (status) {
    case "published":
      return (
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-green-600" />
          <small className="text-xs">Published</small>
        </div>
      );
    default:
      return (
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-zinc-600" />
          <small className="text-xs">Draft</small>
        </div>
      );
  }
}
