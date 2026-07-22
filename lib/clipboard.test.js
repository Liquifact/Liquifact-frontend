import { copyToClipboard } from "./clipboard";

describe("copyToClipboard helper", () => {
  let originalClipboard;
  let originalExecCommand;

  beforeEach(() => {
    originalClipboard = navigator.clipboard;
    originalExecCommand = document.execCommand;
  });

  afterEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
      writable: true,
    });
    document.execCommand = originalExecCommand;
    jest.restoreAllMocks();
  });

  it("throws an error when provided empty or invalid text", async () => {
    await expect(copyToClipboard("")).rejects.toThrow("Invalid text provided for copying");
    await expect(copyToClipboard(null)).rejects.toThrow("Invalid text provided for copying");
    await expect(copyToClipboard(123)).rejects.toThrow("Invalid text provided for copying");
  });

  it("copies text using navigator.clipboard.writeText when available", async () => {
    const writeTextMock = jest.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });

    await copyToClipboard("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    expect(writeTextMock).toHaveBeenCalledWith("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
  });

  it("falls back to execCommand when navigator.clipboard.writeText rejects", async () => {
    const writeTextMock = jest.fn().mockRejectedValue(new Error("Permission denied"));
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    });
    const execCommandSpy = jest.fn().mockReturnValue(true);
    document.execCommand = execCommandSpy;

    await copyToClipboard("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    expect(writeTextMock).toHaveBeenCalledWith("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    expect(execCommandSpy).toHaveBeenCalledWith("copy");
  });

  it("falls back to execCommand when navigator.clipboard is undefined", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const execCommandSpy = jest.fn().mockReturnValue(true);
    document.execCommand = execCommandSpy;

    await copyToClipboard("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456");
    expect(execCommandSpy).toHaveBeenCalledWith("copy");
  });

  it("throws an error when execCommand returns false", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    const execCommandSpy = jest.fn().mockReturnValue(false);
    document.execCommand = execCommandSpy;

    await expect(copyToClipboard("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456")).rejects.toThrow(
      "document.execCommand('copy') returned false"
    );
  });

  it("throws an error when execCommand throws an exception", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: undefined,
      configurable: true,
      writable: true,
    });
    document.execCommand = jest.fn().mockImplementation(() => {
      throw new Error("execCommand not supported");
    });

    await expect(copyToClipboard("GABCDEFGHIJKLMNOPQRSTUVWXYZ123456")).rejects.toThrow(
      "execCommand not supported"
    );
  });
});
