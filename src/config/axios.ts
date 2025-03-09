import axios from "axios";
import { getCookie } from "~/app/_actions/util";
import { SESSION_KEY } from "~/utils/constants";

// const httpsAgent = new https.Agent({
//   rejectUnauthorized: false, // Ignore certificate validation
// });

const axiosInstance = axios.create({
  // baseURL: process.env.BASE_URL,
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
  baseURL: process.env.BASE_URL,
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
//     try {
//       if (!config.headers.Authorization) {
//         const session = await getCookie(SESSION_KEY);
//         if (!session) {
//           return config;
//         }

//         if (!session) throw new Error("Session not found");

//         config.headers.Authorization = `Bearer ${session}`;
//         axiosPrivate.defaults.headers.common["Authorization"] = "Bearer " + session;
//       }
//     } catch (error) {
//       return Promise.reject(error);
//     }

//     return config;
//   },
//   (error) => Promise.reject(error)
// );

axiosPrivate.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error?.response?.status;

    // if (status === 401) {
    //   // const refreshToken = await getCookie(JWT_KEY);

    //   // if (!refreshToken) {
    //   //   return Promise.reject(error);
    //   // }

    //   // try {
    //   //   const { access, refresh } = await AuthService.refreshJwt({
    //   //     refresh: refreshToken,
    //   //   });

    //   //   if (access && refresh) {
    //   //     axiosPrivate.defaults.headers.common["Authorization"] = "Bearer " + access;
    //   //     await setCookie(JWT_KEY, refresh);
    //   //   }
    //   // } catch (error) {
    //   //   if (isAxiosError(error)) {
    //   //     if (error.response?.status === 401) {
    //   //       await deleteCookie(JWT_KEY);
    //   //     }
    //   //   }
    //   // }

    //   return axiosPrivate.request(error?.config);
    // }

    return Promise.reject(error);
  }
);

export default axiosInstance;
