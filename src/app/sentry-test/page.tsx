"use client";

import { captureException } from "@sentry/nextjs";

export default function SentryTest() {
  function sendSentryError() {
    const now = new Date().toLocaleString();
    captureException(`This is a test error made at ${now}`);
  }

  return (
    <div className="p-4">
      <h2 className="mb-4 text-xl font-bold">Sentry Test</h2>
      <button
        onClick={sendSentryError}
        className="w-full rounded bg-red-500 px-4 py-2 text-white transition-colors hover:bg-red-600"
      >
        Test Sentry Error
      </button>
    </div>
  );
}
