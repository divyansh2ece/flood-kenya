import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const API = import.meta.env.VITE_API_BASE_URL

const COUNTIES = [
  'Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Kisii','Nyeri','Meru',
  'Kakamega','Machakos','Kilifi','Kwale','Kitui','Garissa','Turkana',
  'Mandera','Wajir','Marsabit','Isiolo','Lamu','Kajiado','Makueni',
  'Narok','Migori','Homa Bay','Siaya','Vihiga','Bungoma','Busia',
  'Embu','Kirinyaga','Kiambu','Baringo','Kericho','Bomet','Nandi',
  "Trans Nzoia","Uasin Gishu","Elgeyo Marakwet","Samburu","Laikipia",
  "Tana River","Taita Taveta","West Pokot","Tharaka Nithi","Murang'a","Nyandarua",
]

const INITIAL = {
  location: '', county: '', severity: 3, water_level: '',
  needs_rescue: false, description: '', contact: '',
}

export default function ReportForm({ onClose, onSuccess }) {
  const { t } = useTranslation()
  const [form,   setForm]   = useState(INITIAL)
  const [status, setStatus] = useState('idle')

  const set = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('loading')
    try {
      const payload = {
        source:           'web',
        location:         form.location   || undefined,
        county:           form.county     || undefined,
        severity:         form.severity,
        water_level:      form.water_level || undefined,
        needs_rescue:     form.needs_rescue,
        raw_message:      form.description || undefined,
        reporter_contact: form.contact    || undefined,
      }
      const res = await fetch(`${API}/reports/`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      setStatus('success')
      setTimeout(() => { onSuccess?.(); onClose() }, 1800)
    } catch {
      setStatus('error')
      setTimeout(() => setStatus('idle'), 3000)
    }
  }

  const inputClass = "w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
  const labelClass = "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto thin-scroll">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-gray-900 dark:text-white">🌊 {t('report.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xl leading-none">×</button>
        </div>

        {status === 'success' ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-600 dark:text-green-400 font-semibold">{t('report.success')}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-3">
            <div>
              <label className={labelClass}>{t('report.location')}</label>
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. Grogan Area, Nairobi / Kisumu Town"
                className={inputClass}
              />
            </div>

            <div>
              <label className={labelClass}>{t('report.county')}</label>
              <select value={form.county} onChange={e => set('county', e.target.value)} className={inputClass}>
                <option value="">{t('report.selectCounty')}</option>
                {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className={labelClass}>{t('report.severity')}</label>
              <div className="flex gap-1.5">
                {[1,2,3,4,5].map(n => (
                  <button
                    key={n} type="button"
                    onClick={() => set('severity', n)}
                    className={`flex-1 py-2 rounded text-xs font-bold transition-all border ${
                      form.severity === n
                        ? n <= 2 ? 'bg-green-600 text-white border-green-600'
                          : n === 3 ? 'bg-orange-600 text-white border-orange-600'
                          : 'bg-red-600 text-white border-red-600'
                        : 'bg-white dark:bg-gray-800 text-gray-500 border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">{t(`report.severityLabels.${form.severity}`)}</p>
            </div>

            <div>
              <label className={labelClass}>{t('report.waterLevel')}</label>
              <select value={form.water_level} onChange={e => set('water_level', e.target.value)} className={inputClass}>
                {Object.entries(t('report.waterLevels', { returnObjects: true })).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2.5 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              <input
                type="checkbox"
                checked={form.needs_rescue}
                onChange={e => set('needs_rescue', e.target.checked)}
                className="w-4 h-4 accent-red-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">🆘 {t('report.needsRescue')}</span>
            </label>

            <div>
              <label className={labelClass}>{t('report.description')}</label>
              <textarea
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder={t('report.descPlaceholder')}
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className={labelClass}>{t('report.contact')}</label>
              <input
                type="tel"
                value={form.contact}
                onChange={e => set('contact', e.target.value)}
                placeholder="+254 7XX XXX XXX"
                className={inputClass}
              />
            </div>

            {status === 'error' && (
              <p className="text-red-500 text-xs text-center">{t('report.error')}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button" onClick={onClose}
                className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm py-2 rounded-lg transition-colors border border-gray-300 dark:border-gray-700"
              >
                {t('report.cancel')}
              </button>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
              >
                {status === 'loading' ? t('report.submitting') : t('report.submit')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
