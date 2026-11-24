import nextConfig from "eslint-config-next";
import jsxA11y from "eslint-plugin-jsx-a11y";

const config = [
  ...nextConfig,
  {
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      "react/no-danger": "error",
    },
  },
];

export default config;

