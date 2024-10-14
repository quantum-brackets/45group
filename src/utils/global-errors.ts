import { ErrorResponse } from "resend";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import * as Yup from "yup";
import { appError } from "./helpers";

function globalErrors(error: any) {
  console.error(error, "In global error");
  //? Create mini functions that handle errors

  if (error instanceof Yup.ValidationError) {
    const formattedErrors = error.inner.map((err) => ({
      field: err.path,
      message: err.message,
    }));

    return appError({
      errors: formattedErrors,
      status: 400,
    });
  }

  if (error && (error as ErrorResponse & { statusCode: number }).statusCode) {
    return appError({
      status: 500,
      error: error.message,
    });
  }

  if (error instanceof JsonWebTokenError) {
    return appError({
      status: 401,
      error: "Invalid Token",
    });
  }

  if (error instanceof TokenExpiredError) {
    return appError({
      status: 401,
      error: "Token has expired",
    });
  }

  return appError({
    status: 500,
    error: "Internal server error",
  });
}

export default globalErrors;
