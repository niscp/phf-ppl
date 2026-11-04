import React from "react";
import ReactDOM from "react-dom/client";
import FanPage from "../app/fan-activity";
import SiteHeader from "../app/site-header";
import "../app/globals.css";
import "../app/site-navigation.css";
import "../app/fan-activity.css";

function FanPageWithNav() {
  return <><SiteHeader active="fan"/><FanPage/></>;
}

ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><FanPageWithNav/></React.StrictMode>);
