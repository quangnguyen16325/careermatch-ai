import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  CompanyVerificationDecisionDialog,
  CompanyVerificationDetailDialog,
} from "./CompanyVerificationQueuePage";
import type { CompanyVerificationQueueItem } from "../company-verification/types";

const company: CompanyVerificationQueueItem = {
  id: "company-1",
  name: "Example Company",
  description: "A company description",
  website: "https://example.com",
  location: "Hanoi",
  taxCode: "TAX-001",
  verificationStatus: "PENDING",
  verifiedAt: null,
  createdAt: "2026-11-19T00:00:00.000Z",
  updatedAt: "2026-11-19T00:00:00.000Z",
  _count: { jobs: 3, employers: 2 },
};

describe("CompanyVerificationDetailDialog", () => {
  it("renders details for the selected company and an accessible close action", () => {
    const markup = renderToStaticMarkup(
      createElement(CompanyVerificationDetailDialog, {
        company,
        onClose: vi.fn(),
      }),
    );

    expect(markup).toContain("Example Company");
    expect(markup).toContain("PENDING");
    expect(markup).toContain("TAX-001");
    expect(markup).toContain("A company description");
    expect(markup).toContain("Hanoi");
    expect(markup).toContain("https://example.com");
    expect(markup).toContain("Employer accounts");
    expect(markup).toContain(">2</dd>");
    expect(markup).toContain(">3</dd>");
    expect(markup).toContain('aria-label="Close details for Example Company"');
  });

  it("renders absent optional values without inventing company information", () => {
    const markup = renderToStaticMarkup(
      createElement(CompanyVerificationDetailDialog, {
        company: {
          ...company,
          description: null,
          location: null,
          taxCode: null,
          website: null,
        },
        onClose: vi.fn(),
      }),
    );

    expect(markup).toContain("Not provided");
    expect(markup).not.toContain("A company description");
    expect(markup).not.toContain("TAX-001");
  });
});

describe("CompanyVerificationDecisionDialog", () => {
  it("renders an accessible rejection reason field and disabled pending actions", () => {
    const markup = renderToStaticMarkup(
      createElement(CompanyVerificationDecisionDialog, {
        busy: true,
        company,
        error: "Decision failed",
        onCancel: vi.fn(),
        onRefresh: vi.fn(),
        onReasonChange: vi.fn(),
        onSubmit: vi.fn(),
        reason: "Missing document",
        status: "REJECTED",
        validationError: "The reason is too short.",
        canRefresh: true,
      }),
    );

    expect(markup).toContain('role="alertdialog"');
    expect(markup).toContain(
      'aria-labelledby="company-verification-decision-title"',
    );
    expect(markup).toContain('aria-invalid="true"');
    expect(markup).toContain(
      'aria-describedby="company-decision-reason-error"',
    );
    expect(markup).toContain('maxLength="1000"');
    expect(markup).toContain("The reason is too short.");
    expect(markup).toContain("Reload queue");
    expect(markup).toContain("Submitting...");
    expect(markup.match(/disabled=""/g)).toHaveLength(4);
  });
});
