"use client";

import { LoadingButton, LoadingButtonProps } from "@mui/lab";
import { cn } from "~/utils/helpers";

export default function Button({
  loading,
  variant = "contained",
  className,
  sx,
  children,
  size = "medium",
  ...props
}: LoadingButtonProps) {
  return (
    <LoadingButton
      {...props}
      variant={variant}
      size={size}
      className={cn(
        "!font-medium",
        {
          "opacity-40": loading,
        },
        className
      )}
      sx={{
        textTransform: "none",
        "&.MuiButton-sizeSmall": {
          padding: "10px 10px",
        },
        borderRadius: "8px",
        ...sx,
      }}
      loading={loading}
      disableElevation
    >
      {children}
    </LoadingButton>
  );
}
