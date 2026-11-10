# Manual QA Test Plan

This document is the shared manual test checklist for QA and PM validation. It assumes the app is
already deployed and reachable from a browser.

Replace placeholder values before sharing a concrete test run:

- `{DOMAIN_NAME}`: deployed app domain, for example `sheet.example.com`.
- `{ADMIN_EMAIL}`: active admin test user email.
- `{CONTRACTOR_EMAIL}`: active contractor test user email.
- `{EMPLOYEE_EMAIL}`: active employee test user email.
- `{ADMIN_INVITE_TOKEN}`: pending admin invitation token.
- `{CONTRACTOR_INVITE_TOKEN}`: pending contractor invitation token.
- `{INVALID_INVITE_TOKEN}`: deliberately invalid invitation token for negative testing.
- `{SYSTEM_CHECK_VIEW}`: admin system-check path, default `https://{DOMAIN_NAME}/admin/system`.
- `{AUDIT_LOG_VIEW}`: audit-log viewer path, default `https://{DOMAIN_NAME}/admin/audit`.
- `{HELP_VIEW}`: Help page path, default `https://{DOMAIN_NAME}/help`.
- `{MCP_URL}`: MCP connector URL, default `https://{DOMAIN_NAME}/api/mcp`.
- `{ADMIN_INFO_VIEW}`: admin information-page editor path, default `https://{DOMAIN_NAME}/admin/info`.
- `{INVITED_EMAIL}`: email address that owns the tested invitation.
- `{INVITED_FIRST_NAME}`: first name used when creating a new invited member.
- `{INVITED_LAST_NAME}`: last name used when creating a new invited member.
- `{INVITED_PROFILE}`: profile selected for a new invited member, for example contractor or employee.
- `{INVITED_ROLE}`: role selected for a new invited member, for example member or admin.
- `{INVITED_CURRENCY}`: default currency selected for a new invited member.
- `{INVITED_TIMEZONE}`: timezone selected for a new invited member.
- `{INVITED_LOCALE}`: locale selected for a new invited member.
- `{UNKNOWN_EMAIL}`: email address that is not a Sheet Happens member or pending invite.
- `{LOCKOUT_TEST_EMAIL}`: active test account with a known password, reserved for sign-in lockout testing.
- `{COMPANY_GOOGLE_DOMAIN}`: allowed Google Workspace domain configured for company Google login.
- `{COMPANY_GOOGLE_EMAIL}`: activated member email in `{COMPANY_GOOGLE_DOMAIN}`.
- `{PRIVATE_GOOGLE_EMAIL}`: Google email outside `{COMPANY_GOOGLE_DOMAIN}`.
- `{PROFILE_TRANSITION_VALID_FROM}`: today or a future date for profile transition testing.
- `{PROFILE_TRANSITION_REASON}`: reason text for profile transition testing.
- `{AUTHENTICATOR_APP}`: authenticator app used for TOTP testing.
- `{PASSKEY_DEVICE}`: passkey-capable test device or browser profile.
- `{TIME_TRACKING_WEEK_START}`: Monday date of a test week, formatted as `YYYY-MM-DD`.
- `{TIME_TRACKING_PREVIOUS_WEEK_START}`: Monday date one week before `{TIME_TRACKING_WEEK_START}`.
- `{TIME_TRACKING_MONTH_SPANNING_WEEK_START}`: Monday date of a week that spans two calendar
  months, formatted as `YYYY-MM-DD` — for example `2026-08-31`, the week Aug 31 - Sep 6.
- `{TIME_TRACKING_PROJECT_A}`: active project assigned to the time-tracking test user.
- `{TIME_TRACKING_PROJECT_B}`: second active project assigned to the time-tracking test user.
- `{DECLARED_HOURS}`: monthly hour figure used for declared-hours testing, for example `52`.
- `{DECLARED_NOTE}`: note text describing what the declared hours cover.
- `{HOURS_PROOF_PDF_FILE}`: local PDF file used as the declared-hours proof document.
- `{HOURS_PROOF_REPLACEMENT_PDF_FILE}`: second local PDF file, for replacing a proof.
- `{TIME_ENTRY_DESCRIPTION}`: description text used for test time entries.
- `{TIME_ENTRY_UPDATED_DESCRIPTION}`: edited description text used for test time entries.
- `{TIMESHEET_MONTH}`: contractor timesheet month formatted as `YYYY-MM`.
- `{TIMESHEET_PROJECT_A}`: first contractor project used in timesheet tests.
- `{TIMESHEET_PROJECT_B}`: second contractor project used in timesheet tests.
- `{TIMESHEET_CURRENCY_A}`: first currency used in mixed-currency timesheet tests.
- `{TIMESHEET_CURRENCY_B}`: second currency used in mixed-currency timesheet tests.
- `{TIMESHEET_REJECTION_REASON}`: reason text used when rejecting a submitted timesheet.
- `{INVOICE_NUMBER}`: invoice number used for contractor invoice upload testing.
- `{INVOICE_AMOUNT}`: declared invoice amount used for contractor invoice upload testing.
- `{INVOICE_PDF_FILE}`: local PDF file used for contractor invoice upload testing.
- `{INVOICE_REJECTION_REASON}`: reason text used when rejecting an uploaded invoice.
- `{CANCELLATION_INVOICE_NUMBER}`: invoice number used for the cancellation invoice.
- `{CANCELLATION_INVOICE_PDF_FILE}`: local PDF file used for cancellation invoice testing.
- `{CORRECTED_INVOICE_NUMBER}`: invoice number used for the corrected replacement invoice.
- `{CORRECTED_INVOICE_PDF_FILE}`: local PDF file used for corrected invoice testing.
- `{PROJECT_NAME}`: name for a newly created project.
- `{PROJECT_UPDATED_NAME}`: updated project name.
- `{PROJECT_SLUG}`: URL-safe or code-like project slug.
- `{PROJECT_UPDATED_SLUG}`: updated project slug.
- `{PROJECT_GROUP_NAME}`: name for a project group.
- `{PROJECT_GROUP_UPDATED_NAME}`: updated project group name.
- `{PROJECT_ASSIGNMENT_START}`: assignment start date formatted as `YYYY-MM-DD`.
- `{PROJECT_ASSIGNMENT_END}`: assignment end date formatted as `YYYY-MM-DD`.
- `{PROJECT_ASSIGNMENT_NOTE}`: note text for project assignment testing.
- `{BULK_ASSIGNMENT_START}`: bulk assignment start date formatted as `YYYY-MM-DD`.
- `{RATE_VALID_FROM}`: rate start date formatted as `YYYY-MM-DD`.
- `{RATE_FUTURE_MONTH_START}`: first day of a future month, formatted as `YYYY-MM-DD`.
- `{RATE_AMOUNT}`: hourly rate amount, for example `16000`.
- `{RATE_UPDATED_AMOUNT}`: second hourly rate amount, for example `18000`.
- `{RATE_CURRENCY}`: initial rate currency, for example `HUF`.
- `{RATE_UPDATED_CURRENCY}`: second rate currency, for example `EUR`.
- `{RATE_NOTE}`: reason or note text for rate testing.
- `{REPORT_EXPORT_TITLE}`: title used for a cost-free report PDF export.
- `{INTERNAL_REPORT_EXPORT_TITLE}`: title used for an internal report PDF export.
- `{HELP_WELCOME_TITLE}`: title used when testing admin-edited Help welcome content.
- `{HELP_WELCOME_MARKDOWN}`: markdown body used when testing admin-edited Help welcome content.
- `{PAYSLIP_MONTH}`: employee payslip month formatted as `YYYY-MM`.
- `{PAYSLIP_PDF_FILE}`: valid PDF file, no larger than 10 MB, used for payslip upload.
- `{SECOND_EMPLOYEE_EMAIL}`: another active employee, used to look at `{EMPLOYEE_EMAIL}`'s leave as a colleague.
- `{SICK_NOTE_FILE}`: a PDF, JPG or PNG no larger than 10 MB, used as a sick note.
- `{LEAVE_MONTH}`: a month after the current one with a public holiday on a weekday, for example the month holding 23 October or 1 May.
- `{PAYSLIP_REPLACEMENT_PDF_FILE}`: different valid PDF file used to replace a payslip.
- `{NON_PDF_FILE}`: non-PDF file used to test payslip file validation.

## General Rules

- Test in a clean browser profile or private window when the scenario mentions signed-out state.
- If a scenario expects email, use the mailbox for the email address named in the test data.
- Record the browser, operating system, user role, and date of the test run.
- Capture screenshots for failures and include the full URL, excluding secret tokens when sharing
  outside the project team.
- Do not reuse one-time backup codes across repeated test runs.
- When a scenario mentions audit rows, verify them through `{AUDIT_LOG_VIEW}` if the current test
  environment exposes audit-log access.

## Smoke: Deployment Is Reachable

### Steps

1. Open `https://{DOMAIN_NAME}`.
2. Wait for the page to finish loading.

### Expected Result

- The app redirects unauthenticated users to `https://{DOMAIN_NAME}/login?callbackURL=%2Fdashboard`.
- No blank page or server error is shown.

## Smoke: Admin System Check Passes

Run this after deployment configuration changes and before invoice testing.

### Steps

1. Sign in as `{ADMIN_EMAIL}`.
2. Open `{SYSTEM_CHECK_VIEW}`.
3. Confirm the page shows application configuration, database, object storage, email delivery, Google OAuth, and Typst PDF renderer checks.
4. Confirm the object storage check completes a temporary write, read, and delete probe.
5. Confirm the Typst PDF renderer check completes a temporary PDF render probe.
6. Open `https://{DOMAIN_NAME}/api/admin/system-check` in a new tab.

### Expected Result

- Application configuration, database, object storage, and Typst PDF renderer are passing before invoice upload and report PDF export tests.
- Email delivery is passing when SMTP is expected, or shows a clear warning when console mode is intentionally used.
- Google OAuth is passing when Google sign-in is expected, or shows a clear warning when it is intentionally disabled.
- The JSON endpoint returns the same check results without exposing secret values.
- Non-admin users cannot open the system check page or endpoint.

## Invitation Activation

Invitation acceptance links are valid for 72 hours. Resending an invitation should rotate the link
and start a fresh 72-hour window.

### Bootstrap Admin Invitation Opens Correctly

Run this test only on a fresh QA environment that was deployed with bootstrap admin enabled.

1. Open the bootstrap admin accept URL provided by the deployment owner.
2. Confirm the page shows `{ADMIN_EMAIL}`.
3. Confirm the primary action offers to send an email sign-in link.

Expected result:

- The bootstrap admin invitation page loads.
- The invited email matches `{ADMIN_EMAIL}`.
- The page does not activate the account until the admin signs in with `{ADMIN_EMAIL}`.
- The bootstrap invitation expires after 72 hours.

### Pending Invitation Opens Correctly

1. Open `https://{DOMAIN_NAME}/accept-invite?token={ADMIN_INVITE_TOKEN}` or
   `https://{DOMAIN_NAME}/accept-invite?token={CONTRACTOR_INVITE_TOKEN}`.
2. Confirm the page shows the invited email address.
3. Confirm the primary action offers to send an email sign-in link.

Expected result:

- The invitation page loads.
- The invited email matches `{INVITED_EMAIL}`.
- The page does not activate the account until the user signs in with the invited email.

### Activate Invited Account

1. Open `https://{DOMAIN_NAME}/accept-invite?token={ADMIN_INVITE_TOKEN}`.
2. Click `Email sign-in link`.
3. Open the email sent to `{INVITED_EMAIL}`.
4. Open the sign-in link from the email.
5. Confirm the invitation page now shows `Signed in as {INVITED_EMAIL}`.
6. Click `Activate account`.
7. Click `Continue`.

Expected result:

- The account activation succeeds.
- If the account has no passkey and no TOTP yet, the user is redirected to
  `https://{DOMAIN_NAME}/settings?setup=required...`.
- After adding a passkey or enabling TOTP, the user can open `https://{DOMAIN_NAME}/dashboard`.
- The member profile is active.
- Opening the same invitation link again shows that the invitation has already been accepted.

### Invitation Email Mismatch Is Blocked

1. Sign in as `{ADMIN_EMAIL}` or any account that is not `{INVITED_EMAIL}`.
2. Open `https://{DOMAIN_NAME}/accept-invite?token={CONTRACTOR_INVITE_TOKEN}`.
3. Try to activate the invitation.

Expected result:

- The page warns that the invitation belongs to a different email.
- The `Activate account` action is disabled or blocked.
- The member is not activated under the wrong auth account.

### Invalid Invitation Token

1. Open `https://{DOMAIN_NAME}/accept-invite?token={INVALID_INVITE_TOKEN}`.

Expected result:

- The page shows an invalid or unavailable invitation state.
- The app does not create or activate a user.

## Login

### Magic-Link Login For Active User

1. Start signed out.
2. Open `https://{DOMAIN_NAME}/login`.
3. Enter `{ADMIN_EMAIL}`.
4. Click `Email sign-in link`.
5. Open the email sent to `{ADMIN_EMAIL}`.
6. Open the sign-in link from the email.

Expected result:

- If 2FA is enabled and the browser is not trusted, the user lands on
  `https://{DOMAIN_NAME}/two-factor?...`.
- If the user has no passkey and no TOTP yet, the user lands on `/settings?setup=required...`.
- Otherwise, the user lands on `https://{DOMAIN_NAME}/dashboard`.

### Unknown Email Does Not Reveal Account State

1. Start signed out.
2. Open `https://{DOMAIN_NAME}/login`.
3. Enter `{UNKNOWN_EMAIL}`.
4. Click `Email sign-in link`.

Expected result:

- The UI shows a neutral success-style message.
- No account existence information is revealed in the browser.
- No app session is created for `{UNKNOWN_EMAIL}`.

### Password Setup For Active User

1. Sign in as `{ADMIN_EMAIL}` or `{CONTRACTOR_EMAIL}`.
2. Open `https://{DOMAIN_NAME}/settings`.
3. In the `Email password` section, click `Send setup link` or `Send reset link`.
4. Open the email sent to the same account.
5. Open the password setup link.
6. Enter a new password with at least 12 characters.
7. Confirm the password.
8. Click `Update password`.

Expected result:

- The password is accepted.
- The page confirms that the password was updated.
- An audit row is recorded for `security.password_reset`.
- Existing sessions for that auth account are revoked.

### Password Login For Active User

1. Start signed out.
2. Open `https://{DOMAIN_NAME}/login`.
3. Enter `{ADMIN_EMAIL}` or `{CONTRACTOR_EMAIL}`.
4. Enter the password created in the previous test.
5. Click `Sign in`.

Expected result:

- If 2FA is enabled and the browser is not trusted, the user lands on
  `https://{DOMAIN_NAME}/two-factor?...`.
- Otherwise, the user lands on `https://{DOMAIN_NAME}/dashboard`.
- Public sign-up is not available from the login screen.

### Password Sign-In Lockout And Recovery

1. Start signed out in a clean browser profile.
2. Open `https://{DOMAIN_NAME}/login`.
3. Enter `{LOCKOUT_TEST_EMAIL}` and a deliberately incorrect password.
4. Submit the password form five times within 15 minutes.
5. Confirm the fifth response says that there have been too many password sign-in attempts.
6. Enter the correct password before the 15-minute lock expires and submit it.
7. Wait until 15 minutes have elapsed from the fifth failed attempt.
8. Enter the correct password again and complete any required second factor.
9. Open `{AUDIT_LOG_VIEW}` and search for the tested member.

Expected result:

- The first four failed attempts show the same neutral invalid-credentials message.
- The fifth failed attempt and every password attempt during the temporary lock show a rate-limit message.
- A correct password does not bypass the active temporary lock.
- The lock expires automatically after 15 minutes; no administrator action is required.
- The account can sign in normally after expiry.
- The audit log contains `security.password_lockout` and, after the successful recovery sign-in,
  `security.password_lockout_recovered`.

### Authentication Endpoint Rate Limits

1. Start signed out in a clean browser profile.
2. Open `https://{DOMAIN_NAME}/login`.
3. Enter `{UNKNOWN_EMAIL}` and click `Email sign-in link` six times within 15 minutes.
4. Confirm the sixth request is refused with a rate-limit message.
5. Wait 15 minutes, then repeat the request once.

Expected result:

- The first five requests retain the neutral response and do not reveal whether the email exists.
- The sixth request shows a localized rate-limit message.
- The request is accepted again after the 15-minute rate-limit window.

### Password Reset For Unknown Email Is Neutral

1. Start signed out.
2. Open `https://{DOMAIN_NAME}/login`.
3. Enter `{UNKNOWN_EMAIL}`.
4. Click `Forgot password?`.

Expected result:

- The UI shows a neutral success-style message.
- No account existence information is revealed in the browser.
- No password reset email is sent to `{UNKNOWN_EMAIL}`.

### Company Google Login

Run this test only when Google auth is configured for `{COMPANY_GOOGLE_DOMAIN}`.

1. Make sure `{COMPANY_GOOGLE_EMAIL}` has already activated its invitation.
2. Start signed out.
3. Open `https://{DOMAIN_NAME}/login`.
4. Click `Continue with company Google`.
5. Choose `{COMPANY_GOOGLE_EMAIL}` in Google.

Expected result:

- Google sign-in succeeds only for the configured company Workspace domain.
- If this is the first Google sign-in for the activated account, the Google account is linked
  automatically.
- The user is then routed through the normal app gates: `/two-factor` when TOTP is enabled and the
  browser is not trusted, `/settings`, or `/dashboard`.

### Private Google Login Is Blocked

Run this test only when Google auth is configured.

1. Start signed out.
2. Open `https://{DOMAIN_NAME}/login`.
3. Click `Continue with company Google`.
4. Choose `{PRIVATE_GOOGLE_EMAIL}` or any Google account outside `{COMPANY_GOOGLE_DOMAIN}`.

Expected result:

- Google sign-in is rejected or returns to the login screen.
- No Sheet Happens auth account is created.
- No domain member is activated or linked to the private Google account.

### Inactive Member Cannot Create A New Session

1. Sign in as `{ADMIN_EMAIL}` and deactivate an active, non-admin test member from the People page.
2. Confirm that the member's existing browser session no longer opens protected pages.
3. In a clean browser profile, attempt password sign-in for the inactive member using a correct password.
4. Request a magic-link sign-in for the inactive member and confirm no email arrives.
5. If the inactive member has a passkey, attempt passkey sign-in.
6. If company Google sign-in is configured for the member, complete the Google provider flow.

Expected result:

- Deactivation revokes existing sessions.
- Password, passkey, and Google authentication do not create an application session for an inactive member.
- Magic-link requests stay neutral and do not deliver a usable sign-in link.
- The inactive member cannot open `/dashboard`, `/time`, `/timesheets`, `/settings`, or any admin route.

## Protected Routes

### Signed-Out User Is Redirected To Login

1. Start signed out in a clean browser profile.
2. Open `https://{DOMAIN_NAME}/dashboard`.
3. Open `https://{DOMAIN_NAME}/admin/people`.
4. Open `https://{DOMAIN_NAME}/settings`.

Expected result:

- Each protected page redirects to `/login`.
- The `callbackURL` points back to the originally requested page.

### Active Member Can Open Dashboard

1. Sign in as `{CONTRACTOR_EMAIL}` or `{EMPLOYEE_EMAIL}` after that account has either a passkey
   or TOTP enabled.
2. Open `https://{DOMAIN_NAME}/dashboard`.

Expected result:

- The dashboard opens in the app shell.
- The user menu shows the signed-in member.
- The sidebar and header are visible.

### Non-Admin Member Cannot Open People Admin

1. Sign in as `{CONTRACTOR_EMAIL}` or `{EMPLOYEE_EMAIL}` after that account has either a passkey
   or TOTP enabled.
2. Open `https://{DOMAIN_NAME}/admin/people`.

Expected result:

- The app shows an `Admin access required` account status page.
- The people table is not visible.

## Time Tracking

Run these tests as `{CONTRACTOR_EMAIL}` or `{EMPLOYEE_EMAIL}`. The user must be active and assigned
to `{TIME_TRACKING_PROJECT_A}` and `{TIME_TRACKING_PROJECT_B}` for `{TIME_TRACKING_WEEK_START}`.

`/time` opens on the `Week` stop of the detail-level control unless the URL carries `?zoom=` or the
browser remembers another level, so any scenario below that works in the grid selects `Grid` first.
Clearing site data for the domain resets the remembered level.

### Weekly Grid Loads Assigned Projects

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}`.
2. Select `Grid` on the detail-level control and confirm the weekly grid is visible.
3. Confirm `{TIME_TRACKING_PROJECT_A}` and `{TIME_TRACKING_PROJECT_B}` are listed.
4. Use the previous-week and next-week controls.
5. Return to `{TIME_TRACKING_WEEK_START}`.

Expected result:

- Only active assigned projects are listed.
- Week navigation keeps the user on `/time`.
- The week total and daily totals are visible.

### Create, Edit, And Delete Duration Entry

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}&zoom=grid`.
2. Click an empty cell for `{TIME_TRACKING_PROJECT_A}` on a non-future day.
3. Enter `{TIME_ENTRY_DESCRIPTION}`.
4. Enter duration `3h 20m`.
5. Save.
6. Open the same cell's entry details.
7. Edit the entry description to `{TIME_ENTRY_UPDATED_DESCRIPTION}` and duration to `200m`.
8. Save.
9. Open the entry details again and delete the entry.

Expected result:

- The empty cell opens the entry form because descriptions are required.
- `3h 20m` and `200m` are accepted as equivalent duration formats.
- The cell, day total, and week total update after create, edit, and delete.
- Deleted entries disappear from the grid.

### Create Interval Entry And Check Warnings

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}`.
2. Click `New entry`.
3. Choose `{TIME_TRACKING_PROJECT_A}`.
4. Choose a date in the selected week.
5. Switch the mode to `Interval`.
6. Enter start `09:00`, end `10:30`, and `{TIME_ENTRY_DESCRIPTION}`.
7. Save.
8. Create another interval on the same day that overlaps the first interval.
9. Create or edit entries so the day total exceeds 8 hours.
10. Try to create or edit entries so the day total exceeds 24 hours.

Expected result:

- Interval entries save with the correct calculated duration.
- Overlaps show a warning but do not block saving.
- More than 8 hours in one day shows a warning but does not block saving.
- More than 24 hours in one day is blocked.

### Timer Start And Stop

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}&zoom=grid`.
2. Click `New timer`.
3. Enter `{TIME_ENTRY_DESCRIPTION}` in the description field.
4. Choose `{TIME_TRACKING_PROJECT_A}`.
5. Click `Start`.
6. Confirm the running timer appears on the page and in the app header, at the `Grid` stop as well
   as at the `Day` and `Week` stops.
7. Confirm `New timer` is now disabled, and that hovering it explains that the running timer has to
   be stopped first.
8. Stop the timer from the card on the page.

Expected result:

- Only one timer can run for the user.
- The elapsed timer label changes while running without hydration errors.
- Stopping the timer creates a time entry on the timer start date.
- Reopening `https://{DOMAIN_NAME}/time?new=timer` directly opens the dialog with empty fields.
- Cancelling the dialog, or pressing `Escape`, leaves no timer running and no entry behind.

### Running Timer Is Visible And Stoppable From Every Page

1. Open `https://{DOMAIN_NAME}/time` and start a timer for `{TIME_TRACKING_PROJECT_A}`.
2. Navigate to `Dashboard`, then `Timesheets`, then an admin page such as `Projects`.
3. Confirm on each page that the header shows the running timer and that the elapsed reading keeps
   counting up rather than restarting at `0:00`.
4. Narrow the window to a mobile width and confirm the timer is still in the header — the elapsed
   time and the stop button remain, the project name gives way.
5. Stop the timer from the header while on the admin page.
6. Confirm the timer disappears from the header immediately, without a page reload.
7. Open `https://{DOMAIN_NAME}/time` and confirm the entry was saved on the day the timer started.

Expected result:

- The timer follows the user across every signed-in page and both breakpoints.
- Moving between pages neither hides the timer nor resets its elapsed reading.
- Stopping from any page clears the timer everywhere and writes the time entry.
- A page reload on any route still shows the running timer.

### Timer Discarded At The Daily Limit Says So

1. Log entries totalling close to 24 hours on one day for the test user.
2. Start a timer that would push that day past 24 hours, and let it run.
3. Navigate away from `Time`, then stop the timer from the app header.

Expected result:

- The timer disappears from the header rather than lingering as a phantom.
- The reason the time was discarded is shown next to where the timer was, and stays on screen until
  it is dismissed.
- No time entry is created for that day.

### Same As Yesterday Does Not Duplicate Existing Cells

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}`.
2. Create one entry for `{TIME_TRACKING_PROJECT_A}` on a test day.
3. Select the next day.
4. Click `Same as yesterday`.
5. Cancel the confirmation dialog.
6. Confirm no copied entry appears on the selected day.
7. Click `Same as yesterday` again.
8. Confirm the dialog.
9. Confirm the copied entry appears on the selected day.
10. Click `Same as yesterday` again for the same selected day and confirm the dialog.

Expected result:

- The quick action does not run until the confirmation dialog is confirmed.
- The first copy creates entries from the previous day.
- The second copy does not create duplicate entries in project/date cells that already contain time.
- The success message reports skipped entries when applicable.

### Duplicate Last Week Does Not Duplicate Existing Cells

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_PREVIOUS_WEEK_START}&zoom=grid`.
2. Create entries for `{TIME_TRACKING_PROJECT_A}` and `{TIME_TRACKING_PROJECT_B}`.
3. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}`.
4. Click `Duplicate last week`.
5. Cancel the confirmation dialog.
6. Confirm no previous-week entries appear in the current week.
7. Click `Duplicate last week` again.
8. Confirm the dialog.
9. Confirm the previous week's entries appear in the matching days of the current week.
10. Click `Duplicate last week` again and confirm the dialog.

Expected result:

- The quick action does not run until the confirmation dialog is confirmed.
- Entries are copied from the previous week into matching current-week days.
- Repeating the action skips project/date cells that already contain entries.
- Existing current-week entries are not overwritten.

### Draft Restore And Discard

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}`.
2. Click `New entry`.
3. Choose `{TIME_TRACKING_PROJECT_A}`.
4. Enter `{TIME_ENTRY_DESCRIPTION}` but do not save.
5. Wait until the form shows that the draft is saved.
6. Close the dialog.
7. Refresh the page.
8. Click `Restore draft`.
9. Confirm the form restores the project, date, duration mode, duration or interval values, and
   description.
10. Close the dialog again and click `Discard`.
11. Refresh the page.

Expected result:

- Drafts are restored after refresh.
- Discard removes the draft banner.
- Drafts never change the grid totals until saved as a real entry.

### Inactive Project Week

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}&zoom=grid`.
2. Choose an assigned project row with no entries in the week.
3. Mark the project as inactive for the week.
4. Undo the inactive mark.
5. Create an entry for the same project.
6. Try to mark the project inactive again.

Expected result:

- Empty project weeks can be marked inactive and restored.
- Project weeks with entries cannot be marked inactive until entries are removed.
- Inactive rows do not contribute missing-work signals.

### Time Entry Dialog Keyboard Behavior

1. Open a new time entry dialog.
2. Use `Tab` repeatedly.
3. Use `Shift+Tab` repeatedly.
4. Press `Escape`.
5. Open an existing entry details dialog and repeat the same keyboard checks.

Expected result:

- Keyboard focus stays inside the open dialog.
- `Escape` closes the dialog.
- Focus returns to the control that opened the dialog.

### Detail Level Axis And Its URL State

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}`.
2. Confirm the detail-level control shows `Day`, `Week`, `Grid` and `Month`, with `Week` selected.
3. Select a day other than today on the day strip above the level, then select `Day`, then `Grid`,
   then `Week` again.
4. Copy the address bar, open it in a new tab, and confirm the same level and the same selected day.
5. Select `Grid`, reload the page, then open `https://{DOMAIN_NAME}/time` with no query string.
6. Use the browser Back button.

Expected result:

- The chosen day stays chosen through every level change, in both directions.
- The address bar gains `zoom=` and `day=` as they change, and the page never reloads or flashes
  while they do — only the week controls reload the page.
- A copied address opens on the level and day it names.
- With no `zoom=` in the address, the page opens on the level last used in this browser.
- Back moves between weeks and pages, not between levels.

### Detail Level Keyboard Shortcuts

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}`.
2. Press `1`, `2`, `3` and `4` in turn.
3. Press `-` and then `+` three times each.
4. Press `[` and `]` at the `Week` level, then again at the `Month` level.
5. Press `t`.
6. Select `Grid`, click into a grid cell, and type `3.5` without saving.
7. Open `New entry`, and with the dialog open type `1`, `3` and `t` into the description field.

Expected result:

- `1`, `2`, `3` and `4` jump to `Day`, `Week`, `Grid` and `Month`.
- `-` moves one level out and `+` one level in, and neither wraps around at either end.
- `[` and `]` move one **week** back and forward at `Day`, `Week` and `Grid`, keeping the current
  level and the same weekday — and one **month** back and forward at `Month`, landing on the 1st of
  that month.
- The hint beside the control says which of the two `[` and `]` will do at the level you are on.
- `t` returns to this week with today selected, from any level.
- Typing in a grid cell or in the entry dialog changes no level: the digits land in the field.
- The arrow keys are not claimed by the level control anywhere on the page.

### Week Level On Desktop And Mobile

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}&zoom=week` on a desktop browser.
2. Confirm seven day columns, each with its day, its total, its entry cards, and an add affordance.
3. Scroll the page and confirm the day headers stay visible while the columns scroll together.
4. Add, edit and delete an entry from a column.
5. Click a day column's header.
6. Repeat step 1 on a phone-width viewport.
7. Tap a collapsed day, then tap the open day's header again.
8. Repeat the whole scenario in Hungarian and in both light and dark themes.

Expected result:

- A day with no entries says so rather than showing an empty column.
- Entry cards show the project, the description, the duration, and a marker for a warning or an
  administrator's correction.
- Clicking a day header opens that day at the `Day` level, with that day selected.
- On a phone the level is an accordion: the selected day is open, the others collapse to one row
  with the day and its total. Tapping a collapsed day opens it; tapping the open one zooms in.
- Every label is translated in both languages, and the level is legible in both themes.

### Week Columns Contain Their Cards, And Use A Wide Display

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}&zoom=week` on the widest
   display available, and log entries so that at least one day holds an entry with a start and end
   time (`09:00`–`18:00`, not a duration-only entry) and one holds an entry with a long
   single-word description.
2. Look along the seven columns at the right-hand edge of each one.
3. Measure how much empty page there is left and right of the content, and compare it with
   `https://{DOMAIN_NAME}/admin/projects` at the same window size.
4. Narrow the browser window down through roughly 1500px, 1300px and 1100px, watching the entry
   cards each time.
5. Widen it back out, then repeat at a phone-width viewport.
6. Repeat in Hungarian and in both light and dark themes.

Expected result:

- No entry card is wider than the column it sits in. Nothing hangs over the day to its right, and
  no card is clipped by the next column — at any window width, and with any description.
- A card's edit and delete buttons stay at the card's right edge at every width. They never sit
  outside the card and never drift as the window changes.
- On a wide display the page uses the same width as the admin screens rather than a narrower
  reading column, so the seven day columns are visibly wider than they were.
- Where a column is too narrow for the duration and the time range on one line, the time range
  moves under the duration. The duration itself is never shortened or ellipsised, and the card
  grows by one text line at most.
- A long single-word description wraps or is clipped to two lines inside the card; it never widens
  the card or the column.
- The phone accordion is unchanged: one open day, the rest collapsed to a summary row.

### Detail Level Focus And Scroll Continuity

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}&zoom=week`.
2. Tab to a day chip on the day strip, then press `3` and `2`.
3. Click a day column's header to zoom into that day.
4. Scroll to the bottom of a dense week, then press `1`.
5. Confirm the week total and the day total do not blank out or jump as levels change.

Expected result:

- Focus stays on the day chip across a level change, and never falls back to the top of the page.
- Zooming in from a day header leaves focus on that day's chip rather than nowhere.
- The selected day is scrolled into view rather than the page jumping to the top.
- The day strip, the week total and the day total stay in place at every level.

### Detail Level Motion And Capacity Bars

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_WEEK_START}&zoom=week` on a desktop browser
   and watch the page arrive.
2. Press `3`, then `2`, then `1`, then `2`, watching what each column and card does in between.
3. On the `Week` level, watch a dense day's column — one with eight or more entries — as it arrives.
4. Look at the bar under each day chip on the day strip. Compare a day under 8 hours, a day at
   roughly 8 hours, and a day over 8 hours, and hover each chip.
5. Add an entry to a day so its total crosses 8 hours, and watch that day's bar.
6. Repeat step 2 at a phone-width viewport.
7. Turn on the operating system's reduce-motion setting — macOS _Settings → Accessibility → Display
   → Reduce motion_, Windows _Settings → Accessibility → Visual effects → Animation effects_ — and
   repeat steps 1-5. Use the real OS setting, not the browser devtools emulation.
8. Turn the setting back off, and with a screen reader running (VoiceOver on macOS) press `1`, `2`
   and `3` in turn and listen.
9. Repeat the whole scenario in Hungarian and in both light and dark themes.

Expected result:

- **Nothing animates on the first paint.** The page arrives settled; no card flies in and no column
  slides on load, at any level.
- Changing level reads as one surface moving, not three screens swapping: a day's column visibly
  becomes its grid column header and back, rather than one list fading out while another fades in.
- The day strip itself never animates. It is the fixed point everything else moves against, and the
  focus ring on a day chip stays exactly where it was through a level change.
- Entry cards arriving after a level change fade up a few pixels, one shortly after the next.
  A column with many entries finishes its cascade quickly — it must not drizzle in for the better
  part of a second. Cards leaving fade out without moving.
- **No number ever counts up or rolls.** The day total, a card's duration and a grid cell's value
  change by swapping, never by tweening. Watch the day total specifically while pressing `1` and
  `2` with different days selected.
- The bar under each day chip fills in proportion to that day's hours against the 8-hour target.
  Under target it is mint and partly filled; at or over target it is full and amber. It never
  overflows its track, however many hours the day holds. Hovering a chip shows the two figures the
  bar stands for, in the same format as the rest of the page.
- A bar whose day crosses 8 hours animates from mint to amber rather than snapping.
- On a phone the level change still works and nothing flies in from the corner of the screen — the
  grid has no day headers at that width, so the week columns must simply appear rather than sliding
  in from the top-left.
- **With OS reduce-motion on, nothing moves.** Levels crossfade, cards appear and disappear without
  sliding, and the capacity bars snap to their new width. This is the check most likely to be
  missed: the app's global CSS reduce-motion rule does not reach this animation library, so a
  failure here means the level transitions will fly for every user who has the setting on.
- The screen reader announces the new level after each of `1`, `2` and `3` — the level's name, how
  many days it covers, and the total for that span — in the language the page is in. After `4` it
  names the month instead of a number of days.

### Month Level And The Month It Shows

Use a week that spans two months for this one — the month is taken from the selected day, not from
the week, and a week inside a single month cannot tell the two apart.

1. Open `https://{DOMAIN_NAME}/time?week={TIME_TRACKING_MONTH_SPANNING_WEEK_START}&zoom=month`.
2. Read the period row above the day strip, and the band below it.
3. On the day strip, select a day on the **earlier** month's side of the week, then a day on the
   **later** month's side. Watch the period row, the total and the band each time.
4. Confirm nothing spins, blanks out or reloads while you do — the address bar gains `day=` but the
   page stays put.
5. Press `[` and then `]`, then use the visible previous/next buttons beside the month name.
6. Press `t`.
7. Click a project row.
8. Press `4` again, then `2`, and watch the day strip and the total across both changes.
9. Repeat with a project you logged nothing against this month, and with a phone-width viewport.
10. Repeat the whole scenario in Hungarian and in both light and dark themes.

Expected result:

- The period row names the month, steps by month, and its total reads `Month total`. It is the same
  row that reads `Aug 31 - Sep 6, 2026` and `Week total` at the other three levels — one row, one
  total, changing only its label and its number.
- The month named is the month the **selected day** falls in. Moving the day strip across the month
  boundary changes the month, its total and its rows, with no page load and no spinner.
- The tracked band lists one row per project with the hours tracked against it in that month. A
  project you logged nothing against this month is still listed, at `0 h`, and reads quieter than
  the others.
- If the member has any declared assignment, a second band follows it. A declared project with
  nothing declared yet still gets a row, because that row is the form the figure is typed into.
- The month total counts every hour the month holds, tracked **and** declared, so the rows across
  both bands add up to it.
- `[` and `]` and the visible previous/next buttons do exactly the same thing: one month back or
  forward, landing on the 1st of that month with the week that contains it loaded. This is a real
  page load, unlike moving within the visible week.
- The `This month` pill appears only when the month shown is the current one; otherwise it is a
  button that returns to today, and `t` does the same.
- Clicking a project row returns to the `Grid` level on the week the day strip was already pointing
  at — the whole week, not a view filtered to that project.
- The day strip stays on screen at the month level, visibly quieter than at the other levels, and
  stays clickable. The day total beside it stays in place and keeps reading the selected day.
- Every label reads correctly in Hungarian and English, and the month name is in the page's own
  language — `2026. szeptember`, not `September 2026`, in Hungarian.

### Declare A Month's Hours On A Hybrid Project

Set up: as an administrator, set **one** of a member's project assignments to declared hours and
leave the rest tracked. Use `{TIME_TRACKING_PROJECT_B}` as the declared one. The month must hold no
tracked time entries for that project — the write refuses one that does, which is the double-count
guard and is checked separately below.

Run this as the member.

1. Open `https://{DOMAIN_NAME}/time` and read the line under the day strip.
2. Follow the link in that line.
3. Read the two bands and their headings.
4. In the declared row, press Save without typing anything, then type `{DECLARED_HOURS}` into the
   hours field and press Save again.
5. Type `{DECLARED_NOTE}` into the note field and press Save.
6. Read the month total in the period row, and add up the two bands yourself.
7. Type `{DECLARED_HOURS}:30` into the hours field, then `{DECLARED_HOURS}h`, saving each time.
8. Attach `{HOURS_PROOF_PDF_FILE}` in the proof slot, then open it with the view link.
9. Replace it with `{HOURS_PROOF_REPLACEMENT_PDF_FILE}` and open it again.
10. Press `1`, `2` and `3`, and look for the declared project in each level.
11. Reload the page and confirm the figure, the note and the proof are still there.
12. Repeat the whole scenario in Hungarian and in both light and dark themes, and at phone width.

Expected result:

- At Day, Week and Grid the declared project is **absent** from everything — the grid rows, the
  "Assigned" chips, the recent chips, the entry form's project picker and the timer dialog — and one
  line under the day strip explains why, naming the project and linking to the month. The line is
  information, not a banner, and it disappears at the month level where the project is on screen.
- The month has two bands: the tracked one first with a row per project, then the declared one.
- Save is unavailable until **both** the hours and the note have a value. A figure with no note
  cannot be saved at all, which is deliberate — the note becomes the entry's description, and a
  timesheet cannot be submitted without one.
- `52`, `52:30` and `52h` are all accepted and mean what they say, the same as everywhere else in
  the app. What is stored is minutes; what is shown is your own duration format.
- **The month total equals the tracked hours plus the declared hours**, and the rows add up to it.
  Check this arithmetic explicitly — it is the number a month is closed against.
- The proof shows its filename, size and upload time, opens as a PDF in a new tab, and can be
  replaced while the month is unlocked. Replacing it leaves exactly one proof, not two.
- Everything survives a reload, and every label reads correctly in both languages.

### Declared Hours Refuse The Ways They Could Double-Count

Run these as the member, on the declared project from the previous scenario.

1. At the Grid level, try to type hours into a cell for the declared project.
2. Press "New entry" and open the project picker.
3. Press "New timer" and open its project picker.
4. Press "Duplicate last week" in a week containing the 1st of a month that has a declared figure.
5. As an administrator, try to switch the assignment back to tracked hours while the declaration
   exists.
6. As an administrator, set a **second** project to declared for a month that already holds ordinary
   time entries for it, then have the member try to declare hours on it.

Expected result:

- The declared project is not offered anywhere at Day, Week or Grid, so steps 1-3 have nothing to
  select. There is no cell to type into and no entry to create.
- "Duplicate last week" copies the tracked entries and **not** the declared figure. The following
  month does not gain a 52-hour entry.
- The mode switch is refused with a message naming the month and what has to be removed first.
- Declaring hours on a month that already holds tracked entries for that project is refused, with a
  message saying to remove them first. This is the guard that keeps a month from counting the same
  hours twice; it is the single most important refusal in this feature.

### A Contractor Cannot Submit Declared Hours Without Their Proof

Run this as `{CONTRACTOR_EMAIL}`, with one declared assignment in `{TIMESHEET_MONTH}`.

1. Declare `{DECLARED_HOURS}` hours with a note, and do **not** attach a proof.
2. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}` and submit the month.
3. Attach `{HOURS_PROOF_PDF_FILE}` and submit again.
4. Return to `https://{DOMAIN_NAME}/time` at the month level.
5. Repeat with a declared assignment that has **no** hours declared against it at all.
6. Repeat step 1 and 2 as an employee rather than a contractor.

Expected result:

- Submission is refused while a declared figure has no proof, and the message **names the projects**
  whose proof is missing rather than saying only that something is wrong.
- With the proof attached the month submits normally, and the declared figure is one line on the
  timesheet with the right hours and the right amount.
- After submission the declared row is read-only: the figure, the note and the proof are still
  legible and the proof still opens, but nothing can be edited or replaced. That is the same
  `PeriodLock` that freezes ordinary entries — no new mechanism.
- A declared assignment with **no** hours does not block submission. That is a quiet month, not a
  missing document.
- An employee has no submission gate at all, so a missing proof stays a warning on their month and
  never blocks anything. That asymmetry is deliberate.

### An Administrator Reviews Declared Hours Against The Invoice

Run this as `{ADMIN_EMAIL}`, on the submitted month from the previous scenario.

1. Open `https://{DOMAIN_NAME}/admin/timesheets` and open that contractor's `{TIMESHEET_MONTH}`.
2. Read the submitted snapshot, project by project.
3. Read the date on the declared project's line.
4. Open the proof from the review page.
5. Compare the snapshot total with the uploaded invoice amount.

Expected result:

- The declared project is marked as declared monthly, so a reviewer is not left inferring it from
  an entry count of one.
- Its caption reads as hours declared for the month rather than as a count of entries.
- **The line's date reads as the month and the word "declared", not `Sep 1`.** A reviewer must not
  be able to take it for work done on the first of the month.
- The proof opens as a PDF in a new tab from the review page, the same way the invoice does, and
  the filename, size and upload time are shown beside it.
- The declared hours are counted into the project total, the snapshot total and the figure the
  invoice is checked against — exactly like tracked hours, because they are the same kind of record.

### Reports Exclude Declared Hours And Say So

Run this as `{ADMIN_EMAIL}`, with the hybrid project from the first scenario.

1. Open `https://{DOMAIN_NAME}/admin/reports` for the month that holds the declared figure.
2. Read the total hours and the line above the table.
3. Filter to the declared project only.
4. Filter to a member whose assignments are **all** declared.
5. Export the report as a PDF, in both languages, and read the footnotes.
6. Open the report row editor for a **tracked** entry dated the 1st of that month, change its
   duration, and save.

Expected result:

- The report totals **only** the tracked hours. The declared figure is absent from the totals, the
  charts, the table and the export.
- A line above the report states that declared hours were excluded and how many members and
  projects that covers. It gives **counts and never amounts**, and is worded so it can be read
  outside the company.
- A member with only declared assignments stays selectable in the filters, and the empty result says
  _why_ it is empty rather than showing a blank table.
- The exported PDF carries the same disclosure as a footnote, in the language the export was made
  in.
- **The tracked entry dated the 1st saves normally.** This is the one to watch: the declared figure
  sits on that same date, and if it were counted into the day's total the edit would fail with a
  24-hour message about hours nothing on the screen shows.

### Declared Assignments Are Flagged Monthly, Not Weekly

Run this as `{ADMIN_EMAIL}`.

1. Open `https://{DOMAIN_NAME}/dashboard` mid-month, with a declared assignment that has nothing
   declared for the **current** month but does for the previous one.
2. Then remove the previous month's declaration and reload.
3. Mark that project inactive for the current week, if the option is offered, and reload.
4. Compare against a tracked assignment with nothing logged this week.

Expected result:

- A declared assignment with the **last ended month** declared is not flagged, whatever the current
  week looks like. It must not nag for three weeks out of four while a member waits for month end.
- A declared assignment with nothing declared for the last ended month **is** flagged.
- An inactive-week marker is not offered for a declared assignment and does not excuse a missing
  declaration if one exists — "nothing happened this week" says nothing about a monthly figure.
- A tracked assignment keeps the weekly rhythm it has always had.

### The Proof Upload Rejects What It Should

Run this as the member with a declared assignment and hours already declared.

1. Try to attach the proof **before** declaring any hours.
2. Attach a PNG or a Word file.
3. Rename a non-PDF file to end in `.pdf` and attach it.
4. Attach a PDF larger than 10 MB.
5. Attach a valid PDF and then open the proof link while signed in as a **different** member.

Expected result:

- The proof slot is not offered before hours are declared, and says so rather than being silently
  absent.
- A non-PDF is rejected by type, and a renamed non-PDF is rejected too — the check reads the file's
  own bytes, not its name.
- An oversized file gives a real message naming the size limit. It must not fail silently or with a
  generic error, which is what would happen if it reached the 12 MB server-action limit instead.
- Every rejection is reported on the row that asked for it, not on the whole month.
- Another member's proof link is a 404, not a document.

### A Declared-Only Member Sees Only The Month

Set up: as an administrator, set every one of a member's project assignments to declared hours (or
set the member default to declared and leave every assignment inheriting it).

1. Sign in as that member and open `https://{DOMAIN_NAME}/time`.
2. Then open `https://{DOMAIN_NAME}/time?zoom=week` and `?zoom=grid` directly.
3. Press `1`, `2`, `3`, `-` and `+`.
4. Press `[`, `]` and `t`.
5. Read the bands and their headings.
6. Declare `{DECLARED_HOURS}` hours with `{DECLARED_NOTE}` and attach `{HOURS_PROOF_PDF_FILE}`.
7. Confirm with a hybrid member — some assignments tracked, some declared — that nothing changed
   for them.

Expected result:

- There is **no** detail-level control at all: one stop is not a choice.
- The page opens on the month, and a `zoom=` in the address naming any other level still opens on
  the month.
- No digit or step key reaches another level.
- `[`, `]` and `t` still work, and the hint beside where the control would be lists only those.
- **Both band headings are gone**, and so is the tracked band: with one kind of hours there is
  nothing to distinguish, so this member sees one form and no labels above it. There is also no
  handoff line, because there is nothing to hand off to.
- The month total is the declared figure, and declaring, noting and proving work exactly as they do
  for a hybrid member.
- A hybrid member keeps all four stops, opens on the week as before, sees **both** bands with their
  headings, and sees their tracked projects in the tracked band.

### An Administrator Corrects A Declared Figure On A Member's Behalf

Run this as `{ADMIN_EMAIL}`. Set up: one member with a declared assignment who has declared
`{DECLARED_HOURS}` hours for the current month with `{HOURS_PROOF_PDF_FILE}` attached, one declared
assignment that nobody has declared against yet, and — for step 8 — one contractor whose month is
held by a submitted timesheet.

1. Open `https://{DOMAIN_NAME}/admin/declared-hours` and read the three counters beside the month.
2. Step to the previous month and back with the arrows, then use "This month". Watch the address bar,
   and then press the browser's Back button twice.
3. Open `https://{DOMAIN_NAME}/admin/declared-hours?month=1999-13-99` and then `?month=` with nothing
   after it.
4. Find the row that has nothing declared, and the one with a figure but no proof.
5. On the row with a proof, open the proof from the table, then press Correct and open it again from
   inside the drawer.
6. In the drawer, clear the note and try to save. Put the note back, clear the reason and try again.
7. Type `{DECLARED_HOURS}:30` into the hours field, give a reason, and save.
8. Look at the locked contractor's row, at your own row if you have a declared assignment, and at a
   row whose assignment has been ended so it no longer covers the month.
9. Sign in as the corrected member: open their notifications, then `/time` at the month level.
10. Sign in as a non-admin and open `https://{DOMAIN_NAME}/admin/declared-hours` directly.
11. Repeat in Hungarian, in both light and dark themes, and at phone width.

Expected result:

- The page lists one row per member and declared project for the month — including rows with
  **nothing declared yet**, which is the main thing it exists to make visible. The counters read
  declared total, how many figures are missing, and how many figures have no proof.
- The month lives in the address as `?month=YYYY-MM-01`, so a month is linkable and the browser's
  Back button means "the previous month I was looking at". A nonsense or empty `month=` falls back to
  the current month rather than erroring.
- The proof opens as a PDF from both the table and the drawer. An admin can **open** a proof but
  never upload or replace one — that stays with the member, and the note under the table says so.
- Save is unavailable until the hours, the note **and** the reason all have a value. The reason is
  mandatory: it is what the member reads in their notification.
- Hours accept `52`, `52:30` and `52h`, the same grammar the member's own row takes. A figure above
  24 h × the days in that month warns and still saves.
- Three rows offer no correction, each saying **why** rather than showing a dead button: a locked
  month, your own declaration (correct it on your own `/time`, so the reason is not lost), and an
  assignment that no longer covers the month.
- The corrected member gets a time-entry admin-modification notification carrying the reason, and
  their own month level shows the new figure. The audit log has the correction with before/after
  values.
- A non-admin cannot reach the page at all.
- Reports still exclude the corrected hours, and the contractor's timesheet still includes them —
  a correction changes the figure, never which chain it belongs to.

## Contractor Timesheets

Run these tests as `{CONTRACTOR_EMAIL}` unless the scenario says otherwise.

### Contractor Can Open Monthly Preview

1. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
2. Confirm the Timesheets page opens in the app shell.
3. Confirm the current and previous month controls are visible.
4. Confirm the selected month shows a status.
5. Confirm the summary shows hours, amount, and entry count.
6. Confirm the project breakdown is grouped by project.

Expected result:

- Contractors can access `/timesheets`.
- The preview is calculated from current time entries when no submitted snapshot exists.
- Projects show total hours, rate state, currency, and amount.
- Hours in the summary and the project breakdown render decimal at two fraction digits (e.g.
  `9.50 h`) next to the amount, regardless of the `Time display` preference set in Settings.
- Missing rates or mixed currencies are shown as warnings instead of hidden.

### Contractor Workflow Stepper Follows The Monthly Status

Use a month that can be taken through the complete workflow. Check both
`https://{DOMAIN_NAME}/dashboard` and
`https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}` after every status change.

1. Before submitting the month, open both pages as `{CONTRACTOR_EMAIL}`.
2. Confirm the status is `Not created` and the first workflow node is current.
3. Hover over each locked node and then reach each locked node using only the keyboard.
4. Submit the month and reopen both pages.
5. As `{ADMIN_EMAIL}`, reject the submitted timesheet using `{TIMESHEET_REJECTION_REASON}`.
6. Reopen both contractor pages as `{CONTRACTOR_EMAIL}`.
7. Correct the time entries, resubmit the month, and approve it as `{ADMIN_EMAIL}`.
8. Reopen both contractor pages and upload `{INVOICE_PDF_FILE}` with `{INVOICE_NUMBER}` and
   `{INVOICE_AMOUNT}`.
9. As `{ADMIN_EMAIL}`, reject the invoice using `{INVOICE_REJECTION_REASON}`.
10. Reopen both contractor pages.
11. Upload `{CANCELLATION_INVOICE_PDF_FILE}` and then `{CORRECTED_INVOICE_PDF_FILE}` through the
    correction flow.
12. As `{ADMIN_EMAIL}`, accept the corrected invoice.
13. Reopen both contractor pages and then mark the invoice as paid as `{ADMIN_EMAIL}`.
14. Reopen both contractor pages one final time.

Expected result:

- `Not created` shows the first node as current and all later nodes as locked.
- Submitted shows the submitted node as current and the next-action panel says admin approval is
  pending.
- Timesheet rejection marks the submitted node red with an X, shows the rejection reason, and
  offers the correction path.
- Approved shows the approved node as current and enables the invoice upload form.
- Invoice upload shows the invoice node as current and the next-action panel says invoice review
  is pending.
- Invoice rejection marks the invoice node red with an X and offers the cancellation/corrected
  invoice flow.
- Invoice acceptance shows payment as the current step and identifies payment as the remaining
  admin action.
- Paid shows all five nodes as completed and no workflow action can be repeated.
- Every locked-node explanation is readable with both pointer hover and keyboard focus.
- The dashboard next-action CTA always opens the page where the stated action can be completed.

### Workflow Stepper Localization And Narrow Screens

1. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}` in English.
2. Record the status, five workflow labels, locked explanations, invoice section, and next-action
   wording.
3. Change the language to Hungarian without changing the selected month.
4. Confirm the same workflow state remains selected and all recorded text is Hungarian.
5. Test the page at a narrow mobile viewport.
6. Move through the workflow nodes horizontally and focus each locked node.

Expected result:

- Changing language does not change the selected month or workflow state.
- Statuses, workflow labels, tooltips, locked-state explanations, and CTAs are bilingual.
- The five nodes remain readable on a narrow screen through horizontal scrolling.
- The stepper does not widen the whole page or overlap adjacent content.
- Keyboard focus remains visible and locked explanations are not hover-only.

### Contractor Can Submit Monthly Timesheet

1. Sign in as `{CONTRACTOR_EMAIL}`.
2. Ensure `{TIMESHEET_MONTH}` has at least one time entry with a description.
3. Ensure all projects in `{TIMESHEET_MONTH}` resolve to the same currency.
4. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
5. Click `Submit timesheet`.
6. Confirm the dialog explains that source time entries will be locked.
7. Confirm the submit action.
8. Open `https://{DOMAIN_NAME}/time` and navigate to a week inside `{TIMESHEET_MONTH}`.
9. Try to edit or delete a submitted time entry.

Expected result:

- The timesheet status changes to submitted.
- The monthly preview switches to the submitted snapshot source.
- The selected month can no longer be submitted again.
- Source time entries in that month are locked and cannot be edited or deleted.
- The audit log contains a `timesheet.submitted` event for the submitted month.

### Contractor Cannot Submit Invalid Monthly Timesheet

1. Sign in as `{CONTRACTOR_EMAIL}`.
2. Open a month with no entries, missing rates, or mixed currencies.
3. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
4. Check the submit button state.

Expected result:

- The submit button is disabled when the month has no entries, missing rates, or mixed currencies.
- The page shows a factual reason near the submit button.
- Missing rates and mixed currencies are also visible as warnings.

### Admin Can Approve Submitted Timesheet

1. Sign in as `{CONTRACTOR_EMAIL}`.
2. Submit `{TIMESHEET_MONTH}` from `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
3. Sign in as `{ADMIN_EMAIL}`.
4. Open `https://{DOMAIN_NAME}/admin/timesheets`.
5. Filter by `{CONTRACTOR_EMAIL}`, `{TIMESHEET_MONTH}`, or submitted status.
6. Open the submitted timesheet review.
7. Confirm the snapshot shows project totals, source lines, rates, currency, and amount.
8. Click `Approve timesheet`.
9. Reopen the contractor timesheet month.

Expected result:

- The admin review list is reachable from the sidebar approval menu.
- The submitted timesheet appears in the filtered admin list.
- The detail page reviews the immutable submitted snapshot, not live editable entries.
- Hours in the admin list, the review summary, the project snapshot, and every source line render
  decimal at two fraction digits (e.g. `9.50 h`) next to their amount, regardless of the admin's
  `Time display` preference.
- Each project caption in the snapshot names the unit once (`81.75 h, 18 entries` /
  `81,75 h, 18 bejegyzés`, a declared project `52.00 h declared for the month`), never `h h` or
  `h óra`.
- Approval changes the status to approved.
- Source time entries remain locked after approval.
- The audit log contains a `timesheet.approved` row.

### Admin Can Bulk Approve Submitted Timesheets

1. Prepare at least two submitted contractor timesheets and one timesheet in another status.
2. Sign in as `{ADMIN_EMAIL}`.
3. Open `https://{DOMAIN_NAME}/admin/timesheets`.
4. Filter the list so the prepared timesheets appear on the same page.
5. Confirm that only submitted rows have enabled selection checkboxes.
6. Select one submitted row and confirm the bulk action bar appears with the correct count.
7. Clear the selection and confirm the action bar disappears.
8. Use the header checkbox to select every submitted row on the current page.
9. Click the bulk approval action.
10. Reopen the approved rows and inspect the audit log.

Expected result:

- Non-submitted rows cannot be selected for bulk approval.
- Select all affects only submitted rows on the current page, not other pages or filtered-out rows.
- The action bar shows the selected count and keeps the current filters after approval.
- Every selected timesheet changes to approved, while non-selected rows remain unchanged.
- Each approved timesheet has its own approved workflow event and `timesheet.approved` audit row.
- Source time entries remain locked after bulk approval.

### Bulk Approval Rejects A Stale Selection

1. Open the same submitted timesheet list as `{ADMIN_EMAIL}` in two browser windows.
2. Select the same submitted timesheet in both windows.
3. Approve it from the first window.
4. In the second window, include that stale selection in a bulk approval attempt.

Expected result:

- The second bulk action reports that the selection changed and asks the admin to refresh.
- The entire second batch is rejected; it does not partially approve the other selected rows.
- No duplicate approval event or audit row is created for the already approved timesheet.

### Contractor Can Upload Invoice For Approved Timesheet

1. Sign in as `{CONTRACTOR_EMAIL}`.
2. Submit `{TIMESHEET_MONTH}` from `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
3. Sign in as `{ADMIN_EMAIL}`.
4. Open `https://{DOMAIN_NAME}/admin/timesheets`.
5. Open the submitted timesheet review.
6. Approve the timesheet.
7. Sign in again as `{CONTRACTOR_EMAIL}`.
8. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
9. Confirm the contractor invoice panel is visible.
10. Enter `{INVOICE_NUMBER}`.
11. Enter `{INVOICE_AMOUNT}`.
12. Confirm the currency matches the approved timesheet currency.
13. Choose `{INVOICE_PDF_FILE}`.
14. Click `Upload invoice`.
15. Reopen the same month.

Expected result:

- The invoice panel is only available after admin approval.
- The PDF upload succeeds and the page confirms the invoice was uploaded.
- The timesheet status changes to invoiced.
- The invoice summary shows invoice number, amount, file name, upload time, and uploaded status.
- Uploading a second invoice for the same approved revision is blocked.
- The audit log contains an `invoice.uploaded` row.
- The timesheet event history contains an invoice uploaded event.

### Contractor Cannot Upload Invalid Invoice

1. Sign in as `{CONTRACTOR_EMAIL}`.
2. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}` for a month that is not yet approved.
3. Confirm the invoice section is visible in a locked state, explains that admin approval is
   required, and does not show an upload form.
4. Submit and approve the month through the normal contractor and admin flow.
5. Return to `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
6. Try uploading without an invoice file.
7. Try uploading a non-PDF file.
8. Try uploading a PDF larger than 10 MB.
9. Try uploading with an empty invoice number.
10. Try uploading with a zero or negative amount.

Expected result:

- The contractor cannot upload an invoice before approval.
- The unavailable invoice step remains visible and explains how it becomes available.
- Invalid file, amount, and invoice number attempts show clear error messages.
- Invalid attempts do not change the timesheet status.
- Invalid attempts do not create invoice or document records.

### Admin Can Review And Accept Uploaded Invoice

1. Sign in as `{CONTRACTOR_EMAIL}`.
2. Submit `{TIMESHEET_MONTH}` from `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
3. Sign in as `{ADMIN_EMAIL}`.
4. Open `https://{DOMAIN_NAME}/admin/timesheets`.
5. Open the submitted timesheet review.
6. Approve the timesheet.
7. Sign in again as `{CONTRACTOR_EMAIL}`.
8. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
9. Upload `{INVOICE_PDF_FILE}` with `{INVOICE_NUMBER}` and `{INVOICE_AMOUNT}`.
10. Sign in again as `{ADMIN_EMAIL}`.
11. Open `https://{DOMAIN_NAME}/admin/timesheets`.
12. Filter by invoiced status, `{CONTRACTOR_EMAIL}`, or `{TIMESHEET_MONTH}`.
13. Open the invoiced timesheet review.
14. Confirm the uploaded PDF is rendered inside the invoice reconciliation section.
15. Confirm the invoice metadata and declared amount are shown next to the system total.
16. Open the PDF in a separate tab from the review page.
17. Click `Accept invoice`.

Expected result:

- The uploaded PDF is visible to the admin before acceptance.
- The admin can compare the PDF manually with the approved timesheet totals.
- The review page shows whether the declared invoice amount matches the system amount.
- Accepting the invoice changes the timesheet status to accepted.
- The invoice status changes to accepted and can no longer be reviewed again.
- The audit log contains an `invoice.accepted` row.
- The timesheet event history contains an invoice accepted event.

### Admin Can Mark Accepted Invoice As Paid

1. Sign in as `{CONTRACTOR_EMAIL}`.
2. Submit `{TIMESHEET_MONTH}` from `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
3. Sign in as `{ADMIN_EMAIL}`.
4. Open `https://{DOMAIN_NAME}/admin/timesheets`.
5. Open the submitted timesheet review.
6. Approve the timesheet.
7. Sign in again as `{CONTRACTOR_EMAIL}`.
8. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
9. Upload `{INVOICE_PDF_FILE}` with `{INVOICE_NUMBER}` and `{INVOICE_AMOUNT}`.
10. Sign in again as `{ADMIN_EMAIL}`.
11. Open the invoiced timesheet review.
12. Accept the invoice.
13. Confirm the invoice reconciliation section shows the paid action.
14. Click `Mark as paid`.
15. Reopen `https://{DOMAIN_NAME}/admin/timesheets` and read the list without touching a filter.
16. Tick `Kifizetettek mutatása` / `Show paid` and apply.
17. Take the `Kifizetettek is látszanak` / `Paid included` chip off again.
18. Filter by paid status alone, leaving the checkbox unticked.
19. Add `{CONTRACTOR_EMAIL}` or `{TIMESHEET_MONTH}` to that filter, then page to the second page if
    there is one.
20. Open the paid timesheet review.
21. Sign in again as `{CONTRACTOR_EMAIL}`.
22. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.

Expected result:

- The paid action is only visible after the invoice has been accepted.
- Marking as paid changes the timesheet status to paid.
- The unfiltered list leaves the paid timesheet out, and the `Showing x-y of z` count drops with it —
  the queue shows what is still to do, not what is settled.
- Ticking the checkbox brings it back, puts `includePaid=1` in the URL, and produces one chip;
  taking that chip off hides paid rows again **and** unticks the box.
- Filtering by paid status shows paid rows even with the box unticked: an explicit status filter is
  itself the request. A list that comes back empty because two filters disagree is the failure here.
- Paging carries `includePaid=1` along with the other filters.
- `Törlés` / `Clear` returns to the default, paid rows hidden.
- The contractor monthly preview shows the paid status.
- Source time entries remain locked.
- The same timesheet cannot be marked as paid again.
- The audit log contains a `timesheet.paid` row.
- The timesheet event history contains a paid event.

### Admin Can Reject Uploaded Invoice And Contractor Must Upload Cancellation Before Replacement

1. Sign in as `{CONTRACTOR_EMAIL}`.
2. Submit `{TIMESHEET_MONTH}` from `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
3. Sign in as `{ADMIN_EMAIL}`.
4. Open `https://{DOMAIN_NAME}/admin/timesheets`.
5. Open the submitted timesheet review.
6. Approve the timesheet.
7. Sign in again as `{CONTRACTOR_EMAIL}`.
8. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
9. Upload `{INVOICE_PDF_FILE}` with `{INVOICE_NUMBER}` and `{INVOICE_AMOUNT}`.
10. Sign in again as `{ADMIN_EMAIL}`.
11. Open the invoiced timesheet review.
12. Confirm the uploaded PDF is rendered inside the invoice reconciliation section.
13. Enter `{INVOICE_REJECTION_REASON}` in the invoice rejection reason field.
14. Click `Reject invoice`.
15. Sign in again as `{CONTRACTOR_EMAIL}`.
16. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
17. Confirm the invoice rejection reason is visible.
18. Confirm the page asks for a cancellation invoice before the corrected invoice.
19. Confirm the cancellation amount is the negative amount of the rejected invoice and cannot be changed.
20. Enter `{CANCELLATION_INVOICE_NUMBER}`.
21. Choose `{CANCELLATION_INVOICE_PDF_FILE}`.
22. Click `Upload cancellation invoice`.
23. Confirm the page now asks for the corrected invoice.
24. Enter `{CORRECTED_INVOICE_NUMBER}`.
25. Choose `{CORRECTED_INVOICE_PDF_FILE}`.
26. Confirm the corrected invoice amount and currency.
27. Click `Upload replacement invoice`.
28. Sign in again as `{ADMIN_EMAIL}`.
29. Open the invoiced timesheet review again.
30. Confirm the replacement PDF is rendered as the main invoice.
31. Confirm the cancellation invoice is visible as a related invoice document and can be opened.
32. Click `Accept invoice`.

Expected result:

- Rejecting an uploaded invoice changes the timesheet status to invoice rejected.
- The contractor sees the rejection reason and cannot upload the corrected invoice before the cancellation invoice.
- The cancellation invoice must be a PDF and must have the negative amount and same currency as the rejected invoice.
- Uploading the cancellation invoice does not change the timesheet back to invoiced yet.
- Uploading the corrected invoice moves the timesheet back to invoiced.
- The old rejected invoice is not accepted by accident.
- The admin can render the corrected PDF and open the related cancellation PDF before acceptance.
- Accepting the corrected invoice also accepts the uploaded cancellation invoice.
- The audit log contains `invoice.rejected`, cancellation `invoice.uploaded`, corrected `invoice.uploaded`, and `invoice.accepted` rows.
- The timesheet event history contains invoice rejected, cancellation upload, corrected upload, and invoice accepted events.

### Admin Can Reject And Unlock Submitted Timesheet

1. Sign in as `{CONTRACTOR_EMAIL}`.
2. Submit `{TIMESHEET_MONTH}` from `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
3. Sign in as `{ADMIN_EMAIL}`.
4. Open `https://{DOMAIN_NAME}/admin/timesheets`.
5. Open the submitted timesheet review.
6. Enter `{TIMESHEET_REJECTION_REASON}` in the rejection reason field.
7. Click `Reject and unlock month`.
8. Sign in again as `{CONTRACTOR_EMAIL}`.
9. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
10. Confirm the rejection reason is visible.
11. Open `https://{DOMAIN_NAME}/time` and navigate to a week inside `{TIMESHEET_MONTH}`.
12. Edit one of the previously locked entries.
13. Return to `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}` and submit again.

Expected result:

- Rejection changes the status to rejected.
- The rejected month is unlocked for contractor edits.
- The contractor preview recalculates from current time entries after rejection.
- The rejection reason remains visible until resubmission.
- Resubmission creates a new revision.
- The audit log contains `timesheet.rejected`, and the timesheet event history includes rejected
  and unlocked events.

### Admin Can Fix Mixed-Currency Timesheet Blocking

1. Sign in as `{ADMIN_EMAIL}`.
2. Configure `{CONTRACTOR_EMAIL}` so `{TIMESHEET_PROJECT_A}` resolves to `{TIMESHEET_CURRENCY_A}` during `{TIMESHEET_MONTH}`.
3. Configure `{CONTRACTOR_EMAIL}` so `{TIMESHEET_PROJECT_B}` resolves to `{TIMESHEET_CURRENCY_B}` during `{TIMESHEET_MONTH}`.
4. Sign in as `{CONTRACTOR_EMAIL}`.
5. Add time entries with descriptions for both `{TIMESHEET_PROJECT_A}` and `{TIMESHEET_PROJECT_B}` inside `{TIMESHEET_MONTH}`.
6. Open `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
7. Confirm the submit button is disabled because the month contains multiple currencies.
8. Sign in again as `{ADMIN_EMAIL}`.
9. Open the admin rates page.
10. Open `{CONTRACTOR_EMAIL}` in the rate drawer.
11. Find the central rate or project override that causes `{TIMESHEET_PROJECT_A}` or `{TIMESHEET_PROJECT_B}` to resolve to the wrong currency.
12. Click `Replace` on that rate period.
13. Set `Replace from` to the first day of `{TIMESHEET_MONTH}`.
14. Enter the corrected rate amount and currency so every effective rate for `{CONTRACTOR_EMAIL}` in `{TIMESHEET_MONTH}` resolves to one currency.
15. Submit the replacement.
16. Confirm the rate is corrected for `{TIMESHEET_MONTH}`. If the selected date equals the period start, the same period is replaced in place; if it is later than the period start, the old period ends on that date and a replacement starts there.
17. Confirm the audit log contains rate replacement entries.
18. Sign in again as `{CONTRACTOR_EMAIL}`.
19. Reopen `https://{DOMAIN_NAME}/timesheets?month={TIMESHEET_MONTH}`.
20. Submit the timesheet.

Expected result:

- The mixed-currency month is blocked before the admin rate fix.
- The project breakdown shows which projects resolve to different currencies.
- Admin fixes the problem through rate period replacement, not by editing the timesheet amount directly.
- After the fix, the preview recalculates from current time entries and shows a single currency.
- The submit button becomes enabled and the timesheet can be submitted.

### Employee Cannot Open Timesheets

1. Sign in as `{EMPLOYEE_EMAIL}`.
2. Open `https://{DOMAIN_NAME}/timesheets`.
3. Check the sidebar and mobile navigation.

Expected result:

- The employee is shown an account-status message that contractor profile is required.
- The Timesheets navigation item is not visible for the employee.

## Payslips

Run admin scenarios as `{ADMIN_EMAIL}`. Run employee scenarios as `{EMPLOYEE_EMAIL}`. The employee
must have an active employee profile; contractor profiles must not be used for these tests.

### Admin Can Upload A Payslip

1. Sign in as `{ADMIN_EMAIL}` and open `https://{DOMAIN_NAME}/admin/payslips`.
2. In the month overview, click `{EMPLOYEE_EMAIL}` or choose `Upload payslip`.
3. Confirm the month selector shows the twelve months of the overview month's calendar year and initially selects the overview month — the previous month by default.
4. Use the previous-year and next-year buttons. Confirm each step replaces the grid with all 12 months of the adjacent calendar year, then return to the year containing `{PAYSLIP_MONTH}`.
5. Select `{EMPLOYEE_EMAIL}` and `{PAYSLIP_MONTH}`.
6. Upload `{PAYSLIP_PDF_FILE}` and submit.
7. Confirm the row appears in the history list with the employee, month, filename, upload date, and publisher.
8. Open Preview and confirm the embedded PDF renders.
9. Download the PDF and confirm the downloaded file is the uploaded document.

Expected result:

- Only employee profiles can be selected for upload.
- Month navigation is calendar-year based and does not limit older or future years.
- The PDF is private: preview and download work only through authenticated application access.
- The month overview increments its posted count and removes the employee from the missing list when applicable.
- Audit log entries exist for `payslip.uploaded`, `payslip.previewed`, and `payslip.downloaded`.

### Payslip File Validation And Replacement

1. On `https://{DOMAIN_NAME}/admin/payslips`, start an upload and select `{NON_PDF_FILE}`.
2. Confirm the form rejects the file before upload.
3. Upload `{PAYSLIP_PDF_FILE}` for `{EMPLOYEE_EMAIL}` and `{PAYSLIP_MONTH}` if no payslip exists yet.
4. Use Replace on that row.
5. Upload `{PAYSLIP_REPLACEMENT_PDF_FILE}` and confirm the replacement action.
6. Preview and download the row again.

Expected result:

- Non-PDF files, missing files, and files over 10 MB are blocked with a clear error.
- Replacement leaves exactly one current payslip for the selected employee/month.
- Preview and download use the replacement PDF, not the old PDF.
- Audit rows exist for `payslip.replaced` and the subsequent preview/download actions.

### Admin Can Delete And Reupload A Payslip

1. Find the `{EMPLOYEE_EMAIL}` / `{PAYSLIP_MONTH}` row in the admin payslip history.
2. Click Delete and confirm the destructive action.
3. Confirm the row is no longer in the current history list and the employee is shown as missing for the selected month when active.
4. Upload `{PAYSLIP_PDF_FILE}` for the same employee and month again.

Expected result:

- Deletion removes the current document and permits a later reupload for the same employee/month.
- An audit row exists for `payslip.deleted`.

### Employee Can Access Only Their Own Payslips

1. Sign in as `{EMPLOYEE_EMAIL}` and open `https://{DOMAIN_NAME}/payslips`.
2. Confirm the newest payslip is shown first and older months remain available below it.
3. Preview and download `{PAYSLIP_MONTH}`.
4. When the test employee has at least 14 historical payslips, use the history pager and confirm the older documents load on the next page while the newest payslip remains featured.
5. Copy the preview URL path from the browser network tools, sign in as a different employee or contractor, and open that same application URL.
6. As a contractor, confirm the Payslips navigation item is absent and open `https://{DOMAIN_NAME}/payslips` directly.

Expected result:

- The employee sees only their own documents and cannot upload, replace, or delete them.
- The employee history is retrieved in pages of 12 rather than loading every historical document.
- Another member cannot preview or download the employee's payslip through the application endpoint.
- Contractor profiles cannot access the payslip page and do not see it in navigation.

### Month Overview Defaults To The Previous Month

Payslips are uploaded for the month before: in October, the admin uploads September's.

1. Sign in as `{ADMIN_EMAIL}` and open `https://{DOMAIN_NAME}/admin/payslips` with no filters.
2. Confirm the month overview names the previous calendar month and counts posted payslips against it.
3. Confirm the missing list contains only the active employees without a payslip for that month.
4. Click a missing employee, and separately choose `Upload payslip`; confirm both dialogs preselect the previous month.
5. Choose the current month in the month filter and apply it; confirm the overview switches to the current month.
6. Switch the language to Hungarian and confirm the overview label is the same month in Hungarian.

Expected result:

- Without a month filter, the overview checks the previous month, not the current one.
- In January, the default is December of the previous year, and the upload dialog opens on that year.
- On the first day of a month, the default switches at midnight in the admin's time zone, not at UTC midnight.
- A month filter still overrides the default.

## Leave

Leave is employee-only. Run employee scenarios as `{EMPLOYEE_EMAIL}`, the colleague view as
`{SECOND_EMPLOYEE_EMAIL}`, and admin scenarios as `{ADMIN_EMAIL}`.

### Employee Records Vacation And Sees The Workday Count

1. Sign in as `{EMPLOYEE_EMAIL}` and open `https://{DOMAIN_NAME}/leave`.
2. Confirm the calendar shows the current month, Monday first, today marked, and every public
   holiday in rose with its name.
3. Click `Add leave`. Open the date picker and confirm days before yesterday cannot be chosen, and
   that the hint under the dates says earlier days go through an admin.
4. Pick a week in `{LEAVE_MONTH}` that contains a weekday public holiday: click its first day, then
   its last day.
5. Confirm the summary under the dates counts the workdays without the weekend and says one public
   holiday was skipped. Confirm `Part of the day` is not offered for a multi-day range.
6. Submit with `Vacation` and a short note.

Expected result:

- The picker takes two clicks for a range; the second click extends the range rather than starting
  a new one.
- `Leave added.` appears and the leave shows on the calendar as one ribbon labelled `You: Vacation`,
  cut square where it crosses into the next week.
- `My leave` lists it under `Coming up` with the same workday count and the note.

### Half Days, Overlaps And Past Months Are Refused Or Constrained

1. As `{EMPLOYEE_EMAIL}`, open `Add leave` and pick a single workday. Choose `Morning` and submit.
2. Add a second leave on the same day with `Afternoon`.
3. Try a third leave on the same day with `Full day`.
4. Try a leave covering only a Saturday and Sunday.
5. Try a range longer than a year.

Expected result:

- A single day offers Full day, Morning and Afternoon; the summary reads `0.5 workdays` for a half.
- Morning and afternoon of the same day can both be recorded; the full day is refused with
  `Leave is already recorded for these days.` and the form keeps what was entered.
- A weekend-only range is refused because it contains no workday; a range over a year is refused.
- No option anywhere lets an employee enter hours.

### Employee Records Leave From Yesterday, Not Earlier

1. As `{EMPLOYEE_EMAIL}`, open `Add leave` on a Tuesday to Friday. In the date picker, pick
   yesterday as a single `Sick leave` day and submit.
2. Open `Add leave` again and try to pick the day before yesterday.
3. Repeat step 2 on a Monday for the previous Friday.
4. As `{ADMIN_EMAIL}`, record the day before yesterday for `{EMPLOYEE_EMAIL}` from `/admin/leave`.

Expected result:

- Yesterday is accepted and shows in `My leave`.
- The day before yesterday cannot be chosen, and on a Monday neither can Friday; the hint reads
  `You can record leave from yesterday on. For earlier days, ask an admin.` (Hungarian:
  `Szabadságot legkorábban tegnaptól vihetsz fel. Korábbi napokhoz szólj az adminnak.`).
- The admin can still record any earlier day.

### Sick Leave And The Sick Note

1. As `{EMPLOYEE_EMAIL}`, add a `Sick leave` for today without a file.
2. In `My leave`, confirm the row says `Sick note missing`. Open it.
3. Upload `{SICK_NOTE_FILE}` from the dialog. Then use `Open` and `Download`.
4. Upload a `.txt` file renamed to `.pdf`, and a file over 10 MB.
5. Repeat step 3 on a sick leave from a month that is already over.

Expected result:

- The file control's words are in the app's language, not the browser's.
- After the upload the row says `Sick note attached`; Open shows the file inline, Download saves it.
- A renamed or oversized file is refused with a clear message.
- A sick note can still be added after the month is over.
- The dialog says only an admin can change or delete the leave, and offers no edit or delete.

### Colleagues See Who Is Away, Never Why

1. Sign in as `{SECOND_EMPLOYEE_EMAIL}` and open `https://{DOMAIN_NAME}/leave` on the month holding
   `{EMPLOYEE_EMAIL}`'s sick leave.
2. Open that ribbon.
3. Copy the sick note URL from the employee's dialog (`/api/leave/<id>/attachment`) and open it
   as `{SECOND_EMPLOYEE_EMAIL}`.

Expected result:

- The colleague's leave reads `Away` in a hatched neutral ribbon, with name and dates only.
- Neither the type, the note nor the sick note is shown or reachable; the attachment URL answers 404.

### A Crowded Week Stays Readable

1. With at least six employees, record overlapping leave so that five or more people are away on
   the same workdays of one week in `{LEAVE_MONTH}`. Include one morning and one afternoon.
2. Open `https://{DOMAIN_NAME}/leave` and `https://{DOMAIN_NAME}/admin/leave?view=calendar` on that
   month.
3. Hover, then focus with the keyboard, a `+N more` button. Then click it and choose a name.
4. Let at least four of those leaves run through the weekend into the next week, then add one more
   that starts on that Saturday and ends on the following Tuesday.

Expected result:

- Each workday with two or more people away shows `N away` beside the day number, amber from four.
  Weekends and public holidays show no count.
- The week draws at most four rows of ribbons, own leave on top; the rest sits behind one
  `+N more` per workday, never on a weekend or holiday.
- The tooltip names who is behind the button; the click lists everyone away that day, half days
  marked, and choosing one opens its details. Colleagues still read as `Away`.
- The one exception: a leave that reaches a crowded week only on its weekend or holidays and finds
  no free row there is listed behind a `+1 more` on its first day in that week, so it is never
  missing from the week.

### A Leave Into The Next Month Counts The Same Everywhere

1. As `{ADMIN_EMAIL}`, record a vacation for `{EMPLOYEE_EMAIL}` that starts in the last week of a
   month and ends after a weekday public holiday falling past that month's last calendar row, for
   example 30 September to 27 October 2026 across Friday 23 October (September's last row ends on
   4 October).
2. Open `https://{DOMAIN_NAME}/admin/leave?view=calendar` on the month it starts in and open the
   ribbon. Then switch to the list view and find the same leave.
3. Sign in as `{EMPLOYEE_EMAIL}` and compare the dialog on `/leave` with the row in `My leave`.

Expected result:

- The details dialog, the admin list and `My leave` show the same workday count, with the holiday
  in the next month left out, although that holiday is not drawn on the starting month's calendar.

### No Time On A Full-Day Leave

1. Sign in as `{EMPLOYEE_EMAIL}`. On `/leave`, record a full-day vacation for two workdays of the
   current week that hold no time yet, and a morning half day for a third day.
2. Open `https://{DOMAIN_NAME}/time` on that week, in the Week agenda, the Grid and the Day view, on
   a desktop and on a phone.
3. Select a leave day and press `N`, open the actions menu's `Copy yesterday into`, and start the
   timer if one of the leave days is today.
4. Move an entry from another day onto a leave day through its edit dialog.
5. Use `Duplicate last week` on a week whose previous week has time on the leave days' weekdays.
6. Back on `/leave`, try to record a full-day leave over a day that already has time. Then record
   a half day on that same day.

Expected result:

- Each full-day leave day shows a palm tree in its header, labelled `On leave` / `Szabadságon`,
  and offers no `+`, no `Copy yesterday`, no composer and no phone `+`. Empty Grid cells on it are
  disabled; existing entries there can still be deleted.
- The half day stays fully open for time.
- Saving onto a leave day, or starting or stopping a timer on one, shows the error
  `You are on leave this day, so no time can be logged on it.` in English and
  `Ezen a napon szabadságon vagy, ezért nem rögzíthetsz rá időt.` in Hungarian.
- `Duplicate last week` copies every other day and skips the leave days.
- The full-day leave over logged time is refused under the dates with
  `Time is already logged on some of these days. …` in English and
  `Ezen napok némelyikére már van rögzített idő. …` in Hungarian; the half day is recorded.
- An agent's `time_create_entry` on a leave day gets `DAY_ON_LEAVE`.

### Contractors Do Not Have Leave

1. Sign in as `{CONTRACTOR_EMAIL}`.
2. Confirm the navigation has no `Leave` item, and open `https://{DOMAIN_NAME}/leave` directly.

Expected result:

- `/leave` is a 404, and no contractor appears on any employee's calendar.

### Admin Bookkeeps Leave

1. Sign in as `{ADMIN_EMAIL}` and open `https://{DOMAIN_NAME}/admin/leave`.
2. Filter by month, by `{EMPLOYEE_EMAIL}`, by type and by processing status, then remove each filter chip.
3. Tick the `Processed` checkbox on one row. Select two others and use `Mark as processed`, then
   `Unmark` on one of them.
4. Open a row: confirm the employee's note and sick note are visible and the `Processed` tick shows
   who ticked it and when.
5. Use `Edit` to move a leave into last month and change its type. Then `Delete` another leave
   and confirm.
6. Switch to `Calendar`.

Expected result:

- The tick answers the click at once and survives a reload; the header counts the leave still
  waiting to be processed.
- The employee never sees the processed state anywhere.
- An admin edit may move a leave into the past, but overlap and the workday rule still apply.
- A deleted leave disappears for the employee and from the calendar.
- The admin calendar shows every kind in colour: mint vacation, lavender sick leave.
- Audit log entries exist for `leave.created`, `leave.updated`, `leave.deleted`,
  `leave.hr_processed`, `leave.hr_unprocessed`, `leave.attachment_uploaded` and
  `leave.attachment_read`.

### Admin Records Leave For An Employee

1. Sign in as `{ADMIN_EMAIL}`, open `https://{DOMAIN_NAME}/admin/leave` and use `Add leave`.
2. Submit without choosing an employee.
3. Choose `{EMPLOYEE_EMAIL}`, `Sick leave`, three workdays in last month, a note and a PDF sick
   note, and submit.
4. Record a second leave for the same employee over one of those days.
5. Record a full-day leave for the same employee on a day that already holds logged time.
6. Sign in as `{EMPLOYEE_EMAIL}`, open `/leave?view=list` and the notifications, and check the
   inbox.

Expected result:

- The drawer is titled `Add leave for an employee` and lists only active employees; the date
  picker allows any month.
- Without an employee the form asks for one and keeps the dates and the note.
- The leave appears in the list as waiting to be processed; the admin ticks it separately.
- The overlap and the logged-time day are refused with the same messages the employee gets.
- The employee sees the leave with its note and sick note, gets one in-app notification and one
  email (`An admin recorded leave for you` / `Egy admin szabadságot rögzített neked`) naming the
  kind and the days, linking to `/leave`. Recording their own leave never notifies them.
- `/settings` lists `Leave recorded by admin` among the workflow notifications.
- The audit log shows `leave.created` with the admin as actor.

### Month-End Leave Reminder

1. As `{ADMIN_EMAIL}`, open `/settings` → notifications and confirm `Monthly leave reminder` is
   listed with its timing and both delivery methods.
2. On the second-to-last day of a month, after 9:00 company time, check `{EMPLOYEE_EMAIL}`'s
   notifications and inbox.

Expected result:

- Every active employee gets one in-app notification and one email, linking to `/leave`; no
  contractor does.
- The Hungarian text asks to check the month's leave and sick leave, to record the rest of the
  month by 12:00 tomorrow, to tell an admin about any earlier day that is missing, and to send any
  sick-pay paperwork; the English one says the same.
- A second dispatcher run that day does not send it again.

### Leave In Both Languages, Both Themes And On A Phone

1. Repeat the employee calendar and the admin list in Hungarian and English, light and dark.
2. Open `/leave` on a phone-width screen.

Expected result:

- Every label, error and toast is translated; Hungarian month names are lowercase.
- Holiday names follow the language (`Nemzeti ünnep` / `1956 Revolution Memorial Day`).
- On a phone the grid becomes a day-by-day list of the days that hold leave or a holiday.

## Admin Projects

Run these tests as `{ADMIN_EMAIL}` with TOTP enabled and verified.

### Admin Can Open Projects Page

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. Confirm the page header and project counters load.
3. Confirm the create project form is visible.
4. Confirm the project directory and project groups sections are visible.

Expected result:

- The Projects admin page opens without errors.
- Existing projects, assignments, and groups load in the app shell.
- The page remains usable on laptop width without horizontal page overflow.

### Create Project

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. Fill the create project form:
   - Name: `{PROJECT_NAME}`
   - Slug/code: `{PROJECT_SLUG}`
   - Color: choose any non-default color.
   - Start date: today or a future date.
   - End date: leave empty.
   - Internal: test both checked and unchecked in separate runs.
   - Notes: optional.
3. Click `Create project`.
4. Refresh the page.

Expected result:

- A success message confirms the project was created.
- The project appears in the project directory after saving and after refresh.
- The selected color swatch is visible and is not white or blank.
- Internal projects show the internal marker.
- An audit row is recorded for `project.created`.

### Create Project Validation

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. Try to create a project with an empty name.
3. Try to create a project using an existing slug.
4. Try to create a project where the end date is before the start date.

Expected result:

- The form shows field-level validation errors.
- Duplicate slugs are rejected.
- Invalid date ranges are rejected.
- No invalid project appears in the project directory.

### Edit Project

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. Open `{PROJECT_NAME}` from the project directory.
3. Click the edit action.
4. Change:
   - Name: `{PROJECT_UPDATED_NAME}`
   - Slug/code: `{PROJECT_UPDATED_SLUG}`
   - Color: choose a different supported color.
   - Notes: update the note text.
5. Save changes.
6. Refresh the page.

Expected result:

- The project drawer opens with the current project values.
- The updated name, slug, color, and notes are visible after saving and after refresh.
- An audit row is recorded for `project.updated`.

### Activate And Deactivate Project

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. Open `{PROJECT_UPDATED_NAME}` from the project directory.
3. Deactivate the project.
4. Confirm the status changes to inactive.
5. Activate the project again.
6. Confirm the status changes back to active.

Expected result:

- Inactive projects are not available for new future time entry.
- Reactivated projects become available again when the assignment/date rules allow it.
- Audit rows are recorded for project status changes.

### Archive Project

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. Open an active or inactive test project.
3. Click `Archive`.
4. Confirm the archive dialog.
5. Refresh the page.

Expected result:

- A success message confirms the project was archived.
- Archived projects are removed from active working lists.
- Historical assignments and time entries remain available for reporting/audit purposes.
- An audit row is recorded for `project.archived`.

### Project Groups

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. In the project groups section, create a group named `{PROJECT_GROUP_NAME}`.
3. Add `{PROJECT_UPDATED_NAME}` to the group.
4. Remove `{PROJECT_UPDATED_NAME}` from the group.
5. Edit the group name to `{PROJECT_GROUP_UPDATED_NAME}`.
6. Archive the group.

Expected result:

- Created groups appear in the project groups section.
- Projects can be added to and removed from groups.
- Group changes affect organization and filters only; they do not change assignments or time entry.
- Archived groups disappear from active grouping helpers.
- Audit rows are recorded for group create/update/archive and project link changes.

### Project Directory Filters

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. Search by project name, slug, group name, assigned member name, and assigned member email.
3. Filter by project status.
4. Filter by internal/external project type.
5. Filter by timeline: active today, future, and ended.
6. Filter by project group and ungrouped projects.
7. Filter by assigned today and unassigned today.
8. Combine search with multiple filters.
9. Use the pager when more than one page is available.
10. Refresh the browser while filters are applied.
11. Clear filters.

Expected result:

- The directory updates to match each filter.
- The selected filters are represented in the URL and survive refresh.
- Pagination keeps the same filters while moving between pages.
- Clearing filters restores the full project directory.
- The layout remains responsive on laptop width.

### Project Group Filters

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. In the project groups section, search by group name.
3. Search by a project name that belongs to a group.
4. Filter groups by active and inactive state.
5. Filter groups by empty and with projects.
6. Combine group search with state and project-count filters.
7. Clear the group filters.

Expected result:

- The group list updates to match each filter.
- Empty results show a factual empty state.
- Clearing group filters restores the full group list.
- Adding or removing projects from a group still works while filters exist.

### Assign Member To Project

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. Open an active project.
3. In the assignment section, choose `{CONTRACTOR_EMAIL}` or `{EMPLOYEE_EMAIL}`.
4. Set start date `{PROJECT_ASSIGNMENT_START}`.
5. Leave end date empty.
6. Add note `{PROJECT_ASSIGNMENT_NOTE}`.
7. Click `Assign member`.
8. Refresh the page.

Expected result:

- Invited and active members can be assigned.
- The assignment appears after saving and after refresh.
- The assignment timeline and note are visible.
- Contractor assignments show whether they use the central rate or a project override.
- An audit row is recorded for `project_assignment.created`.

### Edit And Close Assignment

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. Open a project with an existing assignment.
3. Edit the assignment note and end date to `{PROJECT_ASSIGNMENT_END}`.
4. Save the assignment.
5. Close or end the assignment using the close action.

Expected result:

- Assignment edits are saved and visible after refresh.
- Closed assignments become inactive for future time entry outside their valid date range.
- Invalid date ranges are rejected.
- Audit rows are recorded for assignment update/close actions.

### Bulk Assignment

1. Open `https://{DOMAIN_NAME}/admin/projects`.
2. Open the bulk assignment dialog.
3. Select multiple members and multiple active projects.
4. Set start date `{BULK_ASSIGNMENT_START}`.
5. Add note `{PROJECT_ASSIGNMENT_NOTE}`.
6. Submit the bulk assignment.
7. Run the same bulk assignment again.

Expected result:

- New member/project assignment pairs are created.
- Existing overlapping assignment pairs are skipped, not duplicated.
- The summary shows created and skipped counts.
- Bulk assignment is limited to the configured maximum number of selected pairs.
- Audit rows are recorded for created assignments.

## Member Own Rates

### Employee Central Rate Timeline

1. Sign in as `{EMPLOYEE_EMAIL}`.
2. Open the avatar menu and select **My rates** / **Saját óradíjaim**.
3. Review the central-rate timeline.

Expected result:

- The header identifies the Employee profile.
- Only the employee's own central-rate periods are visible, newest first.
- The effective period is marked as current.
- Project-specific rate rows are not shown.
- Profile and settings remains a separate account-menu action.

### Contractor Effective Project Rates

1. Sign in as `{CONTRACTOR_EMAIL}`.
2. Open the avatar menu and select **My rates** / **Saját óradíjaim**.
3. Review the central timeline and project rows.
4. Use one assigned project with a current override and one assigned project without an override.

Expected result:

- The header identifies the Contractor profile.
- The contractor's complete central-rate timeline is visible.
- The overridden project shows the current override amount and **Project override**.
- The other project shows the current central amount and **Follows the central rate**.
- No other member's name, email, rate, or project assignment is visible.

### Missing Own Rate

1. Use a member with no current central rate.
2. For a contractor, ensure at least one current assignment also has no current override.
3. Open **My rates** / **Saját óradíjaim**.

Expected result:

- The page explains that no central rate is configured and tells the member to ask an admin.
- A contractor project without either rate shows **Not set**, not a manufactured zero value.
- The page remains read-only.

## Admin Rates

Run these tests as `{ADMIN_EMAIL}` with TOTP enabled and verified.

### Admin Can Open Rates Page

1. Open `https://{DOMAIN_NAME}/admin/rates`.
2. Confirm the rate list loads.
3. Search or scan for `{CONTRACTOR_EMAIL}` and `{EMPLOYEE_EMAIL}`.

Expected result:

- The Rates admin page opens without errors.
- Members are listed with profile, status, current central rate, and override count.
- The page remains usable on laptop width without horizontal page overflow.

### Add Central Member Rate

1. Open `https://{DOMAIN_NAME}/admin/rates`.
2. Open the rate drawer for `{CONTRACTOR_EMAIL}` or `{EMPLOYEE_EMAIL}`.
3. In the central rate section, add a period:
   - Start date: `{RATE_VALID_FROM}`
   - End date: leave empty.
   - Hourly rate: `{RATE_AMOUNT}`
   - Currency: `{RATE_CURRENCY}`
   - Note: `{RATE_NOTE}`
4. Save the rate.
5. Refresh the page.

Expected result:

- A success message confirms the central rate was created.
- The rate appears in the member's central rate timeline.
- The current rate shown in the list updates when the period is current.
- The actor and reason/note are visible in the rate timeline.
- An audit row is recorded for the rate creation.

### Add Future Central Rate With Currency Change

1. Open `https://{DOMAIN_NAME}/admin/rates`.
2. Open the rate drawer for a member who already has a central rate.
3. Add a second rate period:
   - Start date: `{RATE_FUTURE_MONTH_START}`
   - Hourly rate: `{RATE_UPDATED_AMOUNT}`
   - Currency: `{RATE_UPDATED_CURRENCY}`
   - Note: `{RATE_NOTE}`
4. Save the rate.

Expected result:

- Currency changes are accepted only when the new period starts on the first day of a future month,
  or today if today is the first day of the month.
- The previous open-ended period is closed at the new period start.
- The future rate appears as scheduled until it becomes current.

### Rate Validation

1. Open `https://{DOMAIN_NAME}/admin/rates`.
2. Try to create a rate with an empty start date.
3. Try to create a rate with zero or negative hourly amount.
4. Try to create a rate with an unsupported currency.
5. Try to create overlapping central rate periods.
6. Try to set a currency change starting mid-month.

Expected result:

- Invalid fields show validation errors.
- Unsupported currencies are rejected.
- Overlapping rate periods are rejected.
- Currency changes that violate month-boundary rules are rejected.
- No invalid rate period is saved.

### Contractor Project Override Rate

1. Open `https://{DOMAIN_NAME}/admin/rates`.
2. Open the rate drawer for `{CONTRACTOR_EMAIL}`.
3. In project overrides, choose an assigned project.
4. Add an override period:
   - Start date: `{RATE_VALID_FROM}`
   - Hourly rate: `{RATE_AMOUNT}`
   - Currency: `{RATE_CURRENCY}`
   - Note: `{RATE_NOTE}`
5. Save the override.
6. Refresh `https://{DOMAIN_NAME}/admin/projects` and open the same project assignment.

Expected result:

- The override appears under the selected contractor/project assignment.
- The project assignment indicates that a project override exists.
- Other projects for the same contractor continue to use the central rate.
- An audit row is recorded for the override creation.

### Multiple Project Overrides

1. Open `https://{DOMAIN_NAME}/admin/rates`.
2. Open the rate drawer for `{CONTRACTOR_EMAIL}`.
3. Add an override for one assigned project.
4. Add an override for a different assigned project.
5. Add another future period to one existing project override.

Expected result:

- Overrides can exist for multiple projects for the same contractor.
- Adding a future period to one project does not hide the option to add another project override.
- The drawer groups override timelines by project.

### Employee Override Guard

1. Open `https://{DOMAIN_NAME}/admin/rates`.
2. Open the rate drawer for `{EMPLOYEE_EMAIL}`.
3. Look for project override controls.

Expected result:

- Employees have central internal rates only.
- Project-specific override controls are not available for employees.

## Admin People

### Admin Can Open People Page

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/people`.

Expected result:

- The people page opens.
- The invite form is visible.
- Currency, timezone, and locale are dropdowns.
- The member directory table is visible.
- The app shell user menu shows the admin user.

### Search, Filter, And Page Members

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/people`.
3. Search for a known member name or email.
4. Filter by state, role, and profile.
5. Move to the next page if more than one page is available.
6. Clear the filters.

Expected result:

- The member list shows 20 members per page by default.
- Search matches member name and email.
- State, role, and profile filters update the URL query string.
- Pagination keeps the selected filters.
- Clearing filters returns to the unfiltered first page.

### Invite Member

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/people`.
3. Fill the invite form:
   - First name: `{INVITED_FIRST_NAME}`
   - Last name: `{INVITED_LAST_NAME}`
   - Email: `{INVITED_EMAIL}`
   - Profile: `{INVITED_PROFILE}`
   - Role: `{INVITED_ROLE}`
   - Currency: `{INVITED_CURRENCY}`
   - Timezone: `{INVITED_TIMEZONE}`
   - Locale: `{INVITED_LOCALE}`
4. Click `Send invitation`.

Expected result:

- A success message confirms that an invitation was sent.
- The invited person appears in the member directory with state `invited`.
- The invited person receives an invitation email.

### Resend Invitation

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/people`.
3. Find a member with state `invited`.
4. Click the resend invitation action.

Expected result:

- A success message confirms the invitation was resent.
- The invited email receives a new invitation link.

### Resend Expired Invitation

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/people`.
3. Find a member with state `invited` whose previous invitation link has expired.
4. Click the resend invitation action.

Expected result:

- A success message confirms the invitation was resent.
- The invited email receives a new invitation link.
- The old expired invitation link remains unavailable.
- The new invitation link can be accepted.

### Edit Member Details

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/people`.
3. Find an invited, active, or inactive member.
4. Click the edit action.
5. Change first name, last name, display name, currency, timezone, and locale.
6. Click `Save changes`.
7. Refresh `https://{DOMAIN_NAME}/admin/people`.

Expected result:

- The edit drawer opens with the member's current domain profile values.
- Currency, timezone, and locale are dropdowns.
- The updated member name and currency are visible after saving and after refresh.
- Empty required fields show validation errors.
- The member's Better Auth email/account is not changed by this flow.
- An audit row is recorded for `member.updated` with before and after values.

### Schedule Profile Transition

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/people`.
3. Find an invited, active, or inactive member.
4. Click the edit action.
5. In `Profile transition`, choose the opposite profile.
6. Choose `{PROFILE_TRANSITION_VALID_FROM}` as today or a future date.
7. Enter `{PROFILE_TRANSITION_REASON}`.
8. Click `Schedule transition`.
9. Refresh `https://{DOMAIN_NAME}/admin/people`.

Expected result:

- A success message confirms either immediate profile change or scheduled transition.
- If the effective date is today, the member's current profile changes after refresh.
- If the effective date is in the future, the people table shows the scheduled profile and date.
- Past effective dates show validation errors and do not create profile history.
- A second future transition for the same member is rejected until the existing one is handled.
- An audit row is recorded for `member.profile_changed` or
  `member.profile_transition_scheduled`.

### Deactivate And Reactivate Member

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/people`.
3. Find an active non-admin test member.
4. Click the deactivate action.
5. Confirm the member state changes to inactive.
6. Click the reactivate action.

Expected result:

- Deactivation blocks that member from protected app access.
- Deactivation revokes that member's active sessions.
- Reactivation restores access.
- The member directory reflects the latest state.
- Audit rows are recorded for `member.deactivated`, `member.session_revoked`, and
  `member.reactivated`.

### Archive Member

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/people`.
3. Find an active, inactive, or invited non-admin test member.
4. Click `Archive`.
5. Confirm the archive dialog.
6. Refresh `https://{DOMAIN_NAME}/admin/people`.

Expected result:

- A success message confirms that the member was archived.
- The member directory shows the archived member as locked.
- Active sessions for that member are revoked.
- Pending invitations for that member are revoked.
- The archived member cannot open protected app pages.
- Historical time entries, timesheets, invoices, payslips, reports, and audit records remain.
- An audit row is recorded for `member.deleted`.
- For linked auth users, an audit row is recorded for `member.session_revoked`.
- For pending invitations, an audit row is recorded for `member.pending_invitations_revoked`.

### Restore Archived Member

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/people`.
3. Find an archived member.
4. Click the restore account action.
5. Refresh `https://{DOMAIN_NAME}/admin/people`.

Expected result:

- A success message confirms that the member was restored.
- If the archived member had a linked auth account, the member becomes active and can sign in again.
- If the archived member had no linked auth account, the member becomes invited and receives a new invitation email.
- Previously revoked sessions are not restored.
- Historical records remain attached to the restored member.
- An audit row is recorded for `member.restored`.

### Archive Safety Guards

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/people`.
3. Confirm the current admin row does not offer `Archive`.
4. Try to archive the last active admin using a test setup with no other active admins.

Expected result:

- Admins cannot archive their own account from the people table.
- The server rejects archiving the last active admin.
- The member remains active when the last-admin guard rejects the action.

### Revoke Member Sessions

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified in one browser profile.
2. Sign in as `{CONTRACTOR_EMAIL}` or `{EMPLOYEE_EMAIL}` in a second browser profile.
3. In the admin browser, open `https://{DOMAIN_NAME}/admin/people`.
4. Find the signed-in contractor or employee.
5. Click `Revoke sessions`.
6. In the contractor or employee browser, refresh `https://{DOMAIN_NAME}/dashboard`.

Expected result:

- The admin browser shows how many sessions were revoked.
- The contractor or employee is forced back through sign-in before accessing protected pages again.
- The admin cannot revoke their own sessions from this table.
- An audit row is recorded for `member.session_revoked` with reason `admin_revoke`.

### Admin Reset Member Authenticator

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified in one browser profile.
2. Use a second browser profile to sign in as `{CONTRACTOR_EMAIL}` or `{EMPLOYEE_EMAIL}` with TOTP
   enabled.
3. In the admin browser, open `https://{DOMAIN_NAME}/admin/people`.
4. Find the contractor or employee row.
5. Open the row actions menu and click `Reset authenticator`.
6. Confirm `Reset authenticator`.
7. In the contractor or employee browser, refresh `https://{DOMAIN_NAME}/dashboard`.
8. Sign in again as the contractor or employee.

Expected result:

- The admin sees a success message that the authenticator app was reset.
- The contractor or employee is signed out because active sessions were revoked.
- The next sign-in no longer asks for the old TOTP code or old backup codes.
- The user can open `/settings` and set up a new authenticator app.
- The admin cannot reset their own authenticator from this table.
- Audit rows are recorded for `security.totp_reset` and `member.session_revoked` without TOTP
  secrets or backup-code values.

## Security Settings

### Security Setup Gate

1. Sign in as an active member that has no passkey and no TOTP.
2. Open `https://{DOMAIN_NAME}/dashboard`.
3. Open `https://{DOMAIN_NAME}/settings`.

Expected result:

- `/dashboard` redirects to `/settings?setup=required...`.
- The settings page shows an action-required security setup banner.
- The user can still access the passkey and authenticator-app controls.
- After adding a passkey or enabling TOTP, `/dashboard` opens.

### Admin TOTP Gate

1. Sign in as an admin that has a passkey but does not have TOTP enabled.
2. Open `https://{DOMAIN_NAME}/admin/people`.
3. Open `https://{DOMAIN_NAME}/settings`.

Expected result:

- `/admin/people` redirects to `/settings?setup=required&...reason=admin-totp-required...`.
- The settings page explains that admin tools require authenticator-app 2FA.
- After enabling and verifying TOTP, `/admin/people` opens.

### Open Security Settings

1. Sign in as `{ADMIN_EMAIL}` or `{CONTRACTOR_EMAIL}`.
2. Open `https://{DOMAIN_NAME}/settings`.

Expected result:

- The security settings page opens.
- Magic link is shown as connected.
- Email password is shown as enabled or available.
- Company Google is shown when Google auth is configured.
- Passkey and authenticator-app sections are visible.

### Duration Display Preference

1. Sign in as any active user and open `https://{DOMAIN_NAME}/settings`.
2. Open `Preferences` and select `Decimal hours` under time display.
3. Save, then open the dashboard, time tracking, and any available timesheet screen.
4. Confirm a 3-hour 23-minute duration appears as `3.38 h` where an hour unit is shown — never more
   than two decimal digits anywhere.
5. On `/time`, log a 55-minute entry (e.g. start `09:00`, end `09:55`) and confirm the live duration
   badge, the grid cell, and the week total all read `0.92 h` / `0.92` / a total consistent with the
   other entries logged that week — not `0.9167 h`.
6. Return to Preferences, select `Hours and minutes`, and save.
7. Reopen the same screens and refresh the browser.
8. On `/time`, type `3:23` directly into an empty grid cell and confirm it saves as 203 minutes and
   redisplays as `3:23`.
9. Switch the interface language to Hungarian and repeat step 7.

Expected result:

- The preference survives refresh and a new sign-in.
- The same 203 stored minutes appear as `3:23` under the hours-and-minutes preference — identical in
  Hungarian and English, since this format is locale-neutral (no `ó`/`p` split).
- Changing the display does not alter time entries, totals, rates, or calculated amounts.
- The audit log records `member.duration_display_format_updated`.
- On the contractor's own timesheet summary, the admin timesheet review screen, and the line-level
  hours edit field on `/admin/reports`, hours always render as decimal (e.g. `9.50 h`) next to the
  amount they were billed at, regardless of which display preference is selected — these screens
  intentionally do not follow the preference because the amount beside them must stay checkable
  against hours × rate.

## Passkeys

### Add Device Passkey

1. Sign in as `{ADMIN_EMAIL}` or `{CONTRACTOR_EMAIL}` on `{PASSKEY_DEVICE}`.
2. Open `https://{DOMAIN_NAME}/settings`.
3. Enter a recognizable passkey name.
4. Click `Add device passkey`.
5. Complete the browser or operating-system passkey prompt.

Expected result:

- The passkey is added.
- The passkey appears in the registered passkeys list.
- The passkey can be renamed or removed.
- An audit row is recorded for `security.passkey_added` without passkey public key material.

### Passkey Login

1. Sign out.
2. Open `https://{DOMAIN_NAME}/login`.
3. Click `Continue with passkey`.
4. Complete the passkey prompt on `{PASSKEY_DEVICE}`.

Expected result:

- The user lands on `/dashboard`, even when authenticator-app 2FA is enabled.
- The app does not show `/two-factor` after a user-verified passkey login.
- If the passkey belongs to an admin account without authenticator-app setup, normal pages open but
  admin screens still redirect to `/settings?setup=required&...reason=admin-totp-required...`.

### Remove Passkey

1. Sign in as the user who owns the passkey.
2. Open `https://{DOMAIN_NAME}/settings`.
3. Find the registered passkey.
4. Click `Remove`.
5. Confirm removal.

Expected result:

- The passkey disappears from the list.
- The removed passkey cannot be used for login anymore.
- Magic-link login remains available.
- An audit row is recorded for `security.passkey_deleted` without passkey public key material.

### Rename Passkey

1. Sign in as the user who owns a registered passkey.
2. Open `https://{DOMAIN_NAME}/settings`.
3. Find the registered passkey.
4. Change the passkey name.
5. Click `Save`.
6. Refresh the settings page.

Expected result:

- The updated passkey name remains visible after refresh.
- An audit row is recorded for `security.passkey_renamed`.

## TOTP 2FA

### Enable Authenticator App

1. Sign in as `{ADMIN_EMAIL}` or `{CONTRACTOR_EMAIL}`.
2. Open `https://{DOMAIN_NAME}/settings`.
3. If the account has email/password enabled, enter the current password in the authenticator-app
   section.
4. Click `Set up authenticator`.
5. Scan the displayed QR code with `{AUTHENTICATOR_APP}`.
6. Enter the current 6-digit code.
7. Click `Verify and enable`.

Expected result:

- Authenticator app becomes enabled.
- Backup codes are shown.
- The user remains signed in.
- Store backup codes for later backup-code tests.
- An audit row is recorded for `security.totp_enabled` without the TOTP secret or backup codes.

Fallback check:

- If QR scanning is unavailable, copy the manual key fallback into `{AUTHENTICATOR_APP}` and verify
  that setup still works.

### 2FA Challenge After Magic-Link Login

1. Make sure TOTP is enabled for `{ADMIN_EMAIL}` or `{CONTRACTOR_EMAIL}`.
2. Sign out.
3. Open `https://{DOMAIN_NAME}/login`.
4. Sign in using magic link.

Expected result:

- After the magic-link email is opened, the app redirects to `/two-factor`.
- The magic-link sign-in does not satisfy the 2FA challenge by itself.
- `/dashboard` is not accessible until the TOTP code is verified.

### Passkey Login With TOTP Enabled

1. Make sure TOTP is enabled for `{ADMIN_EMAIL}` or `{CONTRACTOR_EMAIL}`.
2. Make sure the same account has a registered passkey on `{PASSKEY_DEVICE}`.
3. Sign out.
4. Open `https://{DOMAIN_NAME}/login`.
5. Click `Continue with passkey`.
6. Complete the passkey prompt on `{PASSKEY_DEVICE}`.

Expected result:

- The passkey prompt requires normal device verification, such as biometrics, PIN, or password.
- The app redirects to `/dashboard` or the original callback URL.
- The app does not show `/two-factor`.
- Signing out and using password, magic link, or Google on an untrusted browser still shows
  `/two-factor` for the same TOTP-enabled account.

### Verify TOTP Challenge

1. On `/two-factor`, keep the `Authenticator` tab selected.
2. Enter the current 6 digit code from `{AUTHENTICATOR_APP}`.
3. Click `Verify`.

Expected result:

- The challenge succeeds.
- The user is redirected to the original `callbackURL`, normally `/dashboard`.

### Invalid TOTP Code

1. Trigger `/two-factor`.
2. Enter an incorrect 6 digit code.
3. Click `Verify`.

Expected result:

- The page shows an error.
- The user remains on `/two-factor`.
- Protected pages remain blocked.

### Trust This Device

1. Trigger `/two-factor`.
2. Check `Trust this device`.
3. Enter a valid TOTP code.
4. Click `Verify`.
5. Sign out.
6. Sign in again in the same browser profile.

Expected result:

- The first challenge succeeds.
- The next sign-in in the same browser skips `/two-factor` while the trust period is valid.

### Backup Code Challenge

1. Make sure backup codes were generated and stored during TOTP setup.
2. Sign out.
3. Sign in again until `/two-factor` is shown.
4. Open the `Backup code` tab.
5. Enter one unused backup code.
6. Click `Verify`.

Expected result:

- The backup code signs the user in.
- The used backup code cannot be reused.

### Disable Authenticator App

1. Sign in as the user who has TOTP enabled.
2. Open `https://{DOMAIN_NAME}/settings`.
3. If the account has email/password enabled, enter the current password in the authenticator-app
   section.
4. Click `Disable` in the authenticator-app section.
5. Confirm the browser prompt.
6. Sign out and sign in again.

Expected result:

- Authenticator app is disabled.
- Future sign-ins no longer require `/two-factor` only if another security method, such as a
  passkey, remains available.
- If no passkey remains, protected pages redirect to `/settings?setup=required...`.
- Admin users cannot use admin pages again until TOTP is re-enabled.
- An audit row is recorded for `security.totp_disabled`.

### Regenerate Backup Codes

1. Sign in as the user who has TOTP enabled.
2. Open `https://{DOMAIN_NAME}/settings`.
3. If the account has email/password enabled, enter the current password in the authenticator-app
   section.
4. Click `New backup codes`.
5. Confirm the browser prompt.
6. Store one of the newly displayed backup codes.
7. Sign out and sign in until `/two-factor` is shown.
8. Open the `Backup code` tab.
9. Enter the stored new backup code.
10. Try one of the older backup codes from before regeneration.

Expected result:

- New backup codes are displayed after regeneration.
- A new backup code can complete the 2FA challenge once.
- Older backup codes no longer work.
- An audit row is recorded for `security.backup_codes_regenerated` without any backup-code values.

## Account Status And Lifecycle

### Inactive Member Is Blocked

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Deactivate `{CONTRACTOR_EMAIL}` from `/admin/people`.
3. Sign out.
4. Sign in as `{CONTRACTOR_EMAIL}`.
5. Open `https://{DOMAIN_NAME}/dashboard`.

Expected result:

- The inactive member sees an account status page.
- Dashboard content is not visible.

### Invited But Not Activated Member Is Blocked

1. Use an invited member that has not completed activation.
2. Sign in through the invitation email if possible.
3. Open `https://{DOMAIN_NAME}/dashboard`.

Expected result:

- The member is told to activate the invitation first.
- Dashboard content is not visible until activation succeeds.

### Archived Member Is Blocked

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Archive `{CONTRACTOR_EMAIL}` from `/admin/people`.
3. Sign out.
4. Sign in as `{CONTRACTOR_EMAIL}` if authentication is still possible.
5. Open `https://{DOMAIN_NAME}/dashboard`.

Expected result:

- The archived member sees an account status page.
- Dashboard content is not visible.
- Reusing an old invitation link for that member does not reactivate the archived account.

## Reports And PDF Export

### Filter Report Data

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/reports`.
3. Switch between month, week, day, year, and custom period filters.
4. Filter by project, project group, and member.
5. Pick **two** projects and **two** members in the same report, then apply.
6. Copy the URL, open it in a new tab, and confirm both values come back on each filter.
7. Export the report to PDF with two projects chosen, and read the header.
8. Export again with exactly one project chosen.
9. Switch between user view and project view.
10. Clear filters.

Expected result:

- The report updates for each period mode and filter.
- User view groups by people.
- Project view groups by projects.
- The selected filters are reflected in the URL and survive browser refresh. A filter holding
  several values appears once per value (`?project=…&project=…`), and every value comes back when
  the URL is reopened — none is silently dropped.
- The report totals cover **all** chosen projects and members, not only the first one.
- The exported PDF header names every chosen project, in the order the picker lists them, joined the
  way the document's language joins a list (`Apollo, Helix és Belső` in Hungarian). With one project
  chosen it names that project and shows its colour dot; with two it names both and shows no dot.
- With two projects chosen the detail table keeps its project column — the header says what the
  scope is, the column says which line is which. With exactly one it drops that column, as before.
- The preview inside the export dialog and the downloaded file describe the same scope.
- Clearing filters returns to the default monthly report.
- The donut chart's center label shows exactly one hour unit (e.g. `3.38 h`), never a doubled or
  mismatched unit, in every display-preference and locale combination.

### Edit Report Rows And Save Optional Corrections

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/reports` and choose filters that include multiple time entries.
3. Note the total hours, one group total, and one row's description and hours.
4. Click `Edit` above the itemized breakdown.
5. Change the noted row's description and hours, typing a value like `3:30` or `3h 20m` into the
   hours field.
6. Confirm the report totals, group total, charts, and itemized row update immediately.
7. Type `0` into another row's hours field and tab away; separately, type an unparseable value like
   `abc` into a row's hours field and tab away.
8. Click `Editing done`.
9. Confirm the edited row carries a visual edit indicator.
10. Confirm a prominent unsaved-change bar remains visible after leaving edit mode.
11. Click `PDF export` and inspect the preview.
12. Leave `Save edits to recorded time` off, download the PDF, then close the dialog.
13. Confirm the unsaved-change bar is still present after the export dialog closes.
14. Refresh the report and confirm the original values return.
15. Repeat the edit, click `Save to recorded time` on the report page, enter a correction reason,
    and confirm.
16. Open the affected member's week on `/time`.
17. Repeat with another edit by selecting `Save edits to recorded time` inside the PDF export
    dialog, enter a reason, and download the PDF.

Expected result:

- Edit mode replaces row descriptions and hours with in-place inputs without changing the row's
  member, project, or date.
- The hours field accepts the same duration formats as the `/time` grid (`3.5`, `3:30`, `3h 20m`,
  `200m`) and commits the parsed duration exactly, with no float rounding drift. Typing `0` or an
  unparseable value is rejected: the field reverts to the row's last committed value instead of
  silently saving a zero or truncated duration.
- The information banner states that changes remain report-only until explicitly saved.
- Totals, grouped summaries, charts, PDF preview, and the downloaded PDF all use the working-copy
  values consistently.
- Completing edit mode keeps the working-copy changes on the current page but does not persist them
  to the underlying time entries.
- Exporting without the save option leaves the working-copy edits visible after the dialog closes;
  refreshing restores the values from recorded time.
- Saving from either the report page or export dialog requires a reason and permanently updates the
  source entry. A duration correction removes the old start/end interval so it cannot contradict
  the corrected total.
- The affected member's week shows an admin-correction banner. The entry shows the admin name,
  correction time, and reason in the day view, entry editor, and multi-entry breakdown.
- The audit log contains `time_entry.admin_updated` with before/after values and the correction
  reason. It must not store only a generic `time_entry.updated` event for this operation.
- Saving is rejected if an affected entry belongs to a submitted/locked timesheet period or if the
  correction would make a day exceed 24 hours; the unsaved working copy remains available.
- Hungarian and English modes translate the edit action, completion action, information banner,
  persistence controls, member correction notice, and accessible input labels.

### Configure Export Dialog

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/reports` and choose filters that include tracked time.
3. Confirm the page header carries only the `PDF export` button — no export title field and no
   content dropdown.
4. Click `PDF export` and wait for the preview.
5. Type a new export title one character at a time and watch the preview.
6. Switch the content selection to internal, then back to cost-free.
7. Switch time display between decimal hours and hours/minutes and compare the preview.
8. Resize the window down to a narrow width.
9. Close the dialog with the `X`, with `Escape`, with `Cancel`, and by clicking outside it. Reopen it
   after each.

Expected result:

- The dialog opens with the export title prefilled from the current period, cost-free selected, and
  `PDF document` shown as the only format.
- The preview pane renders the real report document as a white page, one image per page of the
  export, on the tinted panel behind it.
- Typing does not re-render the preview on every keystroke: the preview refreshes once, roughly half
  a second after typing stops, and the heading it shows then matches the title field.
- A refresh never blanks the preview. The pages already on screen stay put and keep their scroll
  position while the new render runs; a `Rendering the preview…` note appears next to the `PREVIEW`
  label, stays visible even when the pages are scrolled past, and the new pages replace the old ones
  in place. Switching content back and forth quickly does not make the pane strobe.
- Selecting internal reveals the amber `Cost data is visible` warning, the preview gains rate and
  cost columns plus a cost metric, and the time-display selector becomes disabled with a hint
  explaining that internal exports always show decimal hours so they stay checkable against the
  amounts beside them. Selecting cost-free re-enables the selector and removes the warning and cost
  columns again.
- The time-display selector defaults to the admin's saved preference for a cost-free export. Decimal
  mode renders 203 minutes as `3.38 h`; hours/minutes mode renders it as `3:23` — identical in both
  Hungarian and English, since the hour-minute format is locale-neutral. Switching to internal
  forces the selector to `Decimal hours` and greys it out; the preview and the downloaded PDF render
  `3.38 h` for internal exports regardless of what the selector showed before switching.
- The footer states the time zone the report was cut on, matching the admin's own time zone.
- Below roughly 48rem the two panes stack instead of scrolling sideways, and the page never scrolls
  horizontally.
- Every close route dismisses the dialog and returns focus to the `PDF export` button. Reopening
  resets the title, content selection, and time display to their defaults.
- The dialog title, both content labels and hints, the warning, the format row, the preview label,
  the time zone label, `Cancel` and `Download PDF` are all translated in Hungarian and English.
- Both themes are legible: the config rail and footer follow the theme, while the preview page stays
  white in dark and light alike, because it is the printed document.

### Export Preview Fidelity And Limits

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/reports`, pick a period long enough to fill more than one page,
   and open the export dialog.
3. Scroll the preview pane to the last page.
4. Download the PDF and compare it page by page against what the preview showed.
5. Pick a period with more than 12 pages of tracked time, if the data allows it.
6. Filter down to a period with no tracked time and look at the `PDF export` button.
7. Open the audit log and count the `report.exported` rows created while previewing.

Expected result:

- The preview shows every page of the document, not only the first, in order.
- The downloaded PDF matches the preview: same title, same columns, same totals, same page count.
- Beyond 12 pages the preview stops and says it is showing the first 12 pages, while the download
  still contains all of them.
- With no tracked time in range the `PDF export` button is disabled and the dialog cannot be opened.
- Previewing records no `report.exported` audit rows, creates no report export or document rows, and
  writes nothing to object storage. Only the actual download does.

### Export Cost-Free PDF

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/reports`.
3. Choose filters that include tracked time.
4. Click `PDF export`.
5. Enter `{REPORT_EXPORT_TITLE}` as the export title.
6. Keep cost-free content selected.
7. Click `Download PDF`.
8. Open the downloaded PDF.
9. Search the PDF for hourly rate, amount, and currency values that should only appear internally.

Expected result:

- A PDF downloads successfully.
- The export title appears at the top of the PDF.
- The PDF contains hours, dates, projects or members, and descriptions.
- The PDF does not contain hourly rates or calculated amounts, and does not name the export mode.
- An audit row is recorded for `report.exported`.

### Export Internal PDF

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/reports`.
3. Choose filters that include tracked time with configured rates.
4. Click `PDF export`.
5. Enter `{INTERNAL_REPORT_EXPORT_TITLE}` as the export title.
6. Select internal content.
7. Click `Download PDF`.
8. Open the downloaded PDF.

Expected result:

- A PDF downloads successfully.
- The PDF contains hours, hourly rates, currencies, and calculated amounts.
- Every hours figure in the PDF renders decimal at two fraction digits (e.g. `9.50 h`), regardless
  of the admin's saved time-display preference, so it stays checkable against the amount beside it.
- Missing rates are marked with an em dash and explained in a footnote, not silently
  calculated as zero.
- An audit row is recorded for `report.exported`.

### Export Runtime Configuration

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/reports`.
3. Export a PDF from an environment where object storage and Typst are configured.
4. Repeat in an environment where Typst is intentionally not available, if such an environment exists.
5. In that same environment, open the export dialog and read the preview pane.

Expected result:

- With object storage and Typst configured, the export succeeds.
- Without Typst, the export fails with a clear server error instead of a broken or empty PDF.
- Without object storage, the export fails and no report export metadata is left behind.
- Without Typst, the preview pane shows a translated failure message and a retry button rather than
  an empty white page, and the message does not leak the binary path or the renderer's stderr.

### Export Template Rendering And Localization

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Set the interface language to Hungarian, open `https://{DOMAIN_NAME}/admin/reports`, and export
   both a cost-free and an internal PDF with the `PDF language` selector left on `Magyar`.
3. Switch the interface language to English, keep the `PDF language` selector on `English`, and
   export both again.
4. Open all four PDFs.

Expected result:

- Every PDF renders in the language chosen in the dialog: headings, table headers, the
  confidentiality pill, the scope facet labels, the `Generated` label, the `Total` row, the footer
  page label, and the footnotes.
- Hungarian accented characters (`ő`, `ű`, `á`, `é`, `í`) render correctly and are not replaced by
  boxes or blank glyphs. The body font is Inter in both languages.
- Dates never wrap onto a second line inside the date column, in either language.
- Cost-free PDFs contain no rate, amount, or currency values anywhere, including in the summary
  band and the breakdown table.
- A report whose lines have missing rates shows a warning banner, an em dash in the affected rate
  and amount cells, and a footnote explaining the em dash — never a zero amount.

### Export Language Independent Of The Interface

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Set the interface language to Hungarian and open `https://{DOMAIN_NAME}/admin/reports`.
3. Click `PDF export` and read the `PDF nyelve` selector.
4. Select `English` and wait for the preview to re-render.
5. Type `{REPORT_EXPORT_TITLE}` over the generated title, switch back to `Magyar`, then to `English`
   again.
6. Click `Download PDF` and open the PDF.
7. Switch the interface language to English, reopen the dialog, select `Magyar`, and download again.
8. Reopen the dialog after both downloads.

Expected result:

- The selector is a two-pill toggle matching the `User view` / `Project view` pills on the reports
  page, reachable by keyboard with the arrow keys moving the selection, in both dark and light theme.
- The dialog's own labels and buttons stay in the interface language; only the preview and the PDF
  follow the selector.
- Selecting `English` re-renders the preview in English within about a second, and the generated
  title switches from `Időriport - …` to `Time report - …`.
- A hand-typed title survives every later language switch; it is never overwritten.
- Both PDFs render fully in the language the selector showed at download time, with the app chrome
  in the other language — proving the two directions are independent.
- Reopening the dialog resets the selector to the interface language, the generated title, and
  cost-free content.

### Export Document Design

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/reports`, choose a period with enough tracked time to fill
   more than one page, and export both a cost-free and an internal PDF.
3. Read the header block, the summary band, and both tables in each PDF.
4. Search both PDFs for the words `internal`, `cost-free`, `belső`, and `költségmentes`.
5. Print or preview one PDF on paper.

Expected result:

- Neither PDF names its export mode anywhere. Both carry the same `Confidential` pill, and the
  header states the scope instead: view, period, and the project, project group and member filters,
  with an open filter spelled out as `All projects` / `All members`.
- An internal export is distinguishable from a cost-free one only by its rate and amount columns
  and its amount metric.
- The summary band never leaves an orphaned metric on a second row: four metrics for a cost-free
  export, five for an internal one, on a single row.
- Numeric columns are right-aligned, decimal points line up down each column, and every table has
  alternating row tints.
- Each table ends with one `Total` row. It appears only after the last row of the table, never at
  the foot of a page the table continues past.
- The column header row repeats at the top of every page a table spans, and the footer reads
  `Page 2 / 3` style page numbers.
- Group rows carry a member initials chip in user view and a project colour dot in project view;
  the dot colour matches the project colour on screen.
- The share column shows a bar whose length matches its percentage, and the bar is still visible
  for a group rounding to `0%`.
- The printed page is white with tinted panels and table rows, not a full-page cream background.

### Export Scoped To One Project Or One Member

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/reports`, select a single project, keep user view, and export
   both a cost-free and an internal PDF.
3. Switch to project view, clear the project filter, select a single member, and export both again.
4. Select a single project _and_ a single member together, and export once more.
5. Repeat step 2 with a project group selected instead of a single project.

Expected result:

- With one project selected, no PDF repeats the project name down a column. The project appears
  once, in the header `Project` facet, next to a dot in its own project colour.
- The internal details table drops its `Project` column and keeps `Member`; the description column
  takes over the freed width.
- The cost-free details table replaces its `Project` column with `Member`, so every row is still
  attributable to someone. It never ends up with only a date, a description and hours while more
  than one member contributed.
- With one member selected in project view, the reverse happens: the `Member` column disappears and
  the cost-free table shows `Project` instead.
- With both a single project and a single member selected, both identifying columns are gone, the
  details table is date, description and hours, and the header names both.
- The `Projects` metric disappears from the summary band for a single-project export, and `People`
  disappears for a single-member export. No metric reads `1`.
- The breakdown section is omitted entirely when the report has only one group row, since its
  totals would restate the summary band. The details table still ends with its own `Total` row.
- Selecting a project _group_ changes nothing about the columns: a group spans several projects, so
  the `Project` column and the `Projects` metric both stay.

### Export Templates Present In The Deployed Image

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/admin/system`.
3. Read the Typst PDF renderer check.
4. Export any report PDF.

Expected result:

- The Typst PDF renderer check passes, which also confirms the `.typ` templates and the bundled
  Inter fonts were included in the deployed image, not only that the Typst binary exists.
- If the check fails with a message naming a templates directory, the deployment is missing
  `src/server/pdf/templates`; the export will fail the same way.

## Audit Log

### Open Audit Watcher

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `{AUDIT_LOG_VIEW}`.
3. Click `Refresh`.
4. Enable `Watch`, wait at least 15 seconds, then disable it.

Expected result:

- The audit log opens for admins.
- The page shows matching event count, pagination, filters, and event rows.
- Refresh and Watch update the event list without signing the admin out.
- Non-admin users cannot open `{AUDIT_LOG_VIEW}`.

### Search And Filter Audit Rows

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `{AUDIT_LOG_VIEW}`.
3. Search for a known event action, for example `member.updated` or `security.totp_reset`.
4. Filter by event, target type, actor, and a date range.
5. Pick **two** events (for example a rate created and a rate updated), then apply.
6. Pick `Rendszer` / `System` **and** a named person in the actor filter, then apply.
7. Page to the second page of results.
8. Clear the filters.

Expected result:

- Search and filters update the URL query string. A filter holding several values appears once per
  value, and every value comes back when the URL is reopened.
- Rows match the selected criteria, and a multi-value filter matches **any** of them: two events
  show both events' rows.
- `Rendszer` / `System` picked alongside a person shows both the system rows and that person's —
  system is not a member, so it cannot be folded in with real actors.
- Clearing filters returns to the unfiltered first page.
- Pagination keeps the selected filters, including every value of a multi-select one.

### Audit Details Redaction

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `{AUDIT_LOG_VIEW}`.
3. Open `Details` for a security or member lifecycle event.

Expected result:

- The details dialog shows actor, target, request metadata, and before/after JSON.
- Sensitive-looking keys such as password, token, secret, backup code, and credential values are
  displayed as `[redacted]`.
- Closing the dialog returns to the same filtered audit list.

## Help And Manual

### Read Help Welcome Content

1. Sign in as `{EMPLOYEE_EMAIL}`, `{CONTRACTOR_EMAIL}`, or `{ADMIN_EMAIL}`.
2. Open `{HELP_VIEW}`.
3. Select the `Welcome` tab.

Expected result:

- The Help page opens for active users.
- The Welcome tab shows the published admin-maintained markdown content.
- If no admin content has been published yet, the page shows the source default welcome content.
- Signed-out users cannot open `{HELP_VIEW}`.

### Read Manual With Role-Based Visibility

1. Sign in as `{EMPLOYEE_EMAIL}`.
2. Open `{HELP_VIEW}` and select the `Manual` tab.
3. Confirm general topics, such as dashboard, time tracking, and security settings, show full text.
4. Confirm contractor-only and admin-only topics are visible as topic names but show only a generic restricted message.
5. Sign out and repeat as `{CONTRACTOR_EMAIL}`.
6. Sign out and repeat as `{ADMIN_EMAIL}`.

Expected result:

- Employees can read only topics for functions they can use.
- Contractors can read contractor timesheet/invoice topics in addition to general topics.
- Admins can read every manual topic.
- Restricted topics do not expose detailed operational instructions.

### Admin Publishes Welcome Content

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `{ADMIN_INFO_VIEW}`.
3. Enter `{HELP_WELCOME_TITLE}` as the title.
4. Enter `{HELP_WELCOME_MARKDOWN}` as the markdown body.
5. Confirm the live preview updates.
6. Click `Publish`.
7. Open `{HELP_VIEW}` and select the `Welcome` tab.

Expected result:

- The admin editor is available only to admins.
- The live preview renders the controlled Markdown subset.
- Publishing stores a new immutable version and shows a success message.
- After publishing, the editor shows the stored (trimmed) title and body, the new version number,
  and an updated-at timestamp formatted in the selected interface language.
- The Help Welcome tab shows the newly published content.
- An audit row is recorded for `info_pages.publish`.

### Help Navigation

1. Sign in as `{ADMIN_EMAIL}`.
2. Open `https://{DOMAIN_NAME}/dashboard`.
3. Click the sidebar Help link.
4. Click the admin `Information page` navigation item.

Expected result:

- The sidebar Help link opens `{HELP_VIEW}` and highlights Help.
- The admin Information page navigation item opens `{ADMIN_INFO_VIEW}`.
- Non-admin users do not see or access `{ADMIN_INFO_VIEW}`.

## Navigation

### Sidebar Real Routes

1. Sign in as `{ADMIN_EMAIL}` with TOTP enabled and verified.
2. Open `https://{DOMAIN_NAME}/dashboard`.
3. Click `Irányítópult` in the sidebar.
4. Click `Emberek` in the sidebar.
5. Click `Napló` in the sidebar.

Expected result:

- `Irányítópult` opens `/dashboard`.
- `Emberek` opens `/admin/people`.
- `Napló` opens `/admin/audit`.
- The current sidebar item is highlighted.

## Appearance

### Theme Preference

1. In the browser devtools console run `localStorage.removeItem("theme")`, set the operating system
   to light appearance, and hard-reload `https://{DOMAIN_NAME}/dashboard`.
2. Open the theme control in the header (next to `HU | EN`) and pick `Sötét` / `Dark`.
3. Navigate to `/time`, then reload the page.
4. Pick `Rendszer` / `System`, then flip the operating system appearance while the tab stays open.
5. Open a second tab on `/dashboard` and change the theme there.
6. Below the `md` breakpoint, open the navigation drawer and use the theme and language controls in
   its footer.
7. Sign out and repeat step 2 on `/login`.

Expected result:

- With no stored preference the app follows the operating system, and the light theme paints with no
  dark flash at any point during load.
- The header control shows a sun in light and a moon in dark, and the open menu marks the active
  preference.
- The chosen theme survives navigation, reload, and a language change.
- On `System`, flipping the operating system appearance re-themes the open tab without a reload.
- Changing the theme in one tab re-themes the other.
- In light theme the sidebar and mobile drawer are white (not near-black), the page wash is warm, and
  dialogs, dropdowns, and popovers stay readable.
- The drawer footer controls work on mobile and match the header behaviour.
- The auth screens offer the same three options with the same labels in both locales.

### Design Token Fidelity Against The Prototype

Reference screens live in `claude_design_proto/screenshots` (gitignored). The prototype remains
the reference for the **light** theme; the dark theme follows `docs/dark-mode-redesign.md`
("Graphite Aurora") instead, so dark prototype screenshots are historical — compare dark against
the checked-in visual baselines and the scenario below.

1. Open `/dashboard` in dark theme and compare against `shell-dark-admin.png` and `dash-admin-dark.png`.
2. Confirm the page canvas shows a faint mint glow off the **top-right** corner and a faint peach
   glow off the **bottom-left**, over a near-black graphite base — not a flat fill.
3. Switch to light theme. The canvas base is a warm beige that lightens toward white at the top-right.
4. On both themes check a card: it is fully opaque, with no gradient showing through it.
5. Hover a clickable card. It rises slightly, its border strengthens, and it gains one soft shadow.
6. In light theme confirm shadows read teal-grey, not black.
7. Check status pills on `/timesheets` or the review queue: a soft tint fill, tone-coloured text,
   and a faint border of the same hue. The neutral pill keeps the standard border.
8. Check a primary button: a mint gradient with a soft glow beneath it, not a flat fill.
   Check the amber CTA button hovers to a deeper amber.
9. Open a dialog and a drawer. The backdrop is a near-black scrim with a slight blur.
10. Open a dropdown, a select and a tooltip. Each has a visible stronger border; the tooltip sits on
    the tertiary surface, not the card colour.
11. Trigger a loading state and confirm skeletons sweep a sheen across themselves rather than pulsing.
12. Compare `/time` against `timegrid-dark.png` and `/admin/reports` against `rp-main.png`.
13. Repeat steps 4–12 in the other theme.

Expected result:

- Both glows are visible on every app page in both themes.
- Card, table, panel and popover surfaces are opaque and match the prototype's surface colour.
- Every tone tint (success, warning, danger, accent) uses one consistent strength per theme, and in
  light theme reads as a solid pastel rather than a washed-out dark colour.
- Table headers have no fill of their own, just a hairline rule, in the subtle text tier.
- Placeholders sit one step lighter than body copy.
- Nothing regresses at mobile widths, and the collapsed sidebar rail is 76px.

### Graphite Aurora Dark Theme

1. Open `/dashboard` in the dark theme and look at the overall colour of the chassis: page,
   sidebar, cards, dividers.
2. Compare the sidebar against the page canvas, then hover an inactive navigation item and look at
   the active one.
3. Find a screen showing several status pills together (`/timesheets`, the review queue) and a
   dashboard distribution bar with success, warning, and danger segments side by side.
4. Look at the page gutters on `/dashboard` — the margins around and below the cards — then at a
   dense table screen, then at `/login`.
5. Enable "reduce motion" in the operating system and reload `/dashboard` and `/login`.
6. Open `/time` and any form: click into an input.
7. Open `/admin/reports` and check the donut, the horizontal bars, and the utilization trend in
   both themes.
8. Switch to the light theme and check an "Approved" pill and a rejected/danger state, then switch
   back to dark and check the same rows.

Expected result:

- The chassis is neutral graphite — no green or teal cast on the page, cards, hovers, or borders.
  Body text reads warm off-white, not mint-tinted. Mint appears only as a signal: the active nav
  item, focus rings, links, the primary button, the running timer.
- The sidebar is darker than the canvas and recedes; the active item carries a soft mint tint, a
  bright label, and a thin gradient rail on its left edge; inactive items sit in the quiet third
  text tier until hovered.
- Every pill tone is distinguishable at a glance — danger is unmistakably rose, warning amber,
  success green, info mint — each with a faint border of its own hue. The distribution bar's three
  segments never read as two warm blushes.
- The gutters show a faint dot lattice, a barely-there grain, and the brand shapes as soft light:
  two blob glows whose silhouettes are readable via their thin outline echoes, a wave ridge along
  the bottom, and a line-art swoosh off the top-right corner. None of it shows through cards,
  tables, or dialogs, and a dense financial table stays calm. The auth screen shows the same
  atmosphere behind the form panel only, never over the teal brand panel.
- With reduce motion on, the corner glows sit still, centred and unscaled, and the page looks
  composed — nothing is caught mid-drift.
- Inputs sit slightly below the surface (a darker inset fill in dark, a warm cream fill in light)
  with a visible border and a bright mint focus ring.
- Report series follow one fixed colour order — mint, amber, violet, green, rose, blue — in both
  themes; a series keeps its colour when filters change, and every mark is readable on its card.
- "Approved" is the same green and "rejected" the same rose in both themes — the hue does not
  drift between light and dark, and the pill text stays readable on its tint in both.

### Brand Mark and Organisation Branding

1. On a build with none of the `NEXT_PUBLIC_ORG_*` variables set, open `https://{DOMAIN_NAME}/dashboard`
   in the dark theme and look at the top of the sidebar.
2. Switch to the light theme without reloading, then collapse the sidebar with
   `Oldalsáv összecsukása` / `Collapse sidebar` and reload.
3. Below the `lg` breakpoint, open the navigation drawer and look at its header.
4. Sign out and look at the brand tile on the teal panel of `/login` in both themes and at mobile
   width. Open the browser tab of `/login` and check the page description in the page source.
5. Rebuild with `NEXT_PUBLIC_ORG_NAME="Acme Corp"`, `NEXT_PUBLIC_ORG_LOGO=/brand/rolloutit-mark-blue.png`
   and `NEXT_PUBLIC_ORG_LOGO_DARK=/brand/rolloutit-mark-light.png` and repeat steps 1–4. With devtools
   open on the network tab, hard-reload `/dashboard` and filter for `rolloutit`.
6. As an admin export a report PDF, first without and then with `ORG_LOGO_PDF_PATH=public/brand/rolloutit-mark-blue.png`
   set on the server.

Expected result:

- Without configuration the sidebar shows Sheet Happens' own clock pictogram (teal), the `Sheet Happens`
  wordmark and the subtitle `Time & timesheets` / `Idő és timesheet`. No Rollout IT name, logo or
  `internal` label appears anywhere, including the auth panel, and the page description is the
  generic one.
- The default mark follows the palette in the sidebar and is light on the auth panel in **both**
  themes — the panel is teal either way.
- With the three variables set, the subtitle becomes `Acme Corp`, the sidebar shows the configured
  logo — the dark-surface file in the dark theme and the light-surface file in the light theme,
  swapping the instant the theme changes — and the auth panel shows the dark-surface file in both
  themes. Both files are requested once.
- The collapsed rail and the mobile drawer header show the same mark as the expanded sidebar.
- The PDF header reads `SHEET HAPPENS` without configuration and `SHEET HAPPENS - ACME CORP` with the
  name set, and carries a logo left of it only when `ORG_LOGO_PDF_PATH` points at a readable image.
  A wrong path still exports, just without a logo.

### Auth Panel Gyroscope

1. Sign out, then open `https://{DOMAIN_NAME}/login` on a desktop width and watch the teal panel for
   the first two seconds without touching anything.
2. Keep watching for two or three minutes without scrolling or moving the pointer.
3. Note where the brand mark sits, wait about twenty seconds, and look again. Repeat a few times.
4. Maximise the window on the tallest display available and watch another two minutes.
5. Narrow the window from full width down to roughly 1024px, then shorten it to roughly 700px tall and
   then to roughly 640px, watching the mark against the headline, the tip pill, and the footer line the
   whole way.
6. Leave the window at 1024×768 and watch a full minute there.
7. Narrow past the `lg` breakpoint so the panel becomes a banner.
8. Repeat step 1 on `/set-password`, `/reset-password`, and the two-factor challenge screen, in both
   Hungarian and English — the moods with the longest headlines wrap to two lines.
9. Switch the theme between light, dark, and system while the panel is on screen.
10. In the operating system accessibility settings turn on reduce motion, then hard-reload `/login`.

Expected result:

- The rings fade and scale into place one after another over roughly a second, and the mark blooms in
  last. Nothing jumps or lands in the wrong place.
- Four rings turn, at different speeds and in different directions, on three visibly different axes —
  the cage reads as a gyroscope, not as stacked ellipses. Two bright arcs sweep round much faster than
  the rings they ride. Glowing beads travel the rings with short tails behind them, and pass in front
  of and behind the centre. Two faint rings ping outward from the mark every few seconds.
- The whole cage wanders slowly and continuously, carrying the mark with it, and the rings swell and
  shrink as it travels. It moves both across the panel and up and down it, and the two do not keep step:
  the path should never look like a circuit being retraced. Over several minutes the mark should not
  return to a spot you have already seen it in — the two axes only line up again after about 70 minutes.
  The motion is even throughout, easing to a stop only at the far edges of its travel, with no jerk or
  snap anywhere, including where it passes back through the middle.
- The taller the window, the further up and down it ranges; a short window is mostly side to side, and
  around 640px tall it stops moving vertically altogether. That is expected — there is no room.
- The brand mark stays upright and perfectly still on its frosted tile throughout — it never
  rotates with the rings, and it does not tilt or spin as the cage travels. It breathes very slightly,
  out of step with the glow behind it.
- The mark is the cream version at every width and in every theme, since the panel is teal in both.
- Anywhere the cage wanders, at every window size, the mark's tile never touches or overlaps the
  headline, the tip pill, or the footer line, and never gets clipped by the edge of the teal panel. It
  comes closest to the left and right edges of the panel, so watch those. Ring arcs crossing behind the
  text are expected; the frosted tile landing on text is not.
- On the mobile banner the mark, the two fast arcs, and the innermost ring are gone; the two remaining
  rings are cropped to arcs and still turn.
- Under reduce motion everything is still and the panel still looks composed and deliberate — rings
  crossing on three axes, with the cage at rest at the middle of its travel on both axes: horizontally
  centred on the panel, and vertically midway between the tip pill and the footer line. No ring is
  stranded mid-expansion and nothing is missing except the pings.
- Scrolling and typing in the form on the right stay smooth with the animation running.

### Brand Typefaces Load From The App Itself

Lexend and Poppins are self-hosted from `public/fonts`. Before this they were named in CSS but never
loaded, so every screen silently fell back to the OS UI font. The point of this scenario is to catch
a **silent** regression: on a machine that happens to have Lexend or Poppins installed locally, a
broken `@font-face` still looks correct. Test with DevTools, not with your eyes alone.

1. Open `/dashboard` with DevTools → Network, filtered to **Font**, and hard-reload.
2. Confirm `lexend-variable-latin.woff2` and `lexend-variable-latin-ext.woff2` are both fetched from
   this app's own origin (`/fonts/…`), status 200 — not from `fonts.gstatic.com`.
3. Confirm the two Lexend files start loading immediately on navigation, not after the page paints.
4. Scroll to any table header or uppercase micro-label (`.font-ui`) and confirm `poppins-*.woff2`
   files are fetched too.
5. In DevTools → Elements, select a paragraph of body copy and read the **Computed → Rendered Fonts**
   readout at the bottom of the pane. It must say `Lexend`.
6. Select a table header or a stat-card label and confirm its rendered font is `Poppins`.
7. Switch the app to Hungarian and open a screen with accented copy — `/time` or `/timesheets`.
8. Find a word containing **ő** or **ű** (`Időszak`, `Hétfő`, `Törlés`, `űrlap`) and confirm the
   rendered font for that text is still `Lexend`, with `lexend-variable-latin-ext.woff2` in the
   Network list.
9. Repeat step 8 on a `.font-ui` label containing ő/ű and confirm it is still `Poppins`.
10. Throttle the network to Slow 3G and reload. Watch the first paint of body text.
11. Open `/login` and repeat steps 5 and 8 — the auth screens sit outside the app shell.
12. Repeat steps 5–6 in the other theme.

Expected result:

- Every font file comes from this origin. **No request to `fonts.googleapis.com` or
  `fonts.gstatic.com` on any screen** — the app must render correctly with the machine offline from
  Google, and with Lexend and Poppins uninstalled from the OS.
- Body copy renders as Lexend and `.font-ui` labels render as Poppins, in both themes and both
  locales, on `/login` as well as inside the app shell.
- Hungarian ő and ű are the **same** typeface as the letters around them. A word where ő or ű is
  visibly narrower, differently shaped, or sitting on a different baseline than its neighbours means
  the `latin-ext` file failed to load and the glyph fell back to a system face.
- Nothing renders in a heavier or lighter weight than designed. Poppins only ships 400/500/600/700
  here; a label that looks artificially smeared or squeezed means markup asked for a weight with no
  file behind it.
- Under Slow 3G, text may appear briefly in the fallback face and then swap once — acceptable. Text
  must never be **invisible** while the font loads, and the swap must not reflow the page enough to
  move what you were about to click.

### Brand Dropdowns And Date Pickers

Every native `<select>` and `<input type="date">` in the app is replaced by a brand-aware control,
and dropdowns above eight options grow a search field. The controls submit through hidden native
fields, so the whole point of this scenario is that the **submitted values are unchanged** — a
picker that looks right but sends the wrong shape fails silently, filtering nothing or saving
nothing, with no error on screen.

1. Open `/admin/timesheets`, pick a month in the month picker, and Apply.
2. Read the address bar. It must carry `month=2026-08` — **four digits, a dash, two digits**. A
   `month=2026-08-01` means the filter was dropped: the list will show every month with no error.
3. Confirm the list actually narrowed to that month, then use Clear and confirm the filter resets.
4. On the same page, open the contractor dropdown, type part of an email address, and confirm the
   match is found by email even though the trigger shows only the name.
5. Open `/admin/reports` and click through all five period pills — Month, Week, Day, Year, Custom.
6. Confirm the control beneath them changes shape each time: a month grid, a calendar, a calendar, a
   plain year number field, and a start/end pair.
7. For each period, Apply and confirm the URL carries `anchor=` for the first four and `start=`
   plus `end=` only for Custom. A URL carrying both is wrong.
8. Open `/admin/people` → Invite member. Choose a currency and a timezone by typing in the search
   field rather than scrolling (roughly 300 and 400 options respectively).
9. Send the invite. After the success message, confirm the form is **fully** reset — including the
   currency and timezone triggers, not just the text fields. A trigger still showing the previous
   choice means the next invite will submit an empty value.
10. Open `/admin/rates`, add a rate period, and confirm the currency picker saves. Then open a
    replacement period and confirm days outside the period being replaced are greyed out and
    unclickable.
11. Open `/admin/people` → edit a member → change the timezone. This picker lives inside a drawer:
    confirm the panel opens, the search field takes focus, typing filters, and Enter selects.
12. Open `/time`, open the entry form, and confirm the date picker only offers days inside the open
    week. Confirm the start and end time fields are still the native time inputs, so typing `0930`
    fills them without opening anything.
13. Repeat steps 1, 5 and 12 in Hungarian, then repeat them in the other theme.
14. Repeat step 5 and step 12 at 390px width.
15. Keyboard only, no mouse: tab to a dropdown, open it with Enter, type to filter, arrow to a row,
    Enter to choose, and confirm focus lands back on the trigger. Then open a date picker, arrow
    between days, and press Escape.

Expected result:

- The month filter URL is `YYYY-MM` and the day filters are `YYYY-MM-DD`. Nothing submits a
  partially-padded value such as `2026-8-5`.
- Every "All …" dropdown shows its "All …" label on the trigger when nothing is selected, never a
  blank trigger.
- Search appears on the long lists (currency, timezone, project, member, contractor) and does not
  appear on the short ones (status, role, profile, project type).
- Searching ignores accents in both directions: typing `arvizturo` finds `Árvíztűrő`, and typing
  `Árvíz` finds it too.
- Inside a drawer or dialog the picker panel takes focus and keeps it. Focus snapping back to the
  drawer the instant a panel opens is a failure.
- Every control returns focus to its own trigger when closed, by selection or by Escape.
- Hungarian weekday headers read H / K / Sze / Cs / P / Szo / V and the month caption is lowercase
  (`2026. június`, not `2026. Június`).
- At 390px the calendar and the option lists stay inside the viewport — no horizontal scrolling of
  the page itself.

### Focus Indication

Focus used to paint twice — a global mint outline that no component could cancel, plus each
component's own ring — so dropdowns flashed highlight boxes that came and went for reasons a user
could not see. There are now two treatments and they must never both appear on one control. The
tell-tale of a regression is **two mint rings at different offsets**, or a highlight box that
appears on a mouse click.

1. Open `/admin/timesheets`. Using the mouse only, click the **Status** filter (eight options, a
   plain menu) and read the closed trigger before the panel covers it: no ring, no glow, no outline.
2. With the panel open, move the pointer down the rows. Each row under the pointer gets a soft grey
   fill and nothing else — no ring around the row.
3. Still in that panel, press ↓ three times. This is the case that used to light up: the rows must
   still show only the grey fill.
4. Escape out, then press Tab until the Status trigger has focus. Its border turns mint. Nothing
   else changes — the control must not grow, glow, or gain a second ring outside the border.
5. Click the **Contractor** filter (more than eight options, so it has a search field). The search
   field shows a text caret and **no** box of any kind around it.
6. Type two letters, then hover a result row and arrow through the rows. Only the grey fill moves.
7. Tab through the page chrome — a button, a checkbox, a tab, a table row. Each shows exactly one
   mint indicator. Count the rings: two concentric mint lines is the old bug.
8. Click those same controls with the mouse. Nothing paints — a click leaves no focus box behind.
9. Switch to the light theme and repeat steps 1, 4, 5 and 7. `--ring` is a darker teal there, so a
   too-faint border on the focused trigger is a light-theme-only failure.
10. Open `/time` and click a cell in the week grid. The cell gets a mint stroke drawn **inside** its
    own edges, not spilling over the neighbouring cells.
11. Open a table with clickable rows (`/admin/people`) and Tab to the first and last row. The
    indicator is drawn inside the row and is not clipped by the card edge.
12. Keyboard only, no mouse: Tab from the top of `/admin/timesheets` to the bottom and confirm you
    can always tell where you are. A step where nothing is visibly focused is a blocker, not a nit.

Expected result:

- A control with its own border (inputs, textareas, dropdown and date-picker triggers) indicates
  focus by turning that border mint, and by nothing else.
- A borderless control (button, icon button, chip, tab, calendar day) shows one 2px mint outline
  with a 2px gap. On a filled primary button the gap is what keeps the outline visible — an outline
  flush against the mint fill is a regression.
- Option and menu rows never show an outline or ring in any state, keyboard or pointer.
- Nothing paints on a mouse click anywhere. Hover is the only pointer feedback.
- Table rows and time-grid cells are the only two places using an inset stroke, and both are drawn
  inside their own bounds.
- No focusable element anywhere is left with no visible indicator under keyboard navigation.

## Notification System

### Admin Configuration And Channel Independence

1. Sign in as `{ADMIN_EMAIL}` and open `/settings?section=notifications`.
2. Confirm this section is visible only to admins.
3. Set the company timezone, weekly weekday, and weekly local time, then save.
4. Set the invoice first delay to `72` and repeat interval to `24`, then save.
5. Reload and confirm every value persisted.
6. For one workflow type, enable email and disable in-app delivery. For another type, disable email
   and enable in-app delivery. Save and reload.
7. Trigger both workflows and confirm each uses only its configured channel.
8. Disable both channels for a test notification type and trigger it again.
9. Confirm no email or in-app notification is created for the disabled type.
10. Request a magic link or password reset and confirm authentication email still works even when
    product notification channels are disabled.
11. Open `/admin/audit` and confirm the settings update appears as a localized notification event.

Expected result:

- Schedule fields and every per-type email/in-app switch persist.
- Product channel settings do not disable invitations, magic links, or password recovery.
- Invalid timezone, weekday, time, delay, or repeat values are rejected on the server.

### Notification Bell And Center

1. Trigger a workflow notification for `{CONTRACTOR_EMAIL}` or `{EMPLOYEE_EMAIL}`.
2. Sign in as that member and confirm the bell shows an unread count.
3. Open the bell and confirm at most five recent notifications are shown.
4. Open one notification and confirm it becomes read and navigates to the relevant page.
5. Open `/notifications`, switch between All and Unread, and test pagination when enough records
   exist.
6. Select **Mark all as read** and confirm the unread count disappears.
7. Create more than 15 read notifications, then trigger one more notification.
8. Confirm all unread notifications remain and only the latest 15 read notifications are retained.
9. Repeat the checks in Hungarian and English.

Expected result:

- Titles and bodies use the member's locale at display and email delivery time.
- No notification belonging to another member is visible or markable through the API.
- Read-state changes survive reloads.

### Weekly Missing-Time Reminder

1. Give `{EMPLOYEE_EMAIL}` or `{CONTRACTOR_EMAIL}` an active project assignment for the current
   week, with no time entry and no inactive-week marker.
2. Open the admin dashboard and confirm the member/project pair is flagged.
3. Click **Send reminder** and confirm the member receives the configured email and/or in-app item.
4. Open the notification and confirm it links to the relevant week on `/time`.
5. Confirm `/admin/audit` contains the manual reminder event.
6. Add time for that project, refresh the stale dashboard tab, and try its old reminder button.
7. Repeat with an inactive-week marker instead of a time entry.
8. Confirm both stale attempts are rejected and no notification is created.
9. Remove the time/marker, temporarily configure the weekly schedule a few minutes ahead, and keep
   the application running through the configured time.
10. Confirm exactly one reminder is produced for the scheduled occurrence, even though the
    in-service dispatcher checks every 15 seconds.

Expected result:

- Only active member/project assignments with no time and no inactive marker receive reminders.
- Manual sending revalidates current data instead of trusting a stale dashboard row.
- Repeated dispatcher runs are idempotent for the same weekly occurrence.

### Invoice Reminder Uses Exact Elapsed Hours

1. Approve a contractor timesheet without uploading an invoice.
2. Set the invoice first delay to `1` hour for a practical QA run and repeat interval to `1` hour.
3. Before one elapsed hour, wait for the notification dispatcher and confirm no invoice reminder
   exists.
4. After one exact elapsed hour, confirm the first reminder appears within 15 seconds.
5. Confirm another run within the same occurrence does not duplicate the reminder.
6. After the next elapsed hour, confirm one repeat reminder is created.
7. Upload an invoice and confirm later dispatcher runs stop creating invoice reminders.
8. Restore the intended defaults: first delay `72`, repeat interval `24`.

Expected result:

- Delays use elapsed UTC hours, not weekdays or company-local calendar boundaries.
- The production default starts exactly 72 hours after approval and includes weekends.
- Only approved timesheets still waiting for an invoice are eligible.

### Workflow Notifications And Dispatcher Health

1. Exercise timesheet submit, approve, reject, invoice upload, invoice accept/reject, and paid paths.
2. Upload and replace an employee payslip.
3. Permanently edit a member's time entry from the admin report.
4. For each event, confirm the intended recipient, localized content, channel configuration, and
   action link.
5. Open `/admin/system` and confirm **Notification dispatcher** passes after a successful run.
6. Set `NOTIFICATION_SCHEDULER_DISABLED=true` in a non-production test environment, restart the app,
   wait more than one minute, and confirm the check warns instead of claiming success.
7. Remove that variable, restart the app, and confirm the scheduler recovers without a separate
   Railway service and the System check returns to passing within one minute.
8. Temporarily break SMTP in a non-production test environment and trigger an email notification.
9. Confirm the delivery records a failure and retries with increasing delays, up to five attempts.

Expected result:

- Admins receive review work; members receive decisions and personal document/change events.
- Notification creation is idempotent when the dispatcher scans overlapping event windows.
- The sequential loop does not overlap itself, and the database lock protects multiple replicas.
- Scheduler failures are visible on the System page and email failures remain available for
  operational diagnosis.

## Create Flows In Side Sheets

### Invite Member Sheet

1. Sign in as `{ADMIN_EMAIL}` and open `https://{DOMAIN_NAME}/admin/people`.
2. Confirm the member table's first data row is visible without scrolling.
3. Click `Tag meghívása` / `Invite member` in the page header.
4. Fill in first name, last name and an email that already belongs to a member, then submit.
5. Correct the email to a fresh address, tick `Küldés után újabb meghívó` / `Invite another after
sending`, and submit.
6. Without ticking the checkbox, invite a second fresh address.
7. Reopen the sheet, type a first name, and press `Escape`. Choose `Szerkesztés folytatása` / `Keep
editing`, press `Escape` again, then choose `Elvetés` / `Discard`.
8. Open `https://{DOMAIN_NAME}/admin/people?new=member` directly, then reload that URL.
9. Repeat step 3 below the `sm` breakpoint.

Expected result:

- No invite form is on the page until the sheet is opened.
- The sheet opens over the directory, the URL gains `?new=member`, and focus starts in the first
  field.
- The rejected submit keeps the sheet open, marks the email field, moves focus to it, and **keeps
  every value that was typed**, including the profile, role, currency, timezone and language.
- With `invite another` ticked the sheet stays open, empties, refocuses the first field, and shows
  the confirmation.
- Without it the sheet closes, the directory refreshes with the new row, and the confirmation shows
  above the table.
- `Escape`, the scrim and the close button all ask before discarding typed input; `Keep editing`
  returns to the sheet with the values intact.
- The deep link opens the sheet on load and survives a reload; closing it clears the parameter.
- On a narrow viewport the sheet is full width, the header stays put, the fields scroll, and the
  submit row stays visible.

### Create Project And Project Group Sheets

1. Open `https://{DOMAIN_NAME}/admin/projects` and confirm the project table is visible without
   scrolling.
2. Click `Új projekt` / `New project`, fill in a name, pick a colour, a start date and an end date
   **before** the start date, and submit.
3. Fix the end date and submit.
4. Filter the directory so no project matches, and use the empty state's action.
5. Click `Új csoport` / `New group` next to the `Projektcsoportok` / `Project groups` heading,
   create a group, then edit an existing group from its row's `⋯` menu.
6. Open `https://{DOMAIN_NAME}/admin/projects?new=project` and `?new=group` directly.
7. While the create sheet is dirty, press `Escape`. Choose `Szerkesztés folytatása` / `Keep
editing`, press `Escape` again, then choose `Elvetés` / `Discard`.

Expected result:

- Neither create form is on the page until it is opened.
- The rejected project keeps the sheet open and keeps the name, slug, colour, dates, internal flag
  and notes exactly as entered.
- A successful create closes the sheet, refreshes the directory, and reports above the table.
- The filtered-empty table offers to clear the filters; a genuinely empty one offers to create.
- Both the project and the group forms are side sheets (not modal dialogs), share layout and
  discard-guard behaviour, and the group sheet is the same one for create and edit, titled and
  labelled for the mode it is in.
- Archiving a group reports at the top of the section rather than into the edit form.
- Both deep links open their overlay on load, and the discard guard fires on every dismissal path
  (`Escape`, the scrim, and the close button).

### Project Groups Table And Membership Drawer

1. Open `https://{DOMAIN_NAME}/admin/projects` and scroll to `Projektcsoportok` / `Project groups`.
   Confirm it renders as one table with no card nested inside another.
2. Sort by each column (`Csoport`/`Group`, `Projektek`/`Projects`, `Állapot`/`State`,
   `Frissítve`/`Updated`) and confirm the arrow direction and row order both change.
3. Type into the search field, then set the `Állapot`/`State` and `Projektek`/`Projects` filters.
   Confirm chips appear for each, the `Showing` count tracks, and each chip's `×` removes only that
   filter.
4. Click a group's name to open the membership drawer. Confirm the drawer's segmented control shows
   correct `All`/`Selected`/`Available` counts, and that the counts (and the underlying table row)
   update immediately after each toggle below — no page reload and no separate save step.
5. In the drawer, search for a project by name and by slug (accent-folded — a Hungarian project
   name should match with or without diacritics), switch between the three segments, and confirm
   internal and inactive/archived projects carry their badge.
6. Uncheck a project, confirm a brief pending spinner on that row, then recheck it. Confirm the
   result banner behind the drawer reports both changes and the `/admin/audit` log gains one
   `project_group.project_added`/`.project_removed` entry per toggle.
7. Click `Csoport szerkesztése` / `Edit group` inside the drawer header; confirm it opens the same
   edit sheet as the row menu's `Csoport szerkesztése` / `Edit group` item.
8. From the row's `⋯` menu, open `Projektek kezelése` / `Manage projects` as a second way into the
   same drawer, then archive the group and confirm it drops out of the list.
9. Resize to a phone width and repeat steps 2-4: the table becomes stacked cards, and the drawer's
   segmented control stays on one line instead of wrapping.

Expected result:

- The section is a single bordered table (or, on phones, a single card list) — never a card drawn
  inside another card.
- Sorting, filtering and the `Showing N of M groups` summary all match the visible rows exactly.
- The membership drawer never requires a separate save: every checkbox toggle is applied
  immediately, survives closing and reopening the drawer, and is reflected in both the table's
  project-count cell and the audit log.
- Search matches Hungarian diacritics loosely in both directions (typing `arvizturo` finds
  `árvíztűrő` and vice versa).
- The drawer stays keyboard-reachable: `Tab` reaches the group's name button and the row's `⋯`
  trigger even though the row itself is not a single focus stop.

### Filter Toolbars

Run this on all four admin lists: `/admin/timesheets`, `/admin/payslips`, `/admin/people` and
`/admin/projects`.

1. Open the page and confirm the list is visible without scrolling.
2. Apply two or three filters and submit.
3. Remove one filter by clicking its chip.
4. Use `Törlés` / `Clear`.
5. Type a search term, submit, and read the chip it produces.
6. On `/admin/projects`, filter by a project group.
7. Pick **two** values in one of the multi-select filters — status on `/admin/timesheets`, state on
   `/admin/people`, group or timeline on `/admin/projects`, employee on `/admin/payslips` — and
   submit.
8. Remove **one** of the two chips that filter produced.
9. Narrow the window to tablet and phone widths.

Expected result:

- The filters are one toolbar row with no heading, and every control keeps an accessible name for
  screen readers even though the visible labels are gone.
- Each applied filter shows as a chip naming both the filter and its value; removing one chip leaves
  the others applied, and does **not** apply edits sitting unsubmitted in the toolbar.
- `Clear` removes all of them and returns to the unfiltered URL.
- The search chip shows the term next to a magnifier rather than repeating a long field label, and a
  screen reader still hears which filter it is.
- The group chip names the group, never its id.
- On `/admin/people` and `/admin/projects` the `Showing x-y of z` line stays visible even with no
  filters applied; on the other two it lives in the list header as before.
- The payslip employee picker is searchable rather than a native dropdown.
- Check this in **both** locales: the Hungarian labels are markedly longer, and the controls size
  themselves to their content, so a hint such as `Bármely hozzárendelés` is never the thing that
  gets cut off — it takes the width it needs and the row wraps instead.
- Every control on the row is the same height. A long _selected_ value may still ellipsise at the
  control's maximum width; it must never wrap out of its box, and hovering shows the full text.
- On `/admin/projects`, `Tömeges hozzárendelés` / `Bulk assign` sits in the `Projektlista` /
  `Project directory` header on one line, and opening it puts `?new=assignments` in the URL.
- The controls wrap onto further lines on narrow viewports with the submit staying on the right, and
  no page scrolls sideways.
- A multi-select filter shows one chip **per chosen value**, and removing one leaves the others
  applied — the list stays filtered by what the remaining chips say.
- The list matches **any** of the chosen values, not all of them: two statuses on
  `/admin/timesheets` show both statuses' rows, and `Aktív` + `Meghívott` on `/admin/people` shows
  everyone who is not archived.
- On `/admin/people`, `Zárolt` / `Locked` picked alongside a real state still shows both — it is a
  soft-delete marker rather than a status, so it cannot be folded in with the others. The same holds
  for `Csoport nélkül` / `Ungrouped` next to a real group on `/admin/projects`.
- Paging keeps every value of a multi-select filter: go to page 2 and confirm the chips and the URL
  still carry both.

### Multi-Select Rate Filters

1. Open `https://{DOMAIN_NAME}/admin/rates`.
2. Open the `Projekt` / `Project` filter and read the trigger before choosing anything.
3. Pick one project. Confirm the panel stays open.
4. Pick a second project without reopening the panel, then close it with `Esc`.
5. Reopen the panel and confirm both chosen rows are still ticked.
6. Use the panel's `Törlés` / `Clear` action.
7. Repeat steps 2-6 on the `Csoport` / `Group` filter, including its `Csoport nélkül` /
   `Ungrouped` entry alongside a real group.
8. Type into the panel's search field with two projects already chosen.
9. Narrow the window to tablet and phone widths.

Expected result:

- With nothing chosen the trigger reads `Mind` / `All` as placeholder text, and the table shows
  every row — an empty selection means "no filter", not "no results".
- Choosing an option does not close the panel; each row carries a checkbox that fills in when
  ticked, so it is visible up front that several can be picked.
- One choice shows that option's own label. From the second onwards the trigger shows
  `2 kiválasztva` / `2 selected`, and hovering it lists the chosen names in full.
- The table lists members matching **any** of the chosen projects, not only the last one. The same
  holds for groups, and `Csoport nélkül` matches members whose assigned projects have no group.
- `Törlés` / `Clear` empties the filter and disappears with the last chosen value.
- Searching filters the rows but never hides the `Törlés` / `Clear` action, and ticked rows that
  fall outside the search term stay chosen.
- Check this in **both** locales, and confirm the trigger keeps the control's height at every
  width: a long count or label ellipsises, it never wraps out of its box.

### One Colour Per Timesheet Status

1. Open `https://{DOMAIN_NAME}/admin/timesheets` with `Kifizetettek mutatása` / `Show paid` ticked
   and `Minden státusz` / `All statuses` selected, so as many states as possible are on one page.
2. Read the `Státusz` / `Status` column top to bottom.
3. Switch the theme to light and read it again.
4. Open `https://{DOMAIN_NAME}/dashboard` as an admin and compare the status distribution bar and
   its legend against the pills you just read.
5. Open a contractor's own `https://{DOMAIN_NAME}/timesheets` month list and check
   `Nincs létrehozva` / `Not created` and `Hiányzik` / `Missing`.

Expected result:

- `Számlázva` / `Invoiced` is **yellow** — not the mint that `Beküldve` / `Submitted` uses.
- No two statuses share a colour. All nine are distinguishable side by side: grey for
  `Nincs létrehozva`, amber `Hiányzik`, mint `Beküldve`, rose `Elutasítva`, green `Jóváhagyva`,
  yellow `Számlázva`, magenta `Számla elutasítva`, blue `Elfogadva`, violet `Kifizetve`.
- In particular the two rejections differ (rose vs magenta) and the three end states differ (green
  vs blue vs violet); these were previously one colour each.
- Every pill's label is comfortably readable on its own tint, and each pill has a border of its own
  hue — check a row on a hovered table stripe and inside a dropdown/popover too, not just on a card.
- The same nine colours appear in light, still all distinct. Yellow and amber must not both read as
  brown; violet, blue and magenta must not collapse into one purple.
- The dashboard's distribution bar, its legend swatches and the priority-metric tiles use the same
  colour for a status as the table pill does, in **both** themes — the dashboard used to carry its
  own hardcoded dark-theme colours.
- Every colour is accompanied by its status name; nothing requires colour alone to be identified.

## Page Heading Semantics And The Automated Accessibility Gate

- Every page rendered through the app shell exposes its title as the page's only level-1 heading.
  A screen reader announces it on arrival, and the title still looks exactly as before - same size,
  weight and spacing - on desktop and mobile, in light and dark, in both locales.
- No page has two level-1 headings, and no page body introduces a heading that skips a level below
  the shell's.
- The week view on Time tracking reads as a structure without looking at it: one level-1 heading,
  the primary navigation, and one named region per weekday. Each entry inside a day offers an edit
  and a delete control whose names carry the entry description, so two identical descriptions on
  different days stay distinguishable by their day.
- Selecting a different day in the week strip changes that button's pressed state, not only its
  colour, and exactly one day is ever pressed.
- Auth emails with `AUTH_EMAIL_DELIVERY_MODE=file`: the magic link, invitation and password-reset
  messages land as one JSON line each in the outbox file and are not printed to the console. With
  the variable unset they print to the console as before. A production build refuses file delivery
  and falls back to the console, so plaintext links cannot be written to disk on a deploy.
- `pnpm e2e` with nothing running on port 3000 starts its own server and finishes green. With
  `pnpm dev:e2e` already running it reuses that one. With a plain `pnpm dev` running it fails on the
  first authenticated spec and the message names the fix rather than timing out.

## Role Boundaries Seen From A Non-Admin Member

- Signed in as `{CONTRACTOR_EMAIL}`, the sidebar has no Admin group at all. Approvals, Reports,
  Projects, People, Rates, Declared hours, Audit log, System and Information page are absent from
  the navigation rather than shown disabled, and a screen reader walking the primary navigation
  never announces them.
- Opening an admin URL directly as that member - `/admin/people`, `/admin/timesheets`,
  `/admin/system` - lands on the account status screen titled "Admin access required", never on the
  admin page and never on a blank or error page.
- That refusal keeps the route it refused in the address bar, so the screen states what was asked
  for rather than silently dropping it.
- The refusal reads correctly in Hungarian and English, and the same member can still reach their
  own pages - Dashboard, Time tracking, Timesheets - immediately afterwards.
- An admin opening the same URLs sees the admin page, so the refusal is about the role and not about
  the route being broken.
- Invitation resend from the People row menu: the action reports "Invitation resent to {email}" and
  a fresh invitation email arrives. The link in the _previous_ email no longer activates the
  account, because a resend replaces the stored token.
- Resend is offered only for a member whose state is `invited`. For an active, inactive or archived
  member the menu does not offer it.
- Accepting an invitation while signed in with a different email leaves the activate button
  disabled and says which address the invitation belongs to.
- Re-opening an already accepted invitation link says the invitation has already been used instead
  of activating anything a second time.
- After activation the member's People row reads `active` and the member can sign in with a plain
  magic link from then on.
- A magic link is delivered to any active member, but redeeming one for a member who has never
  accepted an invitation does not produce a working session - it ends on the account status screen.
  Delivery is not proof of access.

## Pagination Control Names

- On People and Projects, walking the pager with a screen reader announces four distinct things:
  "Previous page", "Next page", "Go to page N" for each numbered button, and "Current page, page N"
  for the one you are on. No two controls in the pager announce the same name.
- The visible labels are unchanged - the step buttons still read "Prev" and "Next" (HU: "Előző",
  "Következő") - and the announced name contains that visible text, so voice control still works by
  saying what is written on the button.
- The step buttons no longer claim a page number. Previously both announced "Go to page N" for
  their destination, which is what the numbered buttons are called, so the same name pointed at two
  different controls.
- Both names read correctly in Hungarian and English.
- Keyboard tabbing through the pager reaches Prev, every numbered button, then Next, and the
  current page button is the one marked as current.

## Report Export Timestamp And Its Zone

- The "Generated" line of an exported report PDF names the zone it is written in, as in
  `Jul 31, 2026, 02:00 PM GMT+2`, so the time reads correctly without knowing where the server runs.
- That zone is the exporting admin's own, the one set on their profile, not the server's. Change the
  profile timezone, export again, and the stamp moves with it.
- The preview in the export dialog carries the same stamp as the downloaded file. The two cannot
  disagree: both take the zone from the same admin.
- The Hungarian and English renderings of one export carry the same marker - `GMT+2` in both - so
  the two language versions do not read as two different documents.
- Only the stamp is affected. Every date in the table is a member-local calendar date and does not
  move with the exporting admin's zone, and the footnote still names the member time zones the day
  boundaries came from.

## Time View Scope And Lens Redesign

Superseded by "Time View: Days, Weeks And Months Tabs" below; kept for the history of the redesign.

The `/time` chrome is two rows: row 1 answers _how close_ (a View control with `⊖ ⊕` caps, the
week-only Agenda ⇄ Grid layout toggle, and the Start timer / New entry actions), row 2 answers
_when_ (`‹ label ›`, Today, the `⋯` menu, and one period total). Everything below is the design
record in `docs/time-view-redesign.md`; regenerate `e2e/__aria__/time-week.spec.ts/` only after
reading its diff.

### Scope, lens and the period header

1. Open `/time` on a desktop signed in as a member with tracked assignments. Confirm row 1 shows a
   `View` control with **three** stops — Day, Week, Month — each with a small key chip (`1 2 3`)
   that brightens when the control is hovered, and `⊖` / `⊕` caps at its ends. There is no Grid stop
   and no inline keyboard legend.
2. Confirm the Week layout toggle (Agenda / Grid) sits beside the View control **only** in Week
   scope, fading in with a short slide, and that switching it leaves the seven day headers exactly
   where they are while the bodies crossfade.
3. Read row 2: `Week 36 · Aug 31 – Sep 6, 2026` (Hungarian: `36. hét · 2026. aug. 31. – szept. 6.`),
   arrows named Previous week / Next week, a Today button, and one total reading `36 h this week`.
   Switch to Day: the label becomes `Monday, Aug 31, 2026`, the arrows step a **day**, the total
   reads `8.5 h today`. Switch to Month: `September 2026`, the arrows step a month, the total reads
   `112 h this month` with `14 of 22 workdays` under it.
4. Press the period label. A month grid opens; picking a month jumps there **without changing the
   scope**. Confirm Today is dimmed with a mint dot while today is in view and clickable otherwise.
5. Confirm the total never counts up: change a figure (add an entry) and watch it settle in one step
   in the direction of change. Over 8 h in Day scope the total carries `⚠ over 8 h` in words; a bare
   orange number appears nowhere.
6. Open an old link `/time?zoom=grid`. It lands on Week + Grid and the address bar drops `zoom` on
   the first change of view. Reload: the remembered scope and layout survive in `localStorage`
   (`time-scope`, `time-lens`); an explicit `?scope=` in a shared link outranks them.

### Zooming and motion

7. In Week · Agenda, hover a day header: a `›` appears and the header lifts by a pixel. Click it: the
   view zooms in — the seven headers shrink into the Day ribbon's seven chips, the other columns'
   cards fade out, the day's cards grow into full rows, the page scales in from slightly smaller, and
   the rail (target ring, per-project split, quick add) arrives last. Zoom out with `⊖`, `−` or `Esc`
   and the ribbon grows back into the headers with the page scaling in from slightly larger.
8. In Month, click a heat cell: it grows into the selected chip as the Day scope opens. Click a
   week number (`W36 ›`): the week opens in Agenda.
9. Step a period with `‹ ›` or `J` / `K`: the content and the label slide 24 px / 8 px in the
   direction of travel — next from the right, previous from the left. Jumping backwards with the
   month grid or Today slides backwards.
10. Turn on the operating system's reduce-motion setting. Every transition becomes a crossfade,
    nothing scales or slides, the timer's pulse is not rendered, and the heat navigator's rows do
    not draw in one by one.

### The Week and Day content

11. In Week · Agenda confirm there is **no day strip** above the columns and that a day's total,
    name and number appear once, in its header. Today's column has a 2 px mint top rule; when both
    weekend days are empty they are narrower than the working days.
12. Cards: a 3 px project-colour rail, the description as the primary line, `project · 09:00 – 13:15`
    as the muted line, the duration right-aligned in tabular numerals. Edit / Continue / Delete
    appear on hover and on keyboard focus and are always reachable by Tab. A timer-sourced entry has
    a small `▷` before its duration; a locked entry a lock glyph and a muted rail; an admin-changed
    entry the shield.
13. Press Continue on a card: a timer starts with that project and description, the Start timer
    button morphs into a live pill (`● 0:00:05 · Project ■`), and a live card with a mint rail sits
    at the top of today's column and in Day scope. Stop it from the pill or the card. Confirm
    Continue is withheld while a timer runs.
14. Delete a card: it leaves through its exit transition and a toast offers **Undo** for six seconds.
    Undo brings it back through the enter transition and the audit log shows a `Restored` event.
    Let the toast expire on another delete and confirm the entry stays deleted.
15. Empty states: an empty column reads `Nothing logged` with a `Copy yesterday` link when the day
    before holds entries; an empty week shows one centred state with `Add entry` and `Duplicate last
week`, while every column still has its `+`. A locked day shows no `+` at all. A future day's
    header and cards sit on the recessed `--muted` surface, not at reduced opacity, with the `+`
    still enabled — its label, its `0 h` total and its `Nothing logged` line stay at full ink and
    must remain as readable as a past day's. (Ancestor opacity is what put ~640 colour-contrast
    failures into the `@a11y` run; check this on a weekday early enough in the week that the row
    still has future days, because the automated gate cannot see them on a Sunday.) In the narrowed weekend
    columns, in Hungarian and in English, both lines stay inside their own column — the
    `Copy yesterday` link wraps onto a second line rather than running across the neighbouring day
    — and it reads smaller than the `Nothing logged` line above it, not larger.
16. The hybrid handoff: for a member with a declared project, a footnote under the Week columns
    links into Month, the Grid lens shows a ghost row `declared monthly · See Month`, and the Month
    segment wears a 4 px dot while another scope is open.

### Quick composer and quick actions

17. Press a column's `+`: a popover opens anchored to it — the date, project chips (recent first),
    a duration field and a description field. Type `2h30`, a description, Enter. The popover closes,
    the card enters with the stagger and its rail pulses once. Try `lots` as a duration: the composer
    refuses and explains; nothing is sent.
    Switch the app to Hungarian and open the composer again: the empty duration field shows `2h30`,
    not `2ó30`. Typing exactly the placeholder saves a 2:30 entry — the parser reads `h` and `m` in
    every locale, so no Hungarian hint may suggest `ó` or `p`.
18. In Day scope the composer is open in the rail; `N` focuses its duration field. `More options`
    opens the full dialog with the project, date, duration text and description carried over;
    `Interval instead` opens it in interval mode. A half-typed description is autosaved as a draft.
19. The `⋯` menu at the end of row 2 holds `Duplicate last week`, `Copy yesterday into <day>` and
    `Keyboard shortcuts`; the toolbar no longer lists Assigned or Recent chips.
20. On the Grid lens, hover a cell: its row and column tint by one surface step. The seven headers
    are buttons that open the day, with capacity bars.

### Keyboard, palette and hint

21. Press `?`: a dialog lists every shortcut in four tables (View · Move · Add · Timer). Confirm
    `J`/`K` step, `[`/`]` still work, `G` toggles the layout in Week and jumps to Week + Grid from
    Day or Month, `N` opens the composer, `S` starts (opens the timer dialog) or stops the timer,
    `−`/`+` and `1 2 3` move the scope, `T` goes to today, and nothing fires while typing in a
    field. On a Hungarian layout confirm `J`/`K` work unmodified.
22. Press `Esc` with a dialog open: the dialog closes and the view does not change. Press `Esc`
    again within 300 ms: nothing happens. After that, `Esc` zooms out one step; at Month it does
    nothing.
23. Press `⌘K`: a command palette lists Go to today, View: Day / Week / Month, Week layout: Agenda /
    Grid, New entry, Start/Stop timer, Duplicate last week, Copy yesterday and Keyboard shortcuts,
    searchable in both locales.
24. In a fresh browser profile the first visit shows one toast: `Press ? for shortcuts, or click a
day to open it`. Reload: it does not return.

### Mobile

25. At a phone width the default scope is Day: the ribbon scrolls horizontally with the selected
    chip snapping to centre, the rail stacks under the list as an `At a glance` collapsible, and a
    peach `+` FAB above the bottom bar opens the composer as a bottom sheet. Row 1 is the full-width
    View control with no caps; Start timer and New entry are gone from it (the header pill and the
    FAB cover them).
26. Week · Agenda is an accordion whose rows are the same day headers; the expanded row's header
    opens the day. Week · Grid keeps the stacked project cards and the layout toggle. Swipe left or
    right on the Day or Agenda content to step the period; the Grid does not claim the swipe.

### Declared-only member

27. Signed in as a member whose every assignment is declared monthly: Month only, no View control,
    no ribbon, no heat navigator, the declared form as before.

## MCP Server And Connected Apps

An AI agent connects to Sheet Happens over MCP and then acts **as one member, with exactly that
member's rights**. Everything below is the design record in `docs/mcp-server.md`. The whole point of
this section is that an agent can never do something the member could not do in the browser, so
every refusal below matters as much as every success.

### Finding The Connector In The App

1. Sign in as `{CONTRACTOR_EMAIL}` and open `{HELP_VIEW}`, then the `Claude connector` tab.
2. Confirm the Connector URL on the page is `{MCP_URL}` for the environment you are actually on —
   the development deployment has to print its own host, not the production one.
3. Click `Copy URL`, then paste into any text field. Confirm the clipboard holds that URL with no
   trailing slash, that a confirmation line appears beside the button, and that the line clears
   itself a few seconds later without the page jumping.
4. Switch to Hungarian and repeat. Confirm the button, the confirmation line and the whole recipe
   are translated.
5. Open `https://{DOMAIN_NAME}/settings` → Connected apps as a member who has connected nothing,
   and click the link in the empty state.

Expected result:

- The Claude Code command block quotes the same URL as the Connector URL field above it.
- The empty state's link opens the Help page **on the connector tab**, not on Welcome.
- Every member sees the connector tab, not only admins.

### Connecting

1. Sign in to Claude as a person who is **not** signed in to Sheet Happens in that browser. Add a
   custom connector with the URL `{MCP_URL}` exactly, no trailing slash. Claude should detect the
   authentication settings by itself from the refusal — you should not have to paste a client id or
   secret anywhere.
2. Click Connect. Confirm you land on the Sheet Happens login page and that the address bar still
   carries the pending request (a long query string), not a bare `/login`.
3. Sign in with a **magic link**. Confirm that after clicking the link you are taken to the consent
   screen, not to the dashboard. Repeat with a **passkey** and with **password + TOTP**: all three
   must arrive at consent, and the TOTP hop must not lose the request either.
4. Confirm the consent screen names the app as `claude.ai` — the host that vouches for it — rather
   than a name the app chose for itself.
5. Confirm it lists, in plain language, that the app may read your time, log and correct your time,
   and know who you are and stay connected. Confirm it says the app acts as you and can never see
   anyone else's hours.
6. Read the whole screen in Hungarian and in English. Both must be complete: no English sentence on
   the Hungarian page.
7. Click Deny. Confirm you are returned to Claude and it reports the connection was refused, and
   that `{MCP_URL}` still refuses to answer afterwards.
8. Connect again and click Allow. Confirm Claude reports the connector is connected and lists the
   Sheet Happens tools.

### Consent edge cases

- Start a connection, leave the consent screen open for more than ten minutes, then click Allow.
  Confirm the screen or the result says the request has expired and tells you to start again from
  Claude — never a silent failure and never a stuck spinner.
- Open `{MCP_URL}`'s consent path directly in the browser with no query (just `/consent`). Confirm
  it explains that this page is part of connecting an app and does not offer an Allow button.
- Connect a second time after already having connected once. Confirm you are **not** asked to
  consent again: the grant is remembered, and a reconnect or a token refresh must not re-prompt.
- Sign in as an **invited** member who has not accepted yet, or as a **deactivated** member, and try
  to reach the consent screen. Confirm you are bounced exactly as you would be from `/time` — to the
  account-status page — so connecting an app is not a way around the account gate.
- Sign in as a member who has neither a passkey nor TOTP set up, and try to connect. Confirm you are
  sent to finish security setup first.

### What the agent can do

Ask Claude to do each of these and confirm the result in the Sheet Happens UI afterwards.

- "What am I tracking today?" — confirm it reports your timezone's today, your projects, and no
  timer if none is running. Confirm the date it uses is **your** today, not the server's: test from a
  profile timezone far from the server's, near midnight.
- "Log two hours on {a tracked project} today, working on X." Confirm the entry appears on `/time`
  on the right day, with the right project and description, and that its source reads **MCP** rather
  than Grid or Form.
- Confirm the figure Claude quotes back matches the format on your profile: a member on decimal
  hours must hear "2" or "2.5", a member on hours and minutes must hear "2:30".
- "Change that to two and a half hours" — confirm the entry updates and the day total moves with it.
- "How much did I work this week, by project?" — confirm the totals match the `/time` week total
  exactly, and that a declared-hours project is reported separately rather than mixed in.
- "Delete that entry." Confirm Claude asks you to approve the action before it happens, every time,
  even if you have allowed the other tools to run unattended.
- After the delete, confirm `/time` no longer shows the entry, then ask Claude to put it back and
  confirm it reappears unchanged.
- "Start a timer on {a tracked project}." Confirm the header timer pill appears in the browser.
  Ask "what am I tracking?" and confirm the elapsed figure is plausible. Then "stop the timer" and
  confirm an entry is saved for the day the timer **started**.
- Ask Claude to start a second timer while one is running. Confirm it is refused and that Claude can
  tell you what is currently running, so it can offer to stop it.

### What the agent must be refused

- Ask Claude to log time in a month whose timesheet is already submitted. Confirm it is refused and
  that Claude explains the month is locked rather than reporting success.
- Ask it to log time against a project that declares its hours monthly. Confirm it is refused and
  that Claude explains that project is declared on the month level.
- Ask it to log 30 hours on one day. Confirm it is refused for exceeding 24 hours, and that the
  day's existing entries are untouched.
- Ask it about, or to change, **another member's** hours by name. Confirm it cannot: there is no tool
  that takes another member, and it should say so rather than reporting someone else's figures.
- Ask it to submit a timesheet, approve one, or change a rate. Confirm no such tool exists.
- Have an admin deactivate the member while Claude is connected, then ask Claude to log time.
  Confirm it fails and that reconnecting fails at login too.

### Connected apps in settings

- Open `/settings` as the connected member. Confirm a Connected apps section lists the app by the
  host that vouches for it, the date it was connected, and what it was allowed to do — in the same
  wording the consent screen used, not a second set of sentences.
- Confirm the section reads correctly in Hungarian and English, including the empty state for a
  member who has connected nothing.
- Click Disconnect. Confirm a confirmation step names the app, and that cancelling changes nothing.
- Confirm the app then disappears from the list, and that Claude can no longer read or write your
  hours — not even for the hour an access token would otherwise still have been valid.
- Reconnect from Claude and confirm you are asked to consent again, because the grant was removed.

### Audit trail

- Open `{AUDIT_LOG_VIEW}` as an admin. Confirm an entry the agent created is audited under the same
  action name as a browser-created one, and that the row records it arrived over MCP and which app
  it came from.
- Confirm no audit row contains a token, an argument dump, or the text of a time entry's
  description.

## Dashboard Width And Responsive Tables

The dashboard content area now widens to `92rem` from `xl` up, matching `/time` and the admin
surfaces, and every table on it goes through `DataTable` in responsive mode — a real table from
`md` up, stacked cards below.

- On a display wider than 1500px the dashboard fills the same width as `/admin/people`, rather than
  leaving a third of the window empty beside a `73.75rem` column.
- The flagged users table never scrolls sideways, at any window width: check 1024, 1280 and 1920,
  and check the same at 1024 with the sidebar collapsed. Nothing in the page scrolls horizontally
  either — only a scrollbar the table owns would be acceptable, and there should not be one.
- Long values shorten rather than widening the table: a member with a long address shows it
  ellipsised from `md` up, and a project named "Internal Ops & Tooling" wraps to two lines instead
  of holding its column open.
- Below `md` every row becomes a card. The member's name and address head the card without a "Name"
  label, the project and last-logged lines are labelled, and the reminder button sits on its own
  line at the end.
- Time and billing tracking is one full-width strip — a total, one bar and a legend that wraps —
  not a tall column beside the table. The bar shows a band only for states that hold something: a
  month with nothing but missing timesheets shows one band, not six slivers.
- A state with a count of zero is still listed, in the dimmest text tier with a dimmed dot, so the
  legend reports the zero without competing with the states that matter.
- The panel lists eight flagged rows at most. With more than eight, the footer link reads "View all
  N flagged users" and opens the drilldown, which lists every one; with eight or fewer it reads
  "View details".
- The five priority metric cards sit two-up on a phone, three-up from `md` and five-up from `xl`,
  and the last card takes the empty cell rather than leaving a half-width gap.
- Open each drilldown (`?drilldown=submitted`, `approved`, `invoiced`, `accepted`, `missing`,
  `flagged`) and confirm the same: table above `md`, cards below, no sideways scroll on the page,
  and the "Showing N of M" footer still appears on a truncated timesheet queue.
- The employee dashboard's project breakdown behaves the same way — table above `md`, cards below —
  and its rate, cost and missing-rate warnings all survive the switch.
- A screen reader reaches each of these as a real table with a caption naming it ("Flagged users",
  or the drilldown's own heading), column headers and rows. The old markup was a `div` grid with no
  table semantics at all.
- All of the above reads correctly in Hungarian and English, in both themes.

## Dashboard Greeting Uses The First Name

The dashboard heading greets the signed-in member by the first name stored on their member record,
not by a word picked out of the display name. The display name has no fixed name order, so its last
word used to come out as the family name ("Hi, Szabó!").

- Sign in as an admin, a contractor and an employee in turn and open `/dashboard`. Each heading
  reads "Hi, {first name}!" in English and "Szia, {first name}!" in Hungarian, the first name
  exactly as the "First name" field of that member's edit drawer in `/admin/people` holds it.
- A member whose display name puts the family name first, and one whose display name puts it last,
  are both greeted by first name.
- A member with a two-part first name (e.g. "Anna Mária") is greeted with both parts.

## Time View: Days, Weeks And Months Tabs

`/time` opens on **Days**, a scrolling log of days newest first, grouped by ISO week. Three folder
tabs on the panel's top edge - Days, Weeks, Months - replace the Day/Week/Month scope control, the
Agenda/Grid lens and the morphing between levels. Weeks and Months still show the old week grid and
month level until their own redesigns land.

### Frame and URL

- `/time` with nothing in the URL opens Days on every device, also after Weeks or Months was used
  last; the view is never remembered.
- The tabs read Days · Weeks · Months, left aligned, each with an icon and a `1`/`2`/`3` key chip
  (no chips on a phone). The active tab has the panel's own surface and an accent line on top and
  visibly joins the panel; a quiet `zoom out →` sits beside them on a desktop.
- Directly under the tabs, one bar: `‹ period ›` and Today on the left; the period total, the timer
  and `+ Entry` on the right. Switching tabs changes only the period text and the total caption.
- Each tab, the arrows and Today change the URL to `/time?view=…&day=…`; reload keeps the view and
  the period, and a copied link opens on it.
- Old links still land: `?scope=day`, `?scope=week`, `?scope=week&lens=agenda` and `?zoom=day|week`
  open Days; `?lens=grid` and `?zoom=grid` open Weeks; `?scope=month` and `?zoom=month` open
  Months; `?week=2025-03-03` opens Days on that fortnight.
- A tab change shows the new view at once, with at most a brief fade and none with reduced motion
  turned on in the OS. Nothing slides, scales or morphs.
- Keys outside a field: `1`/`2`/`3` switch tabs, `←`/`→` (and `K`/`J`) step the period, `T` returns
  to today, `S` starts or stops the timer, `N` opens a new entry, `?` opens the shortcut sheet,
  `⌘K` the command palette. None fire while typing or with a menu open.
- With a timer running, its pill shows in the bar and not a second time in the page header.
- A member whose every assignment is declared monthly sees Months only, with no tab strip.

### Days

- The log shows at least two ISO weeks: a week heading (`Week 46 · Nov 9 – 15`, total on the right),
  then day cards newest first. Future days of the current week are not listed.
- A day card's header reads `Tue, Nov 10` (Hungarian: `nov. 10., kedd`), with a Today badge on
  today, the day total, a slim bar toward 8 h (amber past 8 h) and a `+` that opens the entry
  dialog on that date.
- Each row: project colour bar, description, project name, `09:00–11:00` (or `—` for a
  duration-only entry), duration, ▷ and ⋯. Clicking anywhere on the row opens the edit dialog;
  ⋯ offers Edit and Delete, and Delete shows the Undo toast, which restores the row.
- ▷ starts a timer with that row's project and description. With a timer already running it stops
  that one (saving it as an entry) and starts the new one in a single step - no "stop the running
  timer first" error ever appears.
- The running timer is the first row of today with a live elapsed time and a stop button; stopping
  it turns it into an ordinary row.
- The composer at the top ("What are you working on?") offers recent descriptions for the chosen
  project; the project menu lists recent projects first. ▷ or Enter starts the timer; an empty
  description shows an inline message instead of starting.
- A weekend day with nothing logged is one muted line; a past workday with nothing logged warns
  "Nothing logged on a workday"; a full-day leave says "On leave" and has no `+`.
- Days in a submitted month show a lock: their rows have no edit, no ⋯ and no `+`, but ▷ still
  starts a new timer today.
- An entry an admin corrected shows a shield mark, and a long or overlapping entry a warning mark
  whose tooltip names the warning.
- Scrolling to the end loads the previous week with a skeleton while it loads, on a desktop and on
  a phone; the loading stops at the member's first logged week. Editing or deleting an entry in an
  older, scrolled-in week updates it in place.
- `‹ ›` move the fortnight by two weeks; `›` does nothing on the current fortnight; picking a month
  from the period label jumps to the last fortnight of that month.
- A member with a declared project sees one quiet line under the composer, "<Project> is declared
  monthly — see Months", and the link opens Months.

### Phone (390 px)

- The bar is one row: the total on the left, the timer pill on the right with its project name
  truncated; no navigator and no `+ Entry`.
- Rows show the description over "project · 09:00–11:00", with the duration and ▷ on the right.
  Today's header stays pinned under the app header while its entries scroll.

### Overflow

- At 1440, 1280, 1024, 768 and 390 px wide, in English and Hungarian, nothing in the page scrolls
  sideways and nothing spills out of its box: a two-line description clamps with an ellipsis, a
  long project name ellipsises, times and durations never wrap, and the bar wraps to a second line
  before the timer pill is squeezed.
- Check that with a description of 300+ characters, a pasted URL with no spaces, and a project name
  such as "Kovács-Szentgyörgyi Ingatlankezelő és Vagyonkezelő Kft.", in both themes.

### Weeks and Months (placeholders)

- Weeks shows the project × day grid for one week inside the panel, with week arrows; typing a
  duration into a cell still saves, and a day header opens Days on that day.
- Months shows the month heat map and the project rows; the declared-hours form saves and uploads
  proof as before. A heat-map day opens Days, a week row opens Weeks.

## Time Tracking Weeks View (Month Calendar)

The Weeks level of `/time` shows one calendar month: rows are ISO weeks starting on Monday, each day
lists its entries, and a week-total column closes every row. Below 768px it becomes a list of weeks,
newest first, that loads earlier months as it scrolls.

- November 2026 shows six rows, Oct 26 – Dec 6; a month that fits five Mondays shows five. The
  header reads MON…SUN plus WEEK (H, K, SZE, CS, P, SZO, V and HÉT in Hungarian), and the two weekend
  columns are visibly narrower than the weekdays while they are empty; once a weekend day holds
  entries they widen.
- The 1st of the month reads "Nov 1" (HU "nov. 1."), every other day only its number. Each day with
  hours shows its total top-right; each week shows its number (W46, HU "46. hét") over its total,
  or "–" when nothing was logged in it. The week total includes the neighbouring month's days in that
  row; the period total above the calendar counts only the month's own days and matches the Months
  view's tracked total for the same month.
- A day lists at most three entries, earliest start first and duration-only entries after them,
  then "+N more". Each chip has the project's colour bar on a light tint of it in both themes; a long
  description wraps to two lines at most, the hours sit top-right inside the text, and the second
  line runs under the hours.
- Days of the previous and next month are striped and their chips faded but still readable. Today is
  outlined, its number in an accent pill. Future days are empty and muted.
- A past weekday in the month with nothing logged and no leave shows "⚠ nothing logged"; weekends,
  today, future days and the neighbouring months' days never do. A full-day leave shows "On leave"
  (HU "Szabadság"); a day in a month locked by a submitted timesheet shows a small lock.
- Declared hours never appear in a day cell or in any total here: a declared project's figure is
  shown in the Months view only.
- Clicking a day, or its "+N more", opens that day. Tab reaches every day in order, and a screen
  reader names each one uniquely, e.g. "Tuesday, November 10, 8 hours", "Monday, November 2, nothing
  logged", with ", locked" on a locked day.
- Nothing overflows its cell or the window at 1440, at 1280 with the sidebar open (calendar about
  1000px wide), at 1024 and at 768, in English and Hungarian, with very long descriptions, very long
  project names and an unbroken 80-character word: text wraps or ends in an ellipsis, hours never
  wrap, and the page never scrolls sideways. A normal word is never split across lines unless it
  is wider than the whole line on its own. In narrow cells the hours move above the description;
  in the narrowest weekend cells they are left to the day total.
- On a phone (390px) the month is a list of weeks, newest first, each headed "W46 · Nov 9 – 15" with
  its total on the right, its days newest first. Future days are left out, and so are weekend days
  with nothing on them. Each day row shows its date, a Today pill on today, its total, up to three
  chips with the project name under the description, and "+N more" when there are more.
- Scrolling to the end of the phone list shows a skeleton and then the previous month's weeks; the
  week that straddles the two months appears once, with all its days. Keep scrolling and earlier
  months keep arriving.
- `/time?view=weeks` shows the month holding `day` (this month without one) inside the tab panel.
  ‹ and › step a month, › is disabled on the current month, Today returns to it, and a `day` in a
  future month opens the current one. The bar's total is the month's tracked hours, "this month".
- Clicking a day or its "+N more" opens Days anchored on that date (`?view=days&day=…`).
- A member with both tracked and declared projects sees "Declared monthly" under the calendar, with
  the shown month's declaration form: saving hours and a note and uploading the proof work as on
  the old month screen, and a month locked by a submitted timesheet shows them read-only. A member
  with only tracked projects sees no such section.
- In Days, such a member's hint line reads "<Project> is declared monthly — see Weeks" (HU "…
  nézd meg a Hetek nézetben") and opens Weeks on the month of the day in view.
- All of the above reads correctly in Hungarian and English, in both the light and the dark theme.

## Time Months View (Year Calendar)

The Months tab of `/time` shows one year as twelve small month calendars: each day shaded by the
hours tracked on it, a total per month, declared hours and the contractor's timesheet status, with
earlier years loaded below as you scroll.

- Days shade in five steps: nothing logged, under 4 h, 4–8 h, 8–10 h, and over 10 h in the warning
  colour. A weekday with nothing logged has a faint fill; a weekend with nothing logged has none.
  The legend under the grid matches the squares in both themes.
- Today is ringed, days after today have a dashed outline, the current month's card is outlined in
  the primary colour and months after it are dimmed. Use a member in a timezone where the date
  differs from the server's (e.g. Pacific/Auckland) and confirm "today" follows the member.
- Each month's total equals the month total on the Weeks/Month level for the same month, including
  declared hours, and a declared entry is not counted twice. A month with declared hours shows
  "+ Nimbus 24 h declared" (or "+ 24 h declared · 2 projects" for several); a long project name is
  shortened with an ellipsis while the hours stay visible.
- A contractor sees the stored timesheet status on each month (Submitted, Approved, Paid, Invoice
  rejected …, using the same labels as `/timesheets`) and "Open" on the current month and on any
  earlier month that holds hours but has no timesheet. An employee sees no badges at all.
- Days on leave carry a small dot and the legend gains a Leave entry; half-day leave is announced
  as such by a screen reader.
- Clicking anywhere on a card outside the day squares opens that month in Weeks; clicking a day
  opens that day. With the keyboard, Tab reaches each month's header (announced as e.g. "November
  2026, 46.3 hours, Open") and then its days as one stop: the arrow keys move between days, Home
  and End jump to the first and last, Enter opens the day.
- Scrolling to the bottom loads the previous year under its own heading and total, with a skeleton
  while it loads; the "Show 2025" button below does the same without scrolling.
- Nothing overflows its card or the window at 1440, 1280, 1024, 768 and 390 px, in Hungarian and
  English: four columns on a wide screen, then three, two, and one on a phone. Check with a large
  hours-and-minutes total, a long declared project name and the longest Hungarian status
  ("Számla elutasítva").
- Everything above reads correctly in Hungarian and English, in light and dark themes.

## Regression Checklist For Every Release

- An employee can record vacation and sick leave from yesterday on, a half day only on a single
  date, and never an overlap.
- Colleagues see each other's leave as `Away` only; the sick note is reachable by its owner and
  admins alone.
- The admin can filter leave, tick it as processed, edit and delete it.
- Invitation activation works for a new invited user.
- Magic-link login works for an active user.
- Password setup, password login, and password reset work for active users.
- Unknown email password reset does not reveal account state.
- Company Google login works for configured Workspace users when Google auth is enabled.
- Private or non-company Google accounts are rejected when Google auth is enabled.
- Unknown email login does not reveal account state.
- Signed-out users cannot open protected routes.
- Non-admin users cannot open admin routes.
- Users without passkey or TOTP are redirected to the security setup gate.
- Admin users without TOTP are redirected to the admin TOTP gate.
- Admin people page can invite, resend, edit, deactivate, reactivate, archive, and restore members.
- Admin people page can revoke member sessions.
- Passkey add, login, rename, and remove still work.
- Passkey login skips the `/two-factor` challenge for TOTP-enabled accounts.
- TOTP setup, challenge, invalid-code handling, trusted device, backup-code fallback, and disable
  still work.
- TOTP disablement and backup-code regeneration create audit rows without storing secrets.
- `/dashboard`, `/settings`, `/admin/people`, `/admin/audit`, `/two-factor`, and `/account-status`
  render without layout breakage on desktop and mobile widths.
- The light, dark, and system theme preferences all apply with no flash, survive a reload, and leave
  every screen readable in both themes.
- Body copy renders in Lexend and `.font-ui` labels in Poppins, served from this origin with no
  request to Google, and Hungarian ő/ű match the typeface of the letters beside them.
- Buttons honour their own type size rather than the size they inherit: a small label inside a
  button reads smaller than the body text around it, and no button label is larger than the text it
  sits beside.
- No native `<select>` or date input remains on any screen; dropdowns above eight options offer
  search, and searching ignores accents.
- The timesheet month filter submits `YYYY-MM` and actually narrows the list.
- The timesheet list hides paid months until `Kifizetettek mutatása` / `Show paid` is ticked.
- The reports period pills each render their own control shape and submit `anchor` or `start`+`end`,
  never both.
- Currency, timezone, project and member pickers save correctly, and a form reset clears their
  triggers along with the text fields.
- Pickers opened inside a drawer or dialog keep focus, and every control returns focus to its
  trigger on close.
- Focus paints once and only under keyboard navigation: bordered controls brighten their border,
  borderless controls take a single 2px mint outline, option rows show only the pointer tint, and a
  mouse click leaves no highlight box behind.
- Notification settings persist, the dispatcher is fresh, and the bell unread count updates.
- Weekly reminders exclude projects with time or inactive-week markers.
- Invoice reminders use exact elapsed hours and stop after invoice upload.
- Dark mode reads as lit rather than drab: cards sit visibly above the canvas on every screen, the
  primary and CTA buttons each carry a glow of their own temperature, and the active sidebar item
  shows a lit rail plus a tinted row.
- No surface, glow, or chart mark reads as khaki, olive, tan, or drab teal in dark mode.
- The dashboard's danger stat card is rose throughout — tinted surface, sparkline bars, and corner
  glow — with no amber ground under rose content.
- Status pills keep four visibly different tones side by side, each with a border of its own hue,
  and every label stays readable on a card, on a hovered row, and inside a dropdown.
- The atmosphere stays a gutter phenomenon: on the auth screen the description text remains fully
  legible wherever the glows and blobs fall behind it, and no card, table, or panel shows it through.
- Reports charts show six clearly distinct series, and green and rose remain tellable apart when
  viewed through a deuteranopia simulator.
- Light mode reads as a warm printed page rather than a flat white one: a card is clearly a panel
  sitting on the canvas everywhere, including the top-right corner of a page, where a white card
  used to disappear into a white glow.
- Every de-emphasised string is readable in light — table column headers, input placeholders, the
  command-palette placeholder, and inactive sidebar labels. None of them is a pale grey-green.
- No text tier smaller than a heading sits directly on the light canvas: on the auth screen the
  heading and the description are legible wherever the blobs and echo lines fall behind them.
- Warning reads as a real amber in light and its label is legible on a pill, on a card, on a table
  stripe, and on a hovered row — not a mustard on cream.
- Status pills stay four visibly different tones in light, each with a border of its own hue; check
  a warning pill and a danger pill sitting on a beige chip or table stripe specifically.
- The light danger button is legible both at rest and while hovered, and so is a danger row in a
  dropdown menu.
- The light primary button shows a teal gradient rather than a flat fill, and it and the CTA each
  cast a shadow of their own temperature — cool under primary, warm under the CTA.
- Nothing in light reads as a smudge: the active sidebar label and rail, the stat-card sparkline's
  final bar, and the distribution meter bars all have crisp edges with no dark halo behind them.
- The brand atmosphere is present in light — printed pastel blobs with crisp echo lines, the wave,
  the swoosh and the dot lattice — and stays in the gutters, never showing through a card, table or
  panel. It carries no film grain.
- The theme toggle survives a reload in both directions, and switching light↔dark on a dense screen
  changes no layout or geometry, only colour.
- Reports charts stay on white cards in light and show six clearly distinct series there.
- Creating a project, a project group or an invitation happens in an overlay opened from a page
  header; no create form sits above a directory table.
- A rejected create keeps its overlay open with every typed value intact and focus on the offending
  field.
- Closing an overlay with unsaved input asks first, whichever way it is closed.
- Admin list filters read as a single toolbar row with removable chips for whatever is applied.
- A running timer sits in the app header on every signed-in page and at every width, and can be
  stopped from there; starting one happens in an overlay opened from the time-tracking toolbar.
- `/time` has one View control with three scopes (Day · Week · Month) and `⊖ ⊕` caps, a week-only
  Agenda ⇄ Grid layout toggle, and the scope, layout and selected day live in the address bar; the
  selected day survives every change of view in both directions and an old `?zoom=` link still lands.
- The period label carries the unit — a day, `Week 36 · range`, or the month — and the arrows,
  `J`/`K` and `[`/`]` step exactly that unit; Today is dimmed with a dot while today is in view.
- The month shown follows the selected day rather than the week, so stepping a day across a month
  boundary changes the month with no page load.
- A member whose every assignment is declared monthly gets the month and no View control at all.
- Zooming is spatial: a day header becomes its ribbon chip and a heat cell becomes the selected
  chip; steps slide in the direction of travel; nothing animates on first paint; no figure ever
  rolls; with the operating system's reduce-motion setting on everything crossfades and nothing moves.
- The desktop Week shows no day strip, each day's total appears once, cards reveal Edit / Continue /
  Delete on hover and focus, a delete can be undone for six seconds, and the `+` opens the quick
  composer rather than the dialog.
- Each assignment in a project's drawer shows its hours-tracking mode beside its rate source, and
  says whether the mode is inherited from the member default or set for that assignment only.
- The per-assignment mode control offers an explicit inherit option that names the member default,
  so an admin can tell a deliberate override from an inherited setting.
- The same three choices are on the form that creates an assignment, so an admin sets the mode while
  assigning the member rather than saving and then editing the assignment straight afterwards.
- That control names the chosen member's default in its inherit option and follows the member picker
  when the choice changes; before any member is picked it reads as the plain inherit option.
- The bulk assign dialog carries the control too. Its inherit option names no mode - several members
  may inherit different ones - and its hint says the choice applies to every assignment created
  there.
- An assignment created on inherit shows as inherited in the list afterwards, and one created on an
  explicit mode shows as set for that assignment only.
- The member-level default is set on the People page, not from inside one project, and both controls
  state their scope: the member default applies to every project, the override to one assignment.
- Changing the member default leaves any assignment carrying its own override exactly as it was.
- Switching a mode is refused while an unlocked month still holds hours of the other kind, and the
  message names the months - for the member default, the projects too - that have to be cleared
  first. A month already locked by a submitted timesheet revision does not block the switch.
- Every one of those labels, hints and refusal messages reads correctly in Hungarian and English.
- A declared project is absent from Day, Week and Grid entirely, and one line under the day strip
  names it and links to the month rather than leaving the absence unexplained.
- A month's declared figure needs both a number and a note before it can be saved, and the month
  total equals the tracked hours plus the declared ones.
- Declaring hours is refused for a month that already holds tracked entries for that project, and
  ordinary time entry is refused for a declared project — the double count is blocked from both
  sides.
- A contractor cannot submit a month while a declared figure has no proof, and the refusal names
  the projects. An employee is never blocked, only warned.
- The admin review marks a declared project as declared, dates its line as the month rather than the
  1st, and opens its proof beside the invoice.
- Reports and exports total only the tracked hours, and state how many members and projects of
  declared hours they left out — counts, never amounts.
- Editing a tracked report line dated the 1st of a month that holds a declared figure still saves.
- The MCP connector connects from Claude with the URL alone, and the consent screen is complete in
  both languages.
- An agent can read and write only its own member's hours, and is refused on a locked month, a
  declared project and a day over 24 hours.
- Agent-written entries show as MCP on `/time` and record the channel and app in the audit log.
- Disconnecting an app from `/settings` stops it acting immediately, not when its token expires.
- The account menu puts Sign out in its own group, one divider and a clear gap below Profile and
  settings, so it is no longer flush against the two navigational entries.
- Choosing Sign out asks first: the session survives Escape, the close affordance and Stay signed
  in, and ends only on the dialog's own Sign out button.
- The confirmation opens with Stay signed in focused, so a stray Enter after the menu keeps the
  session, and it reads correctly in Hungarian and English in both themes.
- Focusing an empty description on `/time` — in the quick composer, the entry dialog or the New
  timer dialog — offers this member's own recent descriptions for the selected project, most useful
  first, with how often and when each was last used; nothing is filled in until one is chosen.
- Typing filters that list, an accented Hungarian description is found from an unaccented query
  (`arajanlat` finds `Árajánlat`), the matched letters are emphasized in place, and a query that
  matches nothing says so rather than showing an unfiltered list.
- Choosing a suggestion with Enter inserts it and nothing else: the entry is logged only by the
  next Enter or by Save. Escape closes the list and leaves the dialog open; a second Escape closes
  the dialog.
- Changing the project chip re-scopes the list and leaves half-typed text alone. A project with
  almost no history of its own borrows a few descriptions from the others, always under a heading
  that says so.
- A description logged minutes ago is offered for the next entry in the same session, and the list
  never contains another member's wording, a declared month's note, or a description from a deleted
  entry — deleting an entry removes it and Undo brings it back.
- Typing a duration into an empty grid cell opens the dialog with the description focused and its
  list already open, and the same happens when editing an entry whose description is empty — the
  one-gesture fix for a `Description needed` warning.
- The list is complete in Hungarian and English, in both themes, and on a phone it appears below
  the field rather than floating over the keyboard.
- An agent connected over MCP sees the same recent descriptions per project in `time_get_context`
  and reuses that wording instead of inventing its own.
- The e-mail field on `/login` shows a neutral `te@example.com` / `you@example.com` placeholder in
  Hungarian and English, never a real company domain.
- `/time` opens on Days, the tabs switch views, old `?scope=`/`?lens=`/`?zoom=`/`?week=` links land
  on the matching tab, and ▷ on any row starts (or switches to) a timer without an error.
