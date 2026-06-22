import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import api from '../lib/api'
import Logo from '../components/Logo'

interface Region {
  id: string
  region: string
  city: string
}

interface Variety {
  id: string
  name_uk: string
}

interface Category {
  id: string
  name_uk: string
  name_lat: string | null
  type: 'vegetable' | 'flower' | 'berry' | 'tree' | 'herb'
  varieties: Variety[]
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

interface Profile {
  region_id: string | null
  plot_type: string | null
  selected_varieties: string[] | null
}

export default function OnboardingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [regions, setRegions] = useState<Region[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [regionId, setRegionId] = useState('')
  const [regionSearch, setRegionSearch] = useState('')
  const [plotType, setPlotType] = useState('')
  const [selectedCrops, setSelectedCrops] = useState<Set<string>>(new Set())   // variety ids
  const [cropFilter, setCropFilter] = useState<string>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())             // expanded category ids
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<Region[]>('/api/regions'),
      api.get<Category[]>('/api/categories'),
      api.get<Profile>('/api/users/me').catch(() => ({ data: null })),
    ])
      .then(([rr, cr, pr]) => {
        setRegions(rr.data)
        setCategories(cr.data)

        const profile = pr.data
        if (profile) {
          if (profile.region_id)    setRegionId(profile.region_id)
          if (profile.plot_type)    setPlotType(profile.plot_type)
          if (profile.selected_varieties?.length) setSelectedCrops(new Set(profile.selected_varieties))
          // Skip to crops step if region + plot type already configured
          if (profile.region_id && profile.plot_type) setStep(2)
        }
      })
      .catch(() => toast.error('Не вдалось завантажити дані. Перевірте, що сервер запущено.'))
      .finally(() => setLoadingData(false))
  }, [])

  const filteredRegions = regions.filter((r) =>
    r.region.toLowerCase().includes(regionSearch.toLowerCase()) ||
    r.city.toLowerCase().includes(regionSearch.toLowerCase())
  )

  const filteredCategories = cropFilter === 'all' ? categories : categories.filter((c) => c.type === cropFilter)

  function toggleVariety(id: string) {
    setSelectedCrops((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Click a category card: single-variety → toggle it; multi → expand the sorts.
  function onCategoryClick(cat: Category) {
    if (cat.varieties.length === 1) toggleVariety(cat.varieties[0].id)
    else toggleExpanded(cat.id)
  }

  function selectedCountIn(cat: Category) {
    return cat.varieties.reduce((n, v) => n + (selectedCrops.has(v.id) ? 1 : 0), 0)
  }

  async function handleFinish() {
    setSubmitting(true)
    try {
      await api.patch('/api/users/me/onboarding', {
        region_id: regionId,
        plot_type: plotType,
        selected_crops: [...selectedCrops],
      })
      navigate('/dashboard')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Помилка збереження')
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

            {loadingData ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-4 border-forest border-t-transparent rounded-full animate-spin" />
              </div>
            ) : regions.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">
                Регіони не знайдено. Запустіть скрипт seed_climate_zones.py у backend/.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                {filteredRegions.length === 0 ? (
                  <div className="col-span-2 py-6 text-center text-gray-400 text-sm">
                    Нічого не знайдено — спробуйте іншу назву
                  </div>
                ) : filteredRegions.map((r) => (
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
            )}
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-80 overflow-y-auto items-start">
              {filteredCategories.map((cat) => {
                const single   = cat.varieties.length === 1
                const count    = selectedCountIn(cat)
                const isOpen   = expanded.has(cat.id)
                const active   = single ? selectedCrops.has(cat.varieties[0]?.id) : count > 0
                return (
                  <div
                    key={cat.id}
                    className={`rounded-xl border-2 transition-colors ${
                      active ? 'border-forest bg-forest/5' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <button
                      onClick={() => onCategoryClick(cat)}
                      className="w-full text-left px-3 py-2.5 flex items-center gap-1.5"
                    >
                      <span>{CROP_TYPE_ICONS[cat.type]}</span>
                      <span className={`text-sm font-medium flex-1 ${active ? 'text-forest' : 'text-gray-700'}`}>
                        {cat.name_uk}
                      </span>
                      {!single && (
                        <span className="flex items-center gap-1 shrink-0">
                          {count > 0 && (
                            <span className="text-xs font-bold text-forest bg-forest/10 rounded-full px-1.5">{count}</span>
                          )}
                          <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </span>
                      )}
                    </button>

                    {/* Sorts — slide-down via grid-rows trick */}
                    {!single && (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateRows: isOpen ? '1fr' : '0fr',
                          transition: 'grid-template-rows 0.25s ease',
                        }}
                      >
                        <div className="overflow-hidden">
                          <div className="px-2 pb-2 pt-0.5 flex flex-wrap gap-1.5 border-t border-forest/10">
                            {cat.varieties.map((v) => {
                              const vSel = selectedCrops.has(v.id)
                              return (
                                <button
                                  key={v.id}
                                  onClick={() => toggleVariety(v.id)}
                                  className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                                    vSel
                                      ? 'border-forest bg-forest text-white'
                                      : 'border-gray-200 bg-white text-gray-600 hover:border-forest/40'
                                  }`}
                                >
                                  {v.name_uk}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

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
              disabled={step === 0 ? (!regionId || loadingData) : !plotType}
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
