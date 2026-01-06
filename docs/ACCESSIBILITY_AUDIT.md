# SmartMed Accessibility Audit Report

**Version:** 1.0  
**Date:** January 6, 2026  
**Standard:** WCAG 2.1 Level AA  
**Status:** Framework Established - Testing Pending

---

## Executive Summary

This document establishes the accessibility testing framework for the SmartMed healthcare management system and provides guidelines for ensuring WCAG 2.1 Level AA compliance. As a healthcare application, accessibility is particularly important to ensure all patients, including those with disabilities, can access medical services.

### Compliance Target: WCAG 2.1 Level AA

### Current Status: 🟡 Assessment Framework Ready

| Category | Status | Notes |
|----------|--------|-------|
| Automated Testing Setup | ✅ Documented | axe-core, Lighthouse guidelines |
| Manual Testing Checklist | ✅ Created | Keyboard, screen reader tests |
| Component Audit | ⚠️ Pending | Requires interactive testing |
| Remediation Plan | ⏳ Post-audit | Will be created after testing |

---

## Table of Contents

1. [Testing Tools and Setup](#1-testing-tools-and-setup)
2. [Pages to Audit](#2-pages-to-audit)
3. [Automated Testing Guide](#3-automated-testing-guide)
4. [Manual Testing Procedures](#4-manual-testing-procedures)
5. [WCAG 2.1 Checklist](#5-wcag-21-checklist)
6. [Known Component Accessibility](#6-known-component-accessibility)
7. [Remediation Guidelines](#7-remediation-guidelines)
8. [Accessibility Issue Tracker](#8-accessibility-issue-tracker)

---

## 1. Testing Tools and Setup

### 1.1 Recommended Tools

| Tool | Purpose | Installation | Cost |
|------|---------|--------------|------|
| **axe DevTools** | Automated accessibility scanning | Browser extension | Free |
| **WAVE** | Visual accessibility evaluation | Browser extension | Free |
| **Lighthouse** | Performance + accessibility audit | Built into Chrome DevTools | Free |
| **pa11y** | CLI accessibility testing | `npm install -g pa11y` | Free |
| **NVDA** | Screen reader testing | Windows download | Free |
| **VoiceOver** | Screen reader testing | Built into macOS | Free |
| **Color Contrast Analyzer** | Contrast verification | Desktop app | Free |

### 1.2 axe DevTools Setup

1. Install axe DevTools extension:
   - [Chrome](https://chrome.google.com/webstore/detail/axe-devtools-web-accessibility/lhdoppojpmngadmnindnejefpokejbdd)
   - [Firefox](https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/)

2. Using axe DevTools:
   ```
   1. Open the page to test
   2. Open DevTools (F12)
   3. Navigate to "axe DevTools" tab
   4. Click "Scan ALL of my page"
   5. Review and document issues
   ```

### 1.3 Lighthouse CLI Setup

```bash
# Install Lighthouse globally
npm install -g lighthouse

# Run accessibility audit
lighthouse https://localhost:3000 --only-categories=accessibility --output=html --output-path=./lighthouse-report.html

# Run with desktop preset
lighthouse https://localhost:3000 --preset=desktop --only-categories=accessibility --output=html
```

### 1.4 pa11y Setup

```bash
# Install pa11y
npm install -g pa11y

# Basic usage
pa11y https://localhost:3000

# With specific standard
pa11y --standard WCAG2AA https://localhost:3000

# JSON output for tracking
pa11y --reporter json https://localhost:3000 > a11y-results.json
```

---

## 2. Pages to Audit

### 2.1 Authentication Pages

| Page | URL | Priority | Test Theme |
|------|-----|----------|------------|
| Login | `/login` | HIGH | Both |
| Sign Up | `/signup` | HIGH | Both |
| Forgot Password | `/forgot-password` | HIGH | Both |
| MFA Setup | `/settings/security` | MEDIUM | Both |

### 2.2 Patient Dashboard & Features

| Page | URL | Priority | Test Theme |
|------|-----|----------|------------|
| Patient Dashboard | `/patient/dashboard` | HIGH | Both |
| Appointments List | `/patient/appointments` | HIGH | Both |
| Book Appointment | `/patient/appointments/book` | HIGH | Both |
| Appointment Details | `/patient/appointments/:id` | HIGH | Both |
| Prescriptions | `/patient/prescriptions` | HIGH | Both |
| Prescription Detail | `/patient/prescriptions/:id` | HIGH | Both |
| Queue Tracker | `/patient/queue` | MEDIUM | Both |
| Profile Settings | `/patient/profile` | MEDIUM | Both |

### 2.3 Doctor Dashboard & Features

| Page | URL | Priority | Test Theme |
|------|-----|----------|------------|
| Doctor Dashboard | `/doctor/dashboard` | HIGH | Both |
| Appointments List | `/doctor/appointments` | HIGH | Both |
| Appointment Details | `/doctor/appointments/:id` | HIGH | Both |
| Create Prescription | `/doctor/prescriptions/create` | HIGH | Both |
| Queue Management | `/doctor/queue` | MEDIUM | Both |
| Availability Settings | `/doctor/availability` | MEDIUM | Both |
| Profile Settings | `/doctor/profile` | MEDIUM | Both |

### 2.4 Admin Pages

| Page | URL | Priority | Test Theme |
|------|-----|----------|------------|
| Admin Dashboard | `/admin/dashboard` | MEDIUM | Both |
| User Management | `/admin/users` | MEDIUM | Both |
| Permission Management | `/admin/permissions` | MEDIUM | Both |
| Audit Logs | `/admin/audit-logs` | LOW | Both |

### 2.5 Common Components

| Component | Priority | Notes |
|-----------|----------|-------|
| Navigation Header | HIGH | Present on all pages |
| Notification Drawer | MEDIUM | Slide-out panel |
| Modal Dialogs | HIGH | Used throughout |
| Form Components | HIGH | All input forms |
| Data Tables | HIGH | List views |
| Dashboard Widgets | MEDIUM | Drag-and-drop |
| Onboarding Tour | LOW | First-time users |

---

## 3. Automated Testing Guide

### 3.1 Running Automated Scans

#### Full Page Scan with axe

For each page listed in Section 2:
1. Navigate to the page
2. Run axe DevTools scan
3. Record results in Section 8 tracker
4. Repeat for dark mode

#### Lighthouse Batch Script

```bash
#!/bin/bash
# a11y-audit.sh - Run Lighthouse on key pages

BASE_URL="http://localhost:3000"
OUTPUT_DIR="./lighthouse-reports"

mkdir -p $OUTPUT_DIR

PAGES=(
  "login"
  "signup"
  "patient/dashboard"
  "patient/appointments"
  "doctor/dashboard"
  "admin/dashboard"
)

for PAGE in "${PAGES[@]}"; do
  echo "Testing: $BASE_URL/$PAGE"
  lighthouse "$BASE_URL/$PAGE" \
    --only-categories=accessibility \
    --output=html \
    --output-path="$OUTPUT_DIR/${PAGE//\//_}.html" \
    --chrome-flags="--headless"
done

echo "Reports saved to $OUTPUT_DIR"
```

### 3.2 Interpreting Results

#### axe Issue Severity

| Severity | Meaning | Action Required |
|----------|---------|-----------------|
| Critical | Blocks access for users | Fix immediately |
| Serious | Major barrier | Fix before release |
| Moderate | Usability issue | Fix soon |
| Minor | Enhancement opportunity | Plan for future |

#### Lighthouse Score Targets

| Score Range | Rating | Target |
|-------------|--------|--------|
| 90-100 | Excellent | ✅ Goal |
| 70-89 | Good | ⚠️ Acceptable short-term |
| 50-69 | Needs improvement | ❌ Action required |
| 0-49 | Poor | ❌ Critical issues |

---

## 4. Manual Testing Procedures

### 4.1 Keyboard Navigation Testing

**Test each page for:**

| Test | Pass Criteria |
|------|---------------|
| Tab order | Follows logical visual order |
| Focus visible | All focused elements have visible indicator |
| Skip links | Skip to main content available (if applicable) |
| Interactive elements | All buttons/links reachable via Tab |
| Forms | Can complete form without mouse |
| Modals | Focus trapped in modal, ESC closes |
| Dropdowns | Arrow keys navigate, Enter selects |
| Custom widgets | Keyboard alternatives provided |

#### Keyboard Testing Checklist

```
Patient Login Flow:
☐ Tab to email field
☐ Enter email
☐ Tab to password field
☐ Enter password
☐ Tab to "Forgot Password" link
☐ Tab to "Sign In" button
☐ Press Enter to submit
☐ Tab to "Sign Up" link

Appointment Booking Flow:
☐ Tab through doctor selection
☐ Navigate date picker with keyboard
☐ Select time slot with keyboard
☐ Tab through confirmation form
☐ Submit with Enter key
☐ Close confirmation modal with ESC
```

### 4.2 Screen Reader Testing

#### NVDA Setup (Windows)

1. Download NVDA from [nvaccess.org](https://www.nvaccess.org/)
2. Install and configure:
   - Voice: Default or preferred
   - Speech rate: Comfortable speed
   - Verbosity: Normal
3. Key commands:
   - `Insert + Down Arrow`: Read from current position
   - `Tab`: Move to next focusable element
   - `H`: Jump to next heading
   - `B`: Jump to next button
   - `F`: Jump to next form field

#### VoiceOver Setup (Mac)

1. Enable: `System Preferences > Accessibility > VoiceOver > Enable`
2. Or press `Cmd + F5` to toggle
3. Key commands:
   - `VO + A`: Read from current position
   - `Tab`: Move to next element
   - `VO + Cmd + H`: Jump to next heading
   - `VO + Cmd + J`: Jump to next form control

#### Screen Reader Testing Checklist

```
For each page, verify:
☐ Page title announced
☐ Headings properly structured (H1, H2, etc.)
☐ Form labels read correctly
☐ Error messages announced
☐ Buttons have descriptive labels
☐ Images have alt text
☐ Dynamic content changes announced (live regions)
☐ Tables have headers and relationships
☐ Links have meaningful text
```

### 4.3 Color Contrast Testing

#### Manual Contrast Checks

Use WebAIM Contrast Checker: https://webaim.org/resources/contrastchecker/

| Element Type | Minimum Ratio | Target |
|--------------|---------------|--------|
| Normal text | 4.5:1 | 7:1 (AAA) |
| Large text (18pt+ or 14pt+ bold) | 3:1 | 4.5:1 (AAA) |
| UI components | 3:1 | 3:1 |
| Graphical objects | 3:1 | 3:1 |

#### SmartMed Theme Colors to Verify

| Element | Light Mode | Dark Mode |
|---------|------------|-----------|
| Body text | `#1a1a1a` on `#ffffff` | `#e5e5e5` on `#1a1a1a` |
| Primary buttons | `#ffffff` on `#2563eb` | `#ffffff` on `#3b82f6` |
| Error text | `#dc2626` on `#ffffff` | `#f87171` on `#1a1a1a` |
| Success text | `#16a34a` on `#ffffff` | `#4ade80` on `#1a1a1a` |
| Placeholder text | `#9ca3af` on `#ffffff` | `#6b7280` on `#374151` |

### 4.4 Zoom and Text Scaling

#### Browser Zoom Test

1. Set browser zoom to 200%
2. Verify for each page:
   - [ ] No horizontal scrolling required
   - [ ] Content remains readable
   - [ ] No overlapping elements
   - [ ] Functionality preserved
   - [ ] Navigation accessible

#### Text Scaling Test

1. Browser: Settings > Appearance > Font size > Very Large
2. Or use browser zoom on text only (Firefox: View > Zoom > Zoom Text Only)
3. Verify:
   - [ ] Text scales appropriately
   - [ ] Layout accommodates larger text
   - [ ] No truncation of important content

### 4.5 Motion and Animation

**Check for:**
- [ ] `prefers-reduced-motion` media query respected
- [ ] No auto-playing animations that can't be paused
- [ ] No content that flashes more than 3 times per second

---

## 5. WCAG 2.1 Checklist

### 5.1 Perceivable

#### 1.1 Text Alternatives
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 1.1.1 Non-text Content | All images have alt text | ⏳ Pending |

#### 1.2 Time-based Media
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 1.2.1 Audio-only/Video-only | Alternatives provided | N/A (no media) |

#### 1.3 Adaptable
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 1.3.1 Info and Relationships | Semantic HTML used | ⏳ Pending |
| 1.3.2 Meaningful Sequence | DOM order matches visual | ⏳ Pending |
| 1.3.3 Sensory Characteristics | Not relying on shape/color alone | ⏳ Pending |
| 1.3.4 Orientation | Works in portrait and landscape | ⏳ Pending |
| 1.3.5 Identify Input Purpose | Autocomplete attributes present | ⏳ Pending |

#### 1.4 Distinguishable
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 1.4.1 Use of Color | Color not sole indicator | ⏳ Pending |
| 1.4.3 Contrast (Minimum) | 4.5:1 for text | ⏳ Pending |
| 1.4.4 Resize Text | Works at 200% zoom | ⏳ Pending |
| 1.4.5 Images of Text | Avoid images of text | ⏳ Pending |
| 1.4.10 Reflow | No horizontal scroll at 320px | ⏳ Pending |
| 1.4.11 Non-text Contrast | 3:1 for UI components | ⏳ Pending |
| 1.4.12 Text Spacing | Works with user text spacing | ⏳ Pending |
| 1.4.13 Content on Hover/Focus | Dismissible, hoverable, persistent | ⏳ Pending |

### 5.2 Operable

#### 2.1 Keyboard Accessible
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 2.1.1 Keyboard | All functions keyboard accessible | ⏳ Pending |
| 2.1.2 No Keyboard Trap | Focus can move away | ⏳ Pending |
| 2.1.4 Character Key Shortcuts | Can be turned off/remapped | N/A |

#### 2.2 Enough Time
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 2.2.1 Timing Adjustable | Session timeout warning | ⏳ Pending |
| 2.2.2 Pause, Stop, Hide | Moving content controllable | ⏳ Pending |

#### 2.3 Seizures and Physical Reactions
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 2.3.1 Three Flashes | No flashing content | ✅ No flashing content |

#### 2.4 Navigable
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 2.4.1 Bypass Blocks | Skip links available | ⏳ Pending |
| 2.4.2 Page Titled | Descriptive page titles | ⏳ Pending |
| 2.4.3 Focus Order | Logical focus order | ⏳ Pending |
| 2.4.4 Link Purpose | Clear link text | ⏳ Pending |
| 2.4.5 Multiple Ways | Multiple navigation methods | ⏳ Pending |
| 2.4.6 Headings and Labels | Descriptive headings | ⏳ Pending |
| 2.4.7 Focus Visible | Focus indicator visible | ⏳ Pending |

#### 2.5 Input Modalities
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 2.5.1 Pointer Gestures | Simple pointer alternatives | ⏳ Pending |
| 2.5.2 Pointer Cancellation | Can cancel pointer actions | ⏳ Pending |
| 2.5.3 Label in Name | Accessible name includes visible | ⏳ Pending |
| 2.5.4 Motion Actuation | Alternatives to motion | N/A |

### 5.3 Understandable

#### 3.1 Readable
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 3.1.1 Language of Page | HTML lang attribute set | ⏳ Pending |
| 3.1.2 Language of Parts | Lang for different languages | N/A |

#### 3.2 Predictable
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 3.2.1 On Focus | No context change on focus | ⏳ Pending |
| 3.2.2 On Input | No unexpected changes | ⏳ Pending |
| 3.2.3 Consistent Navigation | Navigation consistent | ⏳ Pending |
| 3.2.4 Consistent Identification | Components identified consistently | ⏳ Pending |

#### 3.3 Input Assistance
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 3.3.1 Error Identification | Errors clearly identified | ⏳ Pending |
| 3.3.2 Labels or Instructions | Form instructions provided | ⏳ Pending |
| 3.3.3 Error Suggestion | Suggestions for fixes | ⏳ Pending |
| 3.3.4 Error Prevention | Confirm destructive actions | ⏳ Pending |

### 5.4 Robust

#### 4.1 Compatible
| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 4.1.1 Parsing | Valid HTML | ⏳ Pending |
| 4.1.2 Name, Role, Value | ARIA properly used | ⏳ Pending |
| 4.1.3 Status Messages | Status announced to AT | ⏳ Pending |

---

## 6. Known Component Accessibility

### 6.1 UI Component Patterns

#### Modal Dialogs

**Required Accessibility:**
```tsx
// Proper modal implementation
<div
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Modal Title</h2>
  <p id="modal-description">Description...</p>
  <button onClick={close} aria-label="Close modal">×</button>
</div>
```

**Checklist:**
- [ ] Focus trapped inside modal
- [ ] ESC key closes modal
- [ ] Focus returns to trigger on close
- [ ] `aria-modal="true"` set
- [ ] Labeled with `aria-labelledby`

#### Form Inputs

**Required Pattern:**
```tsx
<label htmlFor="email">Email Address</label>
<input
  id="email"
  type="email"
  name="email"
  autoComplete="email"
  aria-required="true"
  aria-invalid={hasError}
  aria-describedby={hasError ? "email-error" : undefined}
/>
{hasError && <span id="email-error" role="alert">Invalid email</span>}
```

#### Toast Notifications

**Required Pattern:**
```tsx
<div
  role="alert"
  aria-live="assertive"
  aria-atomic="true"
>
  {message}
</div>
```

#### Data Tables

**Required Pattern:**
```tsx
<table>
  <caption>Appointments for January 2026</caption>
  <thead>
    <tr>
      <th scope="col">Date</th>
      <th scope="col">Doctor</th>
      <th scope="col">Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Jan 6, 2026</td>
      <td>Dr. Smith</td>
      <td>Scheduled</td>
    </tr>
  </tbody>
</table>
```

### 6.2 Custom Component Considerations

#### Dashboard Drag-and-Drop Widgets

**Challenge:** Drag-and-drop is inherently mouse-centric

**Accessibility Approach:**
1. Provide keyboard alternative (arrow keys to reorder)
2. Add "Move Up" / "Move Down" buttons
3. Announce changes via live region
4. Document keyboard controls

#### Queue Position Display

**Real-time updates need:**
- `aria-live="polite"` for position changes
- `aria-atomic="true"` to announce full context
- Visual indicator + text (not just number)

---

## 7. Remediation Guidelines

### 7.1 Priority Matrix

| Severity | WCAG Level | User Impact | Timeline |
|----------|------------|-------------|----------|
| Critical | A | Blocks access | 24-48 hours |
| High | A | Major barrier | 1 week |
| Medium | AA | Difficult | 2 weeks |
| Low | AAA | Enhancement | Future release |

### 7.2 Common Fixes

#### Missing Alt Text
```tsx
// Before
<img src="/doctor-avatar.png" />

// After
<img src="/doctor-avatar.png" alt="Dr. Smith profile photo" />

// Decorative image
<img src="/divider.png" alt="" role="presentation" />
```

#### Missing Form Labels
```tsx
// Before
<input type="email" placeholder="Email" />

// After
<label htmlFor="email-input" className="sr-only">Email Address</label>
<input id="email-input" type="email" placeholder="Email" />
```

#### Missing Focus Indicator
```css
/* Add visible focus styles */
*:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 2px;
}

/* Custom focus ring */
.custom-button:focus-visible {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.5);
}
```

#### Low Contrast Text
```css
/* Before - fails contrast */
.muted-text {
  color: #b0b0b0; /* 2.5:1 contrast on white */
}

/* After - passes contrast */
.muted-text {
  color: #666666; /* 5.7:1 contrast on white */
}
```

---

## 8. Accessibility Issue Tracker

### 8.1 Issue Template

```markdown
## Issue: [Component/Page] - [Brief Description]

**WCAG Criterion:** [e.g., 1.4.3 Contrast]
**Severity:** [Critical/High/Medium/Low]
**Tool:** [axe/WAVE/Manual]
**Theme:** [Light/Dark/Both]

### Description
[Detailed description of the issue]

### Steps to Reproduce
1. Navigate to [page]
2. [Action]
3. [Result]

### Expected Behavior
[What should happen]

### Actual Behavior
[What happens currently]

### Recommended Fix
[Specific fix recommendation]

### Screenshot
[If applicable]
```

### 8.2 Issue Log

| ID | Page | Issue | WCAG | Severity | Status | Owner |
|----|------|-------|------|----------|--------|-------|
| A001 | Login | [Example: Missing label on email field] | 1.3.1 | High | ⏳ Open | TBD |
| A002 | Dashboard | [Example: Low contrast on widget titles] | 1.4.3 | Medium | ⏳ Open | TBD |
| ... | ... | ... | ... | ... | ... | ... |

*This table will be populated during testing*

---

## 9. Testing Schedule

| Phase | Activity | Duration | Status |
|-------|----------|----------|--------|
| 1 | Tool setup and training | 1 day | ✅ Complete |
| 2 | Automated scans (all pages) | 2 days | ⏳ Pending |
| 3 | Manual keyboard testing | 2 days | ⏳ Pending |
| 4 | Screen reader testing | 2 days | ⏳ Pending |
| 5 | Contrast and zoom testing | 1 day | ⏳ Pending |
| 6 | Issue documentation | 1 day | ⏳ Pending |
| 7 | Remediation | TBD | ⏳ Pending |
| 8 | Re-testing | 1 day | ⏳ Pending |

---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | January 6, 2026 | Initial accessibility audit framework | QA Team |

---

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [axe DevTools Documentation](https://www.deque.com/axe/devtools/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [Section 508 Standards](https://www.section508.gov/)
