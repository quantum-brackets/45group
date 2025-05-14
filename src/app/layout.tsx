import type { Metadata } from "next";
import Script from "next/script";
import { ThemeProvider } from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v13-appRouter";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";
import theme from "./theme";
import { cn } from "~/utils/helpers";
import TanstackQueryProvider from "~/providers/tanstack-query";
import Toast from "~/components/toast";
import { dancing_script, merriweather } from "~/utils/fonts";
import AppProgressBar from "~/components/app-progress-bar";
import LogoutModal from "~/components/logout-modal";
import { ConfirmationPromptProvider } from "~/providers/confirmation-prompt";

export const metadata: Metadata = {
  title: "45Group",
  description: "where the heart is",
  keywords: [
    "Hotel 45",
    "Hotel45",
    "Event 45",
    "Club 45",
    "Lounge 45",
    "Bar 45",
    "Bar 90",
    "45 Group",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(dancing_script.variable, merriweather.variable, "min-h-dvh scroll-smooth")}
      >
        <AppRouterCacheProvider>
          <TanstackQueryProvider>
            <ThemeProvider theme={theme}>
              <ConfirmationPromptProvider>
                <Toast />
                <AppProgressBar />
                {children}
                <Analytics />
                <LogoutModal />
              </ConfirmationPromptProvider>
            </ThemeProvider>
          </TanstackQueryProvider>
        </AppRouterCacheProvider>
        <Script
          src="https://cdn.jsdelivr.net/gh/iamogbz/oh-my-wcs@6b7a7b0/components/carousel-stack.js"
          strategy="beforeInteractive"
        />
      </body>
    </html>
  );
}
