/**
 * Tests for settings data flow documentation
 * 
 * This test file validates the data flow patterns described in docs/settings-data-flow.md
 * by testing the key integration points between settings components.
 */

import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom";
import SettingsPage, {
  normalizeSettings,
  DEFAULT_SETTINGS,
  validateDisplayName,
  validateEmail,
} from "../app/settings/page";
import InlineEditRow from "../components/InlineEditRow";
import SettingsErrorBoundary from "../components/SettingsErrorBoundary";

describe("Settings Data Flow - Documentation Validation", () => {
  describe("1. Initial Load Phase - Normalization", () => {
    it("normalizes settings with missing fields to defaults", () => {
      const legacyData = { displayName: "Legacy User" };
      
      const normalized = normalizeSettings(legacyData);
      
      expect(normalized).toEqual({
        displayName: "Legacy User",
        email: DEFAULT_SETTINGS.email
      });
    });

    it("normalizes settings with invalid types to defaults", () => {
      const invalidData = { displayName: 123, email: null };
      
      const normalized = normalizeSettings(invalidData);
      
      expect(normalized).toEqual({
        displayName: DEFAULT_SETTINGS.displayName,
        email: DEFAULT_SETTINGS.email
      });
    });

    it("handles null/undefined input gracefully", () => {
      expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
      expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
      expect(normalizeSettings({})).toEqual(DEFAULT_SETTINGS);
    });

    it("ignores unknown fields in stored data", () => {
      const dataWithExtras = {
        displayName: "User",
        email: "user@example.com",
        unknownField: "should be ignored",
        anotherUnknown: 123
      };
      
      const normalized = normalizeSettings(dataWithExtras);
      
      expect(normalized).not.toHaveProperty("unknownField");
      expect(normalized).not.toHaveProperty("anotherUnknown");
      expect(normalized).toHaveProperty("displayName");
      expect(normalized).toHaveProperty("email");
    });
  });

  describe("2. Render Phase - Component Structure", () => {
    it("renders InlineEditRow for displayName field", () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText(/display name/i)).toBeInTheDocument();
      expect(screen.getByTestId("settings-display-name")).toBeInTheDocument();
    });

    it("renders InlineEditRow for email field", () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByTestId("settings-email")).toBeInTheDocument();
    });
  });

  describe("3. Edit Flow Phase - Validation", () => {
    it("enters edit mode when Edit button is clicked", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="test-field"
          label="Test Field"
          value="Initial Value"
          onSave={onSave}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit test field/i });
      fireEvent.click(editButton);

      expect(screen.getByRole("textbox")).toBeInTheDocument();
      expect(screen.getByRole("textbox")).toHaveValue("Initial Value");
    });

    it("validates displayName on every keystroke", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="display-name"
          label="Display Name"
          value="John Doe"
          validate={validateDisplayName}
          onSave={onSave}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit display name/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "A" } });

      expect(screen.getByText(/too short/i)).toBeInTheDocument();
      
      const saveButton = screen.getByRole("button", { name: /save display name/i });
      expect(saveButton).toBeDisabled();
    });

    it("validates email format correctly", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="email"
          label="Email"
          value="test@example.com"
          type="email"
          validate={validateEmail}
          onSave={onSave}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit email/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "invalid-email" } });

      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
      
      const saveButton = screen.getByRole("button", { name: /save email/i });
      expect(saveButton).toBeDisabled();
    });

    it("enables Save button when validation passes", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="display-name"
          label="Display Name"
          value="John Doe"
          validate={validateDisplayName}
          onSave={onSave}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit display name/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Valid Name" } });

      const saveButton = screen.getByRole("button", { name: /save display name/i });
      expect(saveButton).not.toBeDisabled();
    });

    it("shows validation error with role=alert", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="display-name"
          label="Display Name"
          value="John Doe"
          validate={validateDisplayName}
          onSave={onSave}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit display name/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "" } });

      const errorElement = screen.getByRole("alert");
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveAttribute("aria-live", "polite");
    });
  });

  describe("4. Save Flow Phase - Persistence", () => {
    it("calls onSave with trimmed value on save", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="test-field"
          label="Test Field"
          value="Initial"
          onSave={onSave}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit test field/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "  New Value  " } });

      const saveButton = screen.getByRole("button", { name: /save test field/i });
      fireEvent.click(saveButton);

      expect(onSave).toHaveBeenCalledWith("New Value");
    });

    it("announces save success via aria-live", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="test-field"
          label="Test Field"
          value="Initial"
          onSave={onSave}
          savedAnnouncement="{label} saved"
        />
      );

      const editButton = screen.getByRole("button", { name: /edit test field/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Value" } });

      const saveButton = screen.getByRole("button", { name: /save test field/i });
      fireEvent.click(saveButton);

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveTextContent(/test field saved/i);
    });

    it("returns focus to Edit button after save", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="test-field"
          label="Test Field"
          value="Initial"
          onSave={onSave}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit test field/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Value" } });

      const saveButton = screen.getByRole("button", { name: /save test field/i });
      fireEvent.click(saveButton);

      expect(editButton).toHaveFocus();
    });
  });

  describe("5. Error Handling Phase", () => {
    it("catches runtime errors and shows ErrorBanner", () => {
      const ThrowError = () => {
        throw new Error("Test error");
      };

      render(
        <SettingsErrorBoundary>
          <ThrowError />
        </SettingsErrorBoundary>
      );

      expect(screen.getByText(/unable to load settings/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
    });

    it("disables Save button during validation errors", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="display-name"
          label="Display Name"
          value="John Doe"
          validate={validateDisplayName}
          onSave={onSave}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit display name/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "" } });

      const saveButton = screen.getByRole("button", { name: /save display name/i });
      expect(saveButton).toBeDisabled();
    });

    it("announces cancellation via aria-live", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="test-field"
          label="Test Field"
          value="Initial"
          onSave={onSave}
          cancelledAnnouncement="{label} editing cancelled"
        />
      );

      const editButton = screen.getByRole("button", { name: /edit test field/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Changed Value" } });

      const cancelButton = screen.getByRole("button", { name: /cancel editing test field/i });
      fireEvent.click(cancelButton);

      const liveRegion = screen.getByRole("status");
      expect(liveRegion).toHaveTextContent(/test field editing cancelled/i);
    });
  });

  describe("Keyboard Interactions", () => {
    it("submits form on Enter key in input", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="test-field"
          label="Test Field"
          value="Initial"
          onSave={onSave}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit test field/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "New Value" } });
      fireEvent.submit(screen.getByRole("form"));

      expect(onSave).toHaveBeenCalledWith("New Value");
    });

    it("cancels edit on Escape key", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="test-field"
          label="Test Field"
          value="Initial"
          onSave={onSave}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit test field/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.change(input, { target: { value: "Changed Value" } });
      fireEvent.keyDown(input, { key: "Escape" });

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(onSave).not.toHaveBeenCalled();
    });

    it("returns focus to Edit button after Escape cancel", () => {
      const onSave = jest.fn();
      render(
        <InlineEditRow
          id="test-field"
          label="Test Field"
          value="Initial"
          onSave={onSave}
        />
      );

      const editButton = screen.getByRole("button", { name: /edit test field/i });
      fireEvent.click(editButton);

      const input = screen.getByRole("textbox");
      fireEvent.keyDown(input, { key: "Escape" });

      expect(editButton).toHaveFocus();
    });
  });

  describe("Validation Rules", () => {
    describe("validateDisplayName", () => {
      it("rejects empty values", () => {
        expect(validateDisplayName("")).toContain("required");
        expect(validateDisplayName("   ")).toContain("required");
      });

      it("rejects values shorter than 2 characters", () => {
        expect(validateDisplayName("A")).toContain("too short");
      });

      it("rejects values longer than 100 characters", () => {
        const longName = "A".repeat(101);
        expect(validateDisplayName(longName)).toContain("too long");
      });

      it("accepts valid display names", () => {
        expect(validateDisplayName("John Doe")).toBe(null);
        expect(validateDisplayName("A".repeat(100))).toBe(null);
      });
    });

    describe("validateEmail", () => {
      it("rejects empty values", () => {
        expect(validateEmail("")).toContain("required");
        expect(validateEmail("   ")).toContain("required");
      });

      it("rejects values longer than 254 characters", () => {
        const longEmail = "a".repeat(255) + "@example.com";
        expect(validateEmail(longEmail)).toContain("too long");
      });

      it("rejects invalid email formats", () => {
        expect(validateEmail("invalid")).toContain("invalid email");
        expect(validateEmail("invalid@")).toContain("invalid email");
        expect(validateEmail("@example.com")).toContain("invalid email");
        expect(validateEmail("test@.com")).toContain("invalid email");
      });

      it("accepts valid email addresses", () => {
        expect(validateEmail("test@example.com")).toBe(null);
        expect(validateEmail("user.name+tag@domain.co.uk")).toBe(null);
      });
    });
  });
});
