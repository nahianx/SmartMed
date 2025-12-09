import Home from './page'
import { redirect } from 'next/navigation'

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}))

describe('Home page', () => {
  it('redirects to the login page', () => {
    Home()
    expect(redirect).toHaveBeenCalledWith('/auth/login')
  })
})
