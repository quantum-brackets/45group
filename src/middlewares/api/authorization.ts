import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { MiddlewareFactory } from "../stack-middlewares";
import { appError } from "~/utils/helpers";
import catchAsync from "~/utils/catch-async";
import { HEADER_DATA_KEY, SESSION_KEY } from "~/utils/constants";
import axiosInstance from "~/config/axios";

const protectedRoutes = ["/api/users"];

export const authorization: MiddlewareFactory = (next) => {
  return catchAsync(async (req: NextRequest, _next: NextFetchEvent) => {
    const pathname = req.nextUrl.pathname;
    const sessionToken =
      req.cookies.get(SESSION_KEY)?.value || req.headers.get("Authorization")?.split(" ")[1];

    if (protectedRoutes.some((path) => pathname.startsWith(path))) {
      if (!sessionToken) {
        return appError({ status: 401, error: "No session provided" });
      }

      const {
        data: { user_id },
      } = await axiosInstance.post("/api/utils/decode", { session: sessionToken });

      if (!user_id) {
        return appError({ status: 401, error: "Invalid session" });
      }

      const res = NextResponse.next();
      res.headers.set(HEADER_DATA_KEY, user_id);
      return res;
    }
    return next(req, _next);
  });
};
