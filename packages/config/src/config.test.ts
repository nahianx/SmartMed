import config from './index'

describe('config', () => {
  it('has default API URL and feature flags', () => {
    expect(config.api.url).toBe('http://localhost:4000')
    expect(config.api.timeout).toBeGreaterThan(0)

    expect(config.features.enableAppointments).toBe(true)
    expect(config.features.enablePrescriptions).toBe(true)
  })
})
