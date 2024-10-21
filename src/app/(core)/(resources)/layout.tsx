"use client";

import { ReactNode, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@mui/material";
import UsersService from "~/services/users";

export default function ResourceLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const { isLoading, data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: UsersService.getMe,
  });

  useEffect(() => {
    if (user && !user.complete_profile) {
      window.location.replace(`/complete-profile?origin=${pathname}`);
    }
  }, [user, pathname]);

  if (isLoading) {
    return <Skeleton width={500} height={500} />;
  }

  if (user && !user.complete_profile) {
    return null;
  }

  return <>{children}</>;
}
