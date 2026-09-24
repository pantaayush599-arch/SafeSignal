import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { IdentityProvider } from "./state/identity";
import { ThemeProvider } from "./state/theme";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <IdentityProvider>
          <App />
        </IdentityProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);

