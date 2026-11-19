# Student Exception Flows – CareerMatch AI

## 1. Authentication Exceptions

| ID | Use Case | Exception | Expected System Behavior |
|---|---|---|---|
| EX-ST-01 | Register | Email already exists | Display duplicate email error |
| EX-ST-02 | Register | Invalid email format | Display validation message |
| EX-ST-03 | Login | Incorrect email or password | Display authentication error |
| EX-ST-04 | Login | Account not verified | Inform Student that verification is required |
| EX-ST-05 | Login | Account is inactive | Deny access |
| EX-ST-06 | Verify Email | Invalid or expired token | Display verification failure |
| EX-ST-07 | Reset Password | Invalid or expired reset token | Reject password reset |

## 2. Profile Exceptions

| ID | Use Case | Exception | Expected System Behavior |
|---|---|---|---|
| EX-ST-08 | Edit Profile | Required field is empty | Display validation error |
| EX-ST-09 | Edit Profile | Invalid field length | Reject invalid input |
| EX-ST-10 | Manage Skills | Duplicate skill selected | Reject duplicate skill |
| EX-ST-11 | Manage Skills | Skill does not exist | Display validation error |

## 3. CV Exceptions

| ID | Use Case | Exception | Expected System Behavior |
|---|---|---|---|
| EX-ST-12 | Upload CV | Unsupported file format | Reject the upload |
| EX-ST-13 | Upload CV | File exceeds 10 MiB | Display file size error |
| EX-ST-14 | Upload CV | Empty file | Reject the upload |
| EX-ST-15 | Upload CV | Network or server failure | Display retry option |
| EX-ST-16 | Analyze CV | Analysis already processing | Prevent duplicate concurrent analysis |
| EX-ST-17 | Analyze CV | AI analysis fails | Display failure status |
| EX-ST-18 | View CV | CV belongs to another Student | Deny access |

## 4. Job Exceptions

| ID | Use Case | Exception | Expected System Behavior |
|---|---|---|---|
| EX-ST-19 | Search Jobs | No matching jobs | Display empty state |
| EX-ST-20 | Search Jobs | Search service unavailable | Display error and retry option |
| EX-ST-21 | View Job | Job is unavailable | Display unavailable notice |
| EX-ST-22 | Save Job | Job no longer exists | Display an appropriate error |
| EX-ST-23 | Apply Job | Application is not eligible | Explain the reason for rejection |

## 5. Application Exceptions

| ID | Use Case | Exception | Expected System Behavior |
|---|---|---|---|
| EX-ST-24 | Track Applications | No applications found | Display empty state |
| EX-ST-25 | Respond to Interview | Invitation has expired | Disable response and explain the status |
| EX-ST-26 | Respond to Interview | Invalid response request | Display error message |

## 6. Notification Exceptions

| ID | Use Case | Exception | Expected System Behavior |
|---|---|---|---|
| EX-ST-27 | View Notifications | No notifications available | Display empty state |
| EX-ST-28 | View Notifications | Notification service unavailable | Display error and retry option |
| EX-ST-29 | Mark as Read | Notification no longer exists | Refresh notification list |

## 7. General System Exceptions

| ID | Exception | Expected System Behavior |
|---|---|---|
| EX-ST-30 | Session expired | Require authentication again |
| EX-ST-31 | Unauthorized access | Deny access |
| EX-ST-32 | Network unavailable | Display connection error |
| EX-ST-33 | Unexpected server error | Display generic error without exposing technical details |