import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app.tsx";
import "./main.css";

const root = document.getElementById("root");

if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
} else {
  throw new Error(
    "Could not find container element with id 'root' in index.html",
  );
}
