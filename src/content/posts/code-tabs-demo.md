---
title: Code Tabs Multi-Language Code Tabs Usage Guide
published: 2026-08-10
description: Use the :::code-tabs directive to display multi-language code examples in blog posts, with tab switching and language preference memory.
tags: [Demo, Markdown]
category: Examples
draft: false
---
HHLBlog has added a **Code Tabs** feature that lets you display implementations in multiple programming languages within a single code block, with readers switching freely via tabs. It's especially suited for technical blog posts that need to compare how different languages/frameworks write things.

## Quick Start

Use the `:::code-tabs` container directive to wrap multiple fenced code blocks; each code block's language is automatically detected and displayed as a tab label:

:::code-tabs
```js
// JavaScript
function greet(name) {
  return `Hello, ${name}!`;
}
console.log(greet("World"));
```

```ts
// TypeScript
function greet(name: string): string {
  return `Hello, ${name}!`;
}
console.log(greet("World"));
```
:::

The syntax is very simple — just like writing fenced code blocks normally, except you wrap them with `:::code-tabs`.

## Specifying the Default Language

Use the `default` attribute to preset which tab is displayed by default:

:::code-tabs{default="cpp"}
```c title="C"
#include <stdio.h>

int main() {
    int arr[] = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int i = 0; i < 5; i++) {
        sum += arr[i];
    }
    printf("Sum: %d\n", sum);
    return 0;
}
```

```cpp title="C++"
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::vector<int> arr = {1, 2, 3, 4, 5};
    int sum = std::accumulate(arr.begin(), arr.end(), 0);
    std::cout << "Sum: " << sum << std::endl;
    return 0;
}
```

```rs title="Rust"
fn main() {
    let arr = [1, 2, 3, 4, 5];
    let sum: i32 = arr.iter().sum();
    println!("Sum: {}", sum);
}
```

```go title="Go"
package main

import "fmt"

func main() {
    arr := []int{1, 2, 3, 4, 5}
    sum := 0
    for _, v := range arr {
        sum += v
    }
    fmt.Printf("Sum: %d\n", sum)
}
```
:::

## Using title to Customize Tab Names

You can customize the display name of a tab via the `title` attribute of a fenced code block:

:::code-tabs
```bash title="npm"
npm install lodash
```

```bash title="yarn"
yarn add lodash
```

```bash title="pnpm"
pnpm add lodash
```

```bash title="bun"
bun add lodash
```
:::

## Real-World Examples

### Example 1: HTTP Requests

:::code-tabs{default="ts"}
```js title="Fetch API"
fetch("https://api.example.com/users")
  .then((res) => res.json())
  .then((data) => console.log(data))
  .catch((err) => console.error(err));
```

```ts title="Axios"
import axios from "axios";

const { data } = await axios.get("https://api.example.com/users");
console.log(data);
```

```py title="Python requests"
import requests

res = requests.get("https://api.example.com/users")
print(res.json())
```

```go title="Go net/http"
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

func main() {
    resp, _ := http.Get("https://api.example.com/users")
    defer resp.Body.Close()
    var data interface{}
    json.NewDecoder(resp.Body).Decode(&data)
    fmt.Println(data)
}
```
:::

### Example 2: Reading Files

:::code-tabs{default="py"}
```py title="Python"
with open("data.txt", "r") as f:
    content = f.read()
    print(content)
```

```js title="Node.js"
import { readFile } from "node:fs/promises";

const content = await readFile("data.txt", "utf-8");
console.log(content);
```

```rs title="Rust"
use std::fs;

fn main() {
    let content = fs::read_to_string("data.txt")
        .expect("Failed to read file");
    println!("{}", content);
}
```

```go title="Go"
package main

import (
    "fmt"
    "os"
)

func main() {
    data, err := os.ReadFile("data.txt")
    if err != nil {
        panic(err)
    }
    fmt.Print(string(data))
}
```
:::

### Example 3: React / Vue / Svelte Component Comparison

:::code-tabs{default="tsx"}
```tsx title="React"
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <button onClick={() => setCount(count + 1)}>
      Clicked {count} times
    </button>
  );
}
```

```vue title="Vue"
<script setup lang="ts">
import { ref } from "vue";

const count = ref(0);
</script>

<template>
  <button @click="count++">
    Clicked {{ count }} times
  </button>
</template>
```

```svelte title="Svelte"
<script>
  let count = 0;
</script>

<button on:click={() => count++}>
  Clicked {count} times
</button>
```
:::

## Language Preference Memory

Code Tabs remembers your most recently selected language preference via the browser's `localStorage`. Once you've switched a tab, when you browse other articles, all Code Tabs containing that language on the page will automatically switch to the corresponding tab.

## Syntax Reference

```
:::code-tabs{default="language identifier"}
```language identifier title="display name"
code content
​```

```another language title="display name"
code content
​```
:::
```

- `default` — optional, specifies the language of the tab to activate by default
- `title` — optional, customizes the tab's display name (if not set, it is automatically mapped based on the language identifier)
- At least **2** fenced code blocks are required