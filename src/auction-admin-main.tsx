import React from "react";
import ReactDOM from "react-dom/client";
import AuctionPage from "../app/auction-page";
import "../app/globals.css";
import "../app/auction.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><AuctionPage admin /></React.StrictMode>,
);
