import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { MiddlewareFactory } from "../stack-middlewares";
import { JWT_KEY } from "~/utils/constants";
import UsersService from "~/services/users";

const protectedPaths = ["/profile", "/previous-bookings", "/receipts"];

const redirectToLogin = (req: NextRequest, origin: string) => {
  const redirectUrl = new URL(req.url);
  redirectUrl.pathname = "/signin";
  return NextResponse.redirect(`${redirectUrl}?origin=${origin}`, 307);
};

export const authorization: MiddlewareFactory = (next) => {
  return async (req: NextRequest, _next: NextFetchEvent) => {
    const pathname = req.nextUrl.pathname;

    if (protectedPaths.some((path) => pathname.startsWith(path))) {
      const jwt = req.cookies.get(JWT_KEY)?.value;

      if (jwt) {
        try {
          await UsersService.getMe();
        } catch (error) {
          return redirectToLogin(req, pathname);
        }
      }
    }

    return next(req, _next);
  };
};
