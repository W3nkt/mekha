import { describe, expect, it } from "vitest";
import { getVerification } from "./seller-profile";

describe("seller profile verification presentation", () => {
  it("maps verified sellers to the green state", () => {
    expect(getVerification("verified").tone).toBe("verified");
  });

  it("maps pending verification to the partial state", () => {
    expect(getVerification("pending").tone).toBe("partial");
  });

  it("maps unverified and rejected sellers to the neutral state", () => {
    expect(getVerification("unverified").tone).toBe("unverified");
    expect(getVerification("rejected").tone).toBe("unverified");
  });
});
