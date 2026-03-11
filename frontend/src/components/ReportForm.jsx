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

const SEV_CONFIG = [
  { n: 1, label: 'Watch',     color: 'bg-emerald-600 border-emerald-600' },
  { n: 2, label: 'Moderate',  color: 'bg-yellow-500 border-yellow-500' },
  { n: 3, label: 'Severe',    color: 'bg-orange-600 border-orange-600' },
  { n: 4, label: 'Critical',  color: 'bg-red-600 border-red-600' },
  { n: 5, label: 'Emergency', color: 'bg-red-900 border-red-900' },
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

  const inputClass = "w-full bg-white dark:bg-navy-700 border border-slate-200 dark:border-navy-600 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 placeholder-slate-400"
  const labelClass = "block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide"

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-navy-800 border border-slate-200 dark:border-navy-600 rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto thin-scroll">

        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-navy-600">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
              <span className="text-sm">🌊</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{t('report.title')}</p>
              <p className="text-xs text-slate-400">Toa Ripoti ya Mafuriko</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-700 rounded-lg transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {status === 'success' ? (
          <div className="p-10 text-center">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-emerald-600 dark:text-emerald-400 font-bold text-lg">{t('report.success')}</p>
            <p className="text-slate-400 text-sm mt-1">Ripoti imehifadhiwa</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-5 py-4 flex flex-col gap-4">

            <div>
              <label className={labelClass}>{t('report.location')}</label>
              <input
                type="text"
                value={form.location}
                onChange={e => set('location', e.target.value)}
                placeholder="e.g. Grogan Area, Nairobi"
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

            {/* Severity */}
            <div>
              <label className={labelClass}>{t('report.severity')}</label>
              <div className="grid grid-cols-5 gap-1.5">
                {SEV_CONFIG.map(({ n, label, color }) => (
                  <button
                    key={n} type="button"
                    onClick={() => set('severity', n)}
                    className={`py-2 rounded-lg text-xs font-bold transition-all border-2 ${
                      form.severity === n
                        ? `${color} text-white`
                        : 'bg-white dark:bg-navy-700 text-slate-400 border-slate-200 dark:border-navy-600 hover:border-slate-300'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5 text-center">
                {SEV_CONFIG.find(s => s.n === form.severity)?.label} — {t(`report.severityLabels.${form.severity}`)}
              </p>
            </div>

            <div>
              <label className={labelClass}>{t('report.waterLevel')}</label>
              <select value={form.water_level} onChange={e => set('water_level', e.target.value)} className={inputClass}>
                {Object.entries(t('report.waterLevels', { returnObjects: true })).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            {/* Rescue checkbox */}
            <label className="flex items-center gap-3 cursor-pointer bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 rounded-xl px-3.5 py-3 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
              <input
                type="checkbox"
                checked={form.needs_rescue}
                onChange={e => set('needs_rescue', e.target.checked)}
                className="w-4 h-4 accent-red-600 shrink-0"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">🆘 {t('report.needsRescue')}</span>
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
              <p className="text-red-500 text-xs text-center bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/50 rounded-lg py-2">{t('report.error')}</p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button" onClick={onClose}
                className="flex-1 bg-slate-100 dark:bg-navy-700 hover:bg-slate-200 dark:hover:bg-navy-600 text-slate-600 dark:text-slate-300 text-sm font-semibold py-2.5 rounded-xl transition-colors"
              >
                {t('report.cancel')}
              </button>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors shadow-sm"
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
