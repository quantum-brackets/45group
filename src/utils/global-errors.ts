import { NextResponse } from "next/server";
import * as Yup from "yup";

function globalErrors(error: any) {
  console.error(error);
  //? Create mini functions that handle errors

  if (error instanceof Yup.ValidationError) {
    const formattedErrors = error.inner.map((err) => ({
      field: err.path,
      message: err.message,
    }));

    return NextResponse.json(
      {
        success: false,
        errors: formattedErrors,
      },
      {
        status: 400,
      }
    );
  }

  return NextResponse.json(
    {
      success: false,
    },
    {
      status: 500,
    }
  );
}

export default globalErrors;
