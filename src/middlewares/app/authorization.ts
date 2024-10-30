import { NextFetchEvent, NextRequest, NextResponse } from "next/server";
import { MiddlewareFactory } from "../stack-middlewares";
import { SESSION_KEY } from "~/utils/constants";
import UsersService from "~/services/users";
import axiosInstance from "~/config/axios";

const protectedPaths = ["/profile", "/previous-bookings", "/receipts"];
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

async function getMe(jwt: string | undefined): Promise<User | null> {
  if (!jwt) return null;

  try {
    const { data: user } = await axiosInstance.get<User>("/api/users/me", {
      headers: {
        Authorization: `Bearer ${jwt}`,
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

    const user = await getMe(session);

    if (isProtectedPath && !user) {
      return redirect({ req, pathname: authPaths.signin, origin: pathname });
    }

    if (user && !user.complete_profile) {
      return redirect({ req, pathname: authPaths.completeProfile, origin: pathname });
    }

    return next(req, _next);
  };
};
