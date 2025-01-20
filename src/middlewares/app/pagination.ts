import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { MiddlewareFactory } from "../stack-middlewares";

const paginatedPaths = ["/admin/locations", "/admin/resources"];

export const pagination: MiddlewareFactory = (next) => {
  return async (req: NextRequest, _next: NextFetchEvent) => {
    const pathname = req.nextUrl.pathname;
    const url = req.nextUrl;

    if (!paginatedPaths.some((path) => pathname.startsWith(path))) {
      return next(req, _next);
    }

    if (!url.searchParams.has("limit") || !url.searchParams.has("offset")) {
      url.searchParams.set("limit", "10");
      url.searchParams.set("offset", "0");

      return NextResponse.redirect(url);
    }

    return next(req, _next);
  };
};
