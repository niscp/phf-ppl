import React from "react";
import ReactDOM from "react-dom/client";
import TournamentStatsPage from "../app/tournament-stats-page";
import "../app/globals.css";
import "../app/site-navigation.css";
import "../app/season-hub-pages.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><TournamentStatsPage /></React.StrictMode>);
