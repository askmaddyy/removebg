import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored copy-you-own components pulled from external registries. They're
    // upstream code, not ours to restyle — linting them is pure noise.
    "components/DomeGallery.tsx",
    "components/LiquidEther.tsx",
    "components/MorphSlider.tsx",
    "components/block/**",
    "lib/effects/**",
  ]),
]);

export default eslintConfig;
