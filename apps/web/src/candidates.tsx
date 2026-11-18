import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { CandidateManagementPage } from "./features/employer/candidates/pages/CandidateManagementPage";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CandidateManagementPage />
  </StrictMode>,
);
