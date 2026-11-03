import React from "react";
import ReactDOM from "react-dom/client";
import BidHistoryPage from "../app/bid-history-page";
import "../app/globals.css";
import "../app/auction.css";
import "../app/bid-history.css";
import "../app/site-navigation.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><BidHistoryPage /></React.StrictMode>,
);
