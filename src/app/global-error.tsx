"use client";

import { useEffect } from "react";
import Image from "next/image";
import { captureException } from "@sentry/nextjs";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import Button from "~/components/button";
import ErrorIllustrtion from "~/assets/illustrations/500-error.png";
import { cn } from "~/utils/helpers";
import { merriweather } from "~/utils/fonts";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error);
  }, [error]);

  return (
    <html>
      <body
        className={cn(
          merriweather.variable,
          "flex min-h-screen items-center justify-center scroll-smooth"
        )}
      >
        <ThemeProvider theme={theme}>
          <div className="flex h-full w-full max-w-[800px] flex-grow flex-col items-center justify-center gap-2 self-center p-8">
            <figure className="w-[80%] largeMobile:w-full">
              <Image priority src={ErrorIllustrtion} alt="Error occured illustration" />
            </figure>
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-2xl tablet_768:text-base">An Error Occured!</h2>
              {/* {process.env.NODE_ENV === "development" && <p>Error: {error.message}</p>} */}
              <Button onClick={() => reset()}>Try again</Button>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
