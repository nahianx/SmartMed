import { render, screen } from '@testing-library/react'
import Home from './page'

describe('Home page', () => {
  it('renders the SmartMed heading', () => {
    render(<Home />)
    expect(screen.getByRole('heading', { name: /smartmed/i })).toBeInTheDocument()
  })
})
