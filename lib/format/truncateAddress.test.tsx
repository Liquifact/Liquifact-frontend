import { truncateAddress } from "@/lib/format/truncateAddress";

describe("truncateAddress - Table Driven Tests", () => {
  describe("normal truncation", () => {
    it.each([
      // [address, headLen?, tailLen?, expected]
      // Default headLen=6, tailLen=4
      {
        address: "GABCDE1234567890XYZ9",
        headLen: undefined,
        tailLen: undefined,
        expected: "GABCDE…XYZ9",
      },
      // Custom head/tail lengths
      {
        address: "GABCDE1234567890XYZ9",
        headLen: 4,
        tailLen: 4,
        expected: "GABC…XYZ9",
      },
      // Minimal truncation — one character over threshold (6+4+1+1 = 12) triggers truncation
      {
        address: "GABCDE123456",
        headLen: 6,
        tailLen: 4,
        expected: "GABCDE…3456",
      },
    ])("truncates '$address' correctly", ({ address, headLen, tailLen, expected }) => {
      const result =
        headLen !== undefined && tailLen !== undefined
          ? truncateAddress(address, headLen, tailLen)
          : truncateAddress(address);
      expect(result).toBe(expected);
    });
  });

  describe("addresses that should not be truncated", () => {
    it.each([
      // Exactly headLen + tailLen + 1 = 11 characters → no truncation
      { address: "ABCDE123456" }, // length 11 → 6+4+1 = 11
      // Shorter than threshold
      { address: "SHORT" },
      { address: "ABCDE1234" }, // length 9 < 11
      { address: "GABCDE78901" }, // length 11 — exactly at boundary
    ])("returns '$address' unchanged", ({ address }) => {
      expect(truncateAddress(address)).toBe(address);
    });
  });

  describe("edge cases — invalid and empty inputs", () => {
    it("returns empty string for empty string input", () => {
      expect(truncateAddress("")).toBe("");
    });

    it("returns empty string for null input", () => {
      expect(truncateAddress(null as unknown as string)).toBe("");
    });

    it("returns empty string for undefined input", () => {
      expect(truncateAddress(undefined as unknown as string)).toBe("");
    });

    it("returns empty string for numeric input", () => {
      expect(truncateAddress(12345 as unknown as string)).toBe("");
    });

    it("returns empty string for object input", () => {
      expect(truncateAddress({} as unknown as string)).toBe("");
    });
  });

  describe("ellipsis character", () => {
    it("uses the single Unicode ellipsis character (…), not three dots (...)", () => {
      const result = truncateAddress("GABCDE1234567890XYZ9");
      expect(result).toContain("…");
      expect(result).not.toContain("...");
    });
  });

  describe("head and tail content", () => {
    it("preserves the first headLen characters", () => {
      const address = "GABCDE1234567890XYZ9";
      const result = truncateAddress(address, 6, 4);
      expect(result.startsWith("GABCDE")).toBe(true);
    });

    it("preserves the last tailLen characters", () => {
      const address = "GABCDE1234567890XYZ9";
      const result = truncateAddress(address, 6, 4);
      expect(result.endsWith("XYZ9")).toBe(true);
    });
  });

  describe("custom head/tail lengths", () => {
    it("supports headLen=1 and tailLen=1", () => {
      const address = "ABCDEF"; // length 6 > 1+1+1=3
      expect(truncateAddress(address, 1, 1)).toBe("A…F");
    });

    it("supports long head and short tail", () => {
      const address = "GABCDEFGHIJ1234567890";
      expect(truncateAddress(address, 10, 2)).toBe("GABCDEFGHI…90");
    });

    it("does not truncate when address length equals headLen + tailLen + 1", () => {
      // Exactly boundary: length = 6+4+1 = 11
      const address = "12345678901"; // length 11
      expect(truncateAddress(address, 6, 4)).toBe("12345678901");
    });

    it("truncates when address length exceeds headLen + tailLen + 1 by 1", () => {
      // One character over boundary: length = 6+4+1+1 = 12
      const address = "123456789012"; // length 12
      expect(truncateAddress(address, 6, 4)).toBe("123456…9012");
    });
  });
});
