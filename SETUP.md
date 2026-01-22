# OmniAgent - Autonomous Marketing Hub

OmniAgent on AI-põhine turundusagentide süsteem, mis kasutab **Supabase** andmebaasi ja **Gemini AI** mudeleid.

## 🚀 Seadistamine

### 1. Klooni repositoorium ja installi sõltuvused

```bash
npm install
```

### 2. Supabase seadistamine

1. Mine [Supabase](https://supabase.com) ja logi sisse
2. Ava projekt ID: `vuxhfxnsmorvzwcbospl`
3. Mine **SQL Editor** vahelehele
4. Kopeeri ja käivita `supabase.sql` faili sisu
5. Mine **Settings** > **API** ja kopeeri:
   - Project URL
   - `anon` `public` key

### 3. Gemini API võti

1. Mine [Google AI Studio](https://aistudio.google.com/apikey)
2. Loo uus API võti
3. Kopeeri võti

### 4. Keskkonna muutujad

Loo `.env` fail projekti juurkausta ja lisa järgmised väärtused:

```env
VITE_SUPABASE_URL=https://vuxhfxnsmorvzwcbospl.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

**⚠️ OLULINE:** Asenda `your_anon_key_here` ja `your_gemini_api_key_here` oma tegelike võtmetega!

### 5. Käivita rakendus

```bash
npm run dev
```

Rakendus käivitub aadressil: [http://localhost:3000](http://localhost:3000)

## 📦 Andmebaasi struktuur

Supabase andmebaas sisaldab järgmisi tabeleid:

- **leads** - Klientide leadid
- **interactions** - Suhtlused leadidega
- **knowledge_base** - Teadmiste baas agentidele
- **social_posts** - Sotsiaalmeediat postitused
- **integrations** - Integratsiooni seaded (Gmail, LinkedIn, Twitter)
- **agent_configs** - Agentide konfiguratsioonid
- **settings** - Rakenduse seaded
- **usage_tracking** - API kasutuse jälgimine

## 🔧 Põhifunktsioonid

### Lead Finder
- Otsib automaatselt Google'ist potentsiaalseid kliente
- Salvestab leitud leadid otse Supabase'i
- Kasutab Google Search Groundingut

### Campaigns
- Genereerib personaliseeritud e-kirju
- Saadab kirju läbi Gmail integratsiooni
- Logib kõik interaktsioonid andmebaasi

### Knowledge Base
- Õpeta agentidele äriinfot
- Kõik faktid salvestatakse Supabase'i
- Agendid kasutavad seda infot vastuste genereerimisel

### CRM & Analytics
- Vaata kõiki leade ja nende staatuseid
- Jälgi API kulusid ja tokenite kasutust
- Kõik andmed pärinevad reaalsest andmebaasist

### Settings
- Konfigureeri agentide mudeleid
- Aktiveeri mooduleid
- Ühendu integratsioonidega

## 🔐 Turvalisus

- Row Level Security (RLS) on aktiveeritud kõikidel tabelitel
- API võtmed hoitakse `.env` failis (ei commiti git'i)
- Supabase anon key on avalik, kuid RLS kaitseb andmeid

## 🛠 Arendus

Kõik andmete muutmised käivad läbi Supabase teenuste:

```typescript
import { createLead, updateLead, getLeads } from './services/supabase';
```

## 📝 Märkmed

- LocalStorage on täielikult eemaldatud
- Kõik simulatsioonid on asendatud Supabase päringutega
- Real-time andmete sünkroonimine
- Täielik CRUD funktsionaalsus kõikidele andmetele

## 🐛 Vead ja probleemid

Kui näed "Failed to connect to database" viga:
1. Kontrolli, et `.env` fail on olemas
2. Veendu, et Supabase URL ja anon key on õiged
3. Veendu, et oled käivitanud `supabase.sql` skripti

---

**Powered by Supabase + Gemini AI**
