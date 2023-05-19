import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import {
  BrowserCacheLocation,
  Configuration,
  PublicClientApplication,
} from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// MSAL configuration
const configuration: Configuration = {
  auth: {
    clientId: "b2787263-b02a-4229-8226-0253310339ee",
    authority:
      "https://devoio.b2clogin.com/devoio.onmicrosoft.com/b2c_1a_needchangepasswordcustompolicy",
    knownAuthorities: ["devoio.b2clogin.com"],
  },
  cache: {
    cacheLocation: BrowserCacheLocation.SessionStorage,
  },
  system: {
    tokenRenewalOffsetSeconds: 60, // default is 300
  },
};

const pca = new PublicClientApplication(configuration);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MsalProvider instance={pca}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </MsalProvider>
  </React.StrictMode>
);
