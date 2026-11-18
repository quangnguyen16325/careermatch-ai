import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RoleProtectedLayout } from "./features/navigation/RoleProtectedLayout";
import { EmployerCompanyJobsPage } from "./features/employer/pages/EmployerCompanyJobsPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RoleProtectedLayout requiredRole="employer">
      <EmployerCompanyJobsPage />
    </RoleProtectedLayout>
  </StrictMode>,
);
