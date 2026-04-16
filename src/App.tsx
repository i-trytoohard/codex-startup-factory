import { useMemo, useRef, useState } from 'react'
import './App.css'

type AxisKey = 'welfare' | 'market' | 'liberty' | 'authority' | 'green' | 'national'
type SwipeAction = 'support' | 'pass'

type ManifestoCard = {
  id: string
  party: string
  family: string
  region: string
  title: string
  slogan: string
  tone: string
  promise: string
  bullets: string[]
  issueTag: string
  weights: Record<AxisKey, number>
}

type RegionProfile = {
  country: string
  cityLabel: string
  note: string
}

type ResultProfile = {
  title: string
  leaning: string
  summary: string
  accent: string
}

const axisLabels: Record<AxisKey, string> = {
  welfare: 'Public welfare',
  market: 'Market freedom',
  liberty: 'Civil liberty',
  authority: 'Strong order',
  green: 'Climate action',
  national: 'National identity',
}

const manifestoCards: ManifestoCard[] = [
  {
    id: 'bjp',
    party: 'Bharatiya Janata Party',
    family: 'National conservative',
    region: 'India',
    title: 'Infra-led growth and a strong national core',
    slogan: 'Build faster. Secure harder. Govern from strength.',
    tone: 'Security + growth',
    promise:
      'A high-energy pitch focused on highways, digital public rails, defense posture, and a more assertive national identity.',
    bullets: ['Mega infrastructure pipeline', 'Manufacturing push', 'Stronger internal security', 'Cultural nationalism'],
    issueTag: 'Growth and order',
    weights: { welfare: 0.32, market: 0.75, liberty: 0.24, authority: 0.86, green: 0.28, national: 0.93 },
  },
  {
    id: 'inc',
    party: 'Indian National Congress',
    family: 'Big-tent center-left',
    region: 'India',
    title: 'Rights-based welfare with institutional repair',
    slogan: 'Protect the safety net. Rebalance the republic.',
    tone: 'Rights + inclusion',
    promise:
      'A social protection pitch centered on jobs, cash support, federal balance, and rebuilding institutions seen as under pressure.',
    bullets: ['Expanded welfare guarantees', 'Youth jobs mission', 'Institutional checks', 'Plural civic identity'],
    issueTag: 'Safety net and inclusion',
    weights: { welfare: 0.9, market: 0.38, liberty: 0.74, authority: 0.29, green: 0.51, national: 0.47 },
  },
  {
    id: 'aap',
    party: 'Aam Aadmi Party',
    family: 'Urban governance reform',
    region: 'India',
    title: 'Everyday governance that feels instantly visible',
    slogan: 'Fix schools. Fix clinics. Make government tangible.',
    tone: 'Service delivery',
    promise:
      'A practical city-first message about public schools, neighborhood clinics, lower utility pressure, and anti-corruption credibility.',
    bullets: ['School and clinic upgrades', 'Affordable utilities', 'Local accountability', 'Middle-class service focus'],
    issueTag: 'Urban reform',
    weights: { welfare: 0.78, market: 0.41, liberty: 0.66, authority: 0.35, green: 0.61, national: 0.34 },
  },
  {
    id: 'left',
    party: 'Left Democratic Bloc',
    family: 'Democratic socialist',
    region: 'India',
    title: 'Workers, redistribution, and anti-privatization',
    slogan: 'Put labor ahead of capital and public systems ahead of profit.',
    tone: 'Class justice',
    promise:
      'A combative labor-forward manifesto stressing stronger unions, public ownership, aggressive redistribution, and price stability.',
    bullets: ['Labor protections', 'Public-sector expansion', 'Higher wealth taxation', 'Anti-privatization stance'],
    issueTag: 'Redistribution',
    weights: { welfare: 0.97, market: 0.14, liberty: 0.62, authority: 0.41, green: 0.72, national: 0.22 },
  },
  {
    id: 'regional',
    party: 'Regional Federal Front',
    family: 'Regional autonomy coalition',
    region: 'India',
    title: 'State pride, regional rights, and local delivery',
    slogan: 'Keep power closer to the people who live with the consequences.',
    tone: 'Federal autonomy',
    promise:
      'A coalition-style message emphasizing regional identity, linguistic pride, stronger state finances, and practical local development.',
    bullets: ['More state autonomy', 'Regional investment', 'Language and culture protections', 'Local coalition politics'],
    issueTag: 'Regional voice',
    weights: { welfare: 0.63, market: 0.48, liberty: 0.69, authority: 0.33, green: 0.43, national: 0.54 },
  },
  {
    id: 'green',
    party: 'Future India Collective',
    family: 'Youth climate reform',
    region: 'India',
    title: 'Clean-air patriotism and next-generation jobs',
    slogan: 'Make the future employable, breathable, and livable.',
    tone: 'Climate + youth',
    promise:
      'A future-facing demo manifesto around green jobs, startup incentives, cleaner cities, public transit, and data-led governance.',
    bullets: ['Green jobs mission', 'Mass transit and clean air', 'Startup acceleration', 'Tech-forward public systems'],
    issueTag: 'Future economy',
    weights: { welfare: 0.61, market: 0.64, liberty: 0.71, authority: 0.28, green: 0.96, national: 0.42 },
  },
]

const initialScores: Record<AxisKey, number> = {
  welfare: 0,
  market: 0,
  liberty: 0,
  authority: 0,
  green: 0,
  national: 0,
}

function getRegionProfile(): RegionProfile {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const language = typeof navigator !== 'undefined' ? navigator.language : 'en-IN'

  if (timezone.includes('Kolkata') || language.endsWith('-IN') || language === 'hi') {
    return {
      country: 'India',
      cityLabel: 'India signal detected',
      note: 'This demo is currently tuned to India-style party messaging based on your browser locale/time zone.',
    }
  }

  return {
    country: 'your region',
    cityLabel: 'Generic region mode',
    note: 'This demo could be localized to any country by swapping the manifesto deck.',
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`
}

function describeResult(scores: Record<AxisKey, number>): ResultProfile {
  const welfareVsMarket = scores.welfare - scores.market
  const libertyVsAuthority = scores.liberty - scores.authority
  const greenVsNational = scores.green - scores.national

  if (welfareVsMarket > 0.18 && libertyVsAuthority > 0.12) {
    return {
      title: 'Civic Progressive',
      leaning: 'Center-left, plural, services-first',
      summary:
        'You favor public systems that visibly improve daily life, while still wanting rights, accountability, and coalition-style politics.',
      accent: 'var(--accent-progressive)',
    }
  }

  if (welfareVsMarket > 0.2 && libertyVsAuthority <= 0.12) {
    return {
      title: 'Welfare Populist',
      leaning: 'Redistributive with a state-first instinct',
      summary:
        'You respond strongest to protection, affordability, and material guarantees, even if that means a more interventionist state.',
      accent: 'var(--accent-populist)',
    }
  }

  if (welfareVsMarket <= 0.18 && libertyVsAuthority > 0.14 && greenVsNational > 0.08) {
    return {
      title: 'Future Liberal',
      leaning: 'Reformist, climate-aware, opportunity-driven',
      summary:
        'You like competence, openness, and growth, but you still want the future economy to feel fair, breathable, and modern.',
      accent: 'var(--accent-future)',
    }
  }

  return {
    title: 'Order and Growth Conservative',
    leaning: 'National-development oriented',
    summary:
      'You prioritize decisive government, economic momentum, and a strong national narrative over looser coalition-style politics.',
    accent: 'var(--accent-conservative)',
  }
}

function App() {
  const region = useMemo(() => getRegionProfile(), [])
  const [index, setIndex] = useState(0)
  const [scores, setScores] = useState(initialScores)
  const [history, setHistory] = useState<{ party: string; action: SwipeAction }[]>([])
  const [dragX, setDragX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef<number | null>(null)
  const currentCard = manifestoCards[index]
  const completed = index >= manifestoCards.length

  const topMatches = useMemo(() => {
    const partyScores = manifestoCards.map((card) => {
      const resonance = (Object.keys(card.weights) as AxisKey[]).reduce((sum, key) => sum + scores[key] * card.weights[key], 0)
      return { party: card.party, resonance }
    })

    return partyScores.sort((a, b) => b.resonance - a.resonance).slice(0, 3)
  }, [scores])

  const totalSwipes = history.length
  const supportCount = history.filter((entry) => entry.action === 'support').length
  const supportRate = totalSwipes === 0 ? 0 : supportCount / totalSwipes
  const result = describeResult(
    totalSwipes === 0
      ? initialScores
      : (Object.keys(scores) as AxisKey[]).reduce(
          (acc, key) => ({ ...acc, [key]: clamp(scores[key] / totalSwipes, 0, 1) }),
          {} as Record<AxisKey, number>,
        ),
  )

  const normalizedScores = useMemo(() => {
    const divisor = Math.max(totalSwipes, 1)
    return (Object.keys(scores) as AxisKey[]).reduce(
      (acc, key) => ({ ...acc, [key]: clamp(scores[key] / divisor, 0, 1) }),
      {} as Record<AxisKey, number>,
    )
  }, [scores, totalSwipes])

  const handleDecision = (action: SwipeAction) => {
    if (!currentCard) return

    const multiplier = action === 'support' ? 1 : -0.45

    setScores((previous) => {
      const next = { ...previous }

      ;(Object.keys(currentCard.weights) as AxisKey[]).forEach((key) => {
        next[key] += currentCard.weights[key] * multiplier
      })

      return next
    })

    setHistory((previous) => [...previous, { party: currentCard.party, action }])
    setIndex((previous) => previous + 1)
    setDragX(0)
    setIsDragging(false)
    startXRef.current = null
  }

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (completed) return
    startXRef.current = event.clientX
    setIsDragging(true)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!isDragging || startXRef.current === null) return
    setDragX(event.clientX - startXRef.current)
  }

  const onPointerUp = () => {
    if (!isDragging) return

    if (dragX > 110) {
      handleDecision('support')
      return
    }

    if (dragX < -110) {
      handleDecision('pass')
      return
    }

    setDragX(0)
    setIsDragging(false)
    startXRef.current = null
  }

  const progress = index / manifestoCards.length

  return (
    <main className="political-app">
      <section className="hero-panel">
        <div className="hero-copy">
          <span className="eyebrow">Demo concept</span>
          <h1>Political Leaning</h1>
          <p>
            Swipe through manifesto-style campaign pitches, react to what clicks, and reveal a clean political personality profile at the end.
          </p>
        </div>

        <div className="hero-meta">
          <div className="meta-pill strong">{region.cityLabel}</div>
          <div className="meta-pill">Tinder-style manifesto matcher</div>
          <div className="meta-pill">Demo data, showcase UI</div>
        </div>

        <p className="hero-note">{region.note}</p>
      </section>

      <section className="dashboard-strip" aria-label="Session overview">
        <article className="dashboard-card">
          <span className="dashboard-label">Deck progress</span>
          <strong>{Math.round(progress * 100)}%</strong>
          <div className="progress-bar">
            <span style={{ width: `${progress * 100}%` }} />
          </div>
        </article>

        <article className="dashboard-card">
          <span className="dashboard-label">Manifestos liked</span>
          <strong>{supportCount}</strong>
          <p>{formatPercent(supportRate)} support rate</p>
        </article>

        <article className="dashboard-card">
          <span className="dashboard-label">Deck region</span>
          <strong>{region.country}</strong>
          <p>Party messaging tuned for demo localization</p>
        </article>
      </section>

      <section className="experience-grid">
        <div className="deck-column">
          <div className="stack-caption">
            <span>Swipe left</span>
            <span>Not me</span>
            <span>Swipe right</span>
          </div>

          <div className="card-stack">
            {!completed && manifestoCards[index + 1] ? (
              <article className="manifesto-card manifesto-card-back" aria-hidden="true">
                <div className="manifesto-gradient manifesto-gradient-muted" />
                <div className="manifesto-back-copy">
                  <span>{manifestoCards[index + 1].family}</span>
                  <strong>{manifestoCards[index + 1].party}</strong>
                </div>
              </article>
            ) : null}

            {!completed && currentCard ? (
              <article
                className="manifesto-card manifesto-card-front"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                style={{
                  transform: `translateX(${dragX}px) rotate(${dragX / 22}deg)`,
                  transition: isDragging ? 'none' : 'transform 220ms ease',
                }}
              >
                <div className={`swipe-indicator ${dragX > 40 ? 'visible support' : ''}`}>Aligns</div>
                <div className={`swipe-indicator ${dragX < -40 ? 'visible pass' : ''}`}>Reject</div>

                <div className="manifesto-gradient" />

                <header className="manifesto-header">
                  <div>
                    <span className="party-family">{currentCard.family}</span>
                    <h2>{currentCard.party}</h2>
                  </div>
                  <span className="issue-tag">{currentCard.issueTag}</span>
                </header>

                <div className="manifesto-body">
                  <span className="tone-badge">{currentCard.tone}</span>
                  <h3>{currentCard.title}</h3>
                  <p>{currentCard.promise}</p>

                  <blockquote>{currentCard.slogan}</blockquote>

                  <ul className="promise-list">
                    {currentCard.bullets.map((bullet) => (
                      <li key={bullet}>{bullet}</li>
                    ))}
                  </ul>
                </div>

                <footer className="manifesto-footer">
                  <span>Left for mismatch</span>
                  <span>Right for resonance</span>
                </footer>
              </article>
            ) : (
              <section className="result-card" style={{ ['--result-accent' as string]: result.accent }}>
                <span className="eyebrow">Your political personality</span>
                <h2>{result.title}</h2>
                <p className="result-leaning">{result.leaning}</p>
                <p>{result.summary}</p>

                <div className="result-match-list">
                  {topMatches.map((match, matchIndex) => (
                    <div key={match.party} className="result-match">
                      <span>#{matchIndex + 1}</span>
                      <strong>{match.party}</strong>
                      <em>{formatPercent(clamp(match.resonance / 3.1, 0, 1))} affinity</em>
                    </div>
                  ))}
                </div>

                <button className="primary-button" onClick={() => window.location.reload()}>
                  Run the demo again
                </button>
              </section>
            )}
          </div>

          {!completed ? (
            <div className="action-row">
              <button className="ghost-button" onClick={() => handleDecision('pass')}>
                Swipe left
              </button>
              <button className="primary-button" onClick={() => handleDecision('support')}>
                Swipe right
              </button>
            </div>
          ) : null}
        </div>

        <aside className="insight-panel">
          <section className="insight-card">
            <span className="eyebrow">Live leaning map</span>
            <h2>How your swipes are shaping the profile</h2>
            <div className="axis-list">
              {(Object.keys(axisLabels) as AxisKey[]).map((key) => (
                <div key={key} className="axis-row">
                  <div className="axis-meta">
                    <span>{axisLabels[key]}</span>
                    <strong>{formatPercent(normalizedScores[key])}</strong>
                  </div>
                  <div className="axis-bar">
                    <span style={{ width: `${normalizedScores[key] * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="insight-card muted">
            <span className="eyebrow">Demo notes</span>
            <h2>What makes this showcase work</h2>
            <ul className="notes-list">
              <li>Region-aware deck framing</li>
              <li>Swipe interaction with visible card physics</li>
              <li>Clear political personality reveal</li>
              <li>Enough realism to demo, without backend complexity</li>
            </ul>
          </section>
        </aside>
      </section>
    </main>
  )
}

export default App
