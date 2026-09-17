import React from "react";
import ReactDOM from "react-dom/client";
import PlayersPage from "../app/players-page";
import "../app/globals.css";
import "../app/players.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><PlayersPage /></React.StrictMode>,
);
