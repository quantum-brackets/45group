import { ReactNode } from "react";

type Props = Record<"children" | "lodges" | "events" | "cuisine" | "contact", ReactNode>;

export default function Layout({ children, lodges, events, cuisine, contact }: Props) {
  return (
    <div className="flex flex-col gap-12">
      {children}
      {lodges}
      {events}
      {cuisine}
      {contact}
    </div>
  );
}
