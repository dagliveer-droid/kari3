// frontend/src/socket.js
import { io } from "socket.io-client";

const URL = import.meta.env.DEV
  ? "http://localhost:3000"
  : import.meta.env.VITE_SOCKET_URL || window.location.origin;

export const socket = io(URL, { autoConnect: false });
