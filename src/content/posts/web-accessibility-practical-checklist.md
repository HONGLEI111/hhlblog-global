---
title: 网站可访问性（a11y）实战清单：让每个人都能用你的网站
published: 2026-09-15
description: '一份可落地的 Web 可访问性实践清单：语义化 HTML、键盘与焦点管理、ARIA 的正确用法、色彩对比度、表单错误提示，以及自动化与手动测试的组合方案。'
image: ''
tags: [可访问性, a11y, HTML, ARIA, 网站开发, WCAG]
category: '网站'
draft: false
lang: ''
---

## 一、a11y 不是「少数人的需求」

很多团队把可访问性（accessibility，缩写 a11y）当成上线前的「合规打勾项」——直到有人在 issue 里贴出「Tab 键根本走不到提交按钮」的截图。

可访问性真正服务的用户远比想象中多：

- 全球约有 **2.5 亿** 视障人士，但更大的群体是色觉障碍（约 8% 的男性）、手部运动障碍、认知障碍用户；
- 任何人在特定场景下都是「暂时性残障」：地铁上单手操作、强光下看不清低对比度文字、鼠标没电只能用键盘；
- 屏幕阅读器用户、语音控制用户、放大镜用户，都在用与你完全不同的方式浏览 DOM。

换句话说，a11y 不是给「边缘人群」做的慈善，而是**让界面在更多输入方式下依然可用**。而它的成本，绝大多数情况下只是「把 HTML 写对」。

下面是一份可以直接贴进 Code Review checklist 的实战清单。

## 二、第一优先级：语义化 HTML

浏览器内置了大量的可访问性语义：`<button>` 天然可聚焦、可用空格/回车触发；`<a>` 天然进入 Tab 序列；`<input>` 天然绑定 label；`<nav>`、`<main>`、`<header>` 天然形成地标（landmark），屏幕阅读器用户可以一键跳转。

只要不滥用 `<div>`，你就能免费拿到 80% 的可访问性。

```html
<!-- ❌ 反面教材：屏幕阅读器只看到一堆文本 -->
<div class="btn" onclick="submit()">提交</div>
<div class="link" onclick="go()">查看详情</div>

<!-- ✅ 正确写法：语义、焦点、键盘事件全部免费 -->
<button type="submit">提交</button>
<a href="/detail">查看详情</a>
```

一条经验法则：**如果你给一个 `div` 写了 `onclick`、`tabindex="0"`、`role="button"` 和键盘事件监听，那你其实是在手写一个 `<button>`——直接用它就好。**

页面结构同理：

```html
<body>
  <a class="skip-link" href="#main">跳到主要内容</a>
  <header>
    <nav aria-label="主导航">...</nav>
  </header>
  <main id="main">
    <h1>文章标题</h1>
    <!-- 标题层级不要跳级：h1 → h2 → h3 -->
  </main>
  <footer>...</footer>
</body>
```

`aria-label` 用于区分多个同类地标（页面上有两个 `<nav>` 时，屏幕阅读器需要知道哪个是主导航、哪个是页脚导航）。

## 三、键盘可达性：焦点是用户体验的一部分

只用键盘（Tab / Shift+Tab / Enter / Esc / 方向键）走一遍你的核心流程，是投入产出比最高的测试。常见问题集中在三处：

**1. 自定义组件不管理焦点。** 打开 Modal 时，焦点应该移入弹窗并被「困」在里面；关闭时，焦点应该回到触发按钮。

```js
function openDialog(dialog, trigger) {
  const focusables = dialog.querySelectorAll(
    'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  dialog.showModal(); // 原生 <dialog> 自带焦点陷阱与 Esc 关闭
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

值得强调的是：**原生的 `<dialog>` + `showModal()` 已经免费提供了焦点陷阱、`Esc` 关闭、背景 inert 化**。手写这套逻辑是 a11y bug 的高发区，能用原生就别重造。

**2. 焦点样式被 `outline: none` 干掉。** 为了「好看」而全局移除焦点轮廓，等于让键盘用户彻底迷路。正确做法是保留、并美化它：

```css
/* ❌ 不要这样 */
*:focus { outline: none; }

/* ✅ 用 :focus-visible 只给键盘用户显示，且保证对比度 */
:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 2px;
  border-radius: 4px;
}
```

`:focus-visible` 的妙处在于：鼠标点击不会触发轮廓，键盘 Tab 会——既保住了设计稿，也保住了可用性。

**3. 动态内容变化没有通知。** 表单校验失败、Toast 提示、加载完成，这些对视觉用户是「看得见的变化」，对屏幕阅读器用户则是「什么都没发生」。用 `aria-live` 播报：

```html
<div role="status" aria-live="polite" class="sr-only">
  已保存 3 项更改
</div>
<!-- 紧急错误用 aria-live="assertive"，它会打断当前播报，慎用 -->
```

配合一个视觉隐藏但读屏可见的工具类：

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

## 四、ARIA：能不用就不用

ARIA 的第一规则是：**如果你能用原生 HTML 元素表达语义，就不要用 ARIA。** 原生元素的行为（键盘交互、焦点管理、状态同步）是浏览器实现好的，而 ARIA 只管「告诉屏幕阅读器这是什么」，不管行为。

```html
<!-- ❌ ARIA 滥用：有 role 但行为没实现，反而更糟 -->
<div role="checkbox" aria-checked="false">同意条款</div>

<!-- ✅ 原生元素，行为与语义都是对的 -->
<label>
  <input type="checkbox" name="terms" />
  同意条款
</label>
```

ARIA 真正该出手的场景有三类：

- 原生元素无法表达的**状态**：`aria-expanded`（折叠面板）、`aria-current="page"`（当前导航项）、`aria-invalid`（校验失败）；
- 原生元素无法表达的**关系**：`aria-describedby`（把帮助文本关联到输入框）、`aria-controls`；
- **自定义复合组件**：如 combobox、tree、tablist ——这类组件应当直接采用 WAI-ARIA Authoring Practices 中给定的模式，而不是自己发明。

一个高频且几乎总被忽略的细节是「图标按钮」：

```html
<!-- 只有一个 SVG 图标，读屏用户听到的是「按钮」，不知道干什么 -->
<button><svg aria-hidden="true">...</svg></button>

<!-- ✅ 提供可读名称，同时让装饰性图标对 AT 隐藏 -->
<button aria-label="关闭对话框">
  <svg aria-hidden="true" focusable="false">...</svg>
</button>
```

## 五、视觉与感知：对比度、动效、不靠颜色传达信息

**对比度**是 WCAG 里最容易量化的一条：正文文字与背景的对比度至少 **4.5:1**，大号文字（≥18.66px 粗体或 ≥24px）至少 **3:1**，UI 组件边界至少 **3:1**。灰底浅灰字的「高级感设计」往往是重灾区。

**不要只靠颜色传达信息**——这是色觉障碍用户的核心痛点：

```html
<!-- ❌ 只靠红色表示错误 -->
<input style="border-color: red" />

<!-- ✅ 颜色 + 图标 + 文字，三重冗余 -->
<input aria-invalid="true" aria-describedby="email-error" />
<p id="email-error" class="error">
  <span aria-hidden="true">⚠</span> 邮箱格式不正确，请检查是否缺少 @
</p>
```

**尊重用户的动效偏好**。前庭功能障碍用户可能因视差滚动、大幅位移动画而眩晕，系统级设置可以直接读取：

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

注意这不是「关掉所有动画」，而是把**装饰性位移**降级为**不移动的透明度变化**，信息传达依然完整。

## 六、表单：错误提示要说清楚「怎么改」

表单是交互最复杂、也最容易出 a11y 问题的地方。三条硬性要求：

1. 每个控件都要有**程序化关联的标签**（`<label for>` 或包裹式 label，或 `aria-label`）；
2. 错误提示必须**在文字里说明如何修复**，并关联到对应控件；
3. 出错时把焦点移到**第一个出错的控件**，并让 `aria-invalid` 状态可被读出。

```html
<form novalidate>
  <div class="field">
    <label for="email">邮箱地址</label>
    <input
      id="email"
      name="email"
      type="email"
      required
      aria-describedby="email-hint email-error"
      aria-invalid="false"
    />
    <p id="email-hint" class="hint">用于接收登录验证码，不会对外公开</p>
    <p id="email-error" class="error" role="alert" hidden></p>
  </div>
  <button type="submit">注册</button>
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
        ? '此项为必填，请输入邮箱地址'
        : '邮箱格式不正确，应形如 name@example.com';
  });

  firstInvalid?.focus();
});
```

注意 `role="alert"` 只在错误出现时才渲染文本，避免页面加载时空元素被播报。

## 七、测试：自动化扫 40%，手动走 60%

自动化工具能高效发现「结构性问题」——缺 `alt`、对比度不足、label 缺失、ARIA 属性拼错。

```bash
npm i -D @axe-core/cli
npx axe https://your-site.com --exit
```

集成进 E2E 也只要几行：

```js
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test('首页无可访问性违规', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

但自动化**测不出**这些问题，必须手动：

- 拔掉鼠标，只用键盘走完注册 / 下单 / 提交表单的主流程；
- 打开 VoiceOver（macOS `Cmd+F5`）或 NVDA，听一遍页面结构是否讲得通；
- 把浏览器缩放到 200%，看内容是否仍可读、不重叠；
- 强制开启 `prefers-reduced-motion` 与高对比度模式，确认界面不崩。

## 八、结语

可访问性不是一个可以「做完」的项目，而是一组持续的工程习惯。落地时建议按这个顺序推进：

1. **语义化 HTML**——成本最低、收益最大，改掉 `div` 按钮；
2. **键盘可达 + 可见焦点**——一条 `:focus-visible` 样式就能救命；
3. **不靠颜色传达信息 + 对比度达标**——多数问题用设计 token 一次性解决；
4. **表单错误可读**——直接影响转化率，业务方也乐意买单；
5. **CI 里跑 axe**——把回归挡住，比事后审计便宜得多。

一个常被引用的观点是：可访问性做对了，**所有人**的体验都会变好——更清晰的标题层级、更明确的错误提示、更可预测的键盘交互。它本质上是好工程实践的副产品，而不是额外的负担。

## 参考来源

- [W3C — Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/)
- [MDN — Accessibility](https://developer.mozilla.org/zh-CN/docs/Web/Accessibility)
- [WAI-ARIA Authoring Practices Guide (APG)](https://www.w3.org/WAI/ARIA/apg/)
- [Deque — axe-core 规则集说明](https://github.com/dequelabs/axe-core)
- [The A11Y Project — Web Accessibility Checklist](https://www.a11yproject.com/checklist/)
- [MDN — `:focus-visible`](https://developer.mozilla.org/zh-CN/docs/Web/CSS/:focus-visible)
