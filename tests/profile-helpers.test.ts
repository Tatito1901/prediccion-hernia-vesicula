import { describe, it, expect } from "vitest";
import { getInitials, formatRole } from "@/components/profile/profile-card";

describe("profile helpers", () => {
  it("getInitials returns first letters of up to two names", () => {
    expect(getInitials("Juan Pérez")).toBe("JP");
    expect(getInitials("María Fernanda López")).toBe("MF");
    expect(getInitials("  Ana   ")).toBe("A");
    expect(getInitials(null as any)).toBe("?");
  });

  it("formatRole maps known roles to labels", () => {
    expect(formatRole("admin")).toBe("Administrador");
    expect(formatRole("doctor")).toBe("Doctor");
    expect(formatRole("asistente")).toBe("Asistente");
    expect(formatRole(undefined as any)).toBe("Sin rol");
    expect(formatRole("otro" as any)).toBe("otro");
  });
});
