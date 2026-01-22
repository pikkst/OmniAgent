# Migration Guide: Simulations → Supabase Backend

## Ülevaade

OmniAgent on nüüd täielikult migreeritud Supabase andmebaasile. Kõik simulatsioonid ja localStorage põhised lahendused on asendatud reaalsete andmebaasioperatsioonidega.

## Muudatused

### 1. Eemaldatud
- ❌ `localStorage` - ei kasutata enam state salvestamiseks
- ❌ Simuleeritud andmed - kõik andmed tulevad nüüd Supabase'ist
- ❌ `Math.random()` ID-d - kasutame UUID-sid
- ❌ Hardcoded default data - kõik defaults on SQL skriptis

### 2. Lisatud

#### Failid
- ✅ `services/supabase.ts` - Supabase klient ja CRUD operatsioonid
- ✅ `supabase.sql` - Andmebaasi skeemi ja seadistuse skript
- ✅ `.env` ja `.env.example` - Keskkonna muutujad
- ✅ `vite-env.d.ts` - TypeScript tüübidefinitsioonid env muutujatele
- ✅ `SETUP.md` - Detailne seadistusjuhend

#### Dependencid
- ✅ `@supabase/supabase-js` - Supabase klient

### 3. Muudetud

#### App.tsx
**Enne:**
```typescript
const [state, setState] = useState<AppState>(() => {
  const saved = localStorage.getItem('omniagent_v2_state');
  if (saved) return JSON.parse(saved);
  return { /* default values */ };
});

useEffect(() => {
  localStorage.setItem('omniagent_v2_state', JSON.stringify(state));
}, [state]);
```

**Pärast:**
```typescript
const [state, setState] = useState<AppState>({
  // empty initial state
});

useEffect(() => {
  const loadData = async () => {
    const data = await loadAllData(); // from Supabase
    setState(data);
  };
  loadData();
}, []);
```

#### LeadFinder.tsx
**Enne:**
```typescript
const result = await performMarketResearch(...);
updateState({ 
  leads: [...state.leads, ...result.data.leads]
});
```

**Pärast:**
```typescript
const result = await performMarketResearch(...);

// Save each lead to Supabase
for (const leadData of result.data.leads) {
  const savedLead = await createLead(leadData);
  savedLeads.push(savedLead);
}

// Save settings
await setSetting('websiteUrl', url);
await updateUsageTracking(result.cost, result.tokens);

updateState({ 
  leads: [...state.leads, ...savedLeads]
});
```

#### Campaigns.tsx
**Enne:**
```typescript
const interaction = {
  id: Math.random().toString(), // ❌
  type: 'email_sent',
  // ...
};
const updatedLeads = state.leads.map(l => 
  l.id === selectedLeadId ? { ...l, interactions: [...l.interactions, interaction] } : l
);
updateState({ leads: updatedLeads });
```

**Pärast:**
```typescript
// Save to Supabase with UUID
const interaction = await createInteraction({
  leadId: selectedLeadId,
  type: 'email_sent',
  // ...
});

// Update lead status
await updateLead(selectedLeadId, { status: 'contacted' });

// Update local state
const updatedLeads = state.leads.map(l => 
  l.id === selectedLeadId ? { ...l, status: 'contacted', interactions: [...l.interactions, interaction] } : l
);
updateState({ leads: updatedLeads });
```

#### KnowledgeBase.tsx
**Enne:**
```typescript
const entry: KnowledgeEntry = {
  id: Math.random().toString(), // ❌
  topic: newTopic,
  // ...
};
updateState({ knowledgeBase: [...state.knowledgeBase, entry] });
```

**Pärast:**
```typescript
const entry = await createKnowledgeEntry({
  topic: newTopic,
  content: newContent,
  source: 'manual'
});
updateState({ knowledgeBase: [...state.knowledgeBase, entry] });
```

#### SettingsView.tsx
**Enne:**
```typescript
const updated = state.agentConfigs.map(config => 
  config.role === role ? { ...config, selectedModel: modelId } : config
);
updateState({ agentConfigs: updated });
```

**Pärast:**
```typescript
// Update in Supabase first
await updateAgentConfig(role, { selectedModel: modelId });

// Then update local state
const updated = state.agentConfigs.map(config => 
  config.role === role ? { ...config, selectedModel: modelId } : config
);
updateState({ agentConfigs: updated });
```

#### services/gemini.ts
**Enne:**
```typescript
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });
```

**Pärast:**
```typescript
const getAI = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY is not set in .env file');
  }
  return new GoogleGenAI({ apiKey });
};
```

## Supabase API funktsioonid

### Leads
```typescript
getLeads(): Promise<Lead[]>
createLead(lead: Omit<Lead, 'id' | 'interactions'>): Promise<Lead>
updateLead(id: string, updates: Partial<Lead>): Promise<void>
deleteLead(id: string): Promise<void>
```

### Interactions
```typescript
getInteractionsByLead(leadId: string): Promise<Interaction[]>
createInteraction(interaction: Omit<Interaction, 'id'> & { leadId: string }): Promise<Interaction>
```

### Knowledge Base
```typescript
getKnowledgeBase(): Promise<KnowledgeEntry[]>
createKnowledgeEntry(entry: Omit<KnowledgeEntry, 'id' | 'timestamp'>): Promise<KnowledgeEntry>
deleteKnowledgeEntry(id: string): Promise<void>
```

### Social Posts
```typescript
getSocialPosts(): Promise<SocialPost[]>
createSocialPost(post: Omit<SocialPost, 'id' | 'metrics'>): Promise<SocialPost>
updateSocialPost(id: string, updates: Partial<SocialPost>): Promise<void>
```

### Integrations
```typescript
getIntegrations(): Promise<Integration[]>
updateIntegration(id: string, isConnected: boolean): Promise<void>
```

### Agent Configs
```typescript
getAgentConfigs(): Promise<AgentModuleConfig[]>
updateAgentConfig(role: string, config: Partial<AgentModuleConfig>): Promise<void>
```

### Settings
```typescript
getSetting(key: string): Promise<any>
setSetting(key: string, value: any): Promise<void>
```

### Usage Tracking
```typescript
getUsageTracking(): Promise<{ totalSpend: number; totalTokensUsed: number }>
updateUsageTracking(spendDelta: number, tokensDelta: number): Promise<void>
```

### Batch Load
```typescript
loadAllData(): Promise<AppState>
```

## Andmebaasi skeemi tunnused

### Row Level Security (RLS)
Kõik tabelid kasutavad RLS-i. Hetkel on lubatud kõik operatsioonid, kuid see on konfigureeritav vastavalt teie vajadustele.

### Auto-timestamps
Kõik tabelid kasutavad:
- `created_at` - automaatselt seadistatakse INSERT ajal
- `updated_at` - automaatselt uuendatakse UPDATE ajal (trigger)

### UUID-d
Kõik ID-d on UUID formaadis (uuid-ossp extension).

### Indeksid
Kõik sagedasti kasutatud väljad on indekseeritud parema jõudluse tagamiseks.

## Seadistuse kontroll-nimekiri

- [ ] Supabase projekt on loodud
- [ ] `supabase.sql` on käivitatud SQL Editoris
- [ ] `.env` fail on loodud ja sisaldab:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
  - [ ] `VITE_GEMINI_API_KEY`
- [ ] `npm install` on käivitatud
- [ ] Rakendus käivitub ilma vigadeta
- [ ] Andmed laetakse Supabase'ist
- [ ] Leadide loomine töötab
- [ ] Interactions salvestuvad
- [ ] Knowledge Base kirjed salvestuvad

## Testimine

```bash
# Build test
npm run build

# Dev server
npm run dev
```

## Troubleshooting

### "Failed to connect to database"
- Kontrolli `.env` faili olemasolu
- Veendu, et Supabase URL on õige
- Veendu, et anon key on õige

### "Missing Supabase environment variables"
- Veendu, et `.env` fail on projekti juurkaustas
- Restart dev server pärast `.env` muutmist

### Type errors
- Käivita `npm run build` kontrollimaks TypeScript vigu
- Veendu, et `vite-env.d.ts` on olemas

---

**Status:** ✅ Migration complete - kõik simulatsioonid on asendatud Supabase'iga!
