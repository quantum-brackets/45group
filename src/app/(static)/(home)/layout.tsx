import { ReactNode } from "react";

type Props = Record<"children" | "lodges" | "events" | "cuisine" | "contact", ReactNode>;

export default function Layout({ children, lodges, events, cuisine, contact }: Props) {
  return (
    <div className="max-w-App flex w-full flex-col gap-16 pb-16">
      {children}
      {lodges}
      {events}
      {cuisine}
      {contact}
    </div>
  );
}