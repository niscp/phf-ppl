import React from "react";
import ReactDOM from "react-dom/client";
import FixturesPage from "../app/fixtures-page";
import "../app/globals.css";
import "../app/auction.css";
import "../app/site-navigation.css";
import "../app/match-rules.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><FixturesPage /></React.StrictMode>);
