// Root eslint config for the workspace. Delegates to the UI package config.
// When lint-staged runs from the workspace root, it picks this up; the UI
// package's own config is also used when running eslint from its directory.
export { default } from './vendor/metacubexd/packages/ui/eslint.config.mjs'
