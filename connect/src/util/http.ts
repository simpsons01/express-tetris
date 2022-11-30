import axios from "axios";
import env from "../config/env";

const http = axios.create({
  baseURL: env.API_SERVICE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export default http;
