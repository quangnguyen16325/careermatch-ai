# Student Use Cases – CareerMatch AI

## 1. Document Information

- Project: CareerMatch AI
- Module: Student
- Issue: CM-049 – Specify Student use cases and exception flows
- Document Type: Use Case Specification
- Version: 1.0

## 2. Actors

| Actor | Description |
|---|---|
| Student | Người sử dụng nền tảng để quản lý hồ sơ, tìm kiếm việc làm và ứng tuyển |
| System | Hệ thống CareerMatch AI |
| AI Service | Dịch vụ hỗ trợ phân tích CV và kỹ năng |

## 3. Use Case Specifications

### UC-ST-09: Upload CV

**Actor:** Student

**Description:** Student uploads a CV to the CareerMatch AI platform for storage and future analysis.

**Preconditions:**
- Student has an authenticated and active account.
- Student has access to the CV management feature.
- Student has a CV file available on their device.

**Trigger:**

Student selects the Upload CV action.

**Main Flow:**

1. Student opens the CV Management page.
2. System displays the CV management interface.
3. Student selects the Upload CV button.
4. System opens the file selection dialog.
5. Student selects a CV file.
6. System validates the file format and file size.
7. System sends the file to the Backend.
8. Backend validates the file and Student ownership.
9. Backend stores the CV securely.
10. Backend returns CV metadata.
11. System displays the uploaded CV in the CV list.

**Alternative Flows:**

- A1: Student cancels the file selection. The system returns to the CV Management page without uploading.
- A2: Student uploads another valid CV. The system processes the new file independently.

**Postconditions:**
- The CV is stored securely.
- CV metadata is available to the Student.
- The CV can be selected for analysis.

**Related Issues:** CM-056, CM-057

---

### UC-ST-11: Analyze CV

**Actor:** Student, System, AI Service

**Description:** Student requests the system to analyze an uploaded CV and extract relevant skills.

**Preconditions:**
- Student is authenticated and active.
- Student owns the selected CV.
- The CV has been uploaded successfully.

**Trigger:**

Student selects the Analyze CV action.

**Main Flow:**

1. Student opens the CV Management page.
2. Student selects an uploaded CV.
3. Student selects Analyze CV.
4. System sends an analysis request to Backend.
5. Backend verifies CV ownership and analysis eligibility.
6. Backend creates an analysis job.
7. AI Service processes the CV content.
8. Backend validates and stores the analysis result.
9. System retrieves the analysis status.
10. System displays the extracted skills and analysis result.

**Alternative Flows:**

- A1: Analysis is still processing. System displays the processing status.
- A2: Analysis fails. System displays an error and allows retry when eligible.
- A3: Analysis is already processing. System informs Student that another analysis cannot be started concurrently.

**Postconditions:**
- The analysis result is stored when successful.
- Student can view the extracted skills.

**Related Issues:** CM-057