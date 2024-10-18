import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { MiddlewareFactory } from "../stack-middlewares";
import { appError } from "~/utils/helpers";
import catchAsync from "~/utils/catch-async";
import { HEADER_DATA_KEY } from "~/utils/constants";

const protectedRoutes = ["/api/users"];

export const authorization: MiddlewareFactory = (next) => {
  return catchAsync(async (req: NextRequest, _next: NextFetchEvent) => {
    const pathname = req.nextUrl.pathname;

    if (protectedRoutes.some((path) => pathname.startsWith(path))) {
      const token = req.headers.get("Authorization")?.split(" ")[1];

      if (!token) {
        return appError({
          status: 401,
          error: "No token provided",
        });
      }

      const {
        data: { user_id },
      } = await axios.post("/api/utils/validate-token", {
        token,
      });

      const res = NextResponse.next();
      res.headers.set(HEADER_DATA_KEY, user_id);

      return res;
    }

    return next(req, _next);
  });
};
