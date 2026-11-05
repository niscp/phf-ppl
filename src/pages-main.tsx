import React from "react";
import ReactDOM from "react-dom/client";
import Page from "../app/page";
import "../app/globals.css";
import "../app/site-navigation.css";
import "../app/home-hub.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><Page /></React.StrictMode>,
);
