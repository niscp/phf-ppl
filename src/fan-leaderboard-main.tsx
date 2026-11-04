import React from "react";
import ReactDOM from "react-dom/client";
import { FanLeaderboardPage } from "../app/fan-activity";
import SiteHeader from "../app/site-header";
import "../app/globals.css";
import "../app/site-navigation.css";
import "../app/fan-activity.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><><SiteHeader active="leaderboard"/><FanLeaderboardPage/></></React.StrictMode>);
