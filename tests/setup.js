import '@testing-library/jest-dom'
import { vi } from 'vitest'

Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '/', assign: vi.fn() },
})

window.open = vi.fn()
window.Razorpay = vi.fn().mockImplementation(() => ({ open: vi.fn() }))
console.error = vi.fn()
