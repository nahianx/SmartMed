import { getPasswordStrength } from "./passwordStrength"

describe("getPasswordStrength", () => {
  it("returns weak for short/simple passwords", () => {
    expect(getPasswordStrength("abc")).toBe("weak")
    expect(getPasswordStrength("password")).toBe("weak")
  })

  it("returns medium for moderately complex passwords", () => {
    expect(getPasswordStrength("Password1"));
  })

  it("returns strong for long complex passwords", () => {
    expect(getPasswordStrength("Str0ng!Passw0rd"));
  })
})
