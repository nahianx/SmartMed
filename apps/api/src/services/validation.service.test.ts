import { ValidationService } from "./validation.service"

describe("ValidationService", () => {
  it("validates emails", () => {
    expect(() => ValidationService.validateEmail("user@example.com")).not.toThrow()
    expect(() => ValidationService.validateEmail("bad-email")).toThrow("INVALID_EMAIL")
  })

  it("validates names", () => {
    expect(() => ValidationService.validateName("John Doe")).not.toThrow()
    expect(() => ValidationService.validateName("J")).toThrow("INVALID_NAME")
    expect(() => ValidationService.validateName("John123")).toThrow("INVALID_NAME")
  })

  it("validates password rules", () => {
    expect(() => ValidationService.validatePassword("Aa1!aaaa")).not.toThrow()
    expect(() => ValidationService.validatePassword("short")).toThrow("WEAK_PASSWORD")
  })
})
