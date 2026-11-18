import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RoleProtectedLayout } from "./features/navigation/RoleProtectedLayout";
import { AdminWorkspacePage } from "./features/admin/pages/AdminWorkspacePage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RoleProtectedLayout requiredRole="admin">
      <AdminWorkspacePage />
    </RoleProtectedLayout>
  </StrictMode>,
);
