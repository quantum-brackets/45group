import { NextFetchEvent, NextMiddleware, type NextRequest } from "next/server";
import globalErrors from "./global-errors";
import { NextMiddlewareResult } from "next/dist/server/web/types";

const catchAsync = (
  fn:
    | ((req: NextRequest) => Promise<any>)
    | ((req: NextRequest, _next: NextFetchEvent) => Promise<NextMiddlewareResult>)
) => {
  return async (req: NextRequest, next: NextFetchEvent) => {
    try {
      return await fn(req, next);
    } catch (error) {
      return globalErrors(error);
    }
  };
};

export default catchAsync;
