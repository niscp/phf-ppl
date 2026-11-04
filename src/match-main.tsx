import React from "react";
import ReactDOM from "react-dom/client";
import MatchDetailsPage from "../app/match-page";
import "../app/globals.css";
import "../app/auction.css";
import "../app/auction-live.css";
import "../app/site-navigation.css";
import "../app/match-details.css";
import "../app/match-analysis.css";
import "../app/match2-analysis.css";
import "../app/match-rules.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><MatchDetailsPage /></React.StrictMode>,
);
