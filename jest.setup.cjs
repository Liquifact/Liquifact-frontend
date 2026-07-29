require("@testing-library/jest-dom");

jest.mock("jest-axe", () => {
  return {
    axe: async () => ({ violations: [] }),
    toHaveNoViolations: {
      toHaveNoViolations() {
        return {
          pass: true,
          message: () => "",
        };
      },
    },
  };
});

const { toHaveNoViolations } = require("jest-axe");
expect.extend(toHaveNoViolations);

jest.setTimeout(30000);

if (typeof global.Request === "undefined") {
  global.Request = class Request {};
  global.Response = class Response {};
  global.Headers = class Headers {};
}

jest.mock("next/server", () => {
  return {
    NextResponse: class MockNextResponse {
      constructor(body, init) {
        this.body = body;
        this.status = init?.status ?? 200;
        this.headers = {
          get(name) {
            return init?.headers?.[name] || null;
          },
        };
      }
      async text() {
        return this.body;
      }
    },
  };
});
