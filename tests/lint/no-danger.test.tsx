/**
 * @jest-environment node
 */
import { Linter } from "eslint";
import reactPlugin from "eslint-plugin-react";

const linter = new Linter({ configType: "flat" });

function lint(code) {
  return linter.verify(code, {
    plugins: { react: reactPlugin },
    rules: { "react/no-danger": "error" },
    languageOptions: {
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  });
}

describe("react/no-danger", () => {
  it("flags dangerouslySetInnerHTML", () => {
    const messages = lint('<div dangerouslySetInnerHTML={{ __html: "<p>unsafe</p>" }} />');
    expect(messages).toHaveLength(1);
    expect(messages[0].ruleId).toBe("react/no-danger");
  });

  it("flags dangerouslySetInnerHTML in nested elements", () => {
    const messages = lint(
      '<section><article dangerouslySetInnerHTML={{ __html: "content" }} /></section>'
    );
    expect(messages).toHaveLength(1);
  });

  it("flags multiple dangerouslySetInnerHTML usages", () => {
    const messages = lint(
      '<><div dangerouslySetInnerHTML={{ __html: "a" }} /><div dangerouslySetInnerHTML={{ __html: "b" }} /></>'
    );
    expect(messages).toHaveLength(2);
    messages.forEach((m) => expect(m.ruleId).toBe("react/no-danger"));
  });

  it("flags dangerouslySetInnerHTML on self-closing elements", () => {
    const messages = lint('<span dangerouslySetInnerHTML={{ __html: "x" }} />');
    expect(messages).toHaveLength(1);
  });

  it("flags dangerouslySetInnerHTML with children present", () => {
    const messages = lint('<div dangerouslySetInnerHTML={{ __html: "x" }}>text</div>');
    expect(messages).toHaveLength(1);
  });

  it("does not flag clean JSX", () => {
    const messages = lint("<div>Safe content</div>");
    expect(messages).toHaveLength(0);
  });

  it("does not flag dynamic expressions", () => {
    const messages = lint("<div>{content}</div>");
    expect(messages).toHaveLength(0);
  });

  it("provides accurate error location", () => {
    const messages = lint('<div dangerouslySetInnerHTML={{ __html: "x" }} />');
    expect(messages[0].line).toBe(1);
    expect(messages[0].column).toBe(6);
  });

  it("produces the expected error message", () => {
    const messages = lint('<div dangerouslySetInnerHTML={{ __html: "x" }} />');
    expect(messages[0].message).toBe("Dangerous property 'dangerouslySetInnerHTML' found");
  });
});
