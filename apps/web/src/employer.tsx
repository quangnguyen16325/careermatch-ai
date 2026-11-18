import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { EmployerCompanyJobsPage } from "./features/employer/pages/EmployerCompanyJobsPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EmployerCompanyJobsPage />
  </StrictMode>,
);
