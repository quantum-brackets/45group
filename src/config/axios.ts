import axios from "axios";
import { getCookie } from "~/app/_actions/util";
import AuthService from "~/services/auth";
import { JWT_KEY } from "~/utils/constants";

const axiosInstance = axios.create({
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

axiosPrivate.interceptors.request.use(
  async (config) => {
    try {
      if (!config.headers.Authorization) {
        const refreshToken = await getCookie(JWT_KEY);

        if (!refreshToken) {
          return config;
        }

        const { access, refresh } = await AuthService.refreshJwt({
          refresh: refreshToken,
        });

        if (access && refresh) {
          config.headers.Authorization = `Bearer ${access}`;
          axiosPrivate.defaults.headers.common["Authorization"] = "Bearer " + access;
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// axiosPrivate.interceptors.response.use(
//   (response) => response,
//   async (error: AxiosError) => {
//     const originalRequest = error?.config;

//     if (!originalRequest) {
//       return Promise.reject(error);
//     }

//     const status = error?.response?.status;

//     if (status === 401) {
//       const token = await getValueFromCookie(JWT_KEY);

//       console.log(token);

//       if (token) {
//         axiosPrivate.defaults.headers.common["Authorization"] = "Bearer " + token;
//       }

//       return axiosPrivate.request(error.config);
//     }
//     return Promise.reject(error);
//   }
// );

export default axiosInstance;
