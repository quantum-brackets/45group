import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { MiddlewareFactory } from "../stack-middlewares";
import { JWT_KEY } from "~/utils/constants";
import UsersService from "~/services/users";

const protectedPaths = ["/profile", "/previous-bookings", "/receipts", "/complete-profile"];

const externalPaths = ["/booking"];

const authPaths = {
  signin: "/signin",
  completeProfile: "/complete-profile",
};

function redirect({
  req,
  pathname,
  origin,
}: {
  req: NextRequest;
  pathname: string;
  origin?: string;
}) {
  const redirectUrl = new URL(req.url);
  redirectUrl.pathname = pathname;
  if (origin) redirectUrl.searchParams.set("origin", origin);
  return NextResponse.redirect(redirectUrl, 307);
}

async function getMe(jwt: string | undefined): Promise<User | null> {
  if (!jwt) return null;

  try {
    return await UsersService.getMe();
  } catch (error) {
    return null;
  }
}

export const authorization: MiddlewareFactory = (next) => {
  return async (req: NextRequest, _next: NextFetchEvent) => {
    const pathname = req.nextUrl.pathname;
    const jwt = req.cookies.get(JWT_KEY)?.value;

    const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
    const isExternalPath = externalPaths.some((path) => pathname.startsWith(path));

    if (!isProtectedPath && !isExternalPath) {
      return next(req, _next);
    }

    if (isProtectedPath && !jwt) {
      return redirect({ req, pathname: authPaths.signin, origin: pathname });
    }

    const user = await getMe(jwt);

    if (pathname === authPaths.completeProfile && user && user.complete_profile) {
      return redirect({ req, pathname: "/booking" });
    }

    if (isProtectedPath && !user) {
      return redirect({ req, pathname: authPaths.signin, origin: pathname });
    }

    if (user && !user.complete_profile) {
      return redirect({ req, pathname: authPaths.completeProfile, origin: pathname });
    }

    return next(req, _next);
  };
};
