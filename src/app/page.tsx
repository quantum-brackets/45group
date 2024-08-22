"use client";

import { notifyError, notifyInfo, notifySuccess } from "~/utils/toast";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <h1 className="text-4xl">Hello World</h1>

      <div className="flex gap-8">
        <button
          onClick={() => notifyError({ message: "error", description: "something has happend" })}
        >
          error
        </button>
        <button onClick={() => notifySuccess({ message: "success" })}>success</button>
        <button onClick={() => notifyInfo({ message: "info" })}>info</button>
      </div>
    </main>
  );
}
