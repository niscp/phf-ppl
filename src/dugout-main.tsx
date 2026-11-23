import React from "react";
import ReactDOM from "react-dom/client";
import DugoutPage from "../app/dugout-page";
import SiteHeader from "../app/site-header";
import "../app/globals.css";
import "../app/site-navigation.css";
import "../app/fan-activity.css";
import "../app/dugout.css";

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><><SiteHeader active="dugout"/><DugoutPage/></></React.StrictMode>);
