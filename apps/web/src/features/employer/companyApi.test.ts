import { describe, expect, it } from "vitest";
import {
  companyVerificationStatuses,
  getCompanyApiFailurePresentation,
  getCompanyVerificationLabel,
  normalizeCompanyApiFailure,
  toCompanyProfileRequest,
  validateCompanyProfileForm,
} from "./companyApi";

describe("company API contract helpers", () => {
  it("matches the backend verification statuses", () => {
    expect(companyVerificationStatuses).toEqual([
      "PENDING",
      "VERIFIED",
      "REJECTED",
    ]);
    expect(
      companyVerificationStatuses.map(getCompanyVerificationLabel),
    ).toEqual(["Pending verification", "Verified", "Rejected"]);
  });

  it("preserves structured backend error codes and messages", () => {
    expect(
      normalizeCompanyApiFailure(409, {
        code: "TAX_CODE_EXISTS",
        message: "A company with this tax code is already registered",
      }),
    ).toEqual({
      status: 409,
      code: "TAX_CODE_EXISTS",
      message: "A company with this tax code is already registered",
      details: [],
    });
  });

  it("normalizes validation message arrays without dropping field details", () => {
    expect(
      normalizeCompanyApiFailure(400, {
        statusCode: 400,
        message: [
          "name must be longer than or equal to 2 characters",
          "website must be a string",
        ],
        error: "Bad Request",
      }),
    ).toEqual({
      status: 400,
      message:
        "name must be longer than or equal to 2 characters website must be a string",
      details: [
        "name must be longer than or equal to 2 characters",
        "website must be a string",
      ],
    });
  });

  it("provides a safe fallback for empty or unstructured failures", () => {
    expect(normalizeCompanyApiFailure(503, null)).toEqual({
      status: 503,
      message: "Company request failed.",
      details: [],
    });
  });

  it("creates a request with only fields supported by the create DTO", () => {
    expect(
      toCompanyProfileRequest("create", {
        name: "  CareerMatch Labs  ",
        description: "  Hiring tools  ",
        website: "",
        location: " Hanoi ",
        taxCode: "0123456789",
      }),
    ).toEqual({
      name: "CareerMatch Labs",
      description: "Hiring tools",
      location: "Hanoi",
      taxCode: "0123456789",
    });
  });

  it("uses nullable update fields to clear values and omits a blank optional name", () => {
    expect(
      toCompanyProfileRequest("update", {
        name: " ",
        description: "",
        website: "https://careermatch.example",
        location: "",
        taxCode: "",
      }),
    ).toEqual({
      description: null,
      website: "https://careermatch.example",
      location: null,
      taxCode: null,
    });
  });

  it("validates required name only on create and accepts DTO boundary values", () => {
    expect(
      validateCompanyProfileForm("create", {
        name: " ",
        description: "",
        website: "",
        location: "",
        taxCode: "",
      }),
    ).toEqual({ name: "Tên doanh nghiệp là bắt buộc khi tạo hồ sơ." });
    expect(
      validateCompanyProfileForm("update", {
        name: " ",
        description: "",
        website: "",
        location: "",
        taxCode: "",
      }),
    ).toEqual({});
    expect(
      validateCompanyProfileForm("create", {
        name: "A ".repeat(127) + "A",
        description: "d".repeat(5000),
        website: "w".repeat(255),
        location: "l".repeat(255),
        taxCode: "1".repeat(50),
      }),
    ).toEqual({});
  });

  it("rejects values outside DTO lengths without imposing a website format rule", () => {
    expect(
      validateCompanyProfileForm("create", {
        name: "A",
        description: "d".repeat(5001),
        website: "not validated as a URL by backend",
        location: "l".repeat(256),
        taxCode: "12345",
      }),
    ).toEqual({
      name: "Tên doanh nghiệp phải có từ 2 đến 255 ký tự.",
      description: "Mô tả không được vượt quá 5000 ký tự.",
      location: "Địa điểm không được vượt quá 255 ký tự.",
      taxCode: "Mã số thuế phải có từ 6 đến 50 ký tự nếu được cung cấp.",
    });
  });

  it("maps backend validation detail to the related field", () => {
    const failure = normalizeCompanyApiFailure(400, {
      message: ["taxCode must be longer than or equal to 6 characters"],
    });
    expect(getCompanyApiFailurePresentation(failure)).toEqual({
      message:
        "Một số thông tin chưa hợp lệ. Hãy kiểm tra các trường được đánh dấu.",
      fieldErrors: {
        taxCode: "Mã số thuế phải có từ 6 đến 50 ký tự nếu được cung cấp.",
      },
    });
  });

  it.each([
    [
      401,
      undefined,
      "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
    ],
    [
      403,
      undefined,
      "Tài khoản hiện tại không có quyền quản lý hồ sơ doanh nghiệp này.",
    ],
    [
      404,
      undefined,
      "Không tìm thấy hồ sơ doanh nghiệp liên kết với tài khoản.",
    ],
    [
      409,
      "TAX_CODE_EXISTS",
      "Mã số thuế này đã được đăng ký cho doanh nghiệp khác.",
    ],
    [
      500,
      undefined,
      "Máy chủ đang gặp sự cố. Dữ liệu chưa được xác nhận là đã lưu.",
    ],
    [
      0,
      undefined,
      "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.",
    ],
  ])(
    "presents HTTP/network failure %s without claiming a save",
    (status, code, message) => {
      expect(
        getCompanyApiFailurePresentation({
          status,
          ...(code ? { code } : {}),
          message: "raw backend message",
          details: [],
        }).message,
      ).toBe(message);
    },
  );
});
