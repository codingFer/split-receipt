import js from "@eslint/js";
import ts from "typescript-eslint";
import reactPlugin from "eslint-plugin-react";
import htmlPlugin from "eslint-plugin-html";
import nextPlugin from "@next/eslint-plugin-next";
import prettier from "eslint-config-prettier";

export default [
  prettier,
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "dist/**",
      "build/**",
    ],
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  {
    plugins: {
      react: reactPlugin,
      "@next/next": nextPlugin,
      html: htmlPlugin
    },
    files: ["**/*.{js,jsx,ts,tsx,html}"],
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@next/next/no-img-element": "warn"
    },
    settings: {
      react: {
        version: "detect"
      }
    }
  }
];
