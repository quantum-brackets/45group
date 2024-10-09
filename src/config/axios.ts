import axios, { AxiosError } from "axios";
// import { getValueFromCookie } from "~/app/_actions/jwt";
// import AuthService from "~/services/auth";

const axiosInstance = axios.create({
  headers: {
    common: {
      Accept: "application/json",
    },
    post: {
      "Content-Type": "application/json",
    },
  },
});

export const axiosPrivate = axios.create({
  headers: {
    common: {
      Accept: "application/json",
    },
    post: {
      "Content-Type": "application/json",
    },
  },
});

// axiosPrivate.interceptors.request.use(
//   async (config) => {
//     if (!config.headers.Authorization) {
//       const refreshToken = await getValueFromCookie(JWT_KEY);
//       if (!refreshToken) {
//         return config;
//       }

//       const token = await AuthService.refreshToken({
//         refreshToken,
//       });

//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//         axiosPrivate.defaults.headers.common["Authorization"] = "Bearer " + token;
//       }
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// axiosPrivate.interceptors.response.use(
//   (response) => response,
//   async (error: AxiosError) => {
//     const originalRequest = error?.config;

//     if (!originalRequest) {
//       return Promise.reject(error);
//     }

//     // const status = error?.response?.status;

//     // if (status === 401) {
//     //   const token = await getValueFromCookie(JWT_KEY);

//     //   console.log(token);

//     //   if (token) {
//     //     axiosPrivate.defaults.headers.common["Authorization"] = "Bearer " + token;
//     //   }

//     //   return axiosPrivate.request(error.config);
//     // }
//     return Promise.reject(error);
//   }
// );

export default axiosInstance;
