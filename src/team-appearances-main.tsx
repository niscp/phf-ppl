import React from "react";
import ReactDOM from "react-dom/client";
import TeamAppearancesPage from "../app/team-appearances-page";
import "../app/globals.css";
import "../app/site-navigation.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><TeamAppearancesPage /></React.StrictMode>,
);
