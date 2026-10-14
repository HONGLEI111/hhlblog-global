---
title: 'IE''s Golden Age of Weirdness: A Blood-and-Tears History of Browser Compatibility'
published: 2026-09-13
description: From the box model wars to CSS expressions, from conditional comments to user-agent string espionage, a look back at the legacy Internet Explorer left behind for the front-end world.
image: ''
tags: [browser, compatibility, CSS, frontend, programmer humor]
category: Frontend
draft: false
---
On June 15, 2022, Microsoft officially sounded the death knell for IE11. After the news broke, an engineer set up an altar at the "funeral," enshrining a cake printed with a blue `e`—this was no joke, but **a spontaneous celebration by front-end developers tormented into PTSD by IE**.

To understand where this resentment comes from, we must first return to that era of "one browser, one book."

## 1. One "Standard," Two Boxes

The most famous disagreement in front-end history is known as the **Box Model War**.

In IE6's Quirks Mode, a box with `width: 100px` and `padding: 10px` has a total width of exactly 100px; while in W3C standards mode, the content is 100px wide, and after adding padding and border, it actually occupies 120px.

```css
.box {
  width: 100px;
  padding: 10px;
  border: 1px solid;
  /* Standard mode: actually occupies 122px (content-box) */
  /* IE quirks mode: actually occupies 100px (border-box) */
}
```

Back then, everyone cursed IE for being "non-standard." But over a decade later, the CSS Working Group quietly added a property—`box-sizing: border-box`, which is **turning IE's algorithm from back then into the standard**. After all that back and forth, it turns out IE was the one who "implemented the requirement ahead of time."

## 2. Those APIs That Only IE Had

IE's unique tricks can be listed off the top of my head:

```css
/* 1. Transparency: the whole world uses opacity, only IE uses filters */
.box {
  opacity: 0.5;
  filter: alpha(opacity=50); /* IE6/7 only */
}
```

Even more absurd than filters was **CSS expressions**—allowing you to write JavaScript inside stylesheets:

```css
/* IE5~IE7: make element width change with the window */
.sidebar {
  width: expression(document.body.clientWidth < 600 ? "600px" : "auto");
}
```

This thing would **re-evaluate on every repaint**, causing performance to collapse outright, and conveniently opened a backdoor for XSS. Later, Microsoft themselves disabled it.

As for the origin of AJAX—`XMLHttpRequest`, the way to write it in IE was like this:

```javascript
var xhr = new ActiveXObject("Microsoft.XMLHTTP"); // IE-specific
```

Yes, a network request object that actually had to be created through an ActiveX control.

## 3. Conditional Comments: The "Secret Code" Microsoft Handed Out Themselves

IE provided an HTML comment syntax that only it could recognize:

```html
<!--[if lt IE 9]>
  <script src="/js/html5shiv.js"></script>
  <link rel="stylesheet" href="/css/ie8.css" />
<![endif]-->
```

Standard browsers would ignore it as a comment, while IE would execute the content inside. So in those years, almost every `<head>` contained a piece of this "secret code," accompanied by CSS hacks like `_height: 100px` and `*display: inline` that only took effect on specific IE versions. **Compatibility went from being a technique to being a form of witchcraft.**

## 4. The `document.all` That Pretends It Doesn't Exist

IE's most enduring "legacy" is hidden in the HTML standard. Even today, if you open the console and type:

```javascript
typeof document.all // "undefined"
document.all == undefined // true
```

`document.all` clearly exists, yet pretends it doesn't—because back then, code commonly used `if (document.all)` to detect IE, and the standards committee, in order to prevent these old codebases from running into the wrong logic branch, **defined this object itself as "an existence disguised as undefined."** One line of specification erected a monument for a piece of history.

## 5. Conclusion

Many of IE's "quirks" actually stem from its leading position in the browser wars: it implemented many things before the standards existed, so the standards had to accommodate it in reverse. But for those developers back then who were debugging `hasLayout` while cursing up a storm, this "foresight" really wasn't very convincing.

The good news is: today's Edge is just Chromium with a new skin, and Safari is dutifully taking up the mantle of "the new IE." The old king is dead, long live the new king.

---

**References**

- [Internet Explorer 11 desktop application end of support announcement](https://learn.microsoft.com/en-us/lifecycle/announcements/internet-explorer-11-end-of-support) — Microsoft's official 2022 retirement notice
- [The bizarre definition of `document.all` in the HTML standard](https://html.spec.whatwg.org/multipage/obsolete.html#dom-document-all) — A special case born in the spec for IE compatibility
- [MDN: `box-sizing`](https://developer.mozilla.org/en-US/docs/Web/CSS/box-sizing) — The Box Model War and the origin of `border-box`
- [IE Conditional Comments official documentation](https://learn.microsoft.com/en-us/previous-versions/windows/internet-explorer/ie-developer/compatibility/ms537512(v=vs.85)) — The original explanation of that "secret code"