# Final-Year Project Blueprint
## Full-Stack Task Management System

**Project title:** Design and Development of a Web-Based Task Management System with User Authentication and Productivity Tracking

**Existing project:** https://github.com/Abhinav-Labs/Simple-Task-Manger/

**Live UI:** https://abhinav-labs.github.io/Simple-Task-Manger/

**Primary objective:** Convert the existing simple Task Manager UI into a functional full-stack web application with authentication, persistent task storage, task prioritization, deadlines, filters, search, and productivity statistics.

---

# 1. Project Scope

## Existing functionality

Preserve the current UI and its working functionality:

- Add tasks
- Remove tasks
- Sort tasks

Do not rebuild the entire application from scratch. Inspect the existing repository and reuse its current HTML, CSS, JavaScript, and framework wherever possible.

## New functionality

### Priority 1 — Essential

1. User registration and login
2. User logout
3. Persistent database storage
4. User-specific task management
5. Add, edit, and delete tasks
6. Task completion status
7. Task priority: Low, Medium, High
8. Task due dates
9. All, Pending, and Completed filters
10. Secure access to each user's tasks

### Priority 2 — Recommended

11. Dashboard statistics
12. Overdue task count
13. Search tasks by title
14. Completion percentage and progress bar

### Priority 3 — Optional

15. Dark mode
16. Task categories
17. Improved empty states and loading indicators
18. Profile display name

Do not implement email reminders, AI features, team collaboration, recurring tasks, or complex administration features unless all essential features are working.

---

# 2. Technology Stack

## Frontend

Use the technology already present in the repository.

- Existing HTML, CSS, and JavaScript, or the current framework
- Existing UI components and styling
- Supabase JavaScript client for backend integration

Do not migrate to React, Next.js, or another framework simply for the sake of using a new technology.

## Backend

**Supabase**

Responsibilities:

- User authentication
- Database access through its client libraries and APIs
- Session management
- Database security through Row Level Security
- Hosted backend infrastructure

Website: https://supabase.com/

## Database

**PostgreSQL**, provided by Supabase.

Responsibilities:

- Store task records
- Associate tasks with authenticated users
- Persist task status, priority, deadlines, and descriptions
- Support dashboard counts and filtering

## Architecture

Browser UI → Supabase Authentication → Authenticated database requests → PostgreSQL

The browser can communicate directly with Supabase using the publishable/legacy anon key and appropriately configured Row Level Security policies. A separate Express backend is not necessary for this project.

Never expose a Supabase service-role key in frontend code.

---

# 3. Database Design

Use Supabase Auth for user accounts and one main application table called `tasks`. A separate `profiles` table is optional.

## Table: tasks

| Column | Type | Purpose |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | References the authenticated user |
| title | Text | Task name |
| description | Text | Optional details |
| priority | Text | Low, Medium, or High |
| status | Text | Pending or Completed |
| due_date | Date | Optional deadline |
| created_at | Timestamp | Creation time |

Recommended constraints:

- `id` is generated automatically.
- `user_id` references `auth.users(id)` with cascading deletion.
- `title` is required and cannot be empty.
- `priority` accepts only Low, Medium, or High.
- `status` accepts only Pending or Completed.
- `created_at` defaults to the current timestamp.
- `due_date` can be null.
- Index `user_id` for efficient user-specific queries.

## Example SQL schema

```sql
create table public.tasks (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  title text not null
    check (length(trim(title)) > 0),

  description text,

  priority text not null default 'Medium'
    check (priority in ('Low', 'Medium', 'High')),

  status text not null default 'Pending'
    check (status in ('Pending', 'Completed')),

  due_date date,

  created_at timestamptz not null default now()
);

create index tasks_user_id_idx
on public.tasks(user_id);

alter table public.tasks enable row level security;
```

## Row Level Security policies

Each authenticated user must only access their own tasks.

```sql
create policy "Users can view their own tasks"
on public.tasks
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own tasks"
on public.tasks
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own tasks"
on public.tasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own tasks"
on public.tasks
for delete
to authenticated
using ((select auth.uid()) = user_id);
```

Run the SQL in the Supabase SQL Editor. If you rerun the setup, check existing tables and policies first to avoid duplicate-object errors.

**Important:** Hiding another user's tasks in the frontend is not sufficient. Database policies must enforce ownership even when requests are made outside the UI.

---

# 4. Authentication Requirements

## Sign-up page

Fields:

- Full name (optional)
- Email address
- Password
- Confirm password (optional)

Behavior:

1. Validate required inputs.
2. Check password confirmation if present.
3. Call Supabase Auth sign-up.
4. Display success or useful error messages.
5. Handle email verification if enabled in Supabase.
6. Navigate to the login page or dashboard according to the actual authentication response.

## Login page

Fields:

- Email
- Password

Behavior:

1. Validate the fields.
2. Authenticate using Supabase Auth.
3. Display invalid-credentials errors clearly.
4. Redirect authenticated users to the dashboard.
5. Restore an existing session when the page reloads.

## Logout

- End the Supabase session.
- Clear user-specific UI state.
- Return to the login page.

## Protected dashboard

- Unauthenticated users must not access the application dashboard.
- Authenticated users should see only their own tasks.
- Handle expired sessions and authentication errors.
- Do not rely on client-side route protection alone; enforce ownership through database policies.

---

# 5. Task Management Requirements

Every task should support the following operations.

## Create task

Required:

- Title

Optional:

- Description
- Priority
- Due date

Defaults:

- Priority: Medium
- Status: Pending

On successful creation, save the task to PostgreSQL and refresh the displayed list.

## Edit task

Allow the user to change:

- Title
- Description
- Priority
- Due date

Save the changes to the database and update the UI.

## Delete task

- Show a confirmation prompt if appropriate.
- Delete the selected task from the database.
- Update the UI only after a successful operation or implement a properly handled optimistic update.

## Complete task

- Provide a checkbox or completion button.
- Change status between Pending and Completed.
- Update the database.
- Refresh dashboard statistics.

## Sort tasks

Preserve the existing sort feature. Support sorting by creation date, priority, or due date if the current implementation allows it.

## Filter tasks

Provide these filters:

- All Tasks
- Pending
- Completed
- Overdue

Define an overdue task as a task whose due date is earlier than today's local date and whose status is Pending.

Tasks without due dates must not be classified as overdue.

## Search tasks

- Add a search input.
- Search by task title.
- Combine search with the selected status filter.
- Show a useful message when there are no matches.

---

# 6. Dashboard Design

Preserve the current design language. Add the following UI elements without making the page unnecessarily complicated.

## Header

- Application name and logo
- User email or display name
- Logout button
- Optional dark-mode toggle

## Summary cards

1. Total Tasks
2. Completed Tasks
3. Pending Tasks
4. Overdue Tasks

## Progress section

Calculate completion percentage as:

Completed Tasks / Total Tasks × 100

If there are no tasks, display 0%.

## Task list

Each task should display:

- Title
- Optional description
- Priority indicator
- Due date
- Completion status
- Edit action
- Delete action
- Completion checkbox or button

## Add-task interface

Use a modal, expandable form, or existing task input UI. Include fields for the title, description, priority, and due date.

## UI states

Implement:

- Loading state
- Empty task list
- No search results
- Successful save feedback
- Error messages
- Authentication errors

Do not redesign working components without a clear reason.

---

# 7. Implementation Workflow

Follow this order to minimize the risk of breaking the existing application.

## Phase 1 — Inspect the repository

- Identify the frontend framework and entry point.
- Understand how tasks are currently stored.
- Identify the current add, delete, and sort implementations.
- Review existing CSS and responsive behavior.
- Identify the deployment process and current hosting limitations.

Deliverable: A clear understanding of the existing codebase before making changes.

## Phase 2 — Configure Supabase

- Create a Supabase project.
- Configure authentication.
- Create the tasks table.
- Enable RLS and apply the ownership policies.
- Add the Supabase client library using the method appropriate for the existing stack.
- Configure the publishable key and project URL using the appropriate environment configuration.

Deliverable: A working backend and database.

## Phase 3 — Implement authentication

- Build signup and login screens.
- Implement logout.
- Handle existing sessions.
- Protect the dashboard.
- Test registration and login with two different accounts.

Deliverable: Secure, working user authentication.

## Phase 4 — Connect task CRUD

Replace local-only task persistence with database operations.

- Fetch the current user's tasks.
- Create tasks with the authenticated user's ID.
- Edit existing tasks.
- Delete tasks.
- Toggle completion status.
- Handle database errors.
- Ensure tasks remain available after a refresh.

Do not remove the existing task behavior until the corresponding database operation works.

Deliverable: Fully functional persistent task management.

## Phase 5 — Add productivity features

Implement:

- Priority selection
- Due dates
- Status filters
- Overdue filtering
- Search
- Dashboard statistics
- Completion percentage

Deliverable: A usable productivity dashboard.

## Phase 6 — Polish and test

- Fix UI regressions.
- Check mobile responsiveness.
- Test error and empty states.
- Verify ownership isolation.
- Check database persistence.
- Verify deployment and authentication redirects.

Deliverable: A working project suitable for demonstration.

---

# 8. Testing Checklist

Test every item before submission.

## Authentication

- [ ] New user can register.
- [ ] Existing user can log in.
- [ ] Invalid credentials display an error.
- [ ] Logout works.
- [ ] Session persists correctly after refresh.
- [ ] Unauthenticated users cannot access protected application features.

## Task management

- [ ] Create a task.
- [ ] Edit a task.
- [ ] Delete a task.
- [ ] Mark a task completed.
- [ ] Change task priority.
- [ ] Set and update due dates.
- [ ] Search tasks.
- [ ] Filter tasks by status.
- [ ] Sort tasks correctly.
- [ ] Data remains after refreshing the page.

## Security

- [ ] User A cannot read User B's tasks.
- [ ] User A cannot update User B's tasks.
- [ ] User A cannot delete User B's tasks.
- [ ] Database policies remain enabled.
- [ ] No service-role or secret key appears in frontend code or repository history.

## Dashboard

- [ ] Summary counts match the task list.
- [ ] Completed percentage is correct.
- [ ] Empty task list displays 0%.
- [ ] Overdue count excludes completed tasks.
- [ ] Search and filters work together.

---

# 9. Deployment Plan

The existing GitHub Pages deployment can host a static frontend if the application uses a compatible static build.

However, GitHub Pages does not run a Node.js backend.

For a frontend using Supabase:

1. Configure the Supabase project and authentication.
2. Set the appropriate frontend configuration values.
3. Configure the deployed website URL and allowed authentication redirect URLs in Supabase.
4. Deploy the updated frontend to GitHub Pages or another compatible static host.
5. Test signup, login, logout, database operations, and page refresh on the deployed URL.

If using a framework with a build process, deploy its generated static output rather than source files where required.

Use Row Level Security to protect data. A frontend publishable key is not a substitute for database security.

---

# 10. Definition of Done

The project is ready for submission when:

- A user can register, log in, and log out.
- The authenticated user can create, view, edit, complete, and delete tasks.
- Priority and due dates work.
- Search and filters work.
- Dashboard statistics reflect the real database.
- Tasks survive a page refresh.
- Different users have isolated task data.
- The deployed application works.
- The report accurately describes the implemented system.
- The demonstration can be completed without relying on fabricated data or unfinished features.

**Final priority:** A smaller, secure, fully functional application is better than a larger application with unfinished features. Complete authentication, database persistence, task CRUD, and user-specific security first. Add the remaining features only after these are verified.
