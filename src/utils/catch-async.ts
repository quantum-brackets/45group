import { type NextRequest } from "next/server";
import globalErrors from "./global-errors";

const catchAsync = (fn: (req: NextRequest) => Promise<any>): ((req: NextRequest) => void) => {
  return (req) => fn(req).catch((err: any) => globalErrors(err));
};

export default catchAsync;
