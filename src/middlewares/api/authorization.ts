import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { MiddlewareFactory } from "../stack-middlewares";
import { appError } from "~/utils/helpers";
import catchAsync from "~/utils/catch-async";
import { HEADER_DATA_KEY, SESSION_KEY } from "~/utils/constants";
import { decode } from "next-auth/jwt";

const protectedRoutes = ["/api/users"];

export const authorization: MiddlewareFactory = (next) => {
  return catchAsync(async (req: NextRequest, _next: NextFetchEvent) => {
    const pathname = req.nextUrl.pathname;

    if (protectedRoutes.some((path) => pathname.startsWith(path))) {
      const session =
        req.cookies.get(SESSION_KEY)?.value || req.headers.get("Authorization")?.split(" ")[1];

      const data = await decode({
        secret: process.env.NEXTAUTH_SECRET!,
        token: session,
      });

      if (!data?.id) {
        return appError({
          status: 401,
          error: "No session provided",
        });
      }

      const res = NextResponse.next();
      res.headers.set(HEADER_DATA_KEY, data.id);

      return res;
    }

    return next(req, _next);
  });
};
