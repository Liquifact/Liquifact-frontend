import {
  ValidationMessages,
  errorId,
  helperId,
  fieldAriaProps,
  validateField,
  validateForm,
  isFormValid,
  toErrorList,
} from "./forms";

describe("ARIA id helpers", () => {
  it("derives stable error and helper ids", () => {
    expect(errorId("amount")).toBe("amount-error");
    expect(helperId("amount")).toBe("amount-helper");
  });

  it("omits aria-describedby entirely when there is nothing to describe", () => {
    const props = fieldAriaProps({ fieldId: "amount" });
    expect(props["aria-invalid"]).toBe("false");
    expect(props["aria-describedby"]).toBeUndefined();
  });

  it("references only the helper when there is no error", () => {
    const props = fieldAriaProps({ fieldId: "amount", hasHelper: true });
    expect(props["aria-invalid"]).toBe("false");
    expect(props["aria-describedby"]).toBe("amount-helper");
  });

  it("references both helper and error, helper first", () => {
    const props = fieldAriaProps({
      fieldId: "amount",
      hasHelper: true,
      error: "Bad",
    });
    expect(props["aria-invalid"]).toBe("true");
    expect(props["aria-describedby"]).toBe("amount-helper amount-error");
  });

  it("references only the error when there is no helper", () => {
    const props = fieldAriaProps({ fieldId: "amount", error: "Bad" });
    expect(props["aria-describedby"]).toBe("amount-error");
  });
});

describe("validateField - required", () => {
  it("reports empty required values", () => {
    expect(validateField("", { required: true, label: "Amount" })).toBe("Amount is required.");
    expect(validateField("   ", { required: true, label: "Amount" })).toBe("Amount is required.");
    expect(validateField(null, { required: true, label: "Amount" })).toBe("Amount is required.");
    expect(validateField(undefined, { required: true, label: "Amount" })).toBe(
      "Amount is required."
    );
  });

  it("treats an empty optional field as valid", () => {
    expect(validateField("", { label: "Amount" })).toBeNull();
  });

  it("does not run other rules on an empty optional field", () => {
    // Without the early return this would wrongly report "must be a number".
    expect(validateField("", { min: 1, label: "Amount" })).toBeNull();
  });

  it("falls back to a generic label", () => {
    expect(validateField("", { required: true })).toBe("This field is required.");
  });

  it("accepts zero as a present value", () => {
    expect(validateField(0, { required: true, label: "Amount" })).toBeNull();
  });
});

describe("validateField - length", () => {
  it("enforces minLength", () => {
    expect(validateField("ab", { minLength: 3, label: "Name" })).toBe(
      "Name must be at least 3 characters."
    );
  });

  it("enforces maxLength", () => {
    expect(validateField("abcd", { maxLength: 3, label: "Name" })).toBe(
      "Name must be 3 characters or fewer."
    );
  });

  it("accepts values on the boundary", () => {
    expect(validateField("abc", { minLength: 3, maxLength: 3, label: "Name" })).toBeNull();
  });
});

describe("validateField - numeric range", () => {
  it("rejects non-numeric input when a range is configured", () => {
    expect(validateField("abc", { min: 0, label: "Yield" })).toBe("Yield must be a number.");
  });

  it("enforces min", () => {
    expect(validateField("4", { min: 5, label: "Yield" })).toBe("Yield must be 5 or more.");
  });

  it("enforces max", () => {
    expect(validateField("11", { max: 10, label: "Yield" })).toBe("Yield must be 10 or less.");
  });

  it("accepts values inside and on the range", () => {
    expect(validateField("5", { min: 5, max: 10, label: "Yield" })).toBeNull();
    expect(validateField(10, { min: 5, max: 10, label: "Yield" })).toBeNull();
  });

  it("handles numeric values that are already numbers", () => {
    expect(validateField(3, { min: 5, label: "Yield" })).toBe("Yield must be 5 or more.");
  });
});

describe("validateField - pattern and custom", () => {
  it("enforces a pattern", () => {
    expect(validateField("nope", { pattern: /^\d+$/, label: "Reference" })).toBe(
      "Reference is not in the expected format."
    );
  });

  it("accepts a matching pattern", () => {
    expect(validateField("123", { pattern: /^\d+$/ })).toBeNull();
  });

  it("runs a custom validator last", () => {
    const rules = {
      label: "Amount",
      validate: (value) => (value === "7" ? "Seven is not allowed." : null),
    };
    expect(validateField("7", rules)).toBe("Seven is not allowed.");
    expect(validateField("8", rules)).toBeNull();
  });

  it("prefers the built-in message over the custom validator", () => {
    const rules = {
      label: "Amount",
      min: 10,
      validate: () => "custom",
    };
    expect(validateField("1", rules)).toBe("Amount must be 10 or more.");
  });

  it("treats a missing rule set as always valid", () => {
    expect(validateField("anything")).toBeNull();
  });
});

describe("validateForm", () => {
  const schema = {
    name: { required: true, label: "Name" },
    yield: { min: 0, max: 100, label: "Yield" },
  };

  it("returns no errors for a valid form", () => {
    const result = validateForm({ name: "Acme", yield: "8.5" }, schema);
    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.firstErrorField).toBeNull();
  });

  it("collects every failing field", () => {
    const result = validateForm({ name: "", yield: "120" }, schema);
    expect(result.isValid).toBe(false);
    expect(result.errors.name).toBe("Name is required.");
    expect(result.errors.yield).toBe("Yield must be 100 or less.");
  });

  it("reports the first failing field so focus can be moved there", () => {
    const result = validateForm({ name: "", yield: "120" }, schema);
    expect(result.firstErrorField).toBe("name");
  });

  it("ignores values with no matching schema entry", () => {
    const result = validateForm({ name: "Acme", stray: "" }, schema);
    expect(result.isValid).toBe(true);
  });

  it("defaults to an empty valid result", () => {
    expect(validateForm()).toEqual({
      errors: {},
      isValid: true,
      firstErrorField: null,
    });
  });
});

describe("isFormValid", () => {
  it("treats missing or empty error maps as valid", () => {
    expect(isFormValid(null)).toBe(true);
    expect(isFormValid(undefined)).toBe(true);
    expect(isFormValid({})).toBe(true);
  });

  it("treats cleared errors as valid", () => {
    expect(isFormValid({ name: null, yield: undefined })).toBe(true);
  });

  it("detects an active error", () => {
    expect(isFormValid({ name: "Name is required." })).toBe(false);
  });
});

describe("toErrorList", () => {
  it("returns an empty list when there is nothing to show", () => {
    expect(toErrorList(null)).toEqual([]);
    expect(toErrorList({})).toEqual([]);
  });

  it("omits cleared entries", () => {
    expect(toErrorList({ name: null, yield: "Bad" })).toEqual([{ field: "yield", message: "Bad" }]);
  });
});

describe("ValidationMessages", () => {
  it("builds each message with the field label", () => {
    expect(ValidationMessages.required("A")).toBe("A is required.");
    expect(ValidationMessages.minLength("A", 2)).toBe("A must be at least 2 characters.");
    expect(ValidationMessages.maxLength("A", 2)).toBe("A must be 2 characters or fewer.");
    expect(ValidationMessages.min("A", 2)).toBe("A must be 2 or more.");
    expect(ValidationMessages.max("A", 2)).toBe("A must be 2 or less.");
    expect(ValidationMessages.number("A")).toBe("A must be a number.");
    expect(ValidationMessages.pattern("A")).toBe("A is not in the expected format.");
  });
});
