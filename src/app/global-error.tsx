"use client";

import Image from "next/image";
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
  console.error(error);

  return (
    <html>
      <body className={cn(merriweather.variable, "min-h-screen scroll-smooth")}>
        <ThemeProvider theme={theme}>
          <div className="flex w-full max-w-App flex-grow flex-col items-center justify-center gap-2 self-center p-8">
            <figure className="w-[20%] largeMobile:!w-[65%] tablet:w-[50%]">
              <Image priority src={ErrorIllustrtion} alt="Error occured illustration" />
            </figure>
            <div className="flex flex-col items-center gap-4">
              <h2 className="text-2xl">An Error Occured!</h2>
              {process.env.NODE_ENV === "development" && <p>Error: {error.message}</p>}
              <Button onClick={() => reset()}>Try again</Button>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
