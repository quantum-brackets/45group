"use client";

import { MenuItem, Typography } from "@mui/material";
import { Formik } from "formik";
import BackButton from "~/components/back-button";
import FormField from "~/components/fields/form-field";
import SelectField from "~/components/fields/select-field";

export default function CreateResource() {
  return (
    <div className="flex flex-col gap-4">
      <header>
        <BackButton href="/resources" text="Back to Resources" />
      </header>
      <main className="flex flex-col gap-6">
        <Typography variant="h1">Create Resource</Typography>
        <Formik initialValues={{}} onSubmit={async () => {}} validateOnBlur={false}>
          {({ handleSubmit }) => (
            <form method="POST" onSubmit={handleSubmit} className="flex flex-col gap-8">
              <div className="grid grid-cols-2 gap-8 tablet:grid-cols-1">
                <div className="grid grid-cols-2 gap-4">
                  <FormField name="name" label="Name" required placeholder="Enter a name" />
                  <FormField
                    name="location"
                    label="Location"
                    required
                    placeholder="Enter a short location"
                  />
                  <FormField
                    name="address"
                    label="Address"
                    required
                    placeholder="Enter a detailed address"
                    multiline
                    rows={5}
                    wrapperClassName="col-span-2"
                  />
                  <FormField
                    name="description"
                    label="Description"
                    required
                    placeholder="Enter a description"
                    multiline
                    rows={5}
                    wrapperClassName="col-span-2"
                  />
                  <SelectField
                    label="Type of resource"
                    required
                    name="type"
                    placeholder="Choose a type of resource"
                  >
                    <MenuItem value={"lodge"}>Lodge</MenuItem>
                    <MenuItem value={"event"}>Event</MenuItem>
                    <MenuItem value={"restaurant"}>Restaurant</MenuItem>
                  </SelectField>
                </div>
                <div className="flex flex-col gap-8">
                  <div className="flex flex-col gap-4 rounded-md border bg-zinc-50 p-4">
                    <header className="flex flex-col gap-1">
                      <h5 className="text-sm">Thumbnail</h5>
                      <p className="text-xs text-zinc-500">Used to represent your resource.</p>
                    </header>
                    <main className="flex min-h-20 cursor-pointer items-center justify-center rounded border border-dashed bg-white p-6 hover:border-primary">
                      <small className="text-xs text-zinc-600">
                        Drop your images here, or{" "}
                        <span className="text-primary">click to browse</span>. Maximum file size:
                        5MB.
                      </small>
                    </main>
                  </div>
                  <div className="flex flex-col gap-4 rounded-md border bg-zinc-50 p-4">
                    <header className="flex flex-col gap-1">
                      <h5 className="text-sm">Media</h5>
                      <p className="text-xs text-zinc-500">Add images of resource.</p>
                    </header>
                    <main className="flex min-h-20 cursor-pointer items-center justify-center rounded border border-dashed bg-white p-6 hover:border-primary">
                      <small className="text-xs text-zinc-600">
                        Drop your images here, or{" "}
                        <span className="text-primary">click to browse</span>. Maximum file size:
                        5MB each.
                      </small>
                    </main>
                  </div>
                </div>
              </div>
            </form>
          )}
        </Formik>
      </main>
    </div>
  );
}
