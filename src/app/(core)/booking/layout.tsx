import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="divide-x">
      <aside className="w-[300px]"></aside>
      <main className="w-full">{children}</main>
    </div>
  );
}
