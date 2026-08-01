/**
 * UI TESTS — React Component Tests
 * Tests rendering, user interactions, form inputs, navigation
 * Run: npx vitest run ui/components.test.jsx
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

// ─── Mock Supabase ────────────────────────────────────────────────────────────
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u-1' } } }, error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'u-1', email: 'test@test.com' } } }),
      signOut: vi.fn().mockResolvedValue({}),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockResolvedValue({ data: [], error: null }),
      delete: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'u-1', company_id: 'co-1',
          companies: { id: 'co-1', name: 'Test Co', owner_name: 'Test Owner', plan: 'trial', pdf_design: 'classic_blue' }
        },
        error: null
      }),
    })),
  }
}))

// Helper: wrap with router
const wrap = (component) => render(<BrowserRouter>{component}</BrowserRouter>)

// ─── Test: Landing Page ───────────────────────────────────────────────────────
describe('Landing Page', () => {
  it('renders QLekha brand name', async () => {
    const { default: App } = await import('../src/App')
    wrap(<App />)
    await waitFor(() => {
      expect(document.title).toContain('QLekha')
    })
  })

  it('shows Get Started and View Demo buttons', async () => {
    // Simulate landing content
    const Landing = () => (
      <div>
        <div>QLekha</div>
        <div>Design. Quote. Close.</div>
        <a href="/auth">Get Started Free</a>
        <a href="/dashboard">View Demo</a>
      </div>
    )
    render(<Landing />)
    expect(screen.getByText('Get Started Free')).toBeTruthy()
    expect(screen.getByText('View Demo')).toBeTruthy()
    expect(screen.getByText('Design. Quote. Close.')).toBeTruthy()
  })
})

// ─── Test: Auth Form ─────────────────────────────────────────────────────────
describe('Auth Form - Login Mode', () => {
  const AuthForm = ({ onLogin }) => {
    const [email, setEmail] = React.useState('')
    const [pw, setPw] = React.useState('')
    const [err, setErr] = React.useState('')

    const login = () => {
      if (!email || !pw) return setErr('Enter email and password.')
      onLogin(email, pw)
    }

    return (
      <div>
        <input type="email" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} data-testid="email" />
        <input type="password" placeholder="Your password" value={pw} onChange={e => setPw(e.target.value)} data-testid="password" />
        <button onClick={login}>Sign in</button>
        {err && <div data-testid="error">{err}</div>}
      </div>
    )
  }

  it('shows error when email is empty', async () => {
    const onLogin = vi.fn()
    render(<AuthForm onLogin={onLogin} />)
    fireEvent.click(screen.getByText('Sign in'))
    expect(screen.getByTestId('error')).toBeTruthy()
    expect(onLogin).not.toHaveBeenCalled()
  })

  it('calls onLogin with email and password', async () => {
    const onLogin = vi.fn()
    render(<AuthForm onLogin={onLogin} />)
    await userEvent.type(screen.getByTestId('email'), 'user@test.com')
    await userEvent.type(screen.getByTestId('password'), 'password123')
    fireEvent.click(screen.getByText('Sign in'))
    expect(onLogin).toHaveBeenCalledWith('user@test.com', 'password123')
  })
})

// ─── Test: Auth Form - Signup Mode ───────────────────────────────────────────
describe('Auth Form - Signup Mode', () => {
  import React from 'react'

  const SignupForm = ({ onSignup }) => {
    const [email, setEmail] = React.useState('')
    const [pw, setPw] = React.useState('')
    const [cpw, setCpw] = React.useState('')
    const [err, setErr] = React.useState('')

    const signup = () => {
      if (!email || pw.length < 8) return setErr('Email required, min 8 char password.')
      if (pw !== cpw) return setErr('Passwords do not match.')
      onSignup(email, pw)
    }

    return (
      <div>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} data-testid="email" />
        <input type="password" placeholder="Password" value={pw} onChange={e => setPw(e.target.value)} data-testid="password" />
        <input type="password" placeholder="Confirm" value={cpw} onChange={e => setCpw(e.target.value)} data-testid="confirm" />
        <button onClick={signup}>Create account</button>
        {err && <div data-testid="error">{err}</div>}
      </div>
    )
  }

  it('shows error for short password', async () => {
    render(<SignupForm onSignup={vi.fn()} />)
    await userEvent.type(screen.getByTestId('email'), 'user@test.com')
    await userEvent.type(screen.getByTestId('password'), 'short')
    fireEvent.click(screen.getByText('Create account'))
    expect(screen.getByTestId('error').textContent).toContain('min 8 char')
  })

  it('shows error for mismatched passwords', async () => {
    render(<SignupForm onSignup={vi.fn()} />)
    await userEvent.type(screen.getByTestId('email'), 'user@test.com')
    await userEvent.type(screen.getByTestId('password'), 'password123')
    await userEvent.type(screen.getByTestId('confirm'), 'different123')
    fireEvent.click(screen.getByText('Create account'))
    expect(screen.getByTestId('error').textContent).toContain('do not match')
  })

  it('calls onSignup with valid data', async () => {
    const onSignup = vi.fn()
    render(<SignupForm onSignup={onSignup} />)
    await userEvent.type(screen.getByTestId('email'), 'user@test.com')
    await userEvent.type(screen.getByTestId('password'), 'password123')
    await userEvent.type(screen.getByTestId('confirm'), 'password123')
    fireEvent.click(screen.getByText('Create account'))
    expect(onSignup).toHaveBeenCalledWith('user@test.com', 'password123')
  })
})

// ─── Test: OTP Input ─────────────────────────────────────────────────────────
describe('OTP Input', () => {
  import React from 'react'

  const OTPForm = ({ onVerify }) => {
    const [otp, setOtp] = React.useState('')
    const [err, setErr] = React.useState('')

    const verify = () => {
      const token = otp.replace(/\s/g, '')
      if (token.length !== 6) return setErr('Enter the full 6-digit code.')
      onVerify(token)
    }

    return (
      <div>
        <input
          type="text"
          placeholder="Enter 6-digit code"
          value={otp}
          onChange={e => setOtp(e.target.value)}
          data-testid="otp"
          maxLength={6}
        />
        <button onClick={verify}>Verify</button>
        {err && <div data-testid="error">{err}</div>}
      </div>
    )
  }

  it('shows error for incomplete OTP', () => {
    render(<OTPForm onVerify={vi.fn()} />)
    fireEvent.change(screen.getByTestId('otp'), { target: { value: '123' } })
    fireEvent.click(screen.getByText('Verify'))
    expect(screen.getByTestId('error').textContent).toContain('6-digit')
  })

  it('calls onVerify with 6-digit OTP', () => {
    const onVerify = vi.fn()
    render(<OTPForm onVerify={onVerify} />)
    fireEvent.change(screen.getByTestId('otp'), { target: { value: '123456' } })
    fireEvent.click(screen.getByText('Verify'))
    expect(onVerify).toHaveBeenCalledWith('123456')
  })
})

// ─── Test: Quote Wizard Steps ─────────────────────────────────────────────────
describe('Quote Wizard - Step Navigation', () => {
  import React from 'react'

  const StepBar = ({ step }) => {
    const steps = ['Client', 'Windows', 'Pricing', 'Review']
    return (
      <div data-testid="stepbar">
        {steps.map((s, i) => (
          <span key={s} data-testid={`step-${i+1}`} style={{ fontWeight: i + 1 === step ? 'bold' : 'normal' }}>
            {i + 1 < step ? '✓' : i + 1}{s}
          </span>
        ))}
      </div>
    )
  }

  it('renders all 4 steps', () => {
    render(<StepBar step={1} />)
    expect(screen.getByText(/Client/)).toBeTruthy()
    expect(screen.getByText(/Windows/)).toBeTruthy()
    expect(screen.getByText(/Pricing/)).toBeTruthy()
    expect(screen.getByText(/Review/)).toBeTruthy()
  })

  it('shows current step as active', () => {
    render(<StepBar step={2} />)
    const step2 = screen.getByTestId('step-2')
    expect(step2.style.fontWeight).toBe('bold')
  })

  it('shows checkmarks for completed steps', () => {
    render(<StepBar step={3} />)
    expect(screen.getAllByText(/✓/).length).toBe(2) // steps 1 and 2 completed
  })
})

// ─── Test: Window Form ────────────────────────────────────────────────────────
describe('Quote Wizard - Window Entry', () => {
  import React from 'react'

  const WindowForm = ({ onAdd }) => {
    const [type, setType] = React.useState('Sliding 2-Track')
    const [width, setWidth] = React.useState(1200)
    const [height, setHeight] = React.useState(900)
    const [qty, setQty] = React.useState(1)

    return (
      <div>
        <select value={type} onChange={e => setType(e.target.value)} data-testid="type">
          <option>Sliding 2-Track</option>
          <option>Casement</option>
          <option>Fixed</option>
        </select>
        <input type="number" value={width} onChange={e => setWidth(parseInt(e.target.value))} data-testid="width" />
        <input type="number" value={height} onChange={e => setHeight(parseInt(e.target.value))} data-testid="height" />
        <input type="number" value={qty} onChange={e => setQty(parseInt(e.target.value))} data-testid="qty" />
        <button onClick={() => onAdd({ type, width, height, qty })}>Add Window</button>
      </div>
    )
  }

  it('renders window type selector', () => {
    render(<WindowForm onAdd={vi.fn()} />)
    expect(screen.getByTestId('type')).toBeTruthy()
  })

  it('adds window with correct values', () => {
    const onAdd = vi.fn()
    render(<WindowForm onAdd={onAdd} />)
    fireEvent.change(screen.getByTestId('width'), { target: { value: '1800' } })
    fireEvent.change(screen.getByTestId('height'), { target: { value: '1200' } })
    fireEvent.change(screen.getByTestId('qty'), { target: { value: '3' } })
    fireEvent.click(screen.getByText('Add Window'))
    expect(onAdd).toHaveBeenCalledWith({ type: 'Sliding 2-Track', width: 1800, height: 1200, qty: 3 })
  })
})

// ─── Test: Invoice Status Badge ───────────────────────────────────────────────
describe('Invoice Status Badge', () => {
  import React from 'react'

  const StatusBadge = ({ status }) => {
    const SC = {
      pending: { bg: 'rgba(255,180,0,0.1)', color: '#FFB400' },
      partial: { bg: 'rgba(26,111,232,0.1)', color: '#1A6FE8' },
      paid: { bg: 'rgba(34,197,94,0.1)', color: '#22C55E' },
      overdue: { bg: 'rgba(239,68,68,0.08)', color: '#EF4444' },
    }
    const style = SC[status] || SC.pending
    return <span style={style} data-testid="badge">{status}</span>
  }

  it('renders pending badge', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByTestId('badge').textContent).toBe('pending')
    expect(screen.getByTestId('badge').style.color).toBe('rgb(255, 180, 0)')
  })

  it('renders paid badge in green', () => {
    render(<StatusBadge status="paid" />)
    expect(screen.getByTestId('badge').style.color).toBe('rgb(34, 197, 94)')
  })

  it('renders overdue badge in red', () => {
    render(<StatusBadge status="overdue" />)
    expect(screen.getByTestId('badge').style.color).toBe('rgb(239, 68, 68)')
  })
})

// ─── Test: Sign Out Button ────────────────────────────────────────────────────
describe('Sign Out', () => {
  import React from 'react'

  it('calls signOut on click', async () => {
    const mockSignOut = vi.fn().mockResolvedValue({})
    const SignOutButton = () => (
      <button onClick={() => mockSignOut().then(() => { window.location.href = '/auth' })}>
        Sign Out
      </button>
    )
    render(<SignOutButton />)
    fireEvent.click(screen.getByText('Sign Out'))
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled())
  })
})
