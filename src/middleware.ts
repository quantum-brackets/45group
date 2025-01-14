import { MiddlewareConfig } from "next/server";
import { stackMiddlewares } from "~/middlewares/stack-middlewares";
import { authorization as apiAuthorization } from "~/middlewares/api/authorization";
import { authorization as appAuthorization } from "~/middlewares/app/authorization";
import { pagination } from "./middlewares/app/pagination";

const middlewares = [apiAuthorization, appAuthorization, pagination];

export default stackMiddlewares(middlewares);

export const config: MiddlewareConfig = {
  matcher: ["/api/:path*", "/((?!api|_next/static|favicon.ico|icon.svg|assets|data|fonts|db).*)"],
};
