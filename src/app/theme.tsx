"use client";

import { createTheme } from "@mui/material/styles";
import { MdOutlineRadioButtonUnchecked } from "react-icons/md";
import { MdOutlineRadioButtonChecked } from "react-icons/md";
import { merriweather } from "~/utils/fonts";

const theme = createTheme({
  palette: {
    primary: {
      main: "#d34c23",
      50: "#fdf5ef",
      100: "#fbe8d9",
      200: "#f5cfb3",
      300: "#efae82",
      400: "#e8834f",
      500: "#e15e26",
      600: "#d34c23",
      700: "#b0391e",
      800: "#8c2f20",
      900: "#71291d",
    },
    secondary: {
      main: "#2aa148",
      50: "#f2fbf4",
      100: "#e0f8e5",
      200: "#c2f0cd",
      300: "#92e3a6",
      400: "#5bcd78",
      500: "#35b254",
      600: "#2aa148",
      700: "#217436",
      800: "#1f5c2f",
      900: "#1b4c29",
    },
    info: {
      main: "#52525b",
      50: "#fafafa",
      100: "#f4f4f5",
      200: "#e4e4e7",
      300: "#d4d4d8",
      400: "#a1a1aa",
      500: "#71717a",
      600: "#52525b",
      700: "#3f3f46",
      800: "#27272a",
      900: "#18181b",
    },
  },
  typography: {
    fontFamily: merriweather.style.fontFamily,
  },
  components: {
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: "6px",
          "& input": {
            padding: "12px 14px 12px 10px",
            fontSize: "0.8rem",
          },
          "&:hover:not(.Mui-focused) .MuiOutlinedInput-notchedOutline": {
            borderColor: "#78716c",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderWidth: "1px",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: "0 4px 8px 0 rgb(0 0 0 / 0.1)",
          marginTop: "4px",
          borderRadius: "4px",
          "& .MuiMenu-list": {
            padding: "0px",
            "& .MuiMenuItem-root": {
              paddingTop: "8px",
              paddingBottom: "8px",
              fontSize: "0.8rem",
              "&.Mui-selected": {
                transition: "all",
                color: "var(--primary)",
              },
            },
          },
        },
      },
    },
    MuiRadio: {
      defaultProps: {
        size: "medium",
        color: "primary",
        icon: <MdOutlineRadioButtonUnchecked />,
        checkedIcon: <MdOutlineRadioButtonChecked />,
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontWeight: 700,
          padding: 0,
          fontSize: "1rem",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        root: {
          "& .MuiDialog-paper": {
            padding: "16px",
            minWidth: "450px",
            maxWidth: "500px",
            "@media (max-width: 500px)": {
              minWidth: "auto",
            },
            "@media (max-width: 425px)": {
              marginLeft: "16px",
              marginRight: "16px",
              width: "100%",
            },
          },
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "8px 0px 12px !important",
        },
      },
    },
    MuiDialogContentText: {
      styleOverrides: {
        root: {
          fontSize: "0.8rem",
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          padding: 0,
          paddingTop: "12px",
          gap: "8px",
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        outlined: {
          borderWidth: "1.5px !important",
        },
        outlinedPrimary: {
          borderColor: "var(--primary) !important",
        },
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          marginTop: "0px",
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-input": {
            padding: "10px 14px 10px 10px",
            fontSize: "0.8rem",
          },
        },
      },
    },
    MuiPopover: {
      styleOverrides: {
        root: {
          "& .MuiFormControlLabel-label": {
            fontSize: "0.8rem",
          },
        },
      },
    },
  },
});

export default theme;
