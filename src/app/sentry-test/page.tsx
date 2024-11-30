"use client";

export default function SentryTest() {
  const testUnhandledError = (): void => {
    // This will trigger an unhandled error
    const obj: null = null;
    (obj as any).nonExistentMethod();
  };

  // // Function to test unhandled error
  // const testUnhandledError = () => {
  //   // This will trigger an unhandled error
  //   const obj = null;
  //   obj.nonExistentMethod();
  // };

  return (
    <div>
      SentryTest
      <button
        onClick={testUnhandledError}
        className="w-full rounded bg-red-500 px-4 py-2 text-white"
      >
        Test Unhandled Error
      </button>
    </div>
  );
}
