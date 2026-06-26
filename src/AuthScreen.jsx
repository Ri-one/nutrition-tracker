import { useState } from 'react'
import { supabase } from './supabase'

const COLORS = {
  bg: '#0F1923', surface: '#182635', card: '#1E3048', border: '#253D58',
  mint: '#3ECFB2', coral: '#FF6B6B', amber: '#FFB347',
  text: '#E8F4F8', muted: '#7A9BB5', dimmed: '#4A6880',
}

function Field({ label, type, value, onChange, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <input
        type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          background: COLORS.surface, border: `1px solid ${COLORS.border}`,
          borderRadius: 10, padding: '12px 14px', color: COLORS.text,
          fontSize: 15, outline: 'none', width: '100%',
        }}
      />
    </div>
  )
}

function Alert({ msg, type }) {
  if (!msg) return null
  const color = type === 'error' ? COLORS.coral : COLORS.mint
  return (
    <div style={{ background: `${color}20`, border: `1px solid ${color}55`, borderRadius: 10, padding: '10px 14px', color, fontSize: 13 }}>
      {msg}
    </div>
  )
}

// ── Login ─────────────────────────────────────────────────────
function LoginForm({ onSwitch }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    if (!email || !password) { setError('Remplissez tous les champs.'); return }
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) setError(err.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect.' : err.message)
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>🥗</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>Nutrition Tracker</div>
        <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Connectez-vous pour continuer</div>
      </div>

      <Alert msg={error} type="error" />

      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.com" />
      <Field label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

      <button
        onClick={handleLogin} disabled={loading}
        style={{ background: loading ? COLORS.border : COLORS.mint, color: loading ? COLORS.dimmed : COLORS.bg, border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s', marginTop: 4 }}
      >
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>

      <div style={{ textAlign: 'center', fontSize: 13, color: COLORS.muted }}>
        Pas encore de compte ?{' '}
        <span onClick={onSwitch} style={{ color: COLORS.mint, fontWeight: 700, cursor: 'pointer' }}>
          Créer un compte
        </span>
      </div>
    </div>
  )
}

// ── Register ──────────────────────────────────────────────────
function RegisterForm({ onSwitch }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleRegister = async () => {
    if (!email || !password || !confirm) { setError('Remplissez tous les champs.'); return }
    if (password.length < 8) { setError('Le mot de passe doit faire au moins 8 caractères.'); return }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas.'); return }

    setLoading(true); setError(''); setSuccess('')
    const { error: err } = await supabase.auth.signUp({ email, password })
    if (err) {
      setError(err.message)
    } else {
      setSuccess('Compte créé ! Vérifiez votre email pour confirmer votre inscription.')
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <div style={{ fontSize: 42, marginBottom: 8 }}>🥗</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: COLORS.text }}>Créer un compte</div>
        <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 4 }}>Gratuit, sans carte bancaire</div>
      </div>

      <Alert msg={error} type="error" />
      <Alert msg={success} type="success" />

      {!success && (
        <>
          <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="vous@exemple.com" />
          <Field label="Mot de passe" type="password" value={password} onChange={setPassword} placeholder="8 caractères minimum" />
          <Field label="Confirmer le mot de passe" type="password" value={confirm} onChange={setConfirm} placeholder="••••••••" />

          <div style={{ fontSize: 12, color: COLORS.dimmed, background: COLORS.surface, borderRadius: 8, padding: '10px 12px' }}>
            🔒 Votre mot de passe est chiffré et sécurisé. Nous ne stockons jamais de mot de passe en clair.
          </div>

          <button
            onClick={handleRegister} disabled={loading}
            style={{ background: loading ? COLORS.border : COLORS.mint, color: loading ? COLORS.dimmed : COLORS.bg, border: 'none', borderRadius: 12, padding: '14px', fontSize: 15, fontWeight: 700, cursor: loading ? 'default' : 'pointer', transition: 'all 0.2s', marginTop: 4 }}
          >
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </>
      )}

      <div style={{ textAlign: 'center', fontSize: 13, color: COLORS.muted }}>
        Déjà un compte ?{' '}
        <span onClick={onSwitch} style={{ color: COLORS.mint, fontWeight: 700, cursor: 'pointer' }}>
          Se connecter
        </span>
      </div>
    </div>
  )
}

// ── Auth Shell ────────────────────────────────────────────────
export default function AuthScreen() {
  const [mode, setMode] = useState('login')

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 20, padding: 28, width: '100%', maxWidth: 380 }}>
        {mode === 'login'
          ? <LoginForm onSwitch={() => setMode('register')} />
          : <RegisterForm onSwitch={() => setMode('login')} />
        }
      </div>
    </div>
  )
}
