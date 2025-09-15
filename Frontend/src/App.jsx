/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import axios from 'axios'
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, CartesianGrid, Legend, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts'
import dayjs from 'dayjs'
import advancedFormat from 'dayjs/plugin/advancedFormat'
import { 
  WiDaySunny, WiCloudy, WiRain, WiSnow, WiThunderstorm, 
  WiFog, WiDayCloudy, WiNightClear, WiHumidity, WiStrongWind,
  WiBarometer, WiSunrise, WiSunset, WiDirectionUp 
} from 'react-icons/wi'
import { 
  BsDropletHalf, BsEye, BsCloudRainHeavy, BsUmbrella, 
  BsSearch, BsGeoAlt, BsArrowLeftRight, BsThreeDotsVertical 
} from 'react-icons/bs'
import { FiRefreshCw, FiMapPin, FiNavigation } from 'react-icons/fi'
import { RiCelsiusLine, RiFahrenheitLine } from 'react-icons/ri'

dayjs.extend(advancedFormat)

const API_KEY = import.meta.env.VITE_OPENWEATHER_KEY

// Custom weather icons mapping
const WeatherIcon = ({ code, isDay = true, size = 48, className = '' }) => {
  const iconProps = { size, className }
  
  // Map OpenWeatherMap icon codes to react-icons
  const iconMap = {
    '01d': <WiDaySunny {...iconProps} />,
    '01n': <WiNightClear {...iconProps} />,
    '02d': <WiDayCloudy {...iconProps} />,
    '02n': <WiDayCloudy {...iconProps} />,
    '03d': <WiCloudy {...iconProps} />,
    '03n': <WiCloudy {...iconProps} />,
    '04d': <WiCloudy {...iconProps} />,
    '04n': <WiCloudy {...iconProps} />,
    '09d': <WiRain {...iconProps} />,
    '09n': <WiRain {...iconProps} />,
    '10d': <WiRain {...iconProps} />,
    '10n': <WiRain {...iconProps} />,
    '11d': <WiThunderstorm {...iconProps} />,
    '11n': <WiThunderstorm {...iconProps} />,
    '13d': <WiSnow {...iconProps} />,
    '13n': <WiSnow {...iconProps} />,
    '50d': <WiFog {...iconProps} />,
    '50n': <WiFog {...iconProps} />,
  }
  
  return iconMap[code] || <WiDaySunny {...iconProps} />
}

// Custom tooltip for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-800/90 p-3 rounded-lg border border-slate-700/50 backdrop-blur-sm">
        <p className="text-slate-200 font-medium">{label}</p>
        <p className="text-blue-400">{`${payload[0].value}°`}</p>
      </div>
    )
  }
  return null
}

// UV Index indicator with color coding
const UvIndicator = ({ uvIndex }) => {
  const getUvLevel = (uv) => {
    if (uv <= 2) return { level: 'Low', color: 'text-green-400', bg: 'bg-green-400/20' }
    if (uv <= 5) return { level: 'Moderate', color: 'text-yellow-400', bg: 'bg-yellow-400/20' }
    if (uv <= 7) return { level: 'High', color: 'text-orange-400', bg: 'bg-orange-400/20' }
    if (uv <= 10) return { level: 'Very High', color: 'text-red-400', bg: 'bg-red-400/20' }
    return { level: 'Extreme', color: 'text-purple-400', bg: 'bg-purple-400/20' }
  }
  
  const uvData = getUvLevel(uvIndex)
  
  return (
    <div className={`px-3 py-1 rounded-full ${uvData.bg} ${uvData.color} text-xs font-medium`}>
      {uvIndex} ({uvData.level})
    </div>
  )
}

// Wind direction indicator
const WindDirection = ({ deg, speed }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-6 h-6 rounded-full bg-slate-700/30 flex items-center justify-center">
        <WiStrongWind size={16} className="text-slate-300" />
        <FiNavigation 
          size={12} 
          className="absolute text-blue-400" 
          style={{ transform: `rotate(${deg}deg)` }} 
        />
      </div>
      <span>{Math.round(speed)} m/s</span>
    </div>
  )
}

// Sunrise/Sunset progress indicator
const SunProgress = ({ sunrise, sunset, current }) => {
  const sunriseTime = dayjs.unix(sunrise)
  const sunsetTime = dayjs.unix(sunset)
  const currentTime = dayjs.unix(current)
  const dayDuration = sunsetTime.diff(sunriseTime, 'minute')
  const currentProgress = currentTime.diff(sunriseTime, 'minute')
  const progressPercent = Math.min(100, Math.max(0, (currentProgress / dayDuration) * 100))
  
  return (
    <div className="mt-2">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{sunriseTime.format('HH:mm')}</span>
        <span>{sunsetTime.format('HH:mm')}</span>
      </div>
      <div className="relative h-2 bg-gradient-to-r from-blue-900 via-yellow-500 to-orange-900 rounded-full overflow-hidden">
        <div 
          className="absolute top-0 bottom-0 w-1.5 bg-white rounded-full"
          style={{ left: `${progressPercent}%` }}
        ></div>
      </div>
    </div>
  )
}

// Hourly forecast item component
const HourlyItem = ({ data, isNow = false }) => {
  return (
    <div className="flex flex-col items-center p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
      <div className={`text-sm ${isNow ? 'font-bold text-blue-300' : 'text-slate-300'}`}>
        {isNow ? 'Now' : dayjs.unix(data.dt).format('HH:mm')}
      </div>
      <div className="my-2">
        <WeatherIcon code={data.weather[0].icon} size={32} />
      </div>
      <div className="text-lg font-medium">{Math.round(data.temp)}°</div>
      <div className="text-xs text-slate-400 mt-1 capitalize">{data.weather[0].description}</div>
      <div className="flex items-center text-xs text-slate-400 mt-2">
        <BsDropletHalf className="mr-1" />
        {data.pop ? Math.round(data.pop * 100) : 0}%
      </div>
    </div>
  )
}

// Daily forecast item component
const DailyItem = ({ data }) => {
  return (
    <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <div className="w-16 font-medium">{dayjs.unix(data.dt).format('ddd')}</div>
        <div className="w-12">
          <WeatherIcon code={data.weather[0].icon} size={36} />
        </div>
        <div className="text-sm capitalize flex-1">{data.weather[0].description}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm text-slate-300">
          {Math.round(data.temp.min)}° / {Math.round(data.temp.max)}°
        </div>
        <div className="flex items-center text-xs text-slate-400">
          <BsDropletHalf className="mr-1" />
          {data.pop ? Math.round(data.pop * 100) : 0}%
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState(null)
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [unit, setUnit] = useState('metric') // 'metric' or 'imperial'
  const [recentSearches, setRecentSearches] = useState([])
  const [showRecent, setShowRecent] = useState(false)

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentWeatherSearches')
    if (saved) {
      setRecentSearches(JSON.parse(saved))
    }
  }, [])

  // Save to recent searches
  const saveToRecentSearches = (search) => {
    const updated = [
      search,
      ...recentSearches.filter(item => item.name !== search.name)
    ].slice(0, 5)
    
    setRecentSearches(updated)
    localStorage.setItem('recentWeatherSearches', JSON.stringify(updated))
  }

  const fetchByCoords = useCallback(async (lat, lon, label) => {
    try {
      setLoading(true)
      setError(null)
      
      const url = `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&units=${unit}&exclude=minutely,alerts&appid=${API_KEY}`
      const res = await axios.get(url)
      setWeather(res.data)
      
      // If we have a label, set location and save to recent searches
      if (label) {
        const locationData = { name: label, lat, lon }
        setLocation(locationData)
        saveToRecentSearches(locationData)
      }
    } catch (err) {
      setError('Failed to fetch weather data')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [unit])

  const fetchByCity = async (city) => {
    if (!city) return
    try {
      setLoading(true)
      setError(null)
      
      const geo = await axios.get(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`)
      if (!geo.data || geo.data.length === 0) {
        setError('Location not found')
        setLoading(false)
        return
      }
      
      const { lat, lon, name, state, country } = geo.data[0]
      const label = `${name}${state ? ', ' + state : ''}, ${country}`
      
      await fetchByCoords(lat, lon, label)
    } catch (err) {
      setError('Failed to fetch location')
      console.error(err)
      setLoading(false)
    }
  }

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not available in this browser')
      return
    }
    setLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        fetchByCoords(latitude, longitude, 'Your location')
      },
      (err) => {
        setError('Permission denied or location unavailable')
        setLoading(false)
      }
    )
  }

  useEffect(() => {
    detectLocation()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      fetchByCity(query.trim())
      setQuery('')
      setShowRecent(false)
    }
  }

  const handleUnitToggle = () => {
    setUnit(prev => prev === 'metric' ? 'imperial' : 'metric')
  }

  // Refresh weather data
  const refreshData = () => {
    if (location) {
      fetchByCoords(location.lat, location.lon, location.name)
    }
  }

  // Process data for charts
  const hourlyChartData = useMemo(() => {
    if (!weather) return []
    return weather.hourly.slice(0, 24).map(h => ({
      time: dayjs.unix(h.dt).format('HH:mm'),
      temp: Math.round(h.temp),
      feelsLike: Math.round(h.feels_like),
      pop: h.pop * 100,
    }))
  }, [weather])

  const dailyChartData = useMemo(() => {
    if (!weather) return []
    return weather.daily.map(d => ({
      day: dayjs.unix(d.dt).format('ddd'),
      max: Math.round(d.temp.max),
      min: Math.round(d.temp.min),
      rain: d.pop * 100,
    }))
  }, [weather])

  const windData = useMemo(() => {
    if (!weather) return []
    return [
      { subject: 'Speed', A: weather.current.wind_speed, fullMark: 20 },
      { subject: 'Gust', A: weather.current.wind_gust || 0, fullMark: 40 },
      { subject: 'Direction', A: 1, fullMark: 1 },
    ]
  }, [weather])

  // Get background based on weather and time of day
  const getBackgroundClass = () => {
    if (!weather) return 'from-slate-900 via-slate-800 to-slate-900'
    
    const hour = dayjs.unix(weather.current.dt).hour()
    const isDayTime = hour > 6 && hour < 20
    const id = weather.current.weather[0].main.toLowerCase()
    
    if (id.includes('cloud')) return isDayTime ? 'from-blue-400 via-blue-300 to-blue-200' : 'from-slate-800 via-slate-700 to-slate-900'
    if (id.includes('rain') || id.includes('drizzle')) return isDayTime ? 'from-blue-600 via-blue-500 to-blue-400' : 'from-slate-800 via-blue-900 to-slate-900'
    if (id.includes('thunder')) return 'from-purple-900 via-blue-900 to-slate-900'
    if (id.includes('snow')) return 'from-blue-100 via-blue-50 to-white'
    if (isDayTime) return 'from-blue-500 via-blue-400 to-yellow-200'
    return 'from-slate-900 via-blue-900 to-slate-800'
  }

  if (!weather) {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${getBackgroundClass()} text-white transition-all duration-1000`}>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-pulse mb-6">
                <WiDaySunny size={80} className="mx-auto" />
              </div>
              <h1 className="text-3xl font-bold mb-4">WeatherSense</h1>
              <p className="text-slate-200 mb-8">Loading your weather data...</p>
              {error && <div className="p-4 bg-red-600/60 rounded mb-4">{error}</div>}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getBackgroundClass()} text-white transition-all duration-1000`}>
      <div className="container mx-auto p-4 lg:p-6">
        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 mb-6 p-4 bg-white/10 rounded-2xl backdrop-blur-md border border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <WiDaySunny size={28} />
            </div>
            <h1 className="text-2xl font-bold">WeatherSense</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={handleUnitToggle}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              {unit === 'metric' ? <RiCelsiusLine /> : <RiFahrenheitLine />}
              <span>°{unit === 'metric' ? 'C' : 'F'}</span>
            </button>
            
            <button 
              onClick={refreshData}
              disabled={loading}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={loading ? 'animate-spin' : ''} />
            </button>
            
            <button 
              onClick={detectLocation}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              <FiNavigation />
            </button>
          </div>
        </header>

        {/* Search Bar */}
        <div className="relative mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <BsSearch className="text-slate-400" />
            </div>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setShowRecent(true)}
              className="w-full p-4 pl-12 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50"
              placeholder="Search city..."
            />
            <button 
              type="submit"
              className="absolute right-2 top-2 p-2 bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors"
            >
              <BsSearch />
            </button>
          </form>
          
          {showRecent && recentSearches.length > 0 && (
            <div className="absolute z-10 w-full mt-2 bg-slate-800/90 backdrop-blur-md rounded-2xl border border-slate-700/50 overflow-hidden">
              <div className="p-2 text-sm text-slate-400 border-b border-slate-700/50">Recent Searches</div>
              {recentSearches.map((item, i) => (
                <button
                  key={i}
                  onClick={() => {
                    fetchByCoords(item.lat, item.lon, item.name)
                    setShowRecent(false)
                  }}
                  className="w-full p-3 text-left hover:bg-slate-700/50 flex items-center gap-3"
                >
                  <FiMapPin className="text-slate-400" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 mb-6 bg-red-600/60 rounded-2xl backdrop-blur-sm">{error}</div>
        )}

        {/* Main Weather Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Current Weather */}
          <div className="lg:col-span-2 p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold">{location?.name}</h2>
                <p className="text-slate-300">{dayjs.unix(weather.current.dt).format('dddd, MMMM Do')}</p>
              </div>
              <div className="flex items-center gap-4">
                <UvIndicator uvIndex={weather.current.uvi} />
                <button className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <BsThreeDotsVertical />
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <WeatherIcon 
                    code={weather.current.weather[0].icon} 
                    size={120} 
                    isDay={weather.current.dt > weather.current.sunrise && weather.current.dt < weather.current.sunset}
                  />
                </div>
                <div>
                  <div className="text-6xl font-bold">{Math.round(weather.current.temp)}°</div>
                  <div className="text-xl capitalize mt-1">{weather.current.weather[0].description}</div>
                  <div className="text-slate-300 mt-2">Feels like {Math.round(weather.current.feels_like)}°</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-6 lg:mt-0">
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <WiHumidity size={32} className="text-blue-400" />
                  <div>
                    <div className="text-sm text-slate-400">Humidity</div>
                    <div className="font-medium">{weather.current.humidity}%</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <WiBarometer size={32} className="text-purple-400" />
                  <div>
                    <div className="text-sm text-slate-400">Pressure</div>
                    <div className="font-medium">{weather.current.pressure} hPa</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <WiStrongWind size={32} className="text-green-400" />
                  <div>
                    <div className="text-sm text-slate-400">Wind</div>
                    <WindDirection deg={weather.current.wind_deg} speed={weather.current.wind_speed} />
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                  <BsEye size={24} className="text-yellow-400" />
                  <div>
                    <div className="text-sm text-slate-400">Visibility</div>
                    <div className="font-medium">{(weather.current.visibility / 1000).toFixed(1)} km</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sunrise/Sunset & Highlights */}
          <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10">
            <h3 className="text-xl font-semibold mb-6">Today's Highlights</h3>
            
            <div className="space-y-5">
              <div className="p-4 bg-white/5 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <WiSunrise size={24} className="text-orange-400" />
                  <span className="font-medium">Sunrise & Sunset</span>
                </div>
                <SunProgress 
                  sunrise={weather.current.sunrise} 
                  sunset={weather.current.sunset} 
                  current={weather.current.dt} 
                />
              </div>
              
              <div className="p-4 bg-white/5 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <BsUmbrella size={20} className="text-blue-400" />
                  <span className="font-medium">Precipitation</span>
                </div>
                <div className="text-3xl font-bold">
                  {weather.hourly[0]?.pop ? Math.round(weather.hourly[0].pop * 100) : 0}%
                </div>
                <div className="text-sm text-slate-400 mt-1">Chance of rain</div>
              </div>
              
              <div className="p-4 bg-white/5 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <BsCloudRainHeavy size={20} className="text-purple-400" />
                  <span className="font-medium">UV Index</span>
                </div>
                <UvIndicator uvIndex={weather.current.uvi} />
                <div className="text-sm text-slate-400 mt-2">Sun protection needed</div>
              </div>
            </div>
          </div>
        </div>

        {/* Hourly Forecast */}
        <div className="p-6 mb-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10">
          <h3 className="text-xl font-semibold mb-6">24-Hour Forecast</h3>
          <div className="overflow-x-auto">
            <div className="flex gap-4 min-w-max pb-4">
              <HourlyItem data={weather.hourly[0]} isNow={true} />
              {weather.hourly.slice(1, 24).map((hour, i) => (
                <HourlyItem key={i} data={hour} />
              ))}
            </div>
          </div>
        </div>

        {/* Charts and Weekly Forecast */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Temperature Chart */}
          <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10">
            <h3 className="text-xl font-semibold mb-6">Temperature Trend</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hourlyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <defs>
                    <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stop="#60a5fa" stopOpacity={0.8}/>
                      <stop offset="95%" stop="#60a5fa" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }} />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="temp" stroke="#60a5fa" fillOpacity={1} fill="url(#tempGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Rain Probability Chart */}
          <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10">
            <h3 className="text-xl font-semibold mb-6">Rain Probability</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <XAxis dataKey="time" tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }} />
                  <YAxis tick={{ fill: 'rgba(255, 255, 255, 0.7)', fontSize: 12 }} />
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pop" fill="#818cf8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Weekly Forecast */}
        <div className="p-6 mb-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10">
          <h3 className="text-xl font-semibold mb-6">7-Day Forecast</h3>
          <div className="space-y-3">
            {weather.daily.map((day, i) => (
              <DailyItem key={i} data={day} />
            ))}
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center text-sm text-slate-400 py-6">
          <p>Powered by OpenWeatherMap • Data updates in real-time</p>
          <p className="mt-2">Remember to add VITE_OPENWEATHER_KEY in your .env</p>
        </footer>
      </div>
    </div>
  )
}