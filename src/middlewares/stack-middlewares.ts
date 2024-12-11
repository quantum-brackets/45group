import { NextFetchEvent, NextMiddleware, NextRequest, NextResponse } from "next/server";
import { HEADER_DATA_KEY } from "~/utils/constants";

export type MiddlewareFactory = (
  middleware: NextMiddleware,
  res: NextResponse,
  data: Record<string, any>
) => NextMiddleware;

export function stackMiddlewares(
  functions: MiddlewareFactory[] = [],
  index = 0,
  data = {}
): NextMiddleware {
  const current = functions[index];

  if (current) {
    const next = stackMiddlewares(functions, index + 1);

    return async (req: NextRequest, event: NextFetchEvent) => {
      const res = NextResponse.next();
      const result = await current(next, res, data)(req, event);

      if (result) {
        if (Object.keys(data).length > 0) {
          result.headers.append(HEADER_DATA_KEY, JSON.stringify(data));
        }
        return result;
      }
      return res;
    };
  }

  const res = NextResponse.next();
  if (Object.keys(data).length > 0) {
    res.headers.append(HEADER_DATA_KEY, JSON.stringify(data));
  }
  return () => res;
}
