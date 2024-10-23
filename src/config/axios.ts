import axios from "axios";
import { getCookie, setCookie } from "~/app/_actions/util";
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

        try {
          if (access && refresh) {
            config.headers.Authorization = `Bearer ${access}`;
            axiosPrivate.defaults.headers.common["Authorization"] = "Bearer " + access;
            await setCookie(JWT_KEY, refresh);
          }
        } catch (error) {
          console.log(error, "in request");
        }
      }
    } catch (error) {
      return Promise.reject(error);
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosPrivate.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    const status = error?.response?.status;

    if (status === 401) {
      const refreshToken = await getCookie(JWT_KEY);

      if (!refreshToken) {
        return Promise.reject(error);
      }

      const { access, refresh } = await AuthService.refreshJwt({
        refresh: refreshToken,
      });

      try {
        if (access && refresh) {
          axiosPrivate.defaults.headers.common["Authorization"] = "Bearer " + access;
          await setCookie(JWT_KEY, refresh);
        }
      } catch (error) {
        console.error(error);
      }

      return axiosPrivate.request(error?.config);
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
