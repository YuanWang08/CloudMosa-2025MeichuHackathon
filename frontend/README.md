# Frontend

此前端已預設：

- 使用 Tailwind CSS v4 via Vite 外掛
- index.html 以灰底置中顯示 240x320 App 視窗
- `App.vue` 內建立固定 240x320 的應用視窗容器，方便日後以 flex column 填入頁面

開發：

```
npm run dev
```

建置：

```
npm run build
npm run preview
```

備註：如果要支援 128x160，可在 `App.vue` 中以條件 class 或路由層級切換不同 viewport 尺寸。

# frontend

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VSCode](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) to make the TypeScript language service aware of `.vue` types.

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Type-Check, Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```
