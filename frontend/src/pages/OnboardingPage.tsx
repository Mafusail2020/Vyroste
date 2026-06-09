import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../lib/api'
import Logo from '../components/Logo'

interface Region {
  id: string
  region: string
  city: string
}

interface Crop {
  id: string
  name_uk: string
  name_lat: string
  type: 'vegetable' | 'flower' | 'berry' | 'tree' | 'herb'
}

const PLOT_TYPES = [
  { value: 'balcony', label: 'Балкон', icon: '🪴', desc: 'Контейнери та горщики' },
  { value: 'dacha',   label: 'Дача',   icon: '🏡', desc: 'Невелянка ділянка' },
  { value: 'garden',  label: 'Город',  icon: '🌿', desc: 'Повноцінний сад' },
] as const

const CROP_TYPE_ICONS: Record<string, string> = {
  vegetable: '🥦',
  herb:      '🌿',
  flower:    '🌸',
  berry:     '🍓',
  tree:      '🌳',
}

const STEP_LABELS = ['Регіон', 'Тип ділянки', 'Культури']

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [regions, setRegions] = useState<Region[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [regionId, setRegionId] = useState('')
  const [regionSearch, setRegionSearch] = useState('')
  const [plotType, setPlotType] = useState('')
  const [selectedCrops, setSelectedCrops] = useState<Set<string>>(new Set())
  const [cropFilter, setCropFilter] = useState<string>('all')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get<Region[]>('/api/regions').then((r) => setRegions(r.data))
    api.get<Crop[]>('/api/crops').then((r) => setCrops(r.data))
  }, [])

  const filteredRegions = regions.filter((r) =>
    r.region.toLowerCase().includes(regionSearch.toLowerCase()) ||
    r.city.toLowerCase().includes(regionSearch.toLowerCase())
  )

  const filteredCrops = cropFilter === 'all' ? crops : crops.filter((c) => c.type === cropFilter)

  function toggleCrop(id: string) {
    setSelectedCrops((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleFinish() {
    setSubmitting(true)
    setError('')
    try {
      await api.patch('/api/users/me/onboarding', {
        region_id: regionId,
        plot_type: plotType,
        selected_crops: [...selectedCrops],
      })
      navigate('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Помилка збереження')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col">
      {/* Header */}
      <div className="flex justify-center pt-8 pb-4">
        <Logo size="md" showSubtitle={false} />
      </div>

      {/* Step indicator */}
      <div className="flex justify-center gap-2 mb-8">
        {STEP_LABELS.map((label, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
              i === step ? 'text-forest' : i < step ? 'text-gray-400' : 'text-gray-300'
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                i === step
                  ? 'bg-forest text-white'
                  : i < step
                  ? 'bg-gray-300 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {i < step ? '✓' : i + 1}
              </span>
              {label}
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`w-8 h-0.5 ${i < step ? 'bg-gray-300' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4">

        {/* Step 0 — Region */}
        {step === 0 && (
          <div>
            <h2 className="text-2xl font-black text-forest uppercase mb-2">Ваш регіон</h2>
            <p className="text-gray-500 text-sm mb-6">Оберіть область — це визначить терміни посіву</p>

            <input
              type="text"
              placeholder="Пошук регіону або міста..."
              value={regionSearch}
              onChange={(e) => setRegionSearch(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:border-forest text-sm mb-4"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {filteredRegions.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRegionId(r.id)}
                  className={`text-left px-4 py-3 rounded-xl border-2 transition-colors ${
                    regionId === r.id
                      ? 'border-forest bg-forest/5 text-forest'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold text-sm">{r.region}</div>
                  <div className="text-xs text-gray-400">{r.city}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 1 — Plot type */}
        {step === 1 && (
          <div>
            <h2 className="text-2xl font-black text-forest uppercase mb-2">Тип ділянки</h2>
            <p className="text-gray-500 text-sm mb-6">Від цього залежить набір рекомендацій</p>

            <div className="grid grid-cols-3 gap-4">
              {PLOT_TYPES.map(({ value, label, icon, desc }) => (
                <button
                  key={value}
                  onClick={() => setPlotType(value)}
                  className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-colors ${
                    plotType === value
                      ? 'border-forest bg-forest/5'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-4xl">{icon}</span>
                  <span className={`font-bold text-sm uppercase tracking-wide ${plotType === value ? 'text-forest' : 'text-gray-700'}`}>
                    {label}
                  </span>
                  <span className="text-xs text-gray-400 text-center">{desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2 — Crops */}
        {step === 2 && (
          <div>
            <h2 className="text-2xl font-black text-forest uppercase mb-2">Культури</h2>
            <p className="text-gray-500 text-sm mb-4">
              Оберіть що плануєте вирощувати ({selectedCrops.size} обрано)
            </p>

            {/* Type filter */}
            <div className="flex gap-2 flex-wrap mb-4">
              {(['all', 'vegetable', 'herb', 'flower', 'berry'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setCropFilter(type)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors ${
                    cropFilter === type
                      ? 'bg-forest text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {type === 'all' ? 'Усі' : `${CROP_TYPE_ICONS[type]} ${
                    type === 'vegetable' ? 'Овочі' :
                    type === 'herb'      ? 'Зелень' :
                    type === 'flower'    ? 'Квіти' : 'Ягоди'
                  }`}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto">
              {filteredCrops.map((crop) => {
                const selected = selectedCrops.has(crop.id)
                return (
                  <button
                    key={crop.id}
                    onClick={() => toggleCrop(crop.id)}
                    className={`text-left px-3 py-2.5 rounded-xl border-2 transition-colors ${
                      selected
                        ? 'border-forest bg-forest/5'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="mr-1.5">{CROP_TYPE_ICONS[crop.type]}</span>
                    <span className={`text-sm font-medium ${selected ? 'text-forest' : 'text-gray-700'}`}>
                      {crop.name_uk}
                    </span>
                  </button>
                )
              })}
            </div>

            {error && (
              <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pb-12">
          {step > 0 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-6 py-2.5 rounded-xl border-2 border-gray-300 text-gray-600 font-semibold text-sm hover:border-gray-400 transition-colors"
            >
              Назад
            </button>
          ) : <div />}

          {step < 2 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={step === 0 ? !regionId : !plotType}
              className="px-6 py-2.5 rounded-xl bg-forest text-white font-bold text-sm uppercase tracking-wide hover:bg-forest-dark transition-colors disabled:opacity-40"
            >
              Далі
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={submitting || selectedCrops.size === 0}
              className="px-6 py-2.5 rounded-xl bg-forest text-white font-bold text-sm uppercase tracking-wide hover:bg-forest-dark transition-colors disabled:opacity-40"
            >
              {submitting ? 'Збереження...' : 'Розпочати'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
