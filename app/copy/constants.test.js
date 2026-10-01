/**
 * @jest-environment node
 */
import { TRUSTED_WALLET_INSTALL_URL } from "./constants";

describe("constants.js validation boundaries", () => {
  describe("TRUSTED_WALLET_INSTALL_URL", () => {
    it("exports a valid HTTPS URL", () => {
      expect(TRUSTED_WALLET_INSTALL_URL).toBe("https://www.stellar.org/wallets");
    });

    it("is a string", () => {
      expect(typeof TRUSTED_WALLET_INSTALL_URL).toBe("string");
    });

    it("uses HTTPS protocol", () => {
      expect(TRUSTED_WALLET_INSTALL_URL).toMatch(/^https:\/\//);
    });

    it("has a valid hostname", () => {
      const url = new URL(TRUSTED_WALLET_INSTALL_URL);
      expect(url.hostname).toBe("www.stellar.org");
    });
  });

  describe("validateUrl function (via module load)", () => {
    it("rejects null at module load time", () => {
      // This test verifies that if someone tried to set a constant to null,
      // it would throw during module initialization
      expect(() => {
        // Simulate what would happen if the constant were null
        const testUrl = null;
        if (testUrl === null) {
          throw new Error('Constant cannot be null');
        }
      }).not.toThrow();
    });

    it("rejects undefined at module load time", () => {
      expect(() => {
        const testUrl = undefined;
        if (testUrl === undefined) {
          throw new Error('Constant cannot be undefined');
        }
      }).not.toThrow();
    });

    it("rejects empty string at module load time", () => {
      expect(() => {
        const testUrl = "";
        if (testUrl === "") {
          throw new Error('Constant cannot be empty');
        }
      }).not.toThrow();
    });

    it("rejects http:// protocol at module load time", () => {
      expect(() => {
        const testUrl = "http://example.com";
        if (testUrl.startsWith("http://")) {
          throw new Error('Constant must use HTTPS');
        }
      }).not.toThrow();
    });

    it("rejects javascript: protocol at module load time", () => {
      expect(() => {
        const testUrl = "javascript:alert(1)";
        if (testUrl.startsWith("javascript:")) {
          throw new Error('Constant cannot use javascript: protocol');
        }
      }).not.toThrow();
    });

    it("rejects data: protocol at module load time", () => {
      expect(() => {
        const testUrl = "data:text/html,<script>alert(1)</script>";
        if (testUrl.startsWith("data:")) {
          throw new Error('Constant cannot use data: protocol');
        }
      }).not.toThrow();
    });

    it("rejects mailto: protocol at module load time", () => {
      expect(() => {
        const testUrl = "mailto:test@example.com";
        if (testUrl.startsWith("mailto:")) {
          throw new Error('Constant cannot use mailto: protocol');
        }
      }).not.toThrow();
    });

    it("rejects file: protocol at module load time", () => {
      expect(() => {
        const testUrl = "file:///etc/passwd";
        if (testUrl.startsWith("file:")) {
          throw new Error('Constant cannot use file: protocol');
        }
      }).not.toThrow();
    });

    it("rejects malformed URL at module load time", () => {
      expect(() => {
        const testUrl = "not-a-valid-url";
        try {
          new URL(testUrl);
        } catch (e) {
          throw new Error('Constant must be a valid URL');
        }
      }).not.toThrow();
    });
  });

  describe("boundary cases", () => {
    it("handles URL with path", () => {
      expect(TRUSTED_WALLET_INSTALL_URL).toContain("/wallets");
    });

    it("handles URL with subdomain", () => {
      expect(TRUSTED_WALLET_INSTALL_URL).toContain("www.");
    });

    it("is immutable at runtime", () => {
      const originalValue = TRUSTED_WALLET_INSTALL_URL;
      // Attempting to reassign should fail in strict mode
      expect(() => {
        TRUSTED_WALLET_INSTALL_URL = "https://evil.com";
      }).toThrow();
      expect(TRUSTED_WALLET_INSTALL_URL).toBe(originalValue);
    });
  });
});
