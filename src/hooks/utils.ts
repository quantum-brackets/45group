import { useSearchParams } from "next/navigation";

type SearchParamValue = string | null;

export function useCustomSearchParams<T extends Record<string, SearchParamValue>>(
  keys: Array<keyof T>
): { [K in keyof T]: string } {
  const searchParams = useSearchParams();

  const params = keys.reduce<{ [K in keyof T]: string }>(
    (acc, key) => {
      acc[key] = searchParams.get(key as string) || "";
      return acc;
    },
    {} as { [K in keyof T]: string }
  );

  return params;
}
