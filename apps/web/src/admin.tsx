import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AdminWorkspacePage } from "./features/admin/pages/AdminWorkspacePage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AdminWorkspacePage />
  </StrictMode>,
);
