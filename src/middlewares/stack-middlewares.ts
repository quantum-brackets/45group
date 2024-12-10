import { NextFetchEvent, NextMiddleware, NextRequest, NextResponse } from "next/server";

export type MiddlewareFactory = (middleware: NextMiddleware, res: NextResponse) => NextMiddleware;

// export function stackMiddlewares(functions: MiddlewareFactory[] = [], index = 0): NextMiddleware {
//   const current = functions[index];

//   if (current) {
//     const next = stackMiddlewares(functions, index + 1);

//     return async (req: NextRequest, event: NextFetchEvent) => {
//       const res = NextResponse.next();
//       const result = await current(next, res)(req, event);

//       if (result) {
//         result.headers.forEach((value, key) => {
//           req.headers.set(key, value);
//         });

//         const response = new NextResponse(result.body, {
//           status: result.status,
//           statusText: result.statusText,
//           headers: result.headers,
//         });

//         res.cookies.getAll().forEach((cookie) => {
//           response.cookies.set(cookie.name, cookie.value);
//         });

//         return response;
//       }

//       return res;
//     };
//   }

//   return (req: NextRequest) => {
//     const finalRes = NextResponse.next();

//     req.cookies.getAll().forEach((cookie) => {
//       finalRes.cookies.set(cookie.name, cookie.value);
//     });
//     req.headers.forEach((value, key) => {
//       finalRes.headers.set(key, value);
//     });

//     return finalRes;
//   };
// }

export function stackMiddlewares(functions: MiddlewareFactory[] = [], index = 0): NextMiddleware {
  const current = functions[index];

  if (current) {
    const next = stackMiddlewares(functions, index + 1);

    return async (req: NextRequest, event: NextFetchEvent) => {
      const res = NextResponse.next();
      const result = await current(next, res)(req, event);
      if (result) {
        return result;
      }
      return res;
    };
  }
  return () => NextResponse.next();
}
