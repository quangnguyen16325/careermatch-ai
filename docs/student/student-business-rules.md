# Student Business Rules – CareerMatch AI

## 1. Account Rules

- BR-ST-01: Only eligible STUDENT accounts can access Student self-service features.
- BR-ST-02: Students must authenticate before accessing protected resources.
- BR-ST-03: Email addresses must be unique.
- BR-ST-04: Unverified accounts must follow the email verification requirements.

## 2. Profile Rules

- BR-ST-05: Each Student account is associated with its own Student Profile.
- BR-ST-06: Students can only update their own profile.
- BR-ST-07: Required profile fields must satisfy validation rules.
- BR-ST-08: Profile updates must not modify another Student's information.

## 3. Skill Rules

- BR-ST-09: Students can select skills from the available skill catalog.
- BR-ST-10: Duplicate skill selections are not allowed.
- BR-ST-11: AI-extracted skills must not automatically overwrite manually confirmed skills.
- BR-ST-12: The proposed skill selection limit is 100 skills.

## 4. CV Rules

- BR-ST-13: Only PDF and DOCX files are accepted.
- BR-ST-14: The maximum CV file size is 10 MiB.
- BR-ST-15: Students can only access their own CV files.
- BR-ST-16: CV files must be stored in private storage.
- BR-ST-17: A CV cannot have multiple concurrent processing jobs.

## 5. Job Rules

- BR-ST-18: Students can search and filter available job postings.
- BR-ST-19: Students can save jobs for later reference.
- BR-ST-20: Students must satisfy application eligibility requirements before applying.

## 6. Application Rules

- BR-ST-21: Students can only view their own applications.
- BR-ST-22: Application status must follow the Backend-defined status model.
- BR-ST-23: Interview responses must comply with invitation validity and status rules.

## 7. Notification Rules

- BR-ST-24: Students can only access their own notifications.
- BR-ST-25: Unread notifications must be distinguishable from read notifications.
- BR-ST-26: Notification status must reflect the persisted Backend state.

## 8. AI and Matching Rules

- BR-ST-27: Match Score is a reference to support career decisions, not a hiring conclusion.
- BR-ST-28: AI recommendations must be explainable to Students.
- BR-ST-29: AI-generated results must not automatically reject a Student's application.
- BR-ST-30: Students retain control over their career and application decisions.