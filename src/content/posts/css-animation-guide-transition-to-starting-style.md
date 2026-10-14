---
title: 'The Ultimate Guide to CSS Animation: From transition to @starting-style'
published: 2026-09-14
description: From transition and @keyframes all the way to @starting-style and allow-discrete, this guide uses a runnable popover example to explain how to animate elements appearing from nothing.
image: ''
tags: [CSS, Animation, Frontend, Web Platform]
category: Frontend
draft: false
---
## A Problem: Why Does the Animation Disappear When `display: none` Is Toggled Back?

Almost everyone who has written front-end interactions has hit this wall: you write a `transition: opacity .3s` for a popover, set it to `display: none` when closing, and when you open it again—it appears out of nowhere, and the animation is gone.

The reason is straightforward: **elements with `display: none` are not in the render tree at all**. The element hasn't been rendered yet, so naturally there's no "from old state to new state" to speak of—the browser can't even compute a starting style. So for the past decade or so, the common approach has been to patch it with JS:

```js
// Classic hack: remove the class first, force reflow, then add the class
panel.classList.remove('is-open');
void panel.offsetWidth; // Force a synchronous layout to make the browser "see" the initial state
panel.classList.add('is-open');
```

This code works, but the cost is that every toggle triggers a forced synchronous layout (forced reflow), and it splits "animation"—something that should be described by CSS—across two languages.

CSS now has a first-class solution: **`@starting-style`**. This article starts from the most basic `transition` and threads these new tools together into a complete chain.

## 1. Layer One: transition — Interpolation Between Two Points

`transition` describes "how the same property smoothly transitions between two known values," and it requires three conditions to hold simultaneously:

1. The property itself is **interpolable** (`opacity`, `transform`, `color` can; `display`, `content` cannot)
2. The element is **in a rendered state both before and after** the transition
3. The property value **actually changes** (going from `opacity: 1` to `opacity: 1` won't trigger anything)

The third point is often overlooked, but it explains a classic confusion: why can't `height: auto` transition? Because `auto` is not a numeric value, and the browser cannot find an intermediate value between `auto` and `200px`. It wasn't until `calc-size()` and `interpolate-size: allow-keywords` appeared that this problem had a pure-CSS answer—but that's another topic.

```css
.card {
  opacity: 0;
  transform: translateY(8px);
  transition: opacity 200ms ease-out, transform 200ms ease-out;
}

.card.is-visible {
  opacity: 1;
  transform: translateY(0);
}
```

Note that only `opacity` and `transform` are animated here. This isn't an aesthetic preference but a performance constraint: these two properties can be handled independently by the compositor thread, without triggering reflow or repaint. Animating `height`, `margin`, `top` forces the browser to recalculate layout every frame, which immediately drops frames on low-end devices.

## 2. Layer Two: @keyframes — Describing a Timeline

`transition` can only describe "A → B." When what you want is multi-stage choreography (scale up then bounce back, infinite rotation, skeleton screen shimmer), you need to switch to `animation`:

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%      { opacity: .5; }
}

.skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes shake {
  10%, 90% { transform: translateX(-2px); }
  20%, 80% { transform: translateX(4px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
}

.input.is-error {
  animation: shake 400ms ease-in-out;
}
```

The key difference between `animation` and `transition` lies in **control**: `transition` is driven by changes in property values, while `animation` is driven by the element having an animation name attached. This also means `@keyframes` can express the action of "entering"—as long as you're willing to attach it immediately after the element is rendered.

## 3. Layer Three: @starting-style — Giving "First Render" a Starting Point

Now back to the problem from the beginning. What `@starting-style` does can be summed up in one sentence: **it provides a starting style for when an element is "rendered for the first time,"** letting the browser know where to begin the transition from.

```css
.panel {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms ease, transform 300ms ease;
}

/* When the element first renders (or recovers from display:none), start here */
@starting-style {
  .panel {
    opacity: 0;
    transform: translateY(-12px);
  }
}
```

The key point is: declarations inside `@starting-style` **are only used to compute the starting value of the transition and do not take effect in the end**. The browser treats it as "what this element should look like if it were in its initial state right now," then immediately transitions to the final value in the regular rules.

But using it alone isn't enough—because the problem of `display: none` hasn't been solved yet.

## 4. Layer Four: allow-discrete — Letting Discrete Properties Participate in Transitions Too

`display` is a discrete property: it's either `none` or it isn't, with no 50% `display` in between. So the browser refuses to transition it by default. `transition-behavior: allow-discrete` changes this rule, allowing discrete properties to flip at the **two endpoints** of the transition rather than interpolating smoothly:

```css
.panel {
  display: none;
  opacity: 0;
  transform: translateY(-12px);

  transition:
    display 300ms allow-discrete,
    opacity 300ms ease,
    transform 300ms ease;
}

.panel.is-open {
  display: block;
  opacity: 1;
  transform: translateY(0);
}
```

The semantics here are worth unpacking: when closing, `display` flipping from `block` to `none` is deferred until the transition ends (otherwise the element would vanish instantly and you wouldn't see the fade-out); when opening, `display` immediately becomes `block`, giving `opacity` and `transform` a chance to transition. This is exactly the effect those few lines of JS hack were trying to simulate in the past.

## 5. Complete Example: A Toast with Zero Lines of JS Animation

Putting the four layers together gives you a complete popover driven by toggling a single class name:

```html
<div class="toast" id="toast">Saved to drafts</div>
<button onclick="document.getElementById('toast').classList.toggle('is-open')">
  Toggle Toast
</button>
```

```css
.toast {
  position: fixed;
  inset-block-start: 1rem;
  inset-inline: 0;
  margin-inline: auto;
  width: fit-content;
  padding: .75rem 1.25rem;
  border-radius: 999px;
  background: #111;
  color: #fff;
  font-size: .875rem;

  /* Closed state */
  display: none;
  opacity: 0;
  transform: translateY(-16px) scale(.96);

  transition:
    display 250ms allow-discrete,
    opacity 250ms ease,
    transform 250ms cubic-bezier(.34, 1.56, .64, 1);
}

.toast.is-open {
  display: block;
  opacity: 1;
  transform: translateY(0) scale(1);
}

/* Starting point on first render / recovery from none */
@starting-style {
  .toast.is-open {
    opacity: 0;
    transform: translateY(-16px) scale(.96);
  }
}

/* Accessibility: respect the system's "reduce motion" setting */
@media (prefers-reduced-motion: reduce) {
  .toast {
    transition: display 0s, opacity 150ms linear;
    transform: none;
  }
}
```

Note that the `@starting-style` selector uses `.toast.is-open`—because only the "open" state needs a starting point. If you wrote `.toast`, the closing direction would also be given a starting style, which would actually interfere with the transition.

The same pattern can be applied directly to `<dialog>`, `popover`, hamburger menus, and dropdown panels. Especially with the popover API, where `popover`'s show/hide itself toggles `display`—combining the two is currently the least effort-intensive popover animation solution.

## 6. Browser Support and Fallback

As of 2026, `@starting-style` and `transition-behavior: allow-discrete` are fully available in Chrome 117+, Safari 17.4+, and Firefox 129+, and new versions of all mainstream browsers have coverage.

For scenarios that still need to support older engines, it's recommended to use `@supports` for progressive enhancement rather than falling back to JS hacks:

```css
@supports (transition-behavior: allow-discrete) {
  .toast { transition: display 250ms allow-discrete, opacity 250ms ease; }
}

@supports not (transition-behavior: allow-discrete) {
  /* Legacy browsers: only do an opacity transition, elements show/hide instantly */
  .toast { transition: opacity 250ms ease; }
  .toast.is-open { display: block; }
}
```

This way, old browsers get a usable version with "fade-out but no fade-in," and new browsers get the full animation—without a single line of JS and without forced reflow.
## Final Thoughts

These four layers actually correspond to progressively deeper questions:

| What you want to do | What to use |
|---|---|
| Smoothly switch between two known states | `transition` |
| Multi-segment choreography, loops, complex timelines | `@keyframes` |
| Elements that need a starting point the first time they appear | `@starting-style` |
| Let discrete properties like `display` participate in transitions | `transition-behavior: allow-discrete` |

In the past, we handed "enter animations" off to JS, not because CSS couldn't do it, but because CSS lacked the language to describe "nothing." `@starting-style` fills in exactly that gap: it makes "nothing exists" a state that can be interpolated. From then on, popover animations became nothing more than a matter of two class names.

---

## References

- [MDN — `@starting-style`](https://developer.mozilla.org/en-US/docs/Web/CSS/@starting-style)
- [MDN — `transition-behavior`](https://developer.mozilla.org/en-US/docs/Web/CSS/transition-behavior)
- [Chrome for Developers — Four new CSS features for smooth entry and exit animations](https://developer.chrome.com/blog/entry-exit-animations)
- [web.dev — Animating entry and exit with `@starting-style`](https://web.dev/blog/starting-style)
- [Can I use — CSS `@starting-style`](https://caniuse.com/mdn-css_at-rules_starting-style)