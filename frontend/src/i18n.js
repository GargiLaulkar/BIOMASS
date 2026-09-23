import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import hi from './locales/hi.json';
import mr from './locales/mr.json';

const savedLanguage = localStorage.getItem('bioplan_language');

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi }, mr: { translation: mr } },
  lng: ['en', 'hi', 'mr'].includes(savedLanguage) ? savedLanguage : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (language) => {
  localStorage.setItem('bioplan_language', language);
  document.documentElement.lang = language;
});

export default i18n;
