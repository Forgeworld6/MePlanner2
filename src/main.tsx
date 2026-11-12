import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Keep the service worker for the website, but not the native Android app.
if (
  import.meta.env.MODE !== "capacitor" &&
  "serviceWorker" in navigator &&
  import.meta.env.PROD
) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error) => {
      console.error("MePlanner service worker registration failed:", error);
    });
  });
}
