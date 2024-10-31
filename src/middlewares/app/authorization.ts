import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { MiddlewareFactory } from "../stack-middlewares";
import { HEADER_AUTHORISATION_KEY, SESSION_KEY } from "~/utils/constants";
import axiosInstance from "~/config/axios";
import { authHeader } from "~/utils/helpers";

const protectedPaths = ["/profile", "/previous-bookings", "/receipts"];
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

async function getUserBySessionToken(token: string | undefined): Promise<User | null> {
  if (!token) return null;

  try {
    const { data: user } = await axiosInstance.get<User>("/api/users/me", {
      headers: {
        [HEADER_AUTHORISATION_KEY]: authHeader(token),
      },
    });

    return user;
  } catch (error) {
    return null;
  }
}

export const authorization: MiddlewareFactory = (next) => {
  return async (req: NextRequest, _next: NextFetchEvent) => {
    const pathname = req.nextUrl.pathname;
    const session = req.cookies.get(SESSION_KEY)?.value;

    console.log(session, "sesssion");

    const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
    const isExternalPath = externalPaths.some((path) => pathname.startsWith(path));

    if (!isProtectedPath && !isExternalPath) {
      return next(req, _next);
    }

    if (isProtectedPath && !session) {
      return redirect({ req, pathname: authPaths.signin, origin: pathname });
    }

    const user = await getUserBySessionToken(session);

    console.log(user);

    if (isProtectedPath && !user) {
      return redirect({ req, pathname: authPaths.signin, origin: pathname });
    }

    if (user && !user.complete_profile) {
      return redirect({ req, pathname: authPaths.completeProfile, origin: pathname });
    }

    return next(req, _next);
  };
};
