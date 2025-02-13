"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { DialogActions, DialogContent, DialogTitle, MenuItem } from "@mui/material";
import { Formik } from "formik";
import * as Yup from "yup";
import { FiFilter } from "react-icons/fi";
import Modal from "~/components/modal";
import Button from "~/components/button";
import { useCustomSearchParams } from "~/hooks/utils";
import statesData from "~/data/states.json";
import SelectField from "~/components/fields/select-field";

type InitialValues = {
  state: string;
  minDate: string;
  maxDate: string;
  city: string;
  _cities?: string[];
};

const validationSchema = Yup.object({
  state: Yup.string().optional(),
  city: Yup.string().optional(),
  minDate: Yup.string().optional(),
  maxDate: Yup.string().optional(),
});

export default function LocationFilter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isModalOpen, setModalOpen] = useState(false);

  const { state, city, minDate, maxDate } = useCustomSearchParams([
    "state",
    "city",
    "minDate",
    "maxDate",
  ]);

  const handleClose = () => setModalOpen(false);
  const handleOpen = () => setModalOpen(true);

  return (
    <>
      <Button className="gap-3" variant="outlined" color="info" onClick={handleOpen}>
        <FiFilter aria-hidden="true" /> <span>Filters</span>
      </Button>
      <Modal
        open={isModalOpen}
        onClose={handleClose}
        exitIcon={{
          display: true,
        }}
        aria-labelledby="filter-dialog-title"
        aria-describedby="filter-dialog-description"
      >
        <header className="mb-2">
          <DialogTitle id="filter-dialog-title">Filters</DialogTitle>
          <small id="filter-dialog-description">
            Select your filtering criteria to narrow down the results
          </small>
        </header>
        <Formik
          initialValues={
            {
              state,
              city,
              maxDate,
              minDate,
              _cities: statesData.find(({ state: _state }) => _state === state)?.cities,
            } as InitialValues
          }
          onSubmit={({ _cities: _, ...values }) => {
            const params = new URLSearchParams(searchParams);
            for (const [key, value] of Object.entries(values)) {
              if (value) params.set(key, value);
            }
            window.history.replaceState(null, "", `${pathname}?${params.toString()}`);
            handleClose();
          }}
          enableReinitialize
          validationSchema={validationSchema}
        >
          {({ handleSubmit, isSubmitting, setFieldValue, values }) => (
            <form onSubmit={handleSubmit}>
              <DialogContent>
                <div className="grid grid-cols-2 gap-4">
                  <SelectField label="State" name="state" placeholder="Choose a state">
                    {statesData.map(({ state, cities }, index) => (
                      <MenuItem
                        value={state}
                        key={index}
                        onClick={() => setFieldValue("_cities", cities)}
                      >
                        {state}
                      </MenuItem>
                    ))}
                  </SelectField>
                  <SelectField
                    label="City"
                    name="city"
                    placeholder="Choose a city"
                    emptyStateText="State has not been selected."
                  >
                    {values._cities &&
                      values._cities.map((city, index) => (
                        <MenuItem value={city} key={index}>
                          {city}
                        </MenuItem>
                      ))}
                  </SelectField>
                </div>
              </DialogContent>
              <DialogActions>
                <Button type="button" variant="outlined" onClick={handleClose}>
                  Cancel
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Submit
                </Button>
              </DialogActions>
            </form>
          )}
        </Formik>
      </Modal>
    </>
  );
}
