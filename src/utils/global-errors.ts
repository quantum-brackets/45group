import { isAxiosError } from "axios";
import { ErrorResponse } from "resend";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { captureException } from "@sentry/nextjs";
import * as Yup from "yup";
import { appError } from "./helpers";

function globalErrors(error: any) {
  if (process.env.NODE_ENV === "development") console.log(error);

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
    const compositeRegex = /Key \((.*?)\)=\((.*?)\) already exists\./;
    const match = error.detail.match(compositeRegex);

    if (match) {
      const fields: string[] = match[1].split(", ").map((field: string) => field.trim());
      const values: string[] = match[2].split(", ").map((value: string) => value.trim());

      if (fields.length > 1) {
        const readableFields = fields.join(", ");
        const readableValues = values.join(", ");

        return appError({
          status: 409,
          errors: [
            {
              field: fields,
              message: `A record with ${readableFields} (${readableValues}) already exists`,
            },
          ],
        });
      }

      return appError({
        status: 409,
        errors: [
          {
            field: fields[0],
            message: `${fields[0]} "${values[0]}" already exists`,
          },
        ],
      });
    }
  }

  if (error instanceof SyntaxError && error.message.includes("Unexpected end of JSON input")) {
    return appError({
      status: 400,
      error: "Malformed JSON input",
    });
  }

  if (process.env.NODE_ENV === "development") {
    return appError({
      status: 500,
      error,
    });
  }

  process.env.NODE_ENV === "production" && console.error(error);
  captureException(error);
  return appError({
    status: 500,
    error: "Internal server error",
  });
}

export default globalErrors;
