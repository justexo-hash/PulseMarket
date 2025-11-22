/**
 * @type {import('eslint').Linter.Config}
 */
module.exports = {
  root: true,
  extends: ["next/core-web-vitals"],
  ignorePatterns: [
    "node_modules/",
    "dist/",
    "build/",
    ".next/",
    "client/dist/",
  ],
  rules: {},
};

