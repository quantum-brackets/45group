import { NextFetchEvent, NextRequest } from "next/server";
import { MiddlewareFactory } from "../stack-middlewares";
import { appError } from "~/utils/helpers";
import catchAsync from "~/utils/catch-async";
import { SESSION_KEY } from "~/utils/constants";
import axiosInstance from "~/config/axios";

const protectedRoutes = ["/api/users", "/api/auth/logout", "/api/auth/set-email"];

export const authorization: MiddlewareFactory = (next, _, data) => {
  return catchAsync(async (req: NextRequest, _next: NextFetchEvent) => {
    const pathname = req.nextUrl.pathname;

    if (protectedRoutes.some((path) => pathname.startsWith(path))) {
      const sessionToken =
        req.cookies.get(SESSION_KEY)?.value || req.headers.get("Authorization")?.split(" ")[1];
      if (!sessionToken) {
        return appError({ status: 401, error: "No session provided" });
      }

      try {
        const {
          data: { user_id },
        } = await axiosInstance.post("/api/utils/decode", { session: sessionToken });

        if (!user_id) {
          return appError({ status: 401, error: "Invalid session" });
        }

        data.userId = user_id;
      } catch (error) {
        return appError({ status: 401, error: "Invalid session" });
      }
    }
    return next(req, _next);
  });
};
