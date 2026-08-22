import { reportError, setReporter, resetReporter } from "./reportError";

describe("reportError", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    resetReporter();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("uses the default console sink and passes arguments", () => {
    const error = new Error("Test error");
    const context = { digest: "123" };

    reportError(error, context);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[ErrorReporter]", error, context);
  });

  it("scrubs sensitive keys in the default sink", () => {
    const error = new Error("Auth failed");
    const context = {
      userId: 42,
      password: "super-secret-password",
      token: "jwt-123",
    };

    reportError(error, context);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[ErrorReporter]", error, {
      userId: 42,
      password: "[REDACTED]",
      token: "[REDACTED]",
    });
  });

  it("allows injecting a custom reporter", () => {
    const customReporter = jest.fn();
    setReporter(customReporter);

    const error = new Error("Custom error");
    const context = { info: "test" };

    reportError(error, context);

    expect(customReporter).toHaveBeenCalledWith(error, context);
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("falls back to console.error if the injected reporter crashes", () => {
    const customReporter = jest.fn().mockImplementation(() => {
      throw new Error("Reporter failed");
    });
    setReporter(customReporter);

    const originalError = new Error("Original error");

    reportError(originalError, { test: 1 });

    expect(customReporter).toHaveBeenCalled();
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error reporter crashed:", expect.any(Error));
    expect(consoleErrorSpy).toHaveBeenCalledWith("Original error:", originalError);
  });

  it("handles null or missing context gracefully", () => {
    const error = new Error("No context");

    reportError(error, undefined);

    expect(consoleErrorSpy).toHaveBeenCalledWith("[ErrorReporter]", error, undefined);
  });
});
