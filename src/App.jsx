import { useState, useMemo, useRef } from 'react'

// ── Design tokens ─────────────────────────────────────────────
const COLORS = {
  bg: '#0F1923', surface: '#182635', card: '#1E3048', border: '#253D58',
  mint: '#3ECFB2', coral: '#FF6B6B', amber: '#FFB347',
  text: '#E8F4F8', muted: '#7A9BB5', dimmed: '#4A6880',
}

// ── Data ──────────────────────────────────────────────────────
const FOOD_DB = [
  { name: 'Poulet grillé (100g)', kcal: 165, p: 31, g: 0, l: 3.6 },
  { name: 'Riz blanc cuit (100g)', kcal: 130, p: 2.7, g: 28, l: 0.3 },
  { name: 'Oeuf entier', kcal: 70, p: 6, g: 0.6, l: 5 },
  { name: 'Avocat (½)', kcal: 120, p: 1.5, g: 6, l: 11 },
  { name: 'Banane', kcal: 89, p: 1.1, g: 23, l: 0.3 },
  { name: 'Yaourt grec (150g)', kcal: 100, p: 10, g: 6, l: 3 },
  { name: 'Saumon (100g)', kcal: 208, p: 20, g: 0, l: 13 },
  { name: 'Lentilles cuites (100g)', kcal: 116, p: 9, g: 20, l: 0.4 },
  { name: 'Pain complet (tranche)', kcal: 80, p: 4, g: 15, l: 1 },
  { name: 'Lait demi-écrémé (200ml)', kcal: 92, p: 6.4, g: 9.4, l: 3.2 },
  { name: 'Amandes (30g)', kcal: 174, p: 6, g: 6, l: 15 },
  { name: 'Pomme', kcal: 72, p: 0.4, g: 19, l: 0.2 },
  { name: 'Pâtes cuites (100g)', kcal: 131, p: 5, g: 25, l: 1.1 },
  { name: 'Brocoli (100g)', kcal: 34, p: 2.8, g: 7, l: 0.4 },
  { name: 'Fromage blanc (100g)', kcal: 57, p: 8, g: 4, l: 0.4 },
]

const ACTIVITY_DB = [
  { name: 'Corde à sauter', kcalPerMin: 13, icon: '🪢', group: 'Cardio' },
  { name: 'Tennis', kcalPerMin: 9, icon: '🎾', group: 'Sport' },
  { name: 'Abdominaux', kcalPerMin: 5, icon: '💪', group: 'Maison' },
  { name: 'Squats', kcalPerMin: 6, icon: '🦵', group: 'Maison' },
  { name: 'Gainage / Planche', kcalPerMin: 4, icon: '🧱', group: 'Maison' },
  { name: 'Exercices hanches / fessiers', kcalPerMin: 4, icon: '🍑', group: 'Maison' },
  { name: 'Pont fessier', kcalPerMin: 3, icon: '🌉', group: 'Maison' },
  { name: 'Circuit maison complet', kcalPerMin: 7, icon: '🏠', group: 'Maison' },
  { name: 'Marche rapide', kcalPerMin: 5, icon: '🚶', group: 'Cardio' },
  { name: 'Course à pied', kcalPerMin: 10, icon: '🏃', group: 'Cardio' },
  { name: 'Vélo', kcalPerMin: 8, icon: '🚴', group: 'Cardio' },
]

const MEALS = ['Petit-déjeuner', 'Déjeuner', 'Dîner', 'Collation']
const GOALS = ['Perte de poids', 'Maintien', 'Prise de masse']
const ACTIVITY_LEVELS = [
  { label: 'Sédentaire', desc: "Peu ou pas d'exercice", factor: 1.2 },
  { label: 'Légèrement actif', desc: '1–3 jours/sem', factor: 1.375 },
  { label: 'Modérément actif', desc: '3–5 jours/sem', factor: 1.55 },
  { label: 'Très actif', desc: '6–7 jours/sem', factor: 1.725 },
  { label: 'Extrêmement actif', desc: 'Athlète / travail physique', factor: 1.9 },
]

// ── Helpers ───────────────────────────────────────────────────
const todayStr = () =>
  new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

function calcTDEE({ age, weight, height, sex, activityFactor, goal }) {
  if (!age || !weight || !height) return null
  const bmr =
    sex === 'H'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161
  const tdee = bmr * activityFactor
  const adj = goal === 'Perte de poids' ? -500 : goal === 'Prise de masse' ? 300 : 0
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), target: Math.round(tdee + adj) }
}

function calcMacros(kcalTarget, goal) {
  const pRatio = goal !== 'Maintien' ? 0.35 : 0.25
  const lRatio = 0.25
  const gRatio = 1 - pRatio - lRatio
  return {
    p: Math.round((kcalTarget * pRatio) / 4),
    g: Math.round((kcalTarget * gRatio) / 4),
    l: Math.round((kcalTarget * lRatio) / 9),
  }
}

// ── Claude Vision API ─────────────────────────────────────────
async function analyzeFoodPhoto(base64Image, mediaType) {
  const prompt = `Tu es un expert en nutrition. Analyse cette photo de repas et estime sa composition nutritionnelle.

Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans backticks), avec cette structure exacte:
{
  "description": "Nom court du plat ou des aliments identifiés",
  "items": [
    { "name": "Nom de l'aliment (portion estimée)", "kcal": 000, "p": 00.0, "g": 00.0, "l": 00.0 }
  ],
  "total": { "kcal": 000, "p": 00.0, "g": 00.0, "l": 00.0 },
  "confidence": "haute|moyenne|faible",
  "note": "Courte remarque sur l'estimation (1 phrase max)"
}

Les valeurs sont: kcal=calories, p=protéines(g), g=glucides(g), l=lipides(g).
Sois précis sur les portions visibles. Si tu ne vois pas clairement un aliment, indique-le dans la note.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64Image } },
            { type: 'text', text: prompt },
          ],
        },
      ],
    }),
  })
  const data = await response.json()
  const text = data.content?.map((c) => c.text || '').join('') || ''
  return JSON.parse(text.replace(/```json|```/g, '').trim())
}

// ── UI Components ─────────────────────────────────────────────
function MacroBar({ label, value, max, color }) {
  const pct = Math.min((value / Math.max(max, 1)) * 100, 100)
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: COLORS.muted, fontSize: 12 }}>{label}</span>
        <span style={{ color: COLORS.text, fontSize: 12, fontWeight: 600 }}>
          {Math.round(value)}g{' '}
          <span style={{ color: COLORS.dimmed }}>/ {max}g</span>
        </span>
      </div>
      <div style={{ background: COLORS.border, borderRadius: 4, height: 6, overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`, background: color, height: '100%',
            borderRadius: 4, transition: 'width 0.4s ease',
          }}
        />
      </div>
    </div>
  )
}

function RingChart({ consumed, burned, goal }) {
  const net = consumed - burned
  const remaining = goal - net
  const pct = Math.min((net / Math.max(goal, 1)) * 100, 100)
  const r = 54
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const isOver = net > goal
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={140} height={140} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke={COLORS.border} strokeWidth={12} />
        <circle
          cx={70} cy={70} r={r} fill="none"
          stroke={isOver ? COLORS.coral : COLORS.mint}
          strokeWidth={12}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={70} y={62} textAnchor="middle" fill={COLORS.text} fontSize={22} fontWeight={700}>
          {Math.round(net)}
        </text>
        <text x={70} y={80} textAnchor="middle" fill={COLORS.muted} fontSize={11}>kcal nets</text>
        <text x={70} y={96} textAnchor="middle" fill={isOver ? COLORS.coral : COLORS.mint} fontSize={11}>
          {isOver ? `+${Math.round(-remaining)} dépassé` : `${Math.round(remaining)} restantes`}
        </text>
      </svg>
      <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
        {[
          { v: Math.round(consumed), label: 'Consommé', c: COLORS.amber },
          { v: Math.round(burned), label: 'Brûlé', c: COLORS.mint },
          { v: goal, label: 'Objectif', c: COLORS.dimmed },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ color: s.c, fontWeight: 700 }}>{s.v}</div>
            <div style={{ color: COLORS.muted }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WeekChart({ data, goal }) {
  const maxVal = Math.max(...data.map((d) => d.net), goal, 100)
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 80, padding: '0 4px' }}>
      {data.map((d, i) => {
        const h = Math.max((d.net / maxVal) * 70, 3)
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div
              title={`${d.net} kcal`}
              style={{
                width: '100%', height: h,
                background: d.today ? COLORS.mint : d.net > goal ? COLORS.coral : COLORS.border,
                borderRadius: 3, transition: 'height 0.3s ease',
              }}
            />
            <span style={{ fontSize: 10, color: d.today ? COLORS.mint : COLORS.dimmed }}>{days[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

function InputRow({ label, unit, value, onChange, min, max }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${COLORS.border}` }}>
      <span style={{ fontSize: 14, color: COLORS.muted }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <input
          type="number" value={value} min={min} max={max}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: 70, background: COLORS.surface, border: `1px solid ${COLORS.border}`,
            borderRadius: 8, padding: '6px 10px', color: COLORS.text,
            fontSize: 14, fontWeight: 600, textAlign: 'right',
          }}
        />
        {unit && <span style={{ fontSize: 13, color: COLORS.dimmed, minWidth: 28 }}>{unit}</span>}
      </div>
    </div>
  )
}

function StatPill({ label, value, color }) {
  return (
    <div style={{ background: COLORS.surface, borderRadius: 10, padding: '10px 14px', textAlign: 'center', border: `1px solid ${COLORS.border}` }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || COLORS.text }}>{value}</div>
      <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function IMCBar({ bmi }) {
  const zones = [
    { label: 'Sous-poids', max: 18.5, color: '#74B9FF' },
    { label: 'Normal', max: 25, color: COLORS.mint },
    { label: 'Surpoids', max: 30, color: COLORS.amber },
    { label: 'Obésité', max: 40, color: COLORS.coral },
  ]
  const clamp = Math.min(Math.max(bmi, 10), 40)
  const pct = ((clamp - 10) / 30) * 100
  const zone = zones.find((z) => bmi < z.max) || zones[zones.length - 1]
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: COLORS.muted }}>IMC</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: zone.color }}>
          {bmi.toFixed(1)} — {zone.label}
        </span>
      </div>
      <div style={{ position: 'relative', height: 10, borderRadius: 6, background: `linear-gradient(to right, #74B9FF 0%, ${COLORS.mint} 28%, ${COLORS.amber} 60%, ${COLORS.coral} 100%)` }}>
        <div style={{ position: 'absolute', top: -3, left: `${pct}%`, transform: 'translateX(-50%)', width: 16, height: 16, borderRadius: '50%', background: COLORS.text, border: `3px solid ${zone.color}`, transition: 'left 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {['10', '18.5', '25', '30', '40'].map((v) => (
          <span key={v} style={{ fontSize: 9, color: COLORS.dimmed }}>{v}</span>
        ))}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: `3px solid ${COLORS.border}`, borderTopColor: COLORS.mint, animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ color: COLORS.muted, fontSize: 13 }}>Analyse en cours…</span>
    </div>
  )
}

function ConfidenceBadge({ level }) {
  const map = {
    haute: { color: COLORS.mint, label: '✓ Confiance haute' },
    moyenne: { color: COLORS.amber, label: '~ Confiance moyenne' },
    faible: { color: COLORS.coral, label: '! Confiance faible' },
  }
  const { color, label } = map[level] || map.moyenne
  return <span style={{ fontSize: 11, color, fontWeight: 600 }}>{label}</span>
}

// ── App ───────────────────────────────────────────────────────
export default function App() {
  // Profile
  const [profile, setProfile] = useState({
    name: '', age: 30, weight: 70, height: 175, sex: 'H',
    activityFactor: 1.375, goal: 'Maintien',
  })
  const tdeeData = useMemo(() => calcTDEE(profile), [profile])
  const macroTargets = useMemo(
    () => (tdeeData ? calcMacros(tdeeData.target, profile.goal) : { p: 150, g: 250, l: 70 }),
    [tdeeData, profile.goal]
  )
  const kcalGoal = tdeeData?.target || 2000

  // Daily data
  const [meals, setMeals] = useState([])
  const [activities, setActivities] = useState([])
  const [tab, setTab] = useState('profile')

  // Food modal
  const [showFood, setShowFood] = useState(false)
  const [foodMode, setFoodMode] = useState('search') // 'search' | 'photo'
  const [selMeal, setSelMeal] = useState('Déjeuner')
  const [foodSearch, setFoodSearch] = useState('')
  const [selFood, setSelFood] = useState(null)
  const [qty, setQty] = useState(1)

  // Photo analysis
  const [photoPreview, setPhotoPreview] = useState(null)
  const [photoBase64, setPhotoBase64] = useState(null)
  const [photoMediaType, setPhotoMediaType] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState(null)
  const [analysisError, setAnalysisError] = useState(null)
  const [selectedItems, setSelectedItems] = useState([])
  const fileInputRef = useRef(null)

  // Activity modal
  const [showActivity, setShowActivity] = useState(false)
  const [selActivity, setSelActivity] = useState(null)
  const [duration, setDuration] = useState(30)

  // Computed
  const filteredFoods = FOOD_DB.filter((f) =>
    f.name.toLowerCase().includes(foodSearch.toLowerCase())
  )
  const consumed = useMemo(() => meals.reduce((s, m) => s + m.kcal * m.qty, 0), [meals])
  const burned = useMemo(() => activities.reduce((s, a) => s + a.kcal, 0), [activities])
  const totalP = useMemo(() => meals.reduce((s, m) => s + m.p * m.qty, 0), [meals])
  const totalG = useMemo(() => meals.reduce((s, m) => s + m.g * m.qty, 0), [meals])
  const totalL = useMemo(() => meals.reduce((s, m) => s + m.l * m.qty, 0), [meals])
  const weekData = useMemo(() => {
    const fake = [1420, 1870, 1650, 2100, 1980, 1750, Math.max(consumed - burned, 0)]
    return fake.map((net, i) => ({ net, today: i === 6 }))
  }, [consumed, burned])
  const bmi = useMemo(
    () => (profile.weight && profile.height ? profile.weight / (profile.height / 100) ** 2 : null),
    [profile.weight, profile.height]
  )

  const upd = (key, val) => setProfile((p) => ({ ...p, [key]: val }))
  const mealGroups = MEALS.map((m) => ({
    label: m,
    items: meals.filter((x) => x.meal === m),
    total: meals.filter((x) => x.meal === m).reduce((s, x) => s + x.kcal * x.qty, 0),
  }))

  // Handlers
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const dataUrl = ev.target.result
      setPhotoPreview(dataUrl)
      setPhotoBase64(dataUrl.split(',')[1])
      setPhotoMediaType(file.type)
      setAnalysisResult(null)
      setAnalysisError(null)
      setSelectedItems([])
    }
    reader.readAsDataURL(file)
  }

  const handleAnalyze = async () => {
    if (!photoBase64) return
    setAnalyzing(true)
    setAnalysisError(null)
    try {
      const result = await analyzeFoodPhoto(photoBase64, photoMediaType)
      setAnalysisResult(result)
      setSelectedItems(result.items.map((_, i) => i))
    } catch {
      setAnalysisError('Analyse impossible. Vérifiez votre connexion et réessayez.')
    } finally {
      setAnalyzing(false)
    }
  }

  const toggleItem = (i) =>
    setSelectedItems((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]))

  const addPhotoMeals = () => {
    if (!analysisResult) return
    const toAdd = analysisResult.items
      .filter((_, i) => selectedItems.includes(i))
      .map((item) => ({ meal: selMeal, ...item, qty: 1, fromPhoto: true }))
    setMeals((prev) => [...prev, ...toAdd])
    closePhotoModal()
  }

  const closePhotoModal = () => {
    setShowFood(false)
    setPhotoPreview(null)
    setPhotoBase64(null)
    setPhotoMediaType(null)
    setAnalysisResult(null)
    setAnalysisError(null)
    setSelectedItems([])
    setFoodMode('search')
  }

  const addMeal = () => {
    if (!selFood) return
    setMeals((prev) => [...prev, { meal: selMeal, ...selFood, qty }])
    setShowFood(false)
    setFoodSearch('')
    setSelFood(null)
    setQty(1)
  }

  const addActivity = () => {
    if (!selActivity) return
    setActivities((prev) => [
      ...prev,
      { name: selActivity.name, icon: selActivity.icon, duration, kcal: Math.round(selActivity.kcalPerMin * duration) },
    ])
    setShowActivity(false)
    setSelActivity(null)
    setDuration(30)
  }

  // Shared style
  const card = {
    background: COLORS.card, borderRadius: 14,
    border: `1px solid ${COLORS.border}`, padding: 16,
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", background: COLORS.bg, minHeight: '100vh', color: COLORS.text, maxWidth: 420, margin: '0 auto', paddingBottom: 80 }}>

      {/* ── Header ── */}
      <div style={{ padding: '20px 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: COLORS.muted, textTransform: 'uppercase', letterSpacing: 1 }}>Aujourd'hui</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{todayStr()}</div>
        </div>
        {profile.name && (
          <div style={{ background: COLORS.mint, color: COLORS.bg, borderRadius: 20, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>
            {profile.name}
          </div>
        )}
      </div>

      {/* ── Nav ── */}
      <div style={{ display: 'flex', margin: '16px 16px 0', background: COLORS.surface, borderRadius: 10, padding: 3 }}>
        {[['profile', '👤 Profil'], ['dashboard', '📊 Bilan'], ['food', '🍽 Repas'], ['activity', '🏃 Sport']].map(([key, label]) => (
          <button
            key={key} onClick={() => setTab(key)}
            style={{ flex: 1, padding: '8px 2px', borderRadius: 8, border: 'none', background: tab === key ? COLORS.mint : 'transparent', color: tab === key ? COLORS.bg : COLORS.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* ────────── PROFILE ────────── */}
        {tab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Identity */}
            <div style={card}>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Identité</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: 14, color: COLORS.muted }}>Prénom</span>
                <input
                  value={profile.name} onChange={(e) => upd('name', e.target.value)} placeholder="Votre prénom"
                  style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: '6px 10px', color: COLORS.text, fontSize: 14, fontWeight: 600, textAlign: 'right', width: 140 }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: 14, color: COLORS.muted }}>Sexe</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['H', 'F'].map((s) => (
                    <button key={s} onClick={() => upd('sex', s)} style={{ padding: '6px 18px', borderRadius: 20, border: 'none', background: profile.sex === s ? COLORS.mint : COLORS.border, color: profile.sex === s ? COLORS.bg : COLORS.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      {s === 'H' ? 'Homme' : 'Femme'}
                    </button>
                  ))}
                </div>
              </div>
              <InputRow label="Âge" unit="ans" value={profile.age} min={10} max={100} onChange={(v) => upd('age', Number(v))} />
              <InputRow label="Poids" unit="kg" value={profile.weight} min={30} max={300} onChange={(v) => upd('weight', Number(v))} />
              <InputRow label="Taille" unit="cm" value={profile.height} min={100} max={250} onChange={(v) => upd('height', Number(v))} />
            </div>

            {/* Goal */}
            <div style={card}>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Objectif</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {GOALS.map((g) => (
                  <button key={g} onClick={() => upd('goal', g)} style={{ flex: 1, padding: '10px 8px', borderRadius: 10, border: `1px solid ${profile.goal === g ? COLORS.mint : COLORS.border}`, background: profile.goal === g ? `${COLORS.mint}20` : 'transparent', color: profile.goal === g ? COLORS.mint : COLORS.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity level */}
            <div style={card}>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Niveau d'activité</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ACTIVITY_LEVELS.map((a) => (
                  <div key={a.label} onClick={() => upd('activityFactor', a.factor)}
                    style={{ padding: '10px 12px', borderRadius: 10, border: `1px solid ${profile.activityFactor === a.factor ? COLORS.mint : COLORS.border}`, background: profile.activityFactor === a.factor ? `${COLORS.mint}15` : 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: profile.activityFactor === a.factor ? COLORS.mint : COLORS.text }}>{a.label}</div>
                      <div style={{ fontSize: 11, color: COLORS.muted }}>{a.desc}</div>
                    </div>
                    <div style={{ fontSize: 11, color: COLORS.dimmed }}>×{a.factor}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* TDEE results */}
            {tdeeData ? (
              <div style={card}>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Vos besoins calculés</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
                  <StatPill label="MB (BMR)" value={tdeeData.bmr} color={COLORS.muted} />
                  <StatPill label="TDEE" value={tdeeData.tdee} color={COLORS.amber} />
                  <StatPill label="Cible" value={tdeeData.target} color={COLORS.mint} />
                </div>
                {bmi && <IMCBar bmi={bmi} />}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 10, fontWeight: 600 }}>Macros recommandés</div>
                  <MacroBar label="Protéines" value={macroTargets.p} max={macroTargets.p} color={COLORS.mint} />
                  <MacroBar label="Glucides" value={macroTargets.g} max={macroTargets.g} color={COLORS.amber} />
                  <MacroBar label="Lipides" value={macroTargets.l} max={macroTargets.l} color={COLORS.coral} />
                  <div style={{ fontSize: 11, color: COLORS.dimmed, marginTop: 4 }}>Basé sur l'objectif "{profile.goal}"</div>
                </div>
                <button onClick={() => setTab('dashboard')} style={{ marginTop: 14, width: '100%', background: COLORS.mint, color: COLORS.bg, border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                  ✓ Enregistrer et suivre
                </button>
              </div>
            ) : (
              <div style={{ ...card, textAlign: 'center', color: COLORS.muted, fontSize: 13 }}>
                Renseignez votre âge, poids et taille pour calculer vos besoins.
              </div>
            )}
          </div>
        )}

        {/* ────────── DASHBOARD ────────── */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {tdeeData && (
              <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' }}>
                <span style={{ fontSize: 12, color: COLORS.muted }}>Cible journalière</span>
                <span style={{ fontWeight: 700, color: COLORS.mint }}>{tdeeData.target} kcal</span>
                <span style={{ fontSize: 12, color: COLORS.dimmed }}>{profile.goal}</span>
              </div>
            )}
            <div style={{ ...card, display: 'flex', justifyContent: 'center' }}>
              <RingChart consumed={consumed} burned={burned} goal={kcalGoal} />
            </div>
            <div style={card}>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 14, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Macronutriments</div>
              <MacroBar label="Protéines" value={totalP} max={macroTargets.p} color={COLORS.mint} />
              <MacroBar label="Glucides" value={totalG} max={macroTargets.g} color={COLORS.amber} />
              <MacroBar label="Lipides" value={totalL} max={macroTargets.l} color={COLORS.coral} />
            </div>
            <div style={card}>
              <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Semaine</div>
              <WeekChart data={weekData} goal={kcalGoal} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Apport', value: `${Math.round(consumed)} kcal`, icon: '🍽', color: COLORS.amber },
                { label: 'Dépense', value: `${Math.round(burned)} kcal`, icon: '🔥', color: COLORS.mint },
              ].map((s) => (
                <div key={s.label} style={{ ...card, textAlign: 'center' }}>
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ────────── FOOD ────────── */}
        {tab === 'food' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={() => { setFoodMode('search'); setShowFood(true) }}
                style={{ background: COLORS.card, color: COLORS.text, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '14px 10px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
              >
                <span style={{ fontSize: 24 }}>🔍</span>
                Rechercher
              </button>
              <button
                onClick={() => { setFoodMode('photo'); setShowFood(true) }}
                style={{ background: `linear-gradient(135deg, ${COLORS.mint}22, ${COLORS.amber}22)`, color: COLORS.mint, border: `1px solid ${COLORS.mint}55`, borderRadius: 12, padding: '14px 10px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
              >
                <span style={{ fontSize: 24 }}>📸</span>
                Photo IA
              </button>
            </div>

            {mealGroups.map((g) => (
              <div key={g.label} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{g.label}</div>
                  <div style={{ color: COLORS.amber, fontWeight: 600, fontSize: 13 }}>{Math.round(g.total)} kcal</div>
                </div>
                {g.items.length === 0 ? (
                  <div style={{ color: COLORS.dimmed, fontSize: 12, fontStyle: 'italic' }}>Aucun aliment</div>
                ) : (
                  g.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${COLORS.border}` }}>
                      <div>
                        <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {item.fromPhoto && (
                            <span style={{ fontSize: 10, background: `${COLORS.mint}22`, color: COLORS.mint, borderRadius: 4, padding: '1px 4px', fontWeight: 600 }}>IA</span>
                          )}
                          {item.name}
                        </div>
                        <div style={{ fontSize: 11, color: COLORS.muted }}>
                          ×{item.qty} · P:{Math.round(item.p * item.qty)}g G:{Math.round(item.g * item.qty)}g L:{Math.round(item.l * item.qty)}g
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ color: COLORS.amber, fontSize: 13, fontWeight: 600 }}>{Math.round(item.kcal * item.qty)}</span>
                        <button
                          onClick={() => setMeals((prev) => { const idx = prev.indexOf(item); return prev.filter((_, j) => j !== idx) })}
                          style={{ background: 'none', border: 'none', color: COLORS.dimmed, cursor: 'pointer', fontSize: 16, padding: 0 }}
                        >×</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        )}

        {/* ────────── ACTIVITY ────────── */}
        {tab === 'activity' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <button
              onClick={() => setShowActivity(true)}
              style={{ background: COLORS.mint, color: COLORS.bg, border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 18 }}>+</span> Ajouter une activité
            </button>
            {activities.length === 0 ? (
              <div style={{ ...card, textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>🏃</div>
                <div style={{ color: COLORS.muted, fontSize: 13 }}>Aucune activité enregistrée</div>
              </div>
            ) : (
              <div style={card}>
                <div style={{ fontSize: 12, color: COLORS.muted, marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Activités du jour</div>
                {activities.map((a, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderTop: i > 0 ? `1px solid ${COLORS.border}` : 'none' }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{a.icon} {a.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.muted }}>{a.duration} min</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ color: COLORS.mint, fontWeight: 700 }}>−{a.kcal} kcal</span>
                      <button
                        onClick={() => setActivities((prev) => prev.filter((_, j) => j !== i))}
                        style={{ background: 'none', border: 'none', color: COLORS.dimmed, cursor: 'pointer', fontSize: 16, padding: 0 }}
                      >×</button>
                    </div>
                  </div>
                ))}
                <div style={{ borderTop: `1px solid ${COLORS.border}`, marginTop: 10, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: COLORS.muted, fontSize: 13 }}>Total brûlé</span>
                  <span style={{ color: COLORS.mint, fontWeight: 700 }}>{Math.round(burned)} kcal</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ────────── MODAL: Food search ────────── */}
      {showFood && foodMode === 'search' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,28,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowFood(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.card, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, margin: '0 auto', padding: 20, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Ajouter un aliment</div>
              <button onClick={() => setShowFood(false)} style={{ background: COLORS.border, border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: COLORS.text, fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MEALS.map((m) => (
                <button key={m} onClick={() => setSelMeal(m)} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: selMeal === m ? COLORS.mint : COLORS.border, color: selMeal === m ? COLORS.bg : COLORS.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{m}</button>
              ))}
            </div>
            <input
              placeholder="Rechercher un aliment..." value={foodSearch}
              onChange={(e) => { setFoodSearch(e.target.value); setSelFood(null) }}
              style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: '10px 12px', color: COLORS.text, fontSize: 14 }}
            />
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredFoods.map((f, i) => (
                <div key={i} onClick={() => setSelFood(f)}
                  style={{ padding: '10px 12px', borderRadius: 10, background: selFood === f ? COLORS.surface : 'transparent', border: `1px solid ${selFood === f ? COLORS.mint : COLORS.border}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>P:{f.p}g G:{f.g}g L:{f.l}g</div>
                  </div>
                  <div style={{ color: COLORS.amber, fontWeight: 700, fontSize: 14 }}>{f.kcal} kcal</div>
                </div>
              ))}
            </div>
            {selFood && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0' }}>
                <span style={{ color: COLORS.muted, fontSize: 13 }}>Quantité :</span>
                <button onClick={() => setQty((q) => Math.max(0.5, q - 0.5))} style={{ background: COLORS.border, border: 'none', borderRadius: 8, width: 32, height: 32, color: COLORS.text, fontSize: 18, cursor: 'pointer' }}>−</button>
                <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{qty}</span>
                <button onClick={() => setQty((q) => q + 0.5)} style={{ background: COLORS.border, border: 'none', borderRadius: 8, width: 32, height: 32, color: COLORS.text, fontSize: 18, cursor: 'pointer' }}>+</button>
                <span style={{ color: COLORS.amber, fontWeight: 700, marginLeft: 'auto' }}>{Math.round(selFood.kcal * qty)} kcal</span>
              </div>
            )}
            <button onClick={addMeal} disabled={!selFood} style={{ background: selFood ? COLORS.mint : COLORS.border, color: selFood ? COLORS.bg : COLORS.dimmed, border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: selFood ? 'pointer' : 'default', transition: 'all 0.2s' }}>
              Ajouter
            </button>
          </div>
        </div>
      )}

      {/* ────────── MODAL: Photo IA ────────── */}
      {showFood && foodMode === 'photo' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,28,0.9)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={closePhotoModal}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.card, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, margin: '0 auto', padding: 20, maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>📸 Analyse IA</div>
                <div style={{ fontSize: 11, color: COLORS.muted, marginTop: 2 }}>Photo → valeurs nutritionnelles</div>
              </div>
              <button onClick={closePhotoModal} style={{ background: COLORS.border, border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: COLORS.text, fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MEALS.map((m) => (
                <button key={m} onClick={() => setSelMeal(m)} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: selMeal === m ? COLORS.mint : COLORS.border, color: selMeal === m ? COLORS.bg : COLORS.muted, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>{m}</button>
              ))}
            </div>

            {!photoPreview ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ border: `2px dashed ${COLORS.mint}66`, borderRadius: 14, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', background: `${COLORS.mint}08` }}
              >
                <div style={{ fontSize: 48, marginBottom: 10 }}>📷</div>
                <div style={{ fontWeight: 700, color: COLORS.mint, marginBottom: 6 }}>Choisir une photo</div>
                <div style={{ fontSize: 12, color: COLORS.muted }}>Photo de votre assiette ou repas</div>
                <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoSelect} style={{ display: 'none' }} />
              </div>
            ) : (
              <div style={{ position: 'relative' }}>
                <img src={photoPreview} alt="repas" style={{ width: '100%', borderRadius: 12, maxHeight: 220, objectFit: 'cover' }} />
                <button
                  onClick={() => { setPhotoPreview(null); setPhotoBase64(null); setAnalysisResult(null); setAnalysisError(null) }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%', width: 28, height: 28, color: '#fff', cursor: 'pointer', fontSize: 14 }}
                >×</button>
              </div>
            )}

            {photoPreview && !analysisResult && !analyzing && (
              <button
                onClick={handleAnalyze}
                style={{ background: `linear-gradient(135deg, ${COLORS.mint}, #2BA898)`, color: COLORS.bg, border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                ✨ Analyser avec l'IA
              </button>
            )}

            {analyzing && <Spinner />}

            {analysisError && (
              <div style={{ background: `${COLORS.coral}22`, border: `1px solid ${COLORS.coral}55`, borderRadius: 10, padding: '12px 14px', color: COLORS.coral, fontSize: 13 }}>
                {analysisError}
              </div>
            )}

            {analysisResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{analysisResult.description}</div>
                    <ConfidenceBadge level={analysisResult.confidence} />
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: COLORS.amber }}>{analysisResult.total.kcal}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted }}>kcal total</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    { l: 'Protéines', v: analysisResult.total.p, c: COLORS.mint },
                    { l: 'Glucides', v: analysisResult.total.g, c: COLORS.amber },
                    { l: 'Lipides', v: analysisResult.total.l, c: COLORS.coral },
                  ].map((m) => (
                    <div key={m.l} style={{ background: COLORS.surface, borderRadius: 10, padding: '8px', textAlign: 'center' }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: m.c }}>{Math.round(m.v)}g</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>{m.l}</div>
                    </div>
                  ))}
                </div>

                {analysisResult.note && (
                  <div style={{ background: `${COLORS.amber}15`, border: `1px solid ${COLORS.amber}33`, borderRadius: 10, padding: '10px 12px', fontSize: 12, color: COLORS.amber }}>
                    💡 {analysisResult.note}
                  </div>
                )}

                <div style={{ fontSize: 12, color: COLORS.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Aliments détectés</div>
                {analysisResult.items.map((item, i) => (
                  <div key={i} onClick={() => toggleItem(i)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 10, border: `1px solid ${selectedItems.includes(i) ? COLORS.mint : COLORS.border}`, background: selectedItems.includes(i) ? `${COLORS.mint}12` : 'transparent', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${selectedItems.includes(i) ? COLORS.mint : COLORS.dimmed}`, background: selectedItems.includes(i) ? COLORS.mint : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
                        {selectedItems.includes(i) && <span style={{ color: COLORS.bg, fontSize: 12, fontWeight: 800 }}>✓</span>}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: COLORS.muted }}>P:{item.p}g G:{item.g}g L:{item.l}g</div>
                      </div>
                    </div>
                    <div style={{ color: COLORS.amber, fontWeight: 700, fontSize: 13 }}>{item.kcal} kcal</div>
                  </div>
                ))}

                <button onClick={addPhotoMeals} disabled={selectedItems.length === 0}
                  style={{ background: selectedItems.length > 0 ? COLORS.mint : COLORS.border, color: selectedItems.length > 0 ? COLORS.bg : COLORS.dimmed, border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: selectedItems.length > 0 ? 'pointer' : 'default', transition: 'all 0.2s' }}>
                  Ajouter {selectedItems.length > 0 ? `(${selectedItems.length} aliment${selectedItems.length > 1 ? 's' : ''})` : ''}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ────────── MODAL: Activity ────────── */}
      {showActivity && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(10,18,28,0.85)', zIndex: 100, display: 'flex', alignItems: 'flex-end' }} onClick={() => setShowActivity(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: COLORS.card, borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 420, margin: '0 auto', padding: 20, maxHeight: '80vh', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Ajouter une activité</div>
              <button onClick={() => setShowActivity(false)} style={{ background: COLORS.border, border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: COLORS.text, fontSize: 16 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
              {['Maison', 'Cardio', 'Sport'].map((group) => (
                <div key={group}>
                  <div style={{ fontSize: 11, color: COLORS.dimmed, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, padding: '8px 4px 4px' }}>{group}</div>
                  {ACTIVITY_DB.filter((a) => a.group === group).map((a, i) => (
                    <div key={i} onClick={() => setSelActivity(a)}
                      style={{ padding: '11px 12px', marginBottom: 5, borderRadius: 10, border: `1px solid ${selActivity === a ? COLORS.mint : COLORS.border}`, background: selActivity === a ? `${COLORS.mint}15` : 'transparent', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.15s' }}>
                      <span style={{ fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>{a.icon}</span>
                        <span style={{ color: selActivity === a ? COLORS.mint : COLORS.text }}>{a.name}</span>
                      </span>
                      <span style={{ color: COLORS.mint, fontSize: 12, fontWeight: 600 }}>{a.kcalPerMin} kcal/min</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
            {selActivity && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ color: COLORS.muted, fontSize: 13 }}>Durée :</span>
                <button onClick={() => setDuration((d) => Math.max(5, d - 5))} style={{ background: COLORS.border, border: 'none', borderRadius: 8, width: 32, height: 32, color: COLORS.text, fontSize: 18, cursor: 'pointer' }}>−</button>
                <span style={{ fontWeight: 700, minWidth: 40, textAlign: 'center' }}>{duration} min</span>
                <button onClick={() => setDuration((d) => d + 5)} style={{ background: COLORS.border, border: 'none', borderRadius: 8, width: 32, height: 32, color: COLORS.text, fontSize: 18, cursor: 'pointer' }}>+</button>
                <span style={{ color: COLORS.mint, fontWeight: 700, marginLeft: 'auto' }}>−{Math.round(selActivity.kcalPerMin * duration)} kcal</span>
              </div>
            )}
            <button onClick={addActivity} disabled={!selActivity} style={{ background: selActivity ? COLORS.mint : COLORS.border, color: selActivity ? COLORS.bg : COLORS.dimmed, border: 'none', borderRadius: 12, padding: '14px', fontSize: 14, fontWeight: 700, cursor: selActivity ? 'pointer' : 'default', transition: 'all 0.2s' }}>
              Ajouter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
