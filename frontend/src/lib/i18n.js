import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  en: {
    translation: {
      // Navigation
      dashboard: 'Dashboard',
      quotes: 'Quotes',
      billing: 'Billing',
      stock: 'Stock Manager',
      crm: 'CRM',
      analytics: 'Analytics',
      settings: 'Settings',
      // Actions
      new_quote: 'New Quote',
      create_invoice: 'Create Invoice',
      save_draft: 'Save Draft',
      send_whatsapp: 'Send via WhatsApp',
      download_pdf: 'Download PDF',
      // Status
      draft: 'Draft',
      sent: 'Sent',
      approved: 'Approved',
      rejected: 'Rejected',
      paid: 'Paid',
      pending: 'Pending',
      partial: 'Partial',
      overdue: 'Overdue',
    }
  },
  hi: {
    translation: {
      dashboard: 'डैशबोर्ड',
      quotes: 'कोटेशन',
      billing: 'बिलिंग',
      stock: 'स्टॉक',
      crm: 'CRM',
      analytics: 'विश्लेषण',
      settings: 'सेटिंग्स',
      new_quote: 'नया कोटेशन',
      create_invoice: 'इनवॉइस बनाएं',
      save_draft: 'ड्राफ्ट सेव करें',
      send_whatsapp: 'WhatsApp पर भेजें',
      download_pdf: 'PDF डाउनलोड करें',
      draft: 'ड्राफ्ट',
      sent: 'भेजा गया',
      approved: 'स्वीकृत',
      rejected: 'अस्वीकृत',
      paid: 'भुगतान',
      pending: 'लंबित',
      partial: 'आंशिक',
      overdue: 'अतिदेय',
    }
  },
  kn: {
    translation: {
      dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
      quotes: 'ಕೋಟೇಶನ್',
      billing: 'ಬಿಲ್ಲಿಂಗ್',
      new_quote: 'ಹೊಸ ಕೋಟೇಶನ್',
      send_whatsapp: 'WhatsApp ನಲ್ಲಿ ಕಳುಹಿಸಿ',
    }
  },
  ta: {
    translation: {
      dashboard: 'டாஷ்போர்ட்',
      quotes: 'மேற்கோள்',
      billing: 'பில்லிங்',
      new_quote: 'புதிய மேற்கோள்',
      send_whatsapp: 'WhatsApp மூலம் அனுப்பு',
    }
  },
  te: {
    translation: {
      dashboard: 'డాష్‌బోర్డ్',
      quotes: 'కోటేషన్',
      billing: 'బిల్లింగ్',
      new_quote: 'కొత్త కోటేషన్',
    }
  },
  ml: {
    translation: {
      dashboard: 'ഡാഷ്‌ബോർഡ്',
      quotes: 'ക്വോട്ടേഷൻ',
      billing: 'ബില്ലിംഗ്',
      new_quote: 'പുതിയ ക്വോട്ടേഷൻ',
    }
  },
  gu: {
    translation: {
      dashboard: 'ડૅશબૉર્ડ',
      quotes: 'ક્વોટેશન',
      billing: 'બિલિંગ',
      new_quote: 'નવું ક્વોટેશન',
    }
  },
}

i18n.use(initReactI18next).init({
  resources,
  lng: localStorage.getItem('qlekha_lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

export default i18n
export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', script: '🇮🇳' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', script: 'अ' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', script: 'ಕ' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', script: 'த' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', script: 'త' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', script: 'മ' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', script: 'ક' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', script: 'म' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', script: 'ਪ' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', script: 'ক' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ', script: 'ଓ' },
  { code: 'as', name: 'Assamese', native: 'অসমীয়া', script: 'অ' },
  { code: 'ur', name: 'Urdu', native: 'اردو', script: 'ر' },
]
