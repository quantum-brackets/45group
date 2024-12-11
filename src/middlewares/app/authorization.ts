import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { MiddlewareFactory } from "../stack-middlewares";
import { SESSION_KEY } from "~/utils/constants";
import axiosInstance from "~/config/axios";

const protectedPaths = [
  "/profile",
  "/previous-bookings",
  "/receipts",
  "/complete-profile",
  "/admin",
];
const externalPaths = ["/booking"];

const authPaths = {
  signin: "/signin",
  completeProfile: "/complete-profile",
};

const cache: {
  user: User | null;
} = {
  user: null,
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
        Authorization: `Bearer ${token}`,
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

    const isProtectedPath = protectedPaths.some((path) => pathname.startsWith(path));
    const isExternalPath = externalPaths.some((path) => pathname.startsWith(path));

    if (!isProtectedPath && !isExternalPath) {
      return next(req, _next);
    }

    if (isProtectedPath && !session) {
      return redirect({ req, pathname: authPaths.signin, origin: pathname });
    }

    if (req.nextUrl.pathname === "/api/users/me") {
      return NextResponse.next();
    }

    cache.user = await getUserBySessionToken(session);

    if (isProtectedPath && !cache.user) {
      return redirect({ req, pathname: authPaths.signin, origin: pathname });
    }

    if (cache.user && !cache.user.complete_profile && pathname !== authPaths.completeProfile) {
      return redirect({ req, pathname: authPaths.completeProfile, origin: pathname });
    }

    if (pathname === authPaths.completeProfile && cache.user?.complete_profile) {
      return redirect({ req, pathname: "/booking" });
    }

    if (pathname.startsWith("/admin") && cache.user?.type !== "admin") {
      return redirect({ req, pathname: "/404" });
    }

    return next(req, _next);
  };
};
