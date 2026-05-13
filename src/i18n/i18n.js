import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import tr from './locales/tr.json'
import ka from './locales/ka.json'

const STORAGE_KEY = 'apicolony_lang'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: tr },
      ka: { translation: ka },
    },
    lng: localStorage.getItem(STORAGE_KEY) || 'tr',
    fallbackLng: 'tr',
    interpolation: {
      escapeValue: false,
    },
  })

// Dil değiştiğinde localStorage'a kaydet
i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng)
  document.documentElement.lang = lng
})

export default i18n
