import { describe, expect, it } from "vitest";
import { createRequestVersion } from "./requestVersion";

describe("request version", () => {
  it("ignores stale responses after a newer request starts", () => {
    const requests = createRequestVersion();
    const oldRequest = requests.next();
    const currentRequest = requests.next();

    expect(requests.isCurrent(oldRequest)).toBe(false);
    expect(requests.isCurrent(currentRequest)).toBe(true);
  });

  it("invalidates pending responses when a view is cancelled or unmounted", () => {
    const requests = createRequestVersion();
    const pendingRequest = requests.next();
    requests.invalidate();

    expect(requests.isCurrent(pendingRequest)).toBe(false);
  });
});
