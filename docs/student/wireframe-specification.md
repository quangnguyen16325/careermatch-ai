# Student Wireframe Specification

## 1. Overview

This document defines the wireframe specifications for the Student module of CareerMatch AI.

The purpose is to establish consistent screen layouts, UI components, input fields, actions, and interface states before frontend implementation.

### 1.1 Design Scope

The Student module covers the following functional areas:

- Authentication and account recovery
- Student profile management
- Skills management
- CV upload and management
- CV analysis and extracted skills
- Job search and filtering
- Job details and match explanation
- Application tracking and interview responses
- Notification management

### 1.2 Design Principles

- Mobile-first and responsive layout.
- Consistent UI components across Student screens.
- Clear navigation and predictable interactions.
- Simple and accessible form layouts.
- Clear feedback for user actions.
- Consistent loading, empty, error, and success states.
- Match Score is informational and does not make automatic hiring decisions.

### 1.3 Target Platform

| Property | Specification |
|---|---|
| Application | Responsive Web Application |
| Primary experience | Mobile-first |
| Reference viewport | 390 × 844 px |
| Desktop support | Responsive layout |
| Typography | Roboto |
| Wireframe fidelity | Low-Fidelity |
| Design tool | Figma |

---

## 2. Shared UI Components

The following components should be reused across Student screens.

| Component | Description |
|---|---|
| Header | Displays page title, navigation actions, and notification access |
| Bottom Navigation | Provides access to main Student modules |
| Button | Primary and secondary user actions |
| Input Field | Text, email, password, and other form inputs |
| Search Bar | Allows searching for jobs |
| Select | Allows users to select predefined values |
| Checkbox | Supports multiple selections |
| Radio Button | Supports single selections |
| Card | Groups related information |
| Job Card | Displays job summary information |
| Skill Tag | Displays individual skills |
| Status Badge | Displays application or processing status |
| Progress Indicator | Displays CV analysis progress |
| Modal | Displays confirmation or additional information |
| Toast | Displays action feedback |
| Empty State | Displays when no data is available |
| Loading State | Indicates an ongoing operation |
| Error Message | Explains an unsuccessful operation |

---

## 3. Screen Specifications

## 3.1 Authentication Module

### ST-01: Login

**Purpose:** Allow existing Student users to access their accounts.

**Layout:**
- CareerMatch AI logo.
- Welcome heading.
- Email input.
- Password input.
- Remember me checkbox (if supported).
- Forgot Password link.
- Login button.
- Register navigation link.

**Inputs:**
- Email address.
- Password.

**Actions:**
- Submit login credentials.
- Navigate to Register.
- Navigate to Forgot Password.

**States:**
- Default.
- Input validation error.
- Invalid credentials.
- Loading.
- Login success.

### ST-02: Register

**Purpose:** Allow new Student users to create an account.

**Layout:**
- CareerMatch AI logo.
- Registration heading.
- Full name input.
- Email input.
- Password input.
- Confirm password input.
- Terms acceptance checkbox (if required).
- Register button.
- Login navigation link.

**Inputs:**
- Full name.
- Email address.
- Password.
- Confirm password.

**Actions:**
- Submit registration form.
- Navigate to Login.

**States:**
- Default.
- Required field validation.
- Invalid email.
- Password validation error.
- Email already registered.
- Loading.
- Registration success.

### ST-03: Email Verification

**Purpose:** Allow users to verify their email address.

**Layout:**
- Verification heading.
- Informational message.
- Registered email address.
- Verification code input or verification link instructions, depending on the authentication flow.
- Verify button.
- Resend verification action.

**Inputs:**
- Verification code, if code-based verification is implemented.

**Actions:**
- Verify email.
- Resend verification instructions.

**States:**
- Waiting for verification.
- Invalid or expired verification.
- Resending.
- Verification success.

### ST-04: Forgot Password

**Purpose:** Allow users to request account password recovery.

**Layout:**
- Forgot password heading.
- Instructions.
- Email input.
- Submit button.
- Back to Login link.

**Inputs:**
- Email address.

**Actions:**
- Submit password recovery request.
- Navigate to Login.

**States:**
- Default.
- Invalid email.
- Submitting.
- Request confirmation.
- Request error.

### ST-05: Reset Password

**Purpose:** Allow users to set a new account password.

**Layout:**
- Reset password heading.
- New password input.
- Confirm password input.
- Password requirements.
- Reset Password button.

**Inputs:**
- New password.
- Confirm password.

**Actions:**
- Submit new password.
- Navigate to Login after successful reset.

**States:**
- Default.
- Password validation error.
- Password mismatch.
- Invalid or expired recovery token.
- Loading.
- Reset success.

---

## 3.2 Student Profile Module

### ST-06: Student Dashboard

**Purpose:** Provide an overview of the Student account and quick access to important features.

**Layout:**
- Header with greeting and notification icon.
- Profile completion summary.
- CV analysis summary.
- Recommended jobs section.
- Recent application summary.
- Quick action buttons.
- Bottom Navigation.

**Actions:**
- Navigate to Student Profile.
- Navigate to CV Management.
- Navigate to Job Search.
- Navigate to Application Tracking.
- Navigate to Notification Inbox.

**States:**
- Default dashboard.
- Loading dashboard data.
- Empty profile.
- No recommended jobs.
- Data loading error.

### ST-07: Student Profile

**Purpose:** Display the Student's career and personal profile.

**Layout:**
- Profile information card.
- Personal information section.
- Education section.
- Experience section.
- Skills summary.
- Profile completion indicator.
- Edit Profile button.

**Actions:**
- View profile information.
- Navigate to Edit Profile.
- Navigate to Skill Editor.

**States:**
- Complete profile.
- Incomplete profile.
- Empty profile sections.
- Loading.
- Error.

### ST-08: Edit Profile

**Purpose:** Allow Students to update their profile information.

**Layout:**
- Profile editing form.
- Personal information section.
- Education section.
- Experience section.
- Save Changes button.
- Cancel button.

**Inputs:**
- Full name.
- Phone number, if supported.
- Location.
- Education information.
- Experience information.
- Career interests.

**Actions:**
- Update profile information.
- Save changes.
- Cancel editing.

**States:**
- Default form.
- Validation errors.
- Saving.
- Save success.
- Save failure.

### ST-09: Skill Editor

**Purpose:** Allow Students to manage their professional skills.

**Layout:**
- Current skills section.
- Add skill input.
- Skill category selector.
- Skill proficiency selector, if supported.
- Remove skill action.
- Save Changes button.

**Inputs:**
- Skill name.
- Skill category.
- Skill proficiency, if supported.

**Actions:**
- Add a skill.
- Edit a skill.
- Remove a skill.
- Save skill changes.

**States:**
- Empty skills.
- Existing skills.
- Invalid skill input.
- Saving.
- Save success.
- Error.

---

## 3.3 CV Management Module

### ST-10: CV Management

**Purpose:** Allow Students to view and manage their uploaded CV documents.

**Layout:**
- Page heading.
- Upload CV button.
- CV document list.
- CV filename.
- Upload date.
- Analysis status.
- Document actions.

**Actions:**
- Upload a new CV.
- View CV details.
- Delete a CV, if supported.
- Open CV analysis result.

**States:**
- No CV uploaded.
- CV list available.
- Processing.
- Upload or document error.

### ST-11: CV Upload

**Purpose:** Allow Students to upload a CV from their device.

**Layout:**
- Upload instruction section.
- File upload area.
- Supported file format information.
- Selected file information.
- Upload button.
- Cancel button.

**Inputs:**
- CV file.

**Actions:**
- Select a file.
- Upload CV.
- Cancel upload.

**States:**
- Empty upload area.
- File selected.
- Unsupported file format.
- File size validation error.
- Uploading.
- Upload success.
- Upload failure.

### ST-12: CV Analysis Progress

**Purpose:** Display the progress and status of CV analysis.

**Layout:**
- Analysis heading.
- Uploaded CV information.
- Progress indicator.
- Current processing status.
- Informational message.
- Back to CV Management action.

**Actions:**
- View analysis progress.
- Return to CV Management.

**States:**
- Waiting.
- Processing.
- Completed.
- Failed.
- Retry available, if supported.

### ST-13: Extracted Skills

**Purpose:** Display skills extracted from the uploaded CV for Student review.

**Layout:**
- Analysis result heading.
- Extracted skills list.
- Skill categories.
- Review and edit actions.
- Save Changes button.

**Actions:**
- Review extracted skills.
- Edit extracted skills.
- Remove incorrect skills.
- Confirm and save skills.

**States:**
- Analysis completed.
- No skills extracted.
- Empty result.
- Saving changes.
- Save success.
- Analysis error.

---

## 3.4 Job Search and Matching Module

### ST-14: Job Search

**Purpose:** Allow Students to discover available job opportunities.

**Layout:**
- Header.
- Search bar.
- Filter button.
- Job results count.
- Job listing cards.
- Pagination or load-more control.
- Bottom Navigation.

**Job Card Information:**
- Job title.
- Company name.
- Location.
- Employment type.
- Salary information, if available.
- Match Score, if available.
- Save Job action.

**Inputs:**
- Search keyword.

**Actions:**
- Search jobs.
- Open job details.
- Open job filters.
- Save a job.
- Navigate between result pages.

**States:**
- Default results.
- Loading.
- No matching jobs.
- Search error.

### ST-15: Job Filters

**Purpose:** Allow Students to refine job search results.

**Layout:**
- Filter heading.
- Location selector.
- Job category selector.
- Employment type selector.
- Salary range, if supported.
- Experience level selector, if supported.
- Apply Filters button.
- Clear Filters button.

**Inputs:**
- Location.
- Job category.
- Employment type.
- Salary range.
- Experience level.

**Actions:**
- Select filter values.
- Apply filters.
- Clear all filters.
- Close filter panel.

**States:**
- Default filters.
- Selected filters.
- Filter validation, if applicable.
- Updated search results.

### ST-16: Job Detail

**Purpose:** Display detailed information about a selected job.

**Layout:**
- Job title.
- Company information.
- Location and employment type.
- Salary information, if available.
- Job description.
- Job requirements.
- Required skills.
- Match Score summary, if available.
- Apply button.
- Save Job button.

**Actions:**
- View full job information.
- Open Match Explanation.
- Save or unsave a job.
- Apply for the job.

**States:**
- Job details loaded.
- Loading.
- Job unavailable.
- Saved.
- Apply confirmation.
- Error.

### ST-17: Match Explanation

**Purpose:** Explain how the Student profile and skills relate to a job's requirements.

**Layout:**
- Match Score summary.
- Matching skills section.
- Missing skills section.
- Job requirements.
- Skill gap explanation.
- Informational disclaimer.

**Actions:**
- Review matching skills.
- Review missing skills.
- Return to Job Detail.

**States:**
- Match information available.
- Incomplete profile or CV.
- No match data available.
- Loading.
- Analysis error.

**Important:**
Match Score is an informational reference only. It must not be presented as a hiring decision, guarantee of employment, or automatic rejection result.

---

## 3.5 Application and Notification Module

### ST-18: Application Tracking

**Purpose:** Allow Students to monitor their submitted job applications.

**Layout:**
- Application heading.
- Application status summary.
- Application list.
- Job title.
- Company name.
- Submission date.
- Current application status.
- Application detail action.

**Actions:**
- View application details.
- Filter applications by status.
- View interview responses.

**States:**
- No applications.
- Applications available.
- Loading.
- Error.

### ST-19: Interview Responses

**Purpose:** Allow Students to view interview invitations and related responses.

**Layout:**
- Interview information.
- Company information.
- Job title.
- Interview date and time, if available.
- Interview instructions.
- Response status.
- Response actions.

**Actions:**
- View interview details.
- Accept invitation, if supported.
- Decline invitation, if supported.
- Submit response.

**States:**
- Pending response.
- Accepted.
- Declined.
- Expired invitation.
- No interview invitations.

### ST-20: Notification Inbox

**Purpose:** Allow Students to view and manage system notifications.

**Layout:**
- Notification heading.
- Unread notification indicator.
- Notification list.
- Notification title.
- Notification description.
- Timestamp.
- Read/unread status.

**Actions:**
- Open notification.
- Mark notification as read.
- Mark all as read, if supported.
- Navigate to related application or feature.

**States:**
- Unread notifications.
- Read notifications.
- Empty notification inbox.
- Loading.
- Error.

---

## 4. Responsive Design Requirements

### 4.1 Mobile Layout

- Use a single-column layout for primary content.
- Use Bottom Navigation for main Student modules.
- Ensure buttons and inputs are touch-friendly.
- Keep important actions visible and accessible.
- Avoid horizontal scrolling for primary content.

### 4.2 Desktop Layout

- Expand content width where appropriate.
- Use multi-column layouts for dashboard sections when useful.
- Maintain consistent spacing and alignment.
- Adapt navigation to a suitable desktop layout.
- Preserve the same information hierarchy as mobile.

### 4.3 Responsive Components

| Component | Mobile | Desktop |
|---|---|---|
| Header | Compact | Expanded |
| Navigation | Bottom Navigation | Desktop navigation |
| Job Cards | Single column | Wider content area |
| Profile | Single column | Multi-column where appropriate |
| Forms | Full-width inputs | Centered or constrained width |
| Modal | Near full-width | Centered dialog |

---

## 5. Common UI States

All applicable screens should define the following states.

| State | Description |
|---|---|
| Default | Normal screen display |
| Loading | Data or action is being processed |
| Empty | No data is available |
| Error | An operation has failed |
| Success | An operation has completed successfully |
| Disabled | An action is temporarily unavailable |

Error messages should be clear and provide actionable guidance where possible.

---

## 6. Accessibility and Usability

- Use readable typography and sufficient contrast.
- Provide clear labels for input fields.
- Indicate required fields.
- Display validation messages near relevant inputs.
- Provide visible feedback after user actions.
- Ensure navigation is consistent across screens.
- Avoid relying on color alone to communicate status.

---

## 7. Design Deliverables

The following deliverables are expected:

1. Student Low-Fidelity Wireframes in Figma.
2. Shared UI component specifications.
3. Student Navigation Flow.
4. Interactive Figma Prototype.
5. Responsive layout specifications.
6. UI state specifications.

### Figma References

- Wireframes: [Insert Figma URL]
- Navigation Flow: [Insert Figma URL]
- Interactive Prototype: [Insert Figma URL]

---

## 8. Related Issues

| Issue | Related Work |
|---|---|
| #49 | Student use cases and exception flows |
| #51 | Shared frontend shell and API client |
| #52 | Registration and sign-in |
| #53 | Email verification and password reset |
| #54 | Student profile editor |
| #55 | Skill editor and profile summary |
| #56 | CV upload and management |
| #57 | CV analysis progress and extracted skills |
| #58 | Job search, filters, and pagination |
| #62 | Application tracking and interview responses |
| #63 | Notification inbox and unread indicator |