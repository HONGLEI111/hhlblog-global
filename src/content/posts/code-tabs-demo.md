---
title: Code Tabs 多语言代码选项卡使用指南
published: 2026-08-10
description: 使用 :::code-tabs 指令在博文中展示多语言版本的代码示例，支持选项卡切换和语言偏好记忆。
tags: [Demo, Markdown]
category: 示例
draft: false
---

HHLBlog 新增了 **Code Tabs** 功能，可以在一个代码块中同时展示多种编程语言的实现，读者通过选项卡自由切换。特别适合技术博文中需要对比不同语言/框架写法的场景。

## 快速开始

使用 `:::code-tabs` 容器指令包裹多个 fenced code block，每个 code block 的语言会被自动识别并显示为选项卡标签：

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

语法非常简单 —— 就像平时写 fenced code block 一样，只是用 `:::code-tabs` 把它们包起来。

## 指定默认语言

使用 `default` 属性可以预设默认显示的选项卡：

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

## 使用 title 自定义标签名

通过 fenced code block 的 `title` 属性可以自定义选项卡的显示名称：

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

## 实际场景示例

### 场景一：HTTP 请求

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

### 场景二：读取文件

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

### 场景三：React / Vue / Svelte 组件对比

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

## 语言偏好记忆

Code Tabs 会通过浏览器的 `localStorage` 记住你最近选择的语言偏好。当你切换过某个选项卡后，浏览其他文章时，页面中所有包含该语言的 Code Tabs 都会自动切换到对应标签页。

## 语法参考

```
:::code-tabs{default="语言标识"}
​```语言标识 title="显示名称"
代码内容
​```

​```另一个语言 title="显示名称"
代码内容
​```
:::
```

- `default` — 可选，指定默认激活的选项卡语言
- `title` — 可选，自定义选项卡的显示名称（不设置则自动根据语言标识映射）
- 至少需要 **2 个** fenced code block
