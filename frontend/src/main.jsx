import React from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import { App } from "./App.jsx";
import { NotificationWatcher } from "./NotificationWatcher.jsx";
import "./styles.css";
import "./notificationWatcher.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <NotificationWatcher />
  </React.StrictMode>
);
