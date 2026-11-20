const companyVerificationStatuses = [
  "PENDING",
  "VERIFIED",
  "REJECTED",
] as const;

type CompanyVerificationStatus = (typeof companyVerificationStatuses)[number];

type CompanyApiProfile = {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  location: string | null;
  taxCode: string | null;
  verificationStatus: CompanyVerificationStatus;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CreateCompanyRequest = {
  name: string;
  description?: string;
  website?: string;
  location?: string;
  taxCode?: string;
};

type UpdateCompanyRequest = {
  name?: string;
  description?: string | null;
  website?: string | null;
  location?: string | null;
  taxCode?: string | null;
};

type CompanyProfileFormValues = {
  name: string;
  description: string;
  website: string;
  location: string;
  taxCode: string;
};

type CompanyProfileField = keyof CompanyProfileFormValues;
type CompanyProfileFieldErrors = Partial<Record<CompanyProfileField, string>>;

type CompanyApiFailurePresentation = {
  message: string;
  fieldErrors: CompanyProfileFieldErrors;
};

type CompanyApiFailure = {
  status: number;
  code?: string;
  message: string;
  details: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeCompanyApiFailure(
  status: number,
  payload: unknown,
): CompanyApiFailure {
  const body = isRecord(payload) ? payload : {};
  const rawMessage = body.message;
  const details = Array.isArray(rawMessage)
    ? rawMessage.filter((item): item is string => typeof item === "string")
    : [];
  const message =
    typeof rawMessage === "string"
      ? rawMessage
      : details.length > 0
        ? details.join(" ")
        : "Company request failed.";

  return {
    status,
    ...(typeof body.code === "string" ? { code: body.code } : {}),
    message,
    details,
  };
}

function getCompanyVerificationLabel(
  status: CompanyVerificationStatus,
): string {
  switch (status) {
    case "PENDING":
      return "Pending verification";
    case "VERIFIED":
      return "Verified";
    case "REJECTED":
      return "Rejected";
  }
}

function toCompanyProfileRequest(
  mode: "create" | "update",
  values: CompanyProfileFormValues,
): CreateCompanyRequest | UpdateCompanyRequest {
  const name = values.name.trim();
  const optionalValues = {
    description: values.description.trim(),
    website: values.website.trim(),
    location: values.location.trim(),
    taxCode: values.taxCode.trim(),
  };

  if (mode === "create") {
    return {
      name,
      ...(optionalValues.description
        ? { description: optionalValues.description }
        : {}),
      ...(optionalValues.website ? { website: optionalValues.website } : {}),
      ...(optionalValues.location ? { location: optionalValues.location } : {}),
      ...(optionalValues.taxCode ? { taxCode: optionalValues.taxCode } : {}),
    };
  }

  return {
    ...(name ? { name } : {}),
    description: optionalValues.description || null,
    website: optionalValues.website || null,
    location: optionalValues.location || null,
    taxCode: optionalValues.taxCode || null,
  };
}

function validateCompanyProfileForm(
  mode: "create" | "update",
  values: CompanyProfileFormValues,
): CompanyProfileFieldErrors {
  const errors: CompanyProfileFieldErrors = {};
  const name = values.name.trim();
  const description = values.description.trim();
  const website = values.website.trim();
  const location = values.location.trim();
  const taxCode = values.taxCode.trim();

  if (mode === "create" && !name) {
    errors.name = "Tên doanh nghiệp là bắt buộc khi tạo hồ sơ.";
  } else if (name && (name.length < 2 || name.length > 255)) {
    errors.name = "Tên doanh nghiệp phải có từ 2 đến 255 ký tự.";
  }
  if (description.length > 5000) {
    errors.description = "Mô tả không được vượt quá 5000 ký tự.";
  }
  if (website.length > 255) {
    errors.website = "Website không được vượt quá 255 ký tự.";
  }
  if (location.length > 255) {
    errors.location = "Địa điểm không được vượt quá 255 ký tự.";
  }
  if (taxCode && (taxCode.length < 6 || taxCode.length > 50)) {
    errors.taxCode = "Mã số thuế phải có từ 6 đến 50 ký tự nếu được cung cấp.";
  }

  return errors;
}

function getCompanyApiFailurePresentation(
  failure: CompanyApiFailure,
): CompanyApiFailurePresentation {
  const fieldErrors: CompanyProfileFieldErrors = {};
  for (const detail of failure.details) {
    const normalized = detail.toLowerCase();
    if (normalized.includes("name ") || normalized.startsWith("name")) {
      fieldErrors.name =
        "Tên doanh nghiệp chưa hợp lệ. Hãy kiểm tra độ dài từ 2 đến 255 ký tự.";
    } else if (normalized.includes("description")) {
      fieldErrors.description = "Mô tả chưa hợp lệ hoặc vượt quá 5000 ký tự.";
    } else if (normalized.includes("website")) {
      fieldErrors.website = "Website chưa hợp lệ hoặc vượt quá 255 ký tự.";
    } else if (normalized.includes("location")) {
      fieldErrors.location = "Địa điểm chưa hợp lệ hoặc vượt quá 255 ký tự.";
    } else if (
      normalized.includes("taxcode") ||
      normalized.includes("tax code")
    ) {
      fieldErrors.taxCode =
        "Mã số thuế phải có từ 6 đến 50 ký tự nếu được cung cấp.";
    }
  }

  if (failure.status === 0) {
    return {
      message:
        "Không thể kết nối máy chủ. Vui lòng kiểm tra kết nối và thử lại.",
      fieldErrors,
    };
  }
  if (failure.status === 401) {
    return {
      message:
        "Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.",
      fieldErrors,
    };
  }
  if (failure.status === 403) {
    return {
      message:
        "Tài khoản hiện tại không có quyền quản lý hồ sơ doanh nghiệp này.",
      fieldErrors,
    };
  }
  if (failure.status === 404) {
    if (failure.code === "EMPLOYER_PROFILE_NOT_FOUND") {
      return {
        message: "Tài khoản Employer chưa có hồ sơ nhà tuyển dụng liên kết.",
        fieldErrors,
      };
    }
    if (failure.code === "COMPANY_NOT_FOUND") {
      return {
        message: "Không tìm thấy hồ sơ doanh nghiệp liên kết với tài khoản.",
        fieldErrors,
      };
    }
    return {
      message: "Không tìm thấy tài nguyên doanh nghiệp được yêu cầu.",
      fieldErrors,
    };
  }
  if (failure.status === 409) {
    const conflictMessages: Record<string, string> = {
      COMPANY_ALREADY_EXISTS: "Tài khoản đã có hồ sơ doanh nghiệp liên kết.",
      TAX_CODE_EXISTS: "Mã số thuế này đã được đăng ký cho doanh nghiệp khác.",
      COMPANY_STATE_CHANGED:
        "Trạng thái hồ sơ đã thay đổi. Hãy tải lại dữ liệu trước khi sửa.",
    };
    return {
      message: failure.code
        ? (conflictMessages[failure.code] ??
          "Dữ liệu hồ sơ đang xung đột. Vui lòng tải lại và thử lại.")
        : "Dữ liệu hồ sơ đang xung đột. Vui lòng tải lại và thử lại.",
      fieldErrors,
    };
  }
  if (failure.status === 400) {
    return {
      message:
        Object.keys(fieldErrors).length > 0
          ? "Một số thông tin chưa hợp lệ. Hãy kiểm tra các trường được đánh dấu."
          : "Yêu cầu chưa hợp lệ. Vui lòng kiểm tra lại thông tin hồ sơ.",
      fieldErrors,
    };
  }
  if (failure.status >= 500) {
    return {
      message: "Máy chủ đang gặp sự cố. Dữ liệu chưa được xác nhận là đã lưu.",
      fieldErrors,
    };
  }
  return {
    message: "Không thể xử lý yêu cầu hồ sơ doanh nghiệp. Vui lòng thử lại.",
    fieldErrors,
  };
}

export {
  companyVerificationStatuses,
  getCompanyVerificationLabel,
  getCompanyApiFailurePresentation,
  normalizeCompanyApiFailure,
  toCompanyProfileRequest,
  validateCompanyProfileForm,
};
export type {
  CompanyApiFailure,
  CompanyApiProfile,
  CompanyProfileFormValues,
  CompanyProfileFieldErrors,
  CompanyVerificationStatus,
  CreateCompanyRequest,
  UpdateCompanyRequest,
};
