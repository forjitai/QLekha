import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock window.location
Object.defineProperty(window, 'location', {
  writable: true,
  value: { href: '/', assign: vi.fn() },
})

// Mock window.open (WhatsApp links)
window.open = vi.fn()

// Mock window.Razorpay
window.Razorpay = vi.fn().mockImplementation(() => ({
  open: vi.fn(),
}))

// Suppress console errors in tests
console.error = vi.fn()
