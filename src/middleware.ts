import { MiddlewareConfig } from "next/server";
import { stackMiddlewares } from "~/middlewares/stack-middlewares";
import { authorization as apiAuthorization } from "~/middlewares/api/authorization";
import { authorization as appAuthorization } from "~/middlewares/app/authorization";

const middlewares = [apiAuthorization, appAuthorization];

export default stackMiddlewares(middlewares);

// export const config: MiddlewareConfig = {
//   matcher: ["/((?!_next/static|favicon.ico|icon.svg|assets|data|fonts|db).*)"],
// };

export const config: MiddlewareConfig = {
  matcher: [
    // Match all API routes
    "/api/:path*",
    // Match all other routes except static files
    "/((?!api|_next/static|favicon.ico|icon.svg|assets|data|fonts|db).*)",
  ],
};
