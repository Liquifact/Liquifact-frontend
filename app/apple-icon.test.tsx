import React from "react";
import AppleIcon, { size, contentType, runtime } from "./apple-icon";
import { ImageResponse } from "next/og";

// Mock next/og ImageResponse to track invocations and simulate boundary conditions
jest.mock("next/og", () => {
  return {
    ImageResponse: jest.fn().mockImplementation((element, options) => {
      return {
        element,
        options,
        status: 200,
        headers: new Headers({ "content-type": "image/png" }),
      };
    }),
  };
});

describe("app/apple-icon route invariants and concurrent execution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("route metadata invariants", () => {
    it("exports edge runtime", () => {
      expect(runtime).toBe("edge");
    });

    it("exports standard PNG content type", () => {
      expect(contentType).toBe("image/png");
    });

    it("exports frozen 180x180 size configuration", () => {
      expect(size).toEqual({ width: 180, height: 180 });
      expect(Object.isFrozen(size)).toBe(true);
    });

    it("prevents direct mutation of route size metadata", () => {
      expect(() => {
        // @ts-expect-error - testing runtime freeze invariant
        size.width = 512;
      }).toThrow();
      expect(size.width).toBe(180);
    });
  });

  describe("AppleIcon execution and rendering", () => {
    it("renders a valid ImageResponse on standard invocation", () => {
      const response = AppleIcon();
      expect(response).toBeDefined();
      expect(ImageResponse).toHaveBeenCalledTimes(1);
      expect(ImageResponse).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ width: 180, height: 180 })
      );
    });

    it("handles heavy concurrent execution deterministically without race conditions", async () => {
      const CONCURRENT_REQUESTS = 64;
      const executions = Array.from({ length: CONCURRENT_REQUESTS }, () =>
        Promise.resolve().then(() => AppleIcon())
      );

      const results = await Promise.all(executions);

      expect(results).toHaveLength(CONCURRENT_REQUESTS);
      expect(ImageResponse).toHaveBeenCalledTimes(CONCURRENT_REQUESTS);

      // Verify each execution produced independent, deterministic responses
      results.forEach((res) => {
        expect(res).toBeDefined();
        // @ts-expect-error - mock inspection
        expect(res.options).toEqual({ width: 180, height: 180 });
      });
    });

    it("recovers deterministically when ImageResponse throws on initial render", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      let callCount = 0;
      (ImageResponse as unknown as jest.Mock).mockImplementationOnce(() => {
        callCount++;
        throw new Error("Simulated Next.js edge rendering failure");
      });

      const response = AppleIcon();

      expect(response).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[apple-icon] Failed to generate icon:")
      );
      // First attempt threw, second attempt generated the fallback
      expect(ImageResponse).toHaveBeenCalledTimes(2);

      consoleErrorSpy.mockRestore();
    });

    it("safely handles non-Error exception types without leaking internals", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      (ImageResponse as unknown as jest.Mock).mockImplementationOnce(() => {
        throw "String exception";
      });

      const response = AppleIcon();

      expect(response).toBeDefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[apple-icon] Failed to generate icon: Unknown error"
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
