# TASK_QUEUE.md — Astra Game Launcher Feature Pipeline

**Last Updated:** 2026-10-06  
**Current Task:** Task #6 — Game Recommendations Engine  
**Next Task:** Task #7 — Game Oracle (AI Strategy Guide)  

---

## 📋 TASK #6: Game Recommendations Engine

Build an AI-powered recommendation system that analyzes your game library and play patterns to suggest games you own but haven't played yet, ranked by relevance and mood.

### **Requirements**

#### **1. Game Library Analysis**
- Pull all games from GameLauncherService (local + retro ROM games)
- Extract metadata: title, platform, genre (hardcoded tag system or parse from filename/metadata)
- Categorize games: `Action`, `RPG`, `Strategy`, `Puzzle`, `Sports`, `Adventure`, `Simulation`, `Horror`, `Indie`, `Casual`
- Track playtime from ActivityTrackingService
- Identify unplayed games (0 minutes playtime)
- Score played games: `playedScore = (totalPlaytime / gameLength) * engagement`

#### **2. Play Pattern Analysis**
- **Genre Preferences:** Calculate weighted score per genre based on total hours played
- **Playstyle:** "You play action games 40% of the time, RPGs 30%, strategy 20%..."
- **Engagement:** Games with high returning playtime = high engagement
- **Time Patterns:** Peak gaming hours (from Activity Dashboard heatmap data)
- **Recency:** Recently played games boost recommendations in same genre
- **Platform Preference:** PC vs Retro vs Console (inferred from library split)

#### **3. Recommendation Algorithm**
- **For each unplayed game:**
  - Match genres with top 3 player preferences
  - Calculate similarity score (0-100):
    - Genre match: +40 points (if top 3 genres)
    - Popularity in your library: +20 points (games like your most-played titles)
    - Release relevance: +10 points (recent games in your library → similar era)
    - Platform match: +10 points (similar platform to what you play)
    - User ratings proxy: +10 points (highly-rated indie games boost)
  - Sort by score, show top 10

#### **4. Recommendation UI (New Modal/Dashboard Tab)**
- **Header Section:**
  - "Games You Might Like" title
  - Your playstyle summary: "You love action-packed adventures with 85% playtime in this category. We found 12 hidden gems."
  - Filter: Genre dropdown (show all or single genre)

- **Recommendation Cards Grid:**
  - Game thumbnail (platform logo or generic game icon)
  - Title + platform badge
  - Genre tags (colored pills)
  - Match score (0-100%, visual progress bar in green)
  - "Why recommended?" subtitle: "You play similar action games 40 hours/month" or "Matches your indie preference"
  - Quick launch button (double-click launches game)

- **Sorting Options:**
  - By Recommendation Score (default)
  - By Genre Match
  - By Game Length (shortest first / longest first)
  - By Library Playtime (games similar to your most-played)

- **Mood Filters (Optional Nice-to-Have):**
  - "Intense" (action/horror)
  - "Chill" (puzzle/indie/casual)
  - "Story-Driven" (RPG/adventure)
  - "Competitive" (sports/multiplayer-focused)

#### **5. Data Persistence & Caching**
- Cache recommendation results in localStorage (`astra_recommendations_cache`, 24-hour TTL)
- Store analyzed playstyles (`astra_playstyle_profile`)
- Invalidate cache when: new game added, major playtime milestone hit, library changes
- Manual "Refresh Recommendations" button (clears cache, recalculates)

#### **6. Integration Points**
- **GameLauncherService:** Get full game library + metadata
- **ActivityTrackingService:** Pull playtime per game, heatmap patterns
- **SaveVaultService:** Infer game relevance (recently backed up = recently played)
- **Retro Hub:** Include ROM games in recommendations
- **Click Launch:** Reuse existing game launch flow

#### **7. Files to Create/Edit**
- `src/components/RecommendationsHub.tsx` — Main modal/dashboard tab with grid view
- `src/services/RecommendationEngine.ts` — Algorithm, playstyle analysis, scoring
- `src/components/RecommendationCard.tsx` — Individual game card with match score
- `src/components/PlaystyleProfile.tsx` — Summary of "Your Gaming Style"
- `src/types/Recommendations.types.ts` — TypeScript interfaces
- Edit `src/services/GameLauncherService.ts` — Add `getGameMetadata()` helper
- Edit `src/App.tsx` — Add Recommendations button/tab

### **Tech Details**
- **Genre Detection:** Hardcoded tag system (store in game metadata or `game.json` per game)
- **Scoring:** Weighted algorithm (genre 40%, popularity 20%, recency 10%, platform 10%, ratings 10%, base 10%)
- **Caching:** localStorage with TTL check (expiry timestamp)
- **Performance:** Calculate once per session refresh; lazy-load on modal open
- **Fallback:** If no play data, show random unplayed games with "New to you" label

### **Acceptance Criteria**
✅ Analyzes all games in library (local + retro)  
✅ Extracts & categorizes genres  
✅ Calculates playstyle profile from Activity data  
✅ Recommends top 10 unplayed games with scores  
✅ Scores based on genre match + popularity + recency  
✅ Shows recommendation reason ("Why recommended?")  
✅ Cards are clickable to launch game  
✅ Filters by genre work  
✅ Sorting by score/genre/length works  
✅ Results cached for 24 hours  
✅ "Refresh Recommendations" clears cache  
✅ Works with retro ROM games  
✅ UI matches Astra theme (glassmorphic)  

### **Branch**
Create: `feat/recommendations-engine`  
Base: `main`

### **Quality Notes**
- Full TypeScript throughout
- Services follow singleton pattern
- Scoring algorithm well-documented with comments
- UI responsive grid (auto-columns on different screen sizes)
- Lazy-load game metadata on demand
- Genre tagging extensible (easy to add new genres)

### **Instructions for you:**
1. Create feature branch: `git checkout -b feat/recommendations-engine`
2. Build Recommendations Engine following Requirements above
3. Follow code patterns from Activity, Retro Hub, other services
4. Commit: `feat: add game recommendations engine with playstyle analysis`
5. Push to origin: `git push origin feat/recommendations-engine`

---

## 📋 TASK #7: Game Oracle (AI Strategy Guide) — NEXT

Build an AI-powered in-game strategy guide and lore explainer that overlays on the Mini-HUD, providing real-time tips, boss walkthroughs, and story context during gameplay.

### **Requirements**

#### **1. Oracle Core Service**
- Integrate Claude API for real-time AI responses
- Accept queries during gameplay: "What's the boss weakness?" "How do I solve this puzzle?" "What happened in the story so far?"
- System prompt: "You are Astra Oracle, an AI gaming assistant. Provide concise, spoiler-aware tips for [CurrentGame]. Be brief (1-2 sentences max for HUD display)."
- Rate limiting: Max 1 query per 5 seconds (prevent spam)
- Caching: Store common queries per game (`astra_oracle_cache_<gameId>`)

#### **2. Mini-HUD Integration**
- Add 5th tab to MiniHUD: **"Oracle"** (alongside Game Status, Quick Controls, System Stats, Settings)
- Oracle UI:
  - Text input field: "Ask Oracle..." placeholder
  - Send button (or Enter to send)
  - Message display area: Shows bot response + timestamp
  - History scroll: Last 5 queries/responses per session
  - Loading state: "Oracle thinking..." while API responds
  - Error state: "No internet" or "API limit reached" with retry button

#### **3. Spoiler Control & Game Context**
- **Spoiler Toggle:** User can set spoiler sensitivity (None, Minor, Major)
  - None: Full spoilers allowed
  - Minor: "Avoid major story twists"
  - Major: "No story spoilers at all"
- **Game Context Detection:** Auto-detect current game from MiniHUD's `runningGame`
- **Game Database:** Store game summaries (genre, story setup, main characters) for context
  - Format: `oracle-game-db.json` with entries like:
    ```json
    {
      "gameId": "elden-ring",
      "title": "Elden Ring",
      "genre": "Action RPG",
      "setup": "Open-world fantasy where you seek the Elden Ring",
      "mainChars": ["Player", "Melina", "Godrick", "Maliketh"]
    }
    ```
- System prompt includes game context: "Helping with [GameTitle], a [Genre] game. Story setup: [Setup]"

#### **4. Query Types & Handling**
- **Gameplay Questions:** "How do I beat X boss?" → Tactical advice (mechanics, weaknesses)
- **Story Questions:** "What's the lore of Y?" → Narrative context (spoiler-aware)
- **Navigation:** "Where do I find Z?" → Location hints (vague by default)
- **Puzzle Hints:** "I'm stuck on this puzzle" → Progressive hints (start easy, escalate)
- **Mechanics:** "How does this stat work?" → Game system explanations

#### **5. Response Formatting for HUD**
- Limit Claude response to 100 tokens max (fits HUD display)
- System prompt enforces: "Keep responses under 2 sentences for the HUD overlay."
- For long responses, show truncated + "Read full response" button → opens detached window
- Add emoji indicators: 🎮 (gameplay), 📖 (story), 🗺️ (navigation), 🧩 (puzzle), ⚙️ (mechanics)

#### **6. Detached Oracle Window (Optional)**
- If user clicks "Read full response", pop a small floating window (like Mini-HUD)
- Shows full response + can ask follow-ups
- Persist window position in settings
- Auto-close when game minimizes

#### **7. Integration Points**
- **Mini-HUD Service:** Access `runningGame` to know current game
- **GameLauncherService:** Get game title/ID
- **Settings:** Claude API key input (user-provided, stored encrypted)
- **localStorage:** Cache queries, game DB, spoiler preferences

#### **8. Files to Create/Edit**
- `src/services/OracleService.ts` — Claude API calls, query handling, caching
- `src/services/GameDatabaseService.ts` — Game metadata, story context
- `src/components/OracleTab.tsx` — 5th tab in MiniHUD with input/output
- `src/components/OracleWindow.tsx` — Detached window for full responses
- `electron/ipc/OracleIpc.ts` — IPC for Claude API (keep key server-side)
- `src/types/Oracle.types.ts` — TypeScript interfaces
- `public/oracle-game-db.json` — Game database (expandable)
- Edit `src/components/MiniHUD.tsx` — Add Oracle tab
- Edit `src/App.tsx` — Add Settings for API key input

### **Tech Details**
- **Claude API:** Use `messages` endpoint with `max_tokens: 100` to force concise responses
- **Spoiler System:** Inject spoiler level into system prompt
- **Game Context:** Load game DB on app start, cache in memory
- **Rate Limiting:** Track last query timestamp per HUD instance
- **Encryption:** Store Claude API key with simple encryption (or use Electron secure storage)
- **Error Handling:** Graceful fallback if API unreachable ("Oracle is thinking... reconnecting")

### **Acceptance Criteria**
✅ Oracle tab appears in MiniHUD (5th tab)  
✅ User can type queries and send  
✅ Claude API returns gameplay/story tips  
✅ Responses limited to 100 tokens (fit HUD)  
✅ Responses include emoji indicators  
✅ Spoiler toggle (None/Minor/Major) works  
✅ Game context auto-detected from running game  
✅ Query cache prevents duplicate API calls  
✅ Rate limiting prevents spam  
✅ Full response window pops on demand  
✅ API key stored securely in Settings  
✅ Error states handled gracefully  
✅ Game database extensible  

### **Branch**
Create: `feat/game-oracle`  
Base: `main`

### **Quality Notes**
- Full TypeScript throughout
- OracleService follows singleton pattern
- System prompts are well-documented
- Error handling for API failures
- Loading states are responsive
- Cached responses reduce API costs

### **Important: API Key Setup**
- User must provide Claude API key in Settings → "Oracle" section
- Key stored locally (encrypted if possible, or Electron secure storage)
- Show warning: "Oracle requires Claude API key (billing applies per query)"
- Test connection button: "Test Oracle Connection"

### **Instructions for you:**
1. Create feature branch: `git checkout -b feat/game-oracle`
2. Build Game Oracle system following Requirements above
3. Follow code patterns from existing services
4. Commit: `feat: add game oracle with claude api integration`
5. Push to origin: `git push origin feat/game-oracle`

---

## ✅ COMPLETED TASKS

### Task #1: Save Game Vault & Auto-Backup
**Status:** ✅ MERGED  
**Commit:** a077d8a  
**Grade:** A+

### Task #2: Astra Jukebox & Audio Visualizer
**Status:** ✅ MERGED  
**Commit:** 09115f9  
**Grade:** A

### Task #3: Gaming Activity Dashboard with Smart Resume
**Status:** ✅ MERGED  
**Commit:** 50a5fc1  
**Grade:** A

### Task #4: In-Game Mini-HUD
**Status:** ✅ MERGED  
**Grade:** A

### Task #5: Retro Hub & Emulation Integration
**Status:** ✅ MERGED  
**Grade:** A

---

## 🔗 Quick Links
- **Repo:** https://github.com/hoseinnp/astra-game-launcher
- **Branch:** main
- **Read PROJECT_INFO.md in repo root for architecture context**

