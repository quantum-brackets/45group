import { NextFetchEvent, NextMiddleware, type NextRequest } from "next/server";
import globalErrors from "./global-errors";
import { NextMiddlewareResult } from "next/dist/server/web/types";

const catchAsync = (
  fn:
    | ((req: NextRequest) => Promise<any>)
    | ((req: NextRequest, _next: NextFetchEvent) => Promise<NextMiddlewareResult>)
): NextMiddleware => {
  return (req: NextRequest, next: NextFetchEvent) => {
    return fn(req, next).catch((err: any) => globalErrors(err));
  };
};

export default catchAsync;
