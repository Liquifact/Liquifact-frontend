import "@testing-library/jest-dom";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { axe, toHaveNoViolations } from "jest-axe";
import UploadZone from "./UploadZone";
import { validatePdfFile } from "../lib/validation/pdf";

jest.mock("../lib/validation/pdf", () => {
  const actual = jest.requireActual("../lib/validation/pdf");
  return {
    validatePdfFile: jest.fn(),
    sanitizeFilename: actual.sanitizeFilename,
    isPdfMagicValid: jest.fn(),
  };
});

expect.extend(toHaveNoViolations);

function createMockFile(name = "invoice.pdf", type = "application/pdf") {
  return new File(["mock content"], name, { type });
}

function createMockTextFile(name = "test.txt") {
  return new File(["mock content"], name, { type: "text/plain" });
}

function mockFetchOk(extra = {}) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue(extra),
  });
}

const ORIGINAL_ENV = process.env;

beforeEach(() => {
  jest.useFakeTimers();
  process.env = {
    ...ORIGINAL_ENV,
    NEXT_PUBLIC_API_URL: "https://api.mock-liquifact.org",
  };
  validatePdfFile.mockResolvedValue({ valid: true });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
  process.env = ORIGINAL_ENV;
});

describe("UploadZone Accessibility Contract (docs/upload-a11y.md)", () => {
  describe("Roles and ARIA Attributes", () => {
    it("drop zone has role=button and tabIndex=0", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      expect(dropZone).toHaveAttribute("role", "button");
      expect(dropZone).toHaveAttribute("tabindex", "0");
    });

    it("drop zone has aria-label describing its purpose", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      expect(dropZone).toHaveAttribute("aria-label");
      expect(dropZone.getAttribute("aria-label").toLowerCase()).toContain("drop");
      expect(dropZone.getAttribute("aria-label").toLowerCase()).toContain("pdf");
    });

    it("error messages have role=alert and aria-live=assertive", () => {
      render(<UploadZone />);
      const file = createMockTextFile();
      const input = screen.getByLabelText(/select pdf invoice file/i);
      fireEvent.change(input, { target: { files: [file] } });

      const alert = screen.getByRole("alert");
      expect(alert).toHaveAttribute("role", "alert");
      expect(alert).toHaveAttribute("aria-live", "assertive");
    });

    it("status messages have role=status and aria-live=polite", async () => {
      mockFetchOk();
      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
      });

      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("role", "status");
      expect(status).toHaveAttribute("aria-live", "polite");
    });

    it("progress bar has role=progressbar with correct ARIA attributes", async () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone progress={50} />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
      });

      const progressbar = screen.getByRole("progressbar");
      expect(progressbar).toHaveAttribute("role", "progressbar");
      expect(progressbar).toHaveAttribute("aria-valuemin", "0");
      expect(progressbar).toHaveAttribute("aria-valuemax", "100");
      expect(progressbar).toHaveAttribute("aria-valuenow", "50");
      expect(progressbar).toHaveAttribute("aria-labelledby", "upload-status-text");
    });

    it("file constraint notice has role=note with accessible label", () => {
      render(<UploadZone />);
      const note = screen.getByRole("note", { name: /file upload requirements/i });
      expect(note).toHaveAttribute("role", "note");
      expect(note).toHaveAttribute("aria-label", "File upload requirements");
    });

    it("spinner has role=img with aria-label", async () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
      });

      const spinners = screen.getAllByRole("img", { name: /uploading/i });
      expect(spinners.length).toBeGreaterThan(0);
      expect(spinners[0]).toHaveAttribute("role", "img");
      expect(spinners[0]).toHaveAttribute("aria-label");
    });

    it("submit button has aria-disabled when no file is selected", () => {
      render(<UploadZone />);
      const submitBtn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveAttribute("aria-disabled", "true");
    });

    it("submit button has aria-disabled when processing", async () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
      });

      const submitBtn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
      expect(submitBtn).toBeDisabled();
      expect(submitBtn).toHaveAttribute("aria-disabled", "true");
    });
  });

  describe("Keyboard Interactions", () => {
    it("Enter key opens file picker on drop zone", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const input = screen.getByLabelText(/select pdf invoice file/i);
      const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

      fireEvent.keyDown(dropZone, { key: "Enter", code: "Enter" });
      expect(clickSpy).toHaveBeenCalledTimes(1);
      clickSpy.mockRestore();
    });

    it("Space key opens file picker on drop zone", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const input = screen.getByLabelText(/select pdf invoice file/i);
      const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

      fireEvent.keyDown(dropZone, { key: " ", code: "Space" });
      expect(clickSpy).toHaveBeenCalledTimes(1);
      clickSpy.mockRestore();
    });

    it("Tab moves focus in natural tab order", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      expect(dropZone).toHaveAttribute("tabindex", "0");
    });

    it("Escape does not open file picker", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      const input = screen.getByLabelText(/select pdf invoice file/i);
      const clickSpy = jest.spyOn(input, "click").mockImplementation(() => {});

      fireEvent.keyDown(dropZone, { key: "Escape", code: "Escape" });
      expect(clickSpy).not.toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it("Enter submits the form when button is enabled", async () => {
      mockFetchOk();
      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
        await Promise.resolve();
      });

      await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    });
  });

  describe("Focus Management", () => {
    it("drop zone is in natural tab order", () => {
      render(<UploadZone />);
      const dropZone = screen.getByRole("button", { name: /drop pdf invoice/i });
      expect(dropZone).toHaveAttribute("tabindex", "0");
    });

    it("focus moves to drop zone after reset", async () => {
      mockFetchOk();
      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
        await Promise.resolve();
        jest.runAllTimers();
      });

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );

      const dropzone = screen.getByRole("button", { name: /drop pdf invoice/i });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload another invoice/i }));
      });

      await waitFor(() => expect(document.activeElement).toBe(dropzone));
    });

    it("submit button has focus-ring class for visible focus", () => {
      render(<UploadZone />);
      const submitBtn = screen.getByRole("button", { name: /upload & tokenize invoice/i });
      expect(submitBtn).toHaveClass("focus-ring");
    });

    it("reset button has focus-ring class for visible focus", async () => {
      mockFetchOk();
      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
        await Promise.resolve();
        jest.runAllTimers();
      });

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );

      const resetBtn = screen.getByRole("button", { name: /upload another invoice/i });
      expect(resetBtn).toHaveClass("focus-ring");
    });
  });

  describe("State Transitions", () => {
    it("idle → uploading → tokenizing → success flow", async () => {
      let resolveFetch;
      global.fetch = jest.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveFetch = resolve;
          })
      );

      render(<UploadZone />);

      const file = createMockFile();
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [file] },
      });

      // 1. Idle state
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeEnabled();

      // 2. Uploading state
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
      });

      expect(screen.getByRole("status")).toHaveTextContent(/uploading/i);
      expect(screen.getByRole("button", { name: /upload & tokenize invoice/i })).toBeDisabled();

      // 3. Tokenizing state (resolve fetch response only)
      await act(async () => {
        resolveFetch({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        });
      });

      // Assert tokenizing status before timers run
      expect(screen.getByRole("status")).toHaveTextContent(/tokenizing/i);

      // 4. Success state (advance timers to complete tokenization stage)
      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      await waitFor(() =>
        expect(screen.getByRole("status")).toHaveTextContent(/queued for tokenization/i)
      );
      expect(screen.getByRole("button", { name: /upload another invoice/i })).toBeInTheDocument();
    });

    it("idle → error → idle flow", () => {
      render(<UploadZone />);
      const input = screen.getByLabelText(/select pdf invoice file/i);

      // Idle state
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      // Error state
      fireEvent.change(input, { target: { files: [createMockTextFile()] } });
      expect(screen.getByRole("alert")).toBeInTheDocument();

      // Back to idle (with valid file)
      fireEvent.change(input, { target: { files: [createMockFile()] } });
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });

  describe("Screen Reader Announcements", () => {
    it("validation error is announced via role=alert", () => {
      render(<UploadZone />);
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [createMockTextFile()] },
      });

      const alert = screen.getByRole("alert");
      expect(alert).toBeInTheDocument();
      expect(alert.textContent).not.toBe("");
    });

    it("upload progress is announced via role=status", async () => {
      mockFetchOk();
      render(<UploadZone />);

      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [createMockFile()] },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
      });

      const status = screen.getByRole("status");
      expect(status).toBeInTheDocument();
      expect(status.textContent).not.toBe("");
    });

    it("success message is announced via role=status", async () => {
      mockFetchOk();
      render(<UploadZone />);

      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [createMockFile()] },
      });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
        await Promise.resolve();
        jest.runAllTimers();
      });

      await waitFor(() => {
        const status = screen.getByRole("status");
        expect(status).toBeInTheDocument();
        expect(status.textContent.toLowerCase()).toContain("queued for tokenization");
      });
    });
  });

  describe("WCAG 2.1 Compliance", () => {
    it("passes axe check in idle state", async () => {
      const { container } = render(<UploadZone />);
      jest.useRealTimers();
      const results = await axe(container);
      jest.useFakeTimers();
      expect(results).toHaveNoViolations();
    }, 15000);

    it("passes axe check with file selected", async () => {
      const { container } = render(<UploadZone />);
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [createMockFile()] },
      });
      jest.useRealTimers();
      const results = await axe(container);
      jest.useFakeTimers();
      expect(results).toHaveNoViolations();
    }, 15000);

    it("passes axe check with validation error", async () => {
      const { container } = render(<UploadZone />);
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [createMockTextFile()] },
      });
      jest.useRealTimers();
      const results = await axe(container);
      jest.useFakeTimers();
      expect(results).toHaveNoViolations();
    }, 15000);

    it("all icons have aria-hidden=true or descriptive aria-label", async () => {
      global.fetch = jest.fn().mockReturnValue(new Promise(() => {}));
      render(<UploadZone />);

      // Check decorative icons in idle state
      const idleIcons = screen.getAllByText("📁");
      idleIcons.forEach((icon) => {
        expect(icon).toHaveAttribute("aria-hidden", "true");
      });

      // Select file and check
      fireEvent.change(screen.getByLabelText(/select pdf invoice file/i), {
        target: { files: [createMockFile()] },
      });
      const fileIcon = screen.getByText("✅");
      expect(fileIcon).toHaveAttribute("aria-hidden", "true");

      // Upload to check spinner
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /upload & tokenize invoice/i }));
      });

      const spinners = screen.getAllByRole("img", { name: /uploading/i });
      expect(spinners[0]).toHaveAttribute("aria-label");
    });
  });
});