import { describe, expect, it } from "vitest";
import { isValidHttpUrl } from "./validation";

describe("isValidHttpUrl", () => {
  it.each(["https://careermatch.ai", "http://example.com/jobs"])("accepts %s", (value) => {
    expect(isValidHttpUrl(value)).toBe(true);
  });

  it.each(["", "careermatch.ai", "javascript:alert(1)", "https://", "ftp://example.com"])("rejects %s", (value) => {
    expect(isValidHttpUrl(value)).toBe(false);
  });
});
