import * as Yup from "yup";

class YupValidation {
  static validateFiles({
    requiredMessage = "`file` is required",
    allowedFormats = ["image/jpeg", "image/png", "image/jpg"],
    fileSizeMessage = "File must be less than 5MB",
    maxSize = 5 * 1024 * 1024,
  } = {}) {
    return Yup.array().of(
      Yup.mixed<File>()
        .required(requiredMessage)
        .test("fileType", `Each file must be a valid ${allowedFormats.join(", ")}`, (value) => {
          if (!value) return false;
          return allowedFormats.includes(value.type);
        })
        .test("fileSize", fileSizeMessage, (value) => {
          if (!value) return false;
          return value.size <= maxSize;
        })
    );
  }

  static validateSingleFile({
    required = true,
    requiredMessage = "`file` is required",
    allowedFormats = ["image/jpeg", "image/png", "image/jpg"],
    fileSizeMessage = "File must be less than 5MB",
    maxSize = 5 * 1024 * 1024,
  } = {}) {
    let schema = Yup.mixed<File>();

    if (required) {
      schema = schema.required(requiredMessage);
    } else {
      schema = schema.optional();
    }

    return schema
      .test("fileType", `Each file must be a valid ${allowedFormats.join(", ")}`, (value) => {
        if (!value) return !required;
        return allowedFormats.includes(value.type);
      })
      .test("fileSize", fileSizeMessage, (value) => {
        if (!value) return !required;
        return value.size <= maxSize;
      });
  }
}

export default YupValidation;
