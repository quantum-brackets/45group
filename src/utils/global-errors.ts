import { isAxiosError } from "axios";
import { ErrorResponse } from "resend";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import * as Yup from "yup";
import { appError } from "./helpers";

function globalErrors(error: any) {
  // console.error(error, "In global error");
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

  if (isAxiosError(error)) {
    return appError({
      status: error.response?.status || 400,
      error: error.response?.data,
    });
  }

  if (error?.code === "23505" && error.detail) {
    const regex = /Key \((\w+)\)=\((.*?)\) already exists\./;
    const match = error.detail.match(regex);

    if (match) {
      return appError({
        status: 409,
        errors: [
          {
            field: match[1],
            message: `"${match[1]}" already exists`,
          },
        ],
      });
    }
  }

  if (process.env.NODE_ENV === "development") {
    return appError({
      status: 500,
      error,
    });
  }

  return appError({
    status: 500,
    error: "Internal server error",
  });
}

export default globalErrors;
