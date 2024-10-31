import axios from "axios";
import { getCookie } from "~/app/_actions/util";
import { HEADER_AUTHORISATION_KEY, SESSION_KEY } from "~/utils/constants";
import { authHeader } from "~/utils/helpers";

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
      if (!config.headers[HEADER_AUTHORISATION_KEY]) {
        const session = await getCookie(SESSION_KEY);
        if (!session) {
          return config;
        }

        const authHeaderValue = authHeader(session);
        config.headers[HEADER_AUTHORISATION_KEY] = authHeaderValue;
        axiosPrivate.defaults.headers.common[HEADER_AUTHORISATION_KEY] = authHeaderValue;
      }
    } catch (error) {
      return Promise.reject(error);
    }

    return config;
  },
);

export default axiosInstance;
