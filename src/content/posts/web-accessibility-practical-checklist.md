---
title: 'Web Accessibility (a11y) in Practice: A Checklist to Make Your Site Usable for Everyone'
published: 2026-09-15
description: 'A practical checklist for web accessibility: semantic HTML, keyboard and focus management, correct use of ARIA, color contrast, form error messaging, and a combined approach of automated and manual testing.'
image: ''
tags: [accessibility, a11y, HTML, ARIA, web development, WCAG]
category: Web
draft: false
---
## 1. a11y Is Not a "Need of a Few"

Many teams treat accessibility (a11y) as a "compliance checkbox" before launch—until someone posts a screenshot in an issue showing "the Tab key can't even reach the submit button."

Accessibility actually serves far more users than you'd imagine:

- There are roughly **250 million** visually impaired people worldwide, but the larger groups are those with color vision deficiency (about 8% of men), motor impairments, and cognitive disabilities;
- Everyone is "temporarily disabled" in certain scenarios: operating a phone one-handed on the subway, struggling to read low-contrast text in bright sunlight, or having to use only the keyboard because the mouse battery died;
- Screen reader users, voice control users, and magnifier users all browse the DOM in ways completely different from yours.

In other words, a11y isn't charity for "marginalized groups"—it's about **keeping the interface usable across more input methods**. And the cost, in the vast majority of cases, is simply "writing HTML correctly."

Below is a practical checklist you can paste directly into your Code Review checklist.

## 2. First Priority: Semantic HTML

Browsers come with a wealth of built-in accessibility semantics: `<button>` is naturally focusable and can be triggered with Space/Enter; `<a>` naturally enters the Tab sequence; `<input>` is naturally bound to a label; `<nav>`, `<main>`, and `<header>` naturally form landmarks that screen reader users can jump to with a single keystroke.

As long as you don't abuse `<div>`, you get 80% of accessibility for free.

```html
<!-- ❌ Anti-pattern: screen readers only see a pile of text -->
<div class="btn" onclick="submit()">Submit</div>
<div class="link" onclick="go()">View details</div>

<!-- ✅ Correct approach: semantics, focus, and keyboard events all come for free -->
<button type="submit">Submit</button>
<a href="/detail">View details</a>
```

A rule of thumb: **if you've written `onclick`, `tabindex="0"`, `role="button"`, and keyboard event listeners for a `div`, you're essentially hand-writing a `<button>`—just use it directly.**

The same applies to page structure:

```html
<body>
  <a class="skip-link" href="#main">Skip to main content</a>
  <header>
    <nav aria-label="Main navigation">...</nav>
  </header>
  <main id="main">
    <h1>Article title</h1>
    <!-- Don't skip heading levels: h1 → h2 → h3 -->
  </main>
  <footer>...</footer>
</body>
```

`aria-label` is used to distinguish multiple landmarks of the same type (when a page has two `<nav>` elements, screen readers need to know which is the main navigation and which is the footer navigation).

## 3. Keyboard Accessibility: Focus Is Part of the User Experience

Walking through your core flows using only the keyboard (Tab / Shift+Tab / Enter / Esc / arrow keys) is the highest-ROI test you can do. Common problems cluster in three areas:

**1. Custom components don't manage focus.** When a Modal opens, focus should move into the dialog and be "trapped" inside; when it closes, focus should return to the trigger button.

```js
function openDialog(dialog, trigger) {
  const focusables = dialog.querySelectorAll(
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  dialog.showModal(); // Native <dialog> comes with focus trapping and Esc to close
  first?.focus();

  dialog.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab') return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  dialog.addEventListener('close', () => trigger?.focus(), { once: true });
}
```

It's worth emphasizing: **the native `<dialog>` + `showModal()` already provides focus trapping, `Esc` to close, and background inerting for free**. Hand-writing this logic is a hotspot for a11y bugs—if you can use the native solution, don't reinvent it.

**2. Focus styles are killed by `outline: none`.** Globally removing focus outlines for the sake of "looking good" is equivalent to leaving keyboard users completely lost. The right approach is to keep it and make it prettier:

```css
/* ❌ Don't do this */
*:focus { outline: none; }

/* ✅ Use :focus-visible to show it only for keyboard users, and ensure contrast */
:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
  border-radius: 4px;
}
```

The beauty of `:focus-visible` is that mouse clicks don't trigger the outline, but keyboard Tab does—preserving both the design mockup and usability.

**3. Dynamic content changes aren't announced.** Form validation failures, Toast notifications, loading completion—these are "visible changes" to sighted users, but "nothing happened" to screen reader users. Use `aria-live` to announce them:

```html
<div role="status" aria-live="polite" class="sr-only">
  Saved 3 changes
</div>
<!-- Use aria-live="assertive" for urgent errors; it interrupts the current announcement, so use with caution -->
```

Pair it with a utility class that's visually hidden but readable by screen readers:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
```

## 4. ARIA: Use It as Little as Possible

The first rule of ARIA is: **if you can express the semantics with native HTML elements, don't use ARIA.** The behavior of native elements (keyboard interaction, focus management, state synchronization) is implemented by the browser, whereas ARIA only "tells the screen reader what this is"—it doesn't handle behavior.

```html
<!-- ❌ ARIA misuse: having a role but not implementing the behavior makes things worse -->
<div role="checkbox" aria-checked="false">Agree to terms</div>

<!-- ✅ Native elements: both behavior and semantics are correct -->
<label>
  <input type="checkbox" name="terms" />
  Agree to terms
</label>
```

There are three scenarios where ARIA genuinely earns its keep:

- **States** that native elements can't express: `aria-expanded` (collapsible panels), `aria-current="page"` (current navigation item), `aria-invalid` (validation failure);
- **Relationships** that native elements can't express: `aria-describedby` (associating help text with an input), `aria-controls`;
- **Custom composite components**: such as combobox, tree, tablist—these should directly adopt the patterns given in the WAI-ARIA Authoring Practices rather than being invented from scratch.

One high-frequency detail that's almost always overlooked is the "icon button":

```html
<!-- With only an SVG icon, screen reader users hear "button" and don't know what it does -->
<button><svg aria-hidden="true">...</svg></button>

<!-- ✅ Provide an accessible name while hiding decorative icons from AT -->
<button aria-label="Close dialog">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>
```

## 5. Visual and Perceptual: Contrast, Motion, and Not Conveying Information by Color Alone

**Contrast** is the most quantifiable item in WCAG: body text against its background must be at least **4.5:1**, large text (≥18.66px bold or ≥24px) at least **3:1**, and UI component boundaries at least **3:1**. The "premium feel design" of light gray text on a gray background is often the worst offender.

**Don't convey information by color alone**—this is the core pain point for users with color vision deficiency:

```html
<!-- ❌ Indicating errors with red alone -->
<input style="border-color: red" />

<!-- ✅ Color + icon + text, triple redundancy -->
<input aria-invalid="true" aria-describedby="email-error" />
<p id="email-error" class="error">
  <span aria-hidden="true">⚠</span> Email address is not valid — check for a missing @
</p>
```

**Respect users' motion preferences.** Users with vestibular disorders may experience dizziness from parallax scrolling or large displacement animations, and the system-level setting can be read directly:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Note that this isn't about "turning off all animations," but about downgrading **decorative displacement** to **non-moving opacity changes**, so that the information is still fully conveyed.
## 6. Forms: Error messages must clearly state "how to fix it"

Forms are where interaction is the most complex and where a11y issues are most likely to arise. Three hard requirements:

1. Every control must have a **programmatically associated label** (`<label for>`, a wrapping label, or `aria-label`);
2. Error messages must **explain in text how to fix the problem**, and be associated with the corresponding control;
3. When an error occurs, move focus to **the first control with an error**, and make the `aria-invalid` state readable.

```html
<form novalidate>
  <div class="field">
    <label for="email">Email address</label>
    <input
      id="email"
      name="email"
      type="email"
      required
      aria-describedby="email-hint email-error"
      aria-invalid="false"
    />
    <p id="email-hint" class="hint">Used to receive login verification codes, will not be made public</p>
    <p id="email-error" class="error" role="alert" hidden></p>
  </div>
  <button type="submit">Register</button>
</form>
```

```js
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const firstInvalid = form.querySelector('input:invalid');

  form.querySelectorAll('[aria-invalid]').forEach((el) => {
    const error = document.getElementById(`${el.id}-error`);
    el.setAttribute('aria-invalid', String(el.matches(':invalid')));
    error.hidden = el.validity.valid;
    error.textContent = el.validity.valid
      ? ''
      : el.validity.valueMissing
        ? 'This field is required, please enter your email address'
        : 'Invalid email format, should look like name@example.com';
  });

  firstInvalid?.focus();
});
```

Note that `role="alert"` only renders text when an error appears, avoiding empty elements being announced on page load.

## 7. Testing: automate 40%, test manually 60%

Automated tools can efficiently find "structural problems" — missing `alt`, insufficient contrast, missing labels, misspelled ARIA attributes.

```bash
npm i -D @axe-core/cli
npx axe https://your-site.com --exit
```

Integrating into E2E only takes a few lines:

```js
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test('No accessibility violations on the home page', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

But automation **cannot detect** these issues, which must be done manually:

- Unplug the mouse and complete the main flows of registration / checkout / form submission using only the keyboard;
- Turn on VoiceOver (macOS `Cmd+F5`) or NVDA, and listen to whether the page structure makes sense;
- Zoom the browser to 200% and check whether content is still readable and does not overlap;
- Force-enable `prefers-reduced-motion` and high contrast mode, and confirm the interface does not break.

## 8. Conclusion

Accessibility is not a project that can be "finished," but a set of ongoing engineering habits. When implementing it, it is recommended to proceed in this order:

1. **Semantic HTML** — lowest cost, greatest benefit; replace `div` buttons;
2. **Keyboard accessible + visible focus** — a single `:focus-visible` style can save the day;
3. **Do not convey information by color alone + meet contrast requirements** — most issues can be solved once and for all with design tokens;
4. **Readable form errors** — directly affects conversion rates, and business stakeholders are happy to pay for it;
5. **Run axe in CI** — blocking regressions is far cheaper than auditing after the fact.

A commonly cited point is: when accessibility is done right, **everyone's** experience improves — clearer heading hierarchy, more explicit error messages, more predictable keyboard interaction. It is essentially a byproduct of good engineering practice, not an extra burden.

## References

- [W3C — Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- [MDN — Accessibility](https://developer.mozilla.org/zh-CN/docs/Web/Accessibility)
- [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [Deque — axe-core rule set documentation](https://github.com/dequelabs/axe-core)
- [The A11Y Project — Web Accessibility Checklist](https://www.a11yproject.com/checklist/)
- [MDN — `:focus-visible`](https://developer.mozilla.org/zh-CN/docs/Web/CSS/:focus-visible)