import { render, screen as testScreen, fireEvent } from '@testing-library/react'
import { Button } from './Button'

describe('Button component', () => {
  it('renders children and handles click', () => {
    const onClick = jest.fn()

    render(<Button onClick={onClick}>Click me</Button>)

    const button = testScreen.getByRole('button', { name: /click me/i })
    fireEvent.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
