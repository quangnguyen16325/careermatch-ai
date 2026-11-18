import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RoleProtectedLayout } from "./features/navigation/RoleProtectedLayout";
import { CandidateManagementPage } from "./features/employer/candidates/pages/CandidateManagementPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RoleProtectedLayout requiredRole="employer">
      <CandidateManagementPage />
    </RoleProtectedLayout>
  </StrictMode>,
);
