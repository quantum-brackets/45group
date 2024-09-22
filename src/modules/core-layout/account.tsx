"use client";

import { Avatar, Skeleton } from "@mui/material";
import { useQuery } from "@tanstack/react-query";
import Button from "~/components/button";

export default function Account() {
  const { isLoading, data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            first_name: "Uchechukwu",
            last_name: "Uchechukwu",
          });
        }, 5000);
      });
    },
  });

  if (isLoading) {
    return <Skeleton width={100} height={50} />;
  }

  if (!currentUser) {
    return (
      <div className="flex gap-4">
        <Button>Login</Button>
        <Button color="info">Signup</Button>
      </div>
    );
  }

  return (
    <button>
      <Avatar alt="full name" sx={{ width: 35, height: 35 }} />
    </button>
  );
}
