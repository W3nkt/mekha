import { describe, expect, it } from "vitest";
import { buildChecklistSteps } from "./dashboard";

describe("buildChecklistSteps", () => {
  it("marks only the completed steps as done", () => {
    const steps = buildChecklistSteps({
      profile_created: true,
      verification_submitted: true,
      verification_approved: false,
      first_order_created: false,
    });

    expect(steps.map((step) => [step.key, step.done])).toEqual([
      ["profile_created", true],
      ["verification_submitted", true],
      ["verification_approved", false],
      ["first_order_created", false],
    ]);
  });

  it("links the verification step's call to action to the upload page", () => {
    const steps = buildChecklistSteps({
      profile_created: true,
      verification_submitted: false,
      verification_approved: false,
      first_order_created: false,
    });

    expect(steps.find((step) => step.key === "verification_submitted")?.cta).toEqual(
      { label: "ສົ່ງດຽວນີ້", to: "/seller/verify" },
    );
    expect(steps.find((step) => step.key === "profile_created")?.cta).toBeUndefined();
  });
});
