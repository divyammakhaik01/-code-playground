import { io } from "socket.io-client";

export const init_socket = async () => {
  const options = {
    "force new connection ": true,
    reconnectionAttempt: "Infinity",
    timeout: 100000,
    transports: ["websocket"],
  };

  //   return instance of socket client
  return io("http://localhost:3031", options);
};
