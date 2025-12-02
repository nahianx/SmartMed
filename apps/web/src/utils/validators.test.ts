import { validateEmailFormat, validateName, validatePasswordBasic } from "./validators"

describe("validators", () => {
  it("validates email format", () => {
    expect(validateEmailFormat("user@example.com")).toBe(true)
    expect(validateEmailFormat("bad-email")).toBe(false)
  })

  it("validates name", () => {
    expect(validateName("John Doe")).toBe(true)
    expect(validateName("J")).toBe(false)
    expect(validateName("John123")).toBe(false)
  })

  it("validates password rules", () => {
    expect(validatePasswordBasic("Aa1!aaaa").valid).toBe(true)
    expect(validatePasswordBasic("short").valid).toBe(false)
    expect(validatePasswordBasic("alllowercase1!").valid).toBe(false)
  })
})
