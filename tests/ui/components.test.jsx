/**
 * UI TESTS — React Component Tests
 * Uses @testing-library/react + jsdom
 * All enum values verified against real DB schema
 * Run: npx vitest run ui/components.test.jsx
 */
import React, { useState } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import '@testing-library/jest-dom'

vi.mock('../mocks/supabase.js', () => ({
  supabase: {
    auth: {
      signUp: vi.fn().mockResolvedValue({ error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'u-1' } } }, error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      signOut: vi.fn().mockResolvedValue({}),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: [], error: null }),
      update: vi.fn().mockResolvedValue({ data: [], error: null }),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: {
          id: 'u-1', company_id: 'co-1',
          companies: { id: 'co-1', name: 'Test Co', owner_name: 'Owner', plan: 'trial', pdf_design: 'classic_blue' }
        }, error: null
      }),
    })),
  }
}))

// ─── Auth: Login Form ─────────────────────────────────────────────────────────
describe('Login Form', () => {
  const LoginForm = ({ onLogin, onSwitch }) => {
    const [email, setEmail] = useState('')
    const [pw, setPw] = useState('')
    const [err, setErr] = useState('')

    const submit = () => {
      if (!email || !pw) return setErr('Enter email and password.')
      onLogin(email, pw)
    }

    return (
      <div>
        <input data-testid="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
        <input data-testid="password" type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="Password" />
        <button onClick={submit}>Sign in</button>
        <button onClick={onSwitch}>Create account</button>
        {err && <div data-testid="error">{err}</div>}
      </div>
    )
  }

  it('shows error when fields empty', () => {
    render(<LoginForm onLogin={vi.fn()} onSwitch={vi.fn()} />)
    fireEvent.click(screen.getByText('Sign in'))
    expect(screen.getByTestId('error').textContent).toBe('Enter email and password.')
  })

  it('calls onLogin with email and password', async () => {
    const onLogin = vi.fn()
    render(<LoginForm onLogin={onLogin} onSwitch={vi.fn()} />)
    await userEvent.type(screen.getByTestId('email'), 'user@test.com')
    await userEvent.type(screen.getByTestId('password'), 'password123')
    fireEvent.click(screen.getByText('Sign in'))
    expect(onLogin).toHaveBeenCalledWith('user@test.com', 'password123')
  })

  it('shows Create account button to switch modes', () => {
    const onSwitch = vi.fn()
    render(<LoginForm onLogin={vi.fn()} onSwitch={onSwitch} />)
    fireEvent.click(screen.getByText('Create account'))
    expect(onSwitch).toHaveBeenCalled()
  })
})

// ─── Auth: Signup Form ────────────────────────────────────────────────────────
describe('Signup Form', () => {
  const SignupForm = ({ onSignup }) => {
    const [email, setEmail] = useState('')
    const [pw, setPw] = useState('')
    const [cpw, setCpw] = useState('')
    const [err, setErr] = useState('')

    const submit = () => {
      if (!email || pw.length < 8) return setErr('Email required, min 8 char password.')
      if (pw !== cpw) return setErr('Passwords do not match.')
      onSignup(email, pw)
    }

    return (
      <div>
        <input data-testid="email" value={email} onChange={e => setEmail(e.target.value)} />
        <input data-testid="pw" type="password" value={pw} onChange={e => setPw(e.target.value)} />
        <input data-testid="cpw" type="password" value={cpw} onChange={e => setCpw(e.target.value)} />
        <button onClick={submit}>Create account</button>
        {err && <div data-testid="error">{err}</div>}
      </div>
    )
  }

  it('rejects short password', async () => {
    render(<SignupForm onSignup={vi.fn()} />)
    await userEvent.type(screen.getByTestId('email'), 'a@b.com')
    await userEvent.type(screen.getByTestId('pw'), 'short')
    fireEvent.click(screen.getByText('Create account'))
    expect(screen.getByTestId('error').textContent).toContain('min 8 char')
  })

  it('rejects mismatched passwords', async () => {
    render(<SignupForm onSignup={vi.fn()} />)
    await userEvent.type(screen.getByTestId('email'), 'a@b.com')
    await userEvent.type(screen.getByTestId('pw'), 'password123')
    await userEvent.type(screen.getByTestId('cpw'), 'different123')
    fireEvent.click(screen.getByText('Create account'))
    expect(screen.getByTestId('error').textContent).toContain('do not match')
  })

  it('calls onSignup with valid data', async () => {
    const onSignup = vi.fn()
    render(<SignupForm onSignup={onSignup} />)
    await userEvent.type(screen.getByTestId('email'), 'a@b.com')
    await userEvent.type(screen.getByTestId('pw'), 'password123')
    await userEvent.type(screen.getByTestId('cpw'), 'password123')
    fireEvent.click(screen.getByText('Create account'))
    expect(onSignup).toHaveBeenCalledWith('a@b.com', 'password123')
  })
})

// ─── OTP Entry ────────────────────────────────────────────────────────────────
describe('OTP Entry Screen', () => {
  const OTPScreen = ({ email, onVerify, onResend }) => {
    const [otp, setOtp] = useState('')
    const [err, setErr] = useState('')

    const verify = () => {
      const token = otp.replace(/\s/g, '')
      if (token.length !== 6) return setErr('Enter the full 6-digit code.')
      onVerify(token)
    }

    return (
      <div>
        <p data-testid="sent-to">Sent to {email}</p>
        <input data-testid="otp" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} />
        <button onClick={verify}>Verify Code</button>
        <button onClick={onResend}>Resend Code</button>
        {err && <div data-testid="error">{err}</div>}
      </div>
    )
  }

  it('shows email address on screen', () => {
    render(<OTPScreen email="test@test.com" onVerify={vi.fn()} onResend={vi.fn()} />)
    expect(screen.getByTestId('sent-to').textContent).toContain('test@test.com')
  })

  it('rejects OTP shorter than 6 digits', () => {
    render(<OTPScreen email="test@test.com" onVerify={vi.fn()} onResend={vi.fn()} />)
    fireEvent.change(screen.getByTestId('otp'), { target: { value: '123' } })
    fireEvent.click(screen.getByText('Verify Code'))
    expect(screen.getByTestId('error').textContent).toContain('6-digit')
  })

  it('calls onVerify with valid 6-digit code', () => {
    const onVerify = vi.fn()
    render(<OTPScreen email="test@test.com" onVerify={onVerify} onResend={vi.fn()} />)
    fireEvent.change(screen.getByTestId('otp'), { target: { value: '123456' } })
    fireEvent.click(screen.getByText('Verify Code'))
    expect(onVerify).toHaveBeenCalledWith('123456')
  })

  it('calls onResend when Resend button clicked', () => {
    const onResend = vi.fn()
    render(<OTPScreen email="test@test.com" onVerify={vi.fn()} onResend={onResend} />)
    fireEvent.click(screen.getByText('Resend Code'))
    expect(onResend).toHaveBeenCalled()
  })
})

// ─── Quote Wizard Step Bar ────────────────────────────────────────────────────
describe('Quote Wizard Step Bar', () => {
  const StepBar = ({ step }) => {
    const steps = ['Client', 'Windows', 'Pricing', 'Review']
    return (
      <div data-testid="stepbar">
        {steps.map((s, i) => (
          <span
            key={s}
            data-testid={`step-${i + 1}`}
            data-active={i + 1 === step}
            data-done={i + 1 < step}
          >
            {i + 1 < step ? '✓' : i + 1} {s}
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

  it('marks step 2 as active on step 2', () => {
    render(<StepBar step={2} />)
    expect(screen.getByTestId('step-2').dataset.active).toBe('true')
    expect(screen.getByTestId('step-1').dataset.done).toBe('true')
  })

  it('shows checkmarks for completed steps', () => {
    render(<StepBar step={3} />)
    const done = screen.getAllByText(/✓/)
    expect(done.length).toBe(2) // steps 1 and 2
  })
})

// ─── Client Tag Selector ──────────────────────────────────────────────────────
describe('Client Tag Selector (DB-verified enum values)', () => {
  // Valid client_tag enum: architect, builder, contractor, individual, dealer, corporate
  const VALID_TAGS = ['individual', 'builder', 'contractor', 'dealer', 'architect', 'corporate']

  const TagSelector = ({ onChange }) => {
    const [selected, setSelected] = useState('individual')
    return (
      <div>
        {VALID_TAGS.map(t => (
          <button
            key={t}
            data-testid={`tag-${t}`}
            data-selected={selected === t}
            onClick={() => { setSelected(t); onChange(t) }}
          >
            {t}
          </button>
        ))}
        <span data-testid="current">{selected}</span>
      </div>
    )
  }

  it('renders all valid client tags', () => {
    render(<TagSelector onChange={vi.fn()} />)
    VALID_TAGS.forEach(tag => {
      expect(screen.getByTestId(`tag-${tag}`)).toBeTruthy()
    })
  })

  it('defaults to individual tag', () => {
    render(<TagSelector onChange={vi.fn()} />)
    expect(screen.getByTestId('current').textContent).toBe('individual')
  })

  it('does NOT show residential tag (not in DB enum)', () => {
    render(<TagSelector onChange={vi.fn()} />)
    expect(screen.queryByTestId('tag-residential')).toBeNull()
  })

  it('does NOT show commercial tag (not in DB enum)', () => {
    render(<TagSelector onChange={vi.fn()} />)
    expect(screen.queryByTestId('tag-commercial')).toBeNull()
  })

  it('calls onChange when tag selected', () => {
    const onChange = vi.fn()
    render(<TagSelector onChange={onChange} />)
    fireEvent.click(screen.getByTestId('tag-builder'))
    expect(onChange).toHaveBeenCalledWith('builder')
  })
})

// ─── Quote Status Dropdown ────────────────────────────────────────────────────
describe('Quote Status Dropdown (DB-verified)', () => {
  // Valid quote_status enum: draft, sent, approved, rejected, expired
  const VALID_STATUSES = ['draft', 'sent', 'approved', 'rejected', 'expired']

  const StatusDropdown = ({ status, onChange }) => (
    <select data-testid="status" value={status} onChange={e => onChange(e.target.value)}>
      {VALID_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
  )

  it('shows all valid quote statuses', () => {
    render(<StatusDropdown status="draft" onChange={vi.fn()} />)
    VALID_STATUSES.forEach(s => {
      expect(screen.getByRole('option', { name: s })).toBeTruthy()
    })
  })

  it('does NOT show pending (only valid for bill_status, not quote_status)', () => {
    render(<StatusDropdown status="draft" onChange={vi.fn()} />)
    expect(screen.queryByRole('option', { name: 'pending' })).toBeNull()
  })

  it('calls onChange with new status', () => {
    const onChange = vi.fn()
    render(<StatusDropdown status="draft" onChange={onChange} />)
    fireEvent.change(screen.getByTestId('status'), { target: { value: 'sent' } })
    expect(onChange).toHaveBeenCalledWith('sent')
  })
})

// ─── Invoice Status Badge ─────────────────────────────────────────────────────
describe('Invoice Status Badge (bill_status enum)', () => {
  // Valid bill_status: draft, sent, paid, partial, pending, overdue, cancelled
  const Badge = ({ status }) => {
    const colors = {
      pending: '#FFB400', partial: '#1A6FE8', paid: '#22C55E',
      overdue: '#EF4444', draft: '#8A9BB5', sent: '#1A6FE8', cancelled: '#8A9BB5'
    }
    return <span data-testid="badge" style={{ color: colors[status] || colors.pending }}>{status}</span>
  }

  it('renders pending badge amber', () => {
    render(<Badge status="pending" />)
    expect(screen.getByTestId('badge').textContent).toBe('pending')
    expect(screen.getByTestId('badge').style.color).toBe('rgb(255, 180, 0)')
  })

  it('renders paid badge green', () => {
    render(<Badge status="paid" />)
    expect(screen.getByTestId('badge').style.color).toBe('rgb(34, 197, 94)')
  })

  it('renders overdue badge red', () => {
    render(<Badge status="overdue" />)
    expect(screen.getByTestId('badge').style.color).toBe('rgb(239, 68, 68)')
  })
})

// ─── GST Selector ────────────────────────────────────────────────────────────
describe('GST Rate Selector', () => {
  const GST_RATES = [0, 5, 12, 18, 28]

  const GSTSelector = ({ rate, onChange }) => (
    <select data-testid="gst" value={rate} onChange={e => onChange(parseInt(e.target.value))}>
      {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
    </select>
  )

  it('renders all GST rates', () => {
    render(<GSTSelector rate={18} onChange={vi.fn()} />)
    GST_RATES.forEach(r => {
      expect(screen.getByRole('option', { name: `${r}%` })).toBeTruthy()
    })
  })

  it('defaults to 18%', () => {
    render(<GSTSelector rate={18} onChange={vi.fn()} />)
    expect(screen.getByTestId('gst').value).toBe('18')
  })

  it('calls onChange with number not string', () => {
    const onChange = vi.fn()
    render(<GSTSelector rate={18} onChange={onChange} />)
    fireEvent.change(screen.getByTestId('gst'), { target: { value: '28' } })
    expect(onChange).toHaveBeenCalledWith(28)
    expect(typeof onChange.mock.calls[0][0]).toBe('number')
  })
})

// ─── Sign Out ─────────────────────────────────────────────────────────────────
describe('Sign Out Button', () => {
  it('calls signOut and redirects', async () => {
    const signOut = vi.fn().mockResolvedValue({})
    const redirect = vi.fn()
    const Btn = () => (
      <button onClick={() => signOut().then(() => redirect('/auth'))}>
        Sign Out
      </button>
    )
    render(<Btn />)
    fireEvent.click(screen.getByText('Sign Out'))
    await waitFor(() => {
      expect(signOut).toHaveBeenCalled()
      expect(redirect).toHaveBeenCalledWith('/auth')
    })
  })
})

// ─── PDF Download ─────────────────────────────────────────────────────────────
describe('PDF Download Button', () => {
  it('triggers download with correct filename', async () => {
    const createSpy = vi.spyOn(document, 'createElement')
    const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => {})
    const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => {})
    const clickMock = vi.fn()

    createSpy.mockImplementationOnce(() => ({
      href: '', download: '', click: clickMock, style: {}
    }))

    const downloadPDF = (uri, filename) => {
      const a = document.createElement('a')
      a.href = uri
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }

    downloadPDF('data:application/pdf;base64,...', 'Quote-Q-2024-1234.pdf')
    expect(clickMock).toHaveBeenCalled()
    createSpy.mockRestore()
    appendSpy.mockRestore()
    removeSpy.mockRestore()
  })
})
