"use client";

import { Typography } from "@mui/material";
import Button from "~/components/button";

export default function Resources() {
  return (
    <main className="flex flex-col gap-10 tablet_768:gap-6">
      <header className="flex items-center justify-between">
        <Typography variant="h1">Resources</Typography>
        <Button href="/admin/resources/create">Create Resources</Button>
      </header>
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-2 gap-6">
          <div className="rounded-lg bg-primary p-4"></div>
          <div className="rounded-lg bg-primary p-4"></div>
        </div>
        <div></div>
      </div>
    </main>
  );
}
