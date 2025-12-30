import { AppointmentStatus, UserRole } from './index'

describe('types enums', () => {
  it('includes expected AppointmentStatus values', () => {
    expect(AppointmentStatus.PENDING).toBe('PENDING')
    expect(AppointmentStatus.ACCEPTED).toBe('ACCEPTED')
    expect(AppointmentStatus.REJECTED).toBe('REJECTED')
    expect(AppointmentStatus.SCHEDULED).toBe('SCHEDULED')
    expect(AppointmentStatus.CONFIRMED).toBe('CONFIRMED')
  })

  it('includes expected UserRole values', () => {
    expect(UserRole.ADMIN).toBe('ADMIN')
    expect(UserRole.DOCTOR).toBe('DOCTOR')
    expect(UserRole.PATIENT).toBe('PATIENT')
  })
})
