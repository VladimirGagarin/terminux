import { useCallback, useEffect, useState } from 'react'

const WEATHER_CODES = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Freezing rain',
  67: 'Freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent rain showers',
  85: 'Snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with hail',
  99: 'Thunderstorm with hail',
}

const codeText = (code) => WEATHER_CODES[code] ?? 'Unknown'

export default function WeatherApp({ params = {} }) {
  const [city, setCity] = useState(params.city || '')
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')

  const load = useCallback(async (query) => {
    const name = query.trim()
    if (!name) return
    setStatus('loading')
    setError('')
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`,
      )
      const geo = await geoRes.json()
      const place = geo.results?.[0]
      if (!place) {
        setError(`Could not find “${name}”.`)
        setStatus('error')
        return
      }
      const wRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}` +
          '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m' +
          '&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=5',
      )
      const weather = await wRes.json()
      setData({ place, weather })
      setStatus('ready')
    } catch {
      setError('Weather request failed. Check your connection.')
      setStatus('error')
    }
  }, [])

  const [lastCity, setLastCity] = useState(params.city || '')
  if (params.city && params.city !== lastCity) {
    setLastCity(params.city)
    setCity(params.city)
  }

  useEffect(() => {
    if (!params.city) return undefined
    const timer = setTimeout(() => load(params.city), 0)
    return () => clearTimeout(timer)
  }, [params.city, load])

  const current = data?.weather?.current
  const daily = data?.weather?.daily

  return (
    <div className="app app--pad">
      <div className="app-row">
        <input
          className="app-input"
          placeholder="City name, e.g. Lagos"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') load(city)
          }}
        />
        <button type="button" className="app-btn app-btn--primary" onClick={() => load(city)}>
          Get weather
        </button>
      </div>

      <div className="app-scroll">
        {status === 'idle' && <p className="app-empty">Type a city and press Enter. Powered by Open-Meteo (no key needed).</p>}
        {status === 'loading' && <p className="app-empty">Loading…</p>}
        {status === 'error' && <p className="error">{error}</p>}

        {status === 'ready' && current && (
          <div className="stack">
            <div>
              <h2 className="weather-city">
                {data.place.name}
                {data.place.country ? `, ${data.place.country}` : ''}
              </h2>
              <p className="app-muted">Updated {new Date().toLocaleTimeString()}</p>
            </div>
            <div className="weather-now">
              <span className="weather-temp">{Math.round(current.temperature_2m)}°C</span>
              <div>
                <div className="weather-desc">{codeText(current.weather_code)}</div>
                <div className="app-muted">
                  Feels {Math.round(current.apparent_temperature)}°C · {current.relative_humidity_2m}% humidity · {current.wind_speed_10m} km/h wind
                </div>
              </div>
            </div>

            <div className="weather-week">
              {daily?.time?.map((t, i) => (
                <div key={t} className="weather-day">
                  <span>{new Date(t).toLocaleDateString(undefined, { weekday: 'short' })}</span>
                  <span className="app-muted">{codeText(daily.weather_code[i])}</span>
                  <span>
                    {Math.round(daily.temperature_2m_max[i])}° / {Math.round(daily.temperature_2m_min[i])}°
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
