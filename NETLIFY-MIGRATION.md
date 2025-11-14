# Netlify-migrering - Utvärdering och Risker
**Datum:** 2024-11-14  
**Projekt:** Flowlearn med WordPress Headless CMS

## 📊 Sammanfattning

**Kan projektet flyttas till Netlify?** ✅ **JA** - med vissa anpassningar  
**Behålls WordPress-kopplingen?** ✅ **JA** - fullt stöd  
**Rekommendation:** ⚠️ **Möjlig med villkor** (se detaljer nedan)

---

## 🔄 Nuvarande vs Netlify-arkitektur

### Nuvarande setup
```
┌─────────────────┐
│   VPS Server    │
│   (PM2 + Node)  │ ──→ WordPress API (extern)
│   Port: 4321    │
└─────────────────┘
```

### Netlify-arkitektur
```
┌──────────────────┐
│  Netlify CDN     │
│  (Edge/Serverless)│ ──→ WordPress API (extern)
│  Functions       │
└──────────────────┘
```

---

## ✅ Fördelar med Netlify

### 1. **Enklare deployment**
- Automatisk CI/CD från Git (push → deploy)
- Ingen manuell rsync eller SSH
- Preview deploys för varje branch
- Rollback med ett klick

### 2. **Bättre performance**
- Global CDN (snabbare sidladdning världen över)
- Automatisk image optimization
- Edge Functions för snabbare API-anrop
- HTTP/2 och HTTP/3 som standard

### 3. **Mindre underhåll**
- Ingen PM2-hantering
- Inga server-uppdateringar
- Automatisk SSL-certifikat
- Ingen manuell skalning

### 4. **Developer Experience**
- Deploy previews för PR:s
- Enkla environment variables
- Build logs i webbgränssnittet
- Webhooks för WordPress → trigger rebuild

### 5. **Kostnad**
- Gratis tier: 100 GB/månad, 300 build minuter
- Pro: $19/månad för mer resurser
- Troligen billigare än VPS-kostnad

---

## ⚠️ Utmaningar & Anpassningar

### 1. **SSR-stöd** 🔴 KRITISKT

**Problem:**  
Din nuvarande Astro-konfiguration använder:
```javascript
output: 'server',
adapter: node({ mode: 'standalone' })
```

Detta är en **Node.js-server** som körs kontinuerligt - Netlify kör **serverless functions**.

**Lösningar:**

#### Alternativ A: Hybrid rendering (REKOMMENDERAS)
```javascript
// astro.config.mjs
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'hybrid', // Statisk som standard, opt-in till SSR
  adapter: netlify(),
  // ...
})
```

**Ändringar:**
- Startsidan, tjänstesidor → statiska (byggs vid deploy)
- Bloggen → SSR eller ISR (on-demand eller scheduled rebuild)
- Kontaktformulär → fortsätter fungera (klient-side)

#### Alternativ B: Full static (ENKLASTE)
```javascript
export default defineConfig({
  output: 'static',
  // Ingen adapter behövs
})
```

**Ändringar:**
- Alla sidor byggs statiskt
- WordPress-innehåll hämtas vid build-time
- Trigger rebuild från WordPress via webhook när innehåll uppdateras

#### Alternativ C: Full SSR (DYRAST)
```javascript
export default defineConfig({
  output: 'server',
  adapter: netlify(),
})
```

**Konsekvens:**
- Alla requests går via Edge Functions
- Kostar mer (function invocations)
- Långsammare än hybrid/static

### 2. **WordPress-integration** ✅ FUNGERAR

**Bra nyheter:** WordPress REST API-anrop fungerar perfekt från Netlify!

```javascript
// src/lib/wordpress.ts - inga ändringar behövs!
export async function getPosts() {
  const wpUrl = process.env.WORDPRESS_URL;
  const response = await fetch(`${wpUrl}/wp-json/wp/v2/posts`);
  // ...
}
```

**Rekommenderad approach:**

1. **Statisk generering med webhook-rebuilds:**
   ```
   WordPress uppdatering 
   → Webhook trigger
   → Netlify rebuild
   → Nya sidor publiceras (2-3 min)
   ```

2. **Setup i Netlify:**
   - Build hook URL: `https://api.netlify.com/build_hooks/{hook_id}`
   - WordPress plugin: "Netlify Deploy" eller custom webhook
   - Trigger vid: Post publish, update, delete

3. **Alternativt: Incremental Static Regeneration (ISR)**
   - Endast Astro 4.0+ med experimental flag
   - Bygger om enskilda sidor on-demand

### 3. **Environment Variables** ✅ ENKELT

**Nuvarande `.env`:**
```env
WORDPRESS_URL=https://wordpress.example.com
WORDPRESS_USERNAME=xxx
WORDPRESS_APP_PASSWORD=xxx
PUBLIC_WEB3FORMS_ACCESS_KEY=xxx
```

**Netlify setup:**
1. Site settings → Environment variables
2. Lägg till samma variabler
3. Separera mellan build-time och runtime:
   - Build-time: WordPress credentials (för att hämta data)
   - Runtime: PUBLIC_* variabler (exponeras till klient)

**VIKTIGT:** Ta bort WordPress-credentials från `astro.config.mjs` Vite define-block om du kör statisk build!

### 4. **Formulär** ✅ FUNGERAR

Web3Forms fungerar perfekt på Netlify - ingen ändring behövs.

### 5. **Build-tid** ⚠️ ÖVERVAKA

**Nuvarande build:**
- Lokalt: ~30-60 sekunder
- Synk + restart: ~10-20 sekunder

**Netlify build:**
- Initial: ~2-3 minuter (inkl. npm install)
- Cache: ~1-2 minuter
- WordPress fetch: +30-60 sekunder (beroende på antal posts)

**Tips för snabbare builds:**
```javascript
// Cacha WordPress-data under development
if (import.meta.env.DEV) {
  // Use cached data
}
```

---

## 🚨 Identifierade Risker

### Hög Risk 🔴

1. **SSR-ombyggnad krävs**
   - **Risk:** Projektet måste konfigureras om från Node standalone till Netlify adapter
   - **Impact:** 4-8 timmars arbete
   - **Mitigation:** Testa i preview-branch först

2. **WordPress API rate limits**
   - **Risk:** Många WordPress-anrop vid varje build kan överbelasta
   - **Impact:** Långsamma builds eller blockering
   - **Mitigation:** Implementera caching, använd GraphQL istället för REST

### Medel Risk 🟡

3. **Build-tid för stora bloggar**
   - **Risk:** Om du har >100 bloggposter kan builds ta lång tid
   - **Impact:** Långsammare deployments
   - **Mitigation:** Använd pagination, bygg endast senaste inlägg

4. **Kostnad för SSR**
   - **Risk:** Edge Functions kostar per invocation
   - **Impact:** Kan bli dyrt vid hög trafik
   - **Mitigation:** Använd hybrid mode, statisk när möjligt

5. **Preview-miljö för staging**
   - **Risk:** Nuvarande setup har separata miljöer
   - **Impact:** Behöver konfigurera branch deploys
   - **Mitigation:** Använd Netlify branch deploys

### Låg Risk 🟢

6. **DNS-migration**
   - **Risk:** Driftstörning under DNS-byte
   - **Impact:** 1-2 timmar möjlig downtime
   - **Mitigation:** Förbered DNS-records, sänk TTL i förväg

7. **SSL-certifikat**
   - **Risk:** Temporary SSL-varning under migration
   - **Impact:** Minimal, Netlify ordnar automatiskt
   - **Mitigation:** Ingen - Netlify hanterar detta

---

## 📋 Migreringsplan - Steg för steg

### Fas 1: Förberedelser (2-3 timmar)

1. **Skapa Netlify-konto**
   - Registrera på netlify.com
   - Koppla GitHub-repository

2. **Installera Netlify adapter**
   ```bash
   npm install @astrojs/netlify
   ```

3. **Uppdatera Astro-konfiguration**
   ```javascript
   // astro.config.mjs
   import netlify from '@astrojs/netlify';
   
   export default defineConfig({
     output: 'hybrid', // Eller 'static'
     adapter: netlify(),
     // ... rest av config
   })
   ```

4. **Skapa netlify.toml**
   ```toml
   [build]
     command = "npm run build"
     publish = "dist"
   
   [build.environment]
     NODE_VERSION = "20"
   
   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200
   
   [[headers]]
     for = "/*"
     [headers.values]
       X-Frame-Options = "DENY"
       X-Content-Type-Options = "nosniff"
   ```

### Fas 2: Testdeploy (2-4 timmar)

5. **Konfigurera environment variables i Netlify**
   - WORDPRESS_URL
   - WORDPRESS_USERNAME
   - WORDPRESS_APP_PASSWORD
   - PUBLIC_WEB3FORMS_ACCESS_KEY

6. **Första build**
   - Push till GitHub
   - Netlify bygger automatiskt
   - Kontrollera build logs

7. **Testa preview URL**
   - Testa alla sidor
   - Verifiera WordPress-data
   - Testa kontaktformulär

### Fas 3: WordPress Webhook (1 timme)

8. **Skapa build hook i Netlify**
   - Site settings → Build & deploy → Build hooks
   - Skapa "WordPress Update Hook"
   - Kopiera webhook URL

9. **Konfigurera WordPress**
   - Installera plugin (t.ex. "WP Webhooks")
   - Lägg till Netlify build hook URL
   - Trigger på: post_publish, post_update

### Fas 4: DNS & Go-Live (2-4 timmar)

10. **Konfigurera custom domain**
    - Site settings → Domain management
    - Lägg till flowlearn.se
    - Följ DNS-instruktioner

11. **Uppdatera DNS (hos domänleverantör)**
    ```
    A record: @ → Netlify Load Balancer IP
    CNAME: www → your-site.netlify.app
    ```

12. **SSL-certifikat**
    - Netlify ordnar automatiskt Let's Encrypt
    - Vänta 10-60 minuter på aktivering

13. **Verifiera produktionssajten**
    - Testa alla funktioner
    - Kontrollera SSL
    - Testa WordPress-uppdateringar

### Fas 5: Rensning (1 timme)

14. **Ta bort gamla deployment-scripts**
    - Backup först!
    - Arkivera production-deploy.sh

15. **Uppdatera dokumentation**
    - README.md
    - Deployment-instruktioner

---

## 📊 Jämförelsetabell: VPS vs Netlify

| Aspekt | Nuvarande (VPS + PM2) | Netlify |
|--------|----------------------|---------|
| **Deployment** | Manuell (rsync) | Automatisk (Git push) |
| **Build-tid** | ~1 min | ~2-3 min |
| **Skalning** | Manuell | Automatisk |
| **SSL** | Manuell (Let's Encrypt) | Automatisk |
| **CDN** | Nej (single server) | Ja (global) |
| **Cost** | VPS: ~€10-50/mån | Free-$19/mån |
| **Underhåll** | Server + OS uppdateringar | Ingen |
| **Preview deploys** | Nej | Ja |
| **Rollback** | Manuell | 1 klick |
| **WordPress-integration** | ✅ Fungerar | ✅ Fungerar |
| **Formulär** | ✅ Web3Forms | ✅ Web3Forms |
| **Analytics** | Egen lösning | Netlify Analytics |

---

## 🎯 Rekommendationer

### För Flowlearn specifikt:

1. **Använd Hybrid Rendering** ⭐ REKOMMENDERAT
   ```javascript
   output: 'hybrid'
   ```
   - Tjänstesidor: Statiska (snabbt)
   - Blogg: SSR eller scheduled rebuild
   - Bästa balansen mellan hastighet och aktualitet

2. **WordPress Webhook för auto-rebuild**
   - Bloggposter uppdateras → Netlify bygger om automatiskt
   - 2-3 minuters fördröjning acceptabel?

3. **Starta med Preview Deploy**
   - Testa på en staging-branch först
   - Verifiera allt fungerar
   - Gå live när du är säker

4. **Behåll VPS som backup initialt**
   - Kör parallellt i 1-2 veckor
   - Verifiera Netlify-stabilitet
   - Ta ner VPS när allt är bekräftat

---

## 💰 Kostnadskalkyl

### Netlify Free Tier:
- ✅ 100 GB bandbredd/månad
- ✅ 300 build-minuter/månad
- ✅ Automatisk SSL
- ✅ Deploy previews
- **Passar för:** Små-medelstora sajter (<10k visitors/mån)

### Netlify Pro ($19/mån):
- ✅ 1 TB bandbredd
- ✅ 1000 build-minuter
- ✅ Prioriterad support
- **Passar för:** Större sajter, mer WordPress-uppdateringar

### Estimerad besparing vs VPS:
```
VPS: €20-50/mån + tid för underhåll (4-8h/mån × €50/h = €200-400)
Netlify: $0-19/mån + 0 underhållstid

Total besparing: €200-431/mån
```

---

## ✅ Slutsats

### Kan du migrera? **JA** ✅

### Bör du migrera? **TROLIGEN JA** ⭐

**Fördelar överväger nackdelarna om:**
- ✅ Du vill slippa serverunderhåll
- ✅ Du är OK med 2-3 min delay för WordPress-uppdateringar
- ✅ Du vill ha automatiska deploys från Git
- ✅ Du vill ha global CDN-prestanda

**Stanna på VPS om:**
- ❌ Du behöver omedelbar WordPress-synk (< 1 min)
- ❌ Du har extremt många API-anrop (>1000/min)
- ❌ Du har väldigt specifika server-krav

---

## 🚀 Nästa steg

1. **Beslut:** Ska vi testa Netlify?
2. **Timeline:** När vill du migrera?
3. **Backup:** Ta fullständig backup av nuvarande setup
4. **Test:** Skapa en staging-deploy på Netlify
5. **Utvärdera:** Kör parallellt i 1 vecka
6. **Go-live:** Byt DNS när du är redo

Jag kan hjälpa dig genom hela processen steg för steg! 🎯

---

**Dokumentversion:** 1.0  
**Nästa uppdatering:** Efter tekniska tester
