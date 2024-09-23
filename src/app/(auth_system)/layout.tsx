import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-secondary-50 p-4">
      <div className="w-full max-w-[450px] rounded-2xl bg-white p-6">{children}</div>
    </div>
  );
}
