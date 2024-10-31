import { NextFetchEvent, NextRequest } from "next/server";
import { MiddlewareFactory } from "../stack-middlewares";
import catchAsync from "~/utils/catch-async";

export const authorization: MiddlewareFactory = (next) => {
  return catchAsync(async (req: NextRequest, _next: NextFetchEvent) => {
    return next(req, _next);
  });
};
