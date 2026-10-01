import AppleIcon, { size, contentType } from "../../app/apple-icon";
import { ImageResponse } from "next/og";

// Mock next/og
jest.mock("next/og", () => {
  return {
    ImageResponse: jest.fn().mockImplementation((element, options) => {
      return { element, options };
    }),
  };
});

describe("AppleIcon Validation Boundaries", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should enforce deterministic valid exports", () => {
    expect(contentType).toBe("image/png");
    expect(size.width).toBe(180);
    expect(size.height).toBe(180);
  });

  it("should process valid input correctly", () => {
    const result = AppleIcon() as any;
    expect(ImageResponse).toHaveBeenCalledTimes(1);
    expect(result.options.width).toBe(180);
    expect(result.options.height).toBe(180);
  });

  it("should handle adverse conditions deterministically (boundary/invalid sizes)", () => {
    const originalWidth = size.width;
    (size as any).width = -1;
    
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    
    const result = AppleIcon() as any;
    
    expect(consoleSpy).toHaveBeenCalledWith("Error generating apple-icon:", "Size dimensions out of bounds");
    
    expect(result.options.width).toBe(180);
    expect(result.options.height).toBe(180);
    
    consoleSpy.mockRestore();
    (size as any).width = originalWidth;
  });
});
