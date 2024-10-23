"use client";

import { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import UsersService from "~/services/users";

export default function ResourceLayout({ children }: { children: ReactNode }) {
  useQuery({
    queryKey: ["current-user"],
    queryFn: UsersService.getMe,
  });

  return <>{children}</>;
}
