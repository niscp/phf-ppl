import React from "react";
import ReactDOM from "react-dom/client";
import { TeamsPage } from "../app/auction-page";
import "../app/globals.css";
import "../app/auction.css";
import "../app/auction-live.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><TeamsPage /></React.StrictMode>,
);
