"use client";

import { useState } from "react";

export default function ErrorComponent() {
  const [throwError, setThrowError] = useState(false);

  if (throwError) {
    throw new Error("This is a manually triggered error.");
  }

  return (
    <div>
      <h1>Click the button to trigger an error</h1>
      <button onClick={() => setThrowError(true)}>Trigger Error</button>
    </div>
  );
}
