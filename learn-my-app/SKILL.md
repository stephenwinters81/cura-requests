---
name: learn-my-app
description: "Generate interactive HTML learning packs that teach someone the architecture of any codebase. Interviews the user to find knowledge gaps, explores the codebase, then produces beautifully designed modules with visual diagrams, analogies, and MCQs with performance tracking. Use this skill whenever the user says 'teach me this codebase', 'I want to learn this project', 'explain this architecture', 'create learning materials', 'onboard me', 'I need to understand this system', or similar requests about learning/understanding a codebase. Also trigger when the user asks for training materials, architecture guides, or interactive documentation for a project."
---

# Learn My App: Interactive Architecture Learning Pack Generator

## Purpose

Produce a set of self-contained HTML learning modules that teach someone the architecture of a codebase. The output is a hub page linking to 4-8 topic modules, each with:
- Visual HTML/CSS diagrams (never ASCII art in `<pre>` blocks)
- Beginner-friendly language with analogies ("Think of it like...")
- Interactive MCQs with immediate feedback and explanations
- localStorage-based performance tracking
- A JSON export button so the user can paste their results into Claude for a targeted follow-up pack

## Workflow

### Phase 1: Interview (find the gaps)

Use `AskUserQuestion` to run a 3-5 question diagnostic interview. The goal is to discover what they already know vs what's fuzzy. Adapt questions based on answers.

**Round 1 — Context:**
- Their role (built it with AI, new developer joining, product owner, etc.)
- Which layers they're comfortable with (frontend, backend, data, infra, none)

**Round 2 — Probe specifics** (based on Round 1 answers):
- Ask architecture questions with multiple-choice answers where only one is correct
- Cover: data flow, state management, auth model, deployment, key design decisions
- Track which answers are correct/wrong — these reveal the gaps

**Round 3 — Confirm the gap map:**
- Present what you think they know (green) vs don't know (amber)
- Ask which topic they want to go deeper on, or if they want the full pack

### Phase 2: Explore the codebase

Before writing anything, research the actual codebase thoroughly. Use the Explore agent or direct Glob/Grep/Read calls to understand:

1. **Project structure** — top-level directories, key config files, entry points
2. **Tech stack** — frameworks, languages, databases, external services
3. **Architecture patterns** — layering rules, service patterns, state management
4. **Data flow** — how a request travels through the system end-to-end
5. **Security model** — auth, encryption, access control
6. **Testing approach** — test structure, frameworks, patterns

Read CLAUDE.md, README.md, package.json/pyproject.toml, docker-compose.yml, and any architecture docs first. Then dive into the actual code to verify claims and gather specifics.

### Phase 3: Plan the modules

Based on the gaps found in Phase 1 and the codebase explored in Phase 2, plan 4-8 modules. Each module should:
- Cover one coherent topic area
- Take ~10-15 minutes to read
- Include 6 MCQs spread throughout (not bunched at the end)
- Build on previous modules (order matters)

Typical module structure for a web app:
1. The Big Picture (architecture overview, data flow)
2. Backend Layers (routing, services, models)
3. Database & Data (schema, queries, migrations)
4. Background Processing (if applicable — queues, workers, jobs)
5. Security (auth, permissions, encryption)
6. Frontend (state, components, API communication)

Adapt this to the actual codebase — a CLI tool or library would have very different modules.

### Phase 4: Generate the HTML

Write all module files into `docs/learning/` (or another location if the user prefers). Use the design system below.

Launch multiple agents in parallel to write different modules simultaneously. Each agent should receive:
- The exact CSS/HTML template (from the design system section below)
- The specific content outline for their module
- Instructions to read relevant source files for accuracy
- The MCQ JavaScript pattern

### Phase 5: Serve and present

Start a local HTTP server:
```bash
cd <project>/docs/learning && python -m http.server 8080 --bind 0.0.0.0
```

Tell the user the URL. If they mentioned a Tailscale/tunnel IP, use that.

---

## Design System

### Fonts (Google Fonts CDN)
```
Outfit (300-800) — body text, UI
JetBrains Mono (400-600) — code, labels, badges
Fraunces (400, 700, 900) — display headings
```

### Color Palette (CSS Variables)
```css
--bg: #0c0e14;
--surface: #161924;
--surface2: #1e2130;
--surface3: #262a3a;
--border: #2c3044;
--text: #e8e4df;
--text-soft: #b0aaa2;
--muted: #7a7670;
--amber: #f0a85c;        /* Primary accent — warmth */
--amber-dim: rgba(240,168,92,0.12);
--amber-mid: rgba(240,168,92,0.25);
--green: #5ce08a;         /* Success, completed */
--green-dim: rgba(92,224,138,0.12);
--green-mid: rgba(92,224,138,0.3);
--red: #e05c6f;           /* Error, warning */
--red-dim: rgba(224,92,111,0.12);
--red-mid: rgba(224,92,111,0.3);
--blue: #5ca8f0;          /* Info, links */
--blue-dim: rgba(92,168,240,0.12);
--cyan: #22d3ee;          /* Code highlights */
--purple: #a07cf0;        /* Secondary accent */
```

### Visual Rules
- Subtle grain overlay on body (via SVG filter)
- `fadeUp` animation on page load (opacity 0→1, translateY 14→0)
- Never use ASCII art in `<pre>` blocks for diagrams — always use styled HTML/CSS
- Use `.vbox` cards with `.vbox-label` color tags for architecture boxes
- Use `.hflow` grids with `.harrow` arrows for horizontal flows
- Use `.pipeline` grids for sequential stage flows
- Use `.events` lists for streaming/timeline content

### Content Components

**Analogy boxes** — explain complex concepts with real-world parallels:
```html
<div class="analogy">A restaurant. The browser is the dining room...</div>
```
CSS adds "Think of it like..." header automatically via `::before`.

**Callout boxes** — three flavors:
```html
<div class="callout insight"><strong>Key insight:</strong> ...</div>
<div class="callout remember"><strong>Remember:</strong> ...</div>
<div class="callout warning"><strong>Watch out:</strong> ...</div>
```

**Visual flow diagrams** (replace all ASCII):
```html
<div class="hflow hflow-3">
  <div class="vbox">
    <span class="vbox-label amber">Label</span>
    <div class="vbox-title">Title</div>
    <div class="vbox-desc">Description</div>
  </div>
  <div class="harrow">
    <div class="harrow-stack"><div class="arrow-shaft"></div><div class="arrow-tip"></div></div>
    <div class="harrow-label">connection label</div>
  </div>
  <!-- more boxes... -->
</div>
```

### MCQ System

Each module has a JavaScript-driven MCQ system with:
- A `MODULE` constant (e.g., `'01'`) identifying the module
- An `EXPLANATIONS` object with right/wrong explanations per question
- `answer(qId, btn, isCorrect)` — handles click, disables options, shows explanation
- `saveProgress()` — writes to `localStorage` key `s8_learning` (or project-specific key)
- `restore()` — restores previous answers on page load
- Topic tags on each question (e.g., "architecture - data flow")

MCQ HTML pattern:
```html
<div class="mcq" id="q1">
  <div class="mcq-header">
    <span class="mcq-badge">Checkpoint</span>
    <span class="mcq-topic">topic - subtopic</span>
  </div>
  <div class="mcq-question">The question text?</div>
  <div class="mcq-options">
    <button class="mcq-opt" onclick="answer('q1',this,false)">
      <span class="letter">A</span>Wrong answer
    </button>
    <button class="mcq-opt" onclick="answer('q1',this,true)">
      <span class="letter">B</span>Correct answer
    </button>
    <!-- C, D options -->
  </div>
  <div class="mcq-explain" id="q1-explain"></div>
</div>
```

### Hub Page (index.html)

The hub page must include:
- Hero section with project name
- Progress dashboard reading from localStorage (score, per-module status)
- Module cards linking to each module page
- **Copy Performance JSON** button that exports:

```json
{
  "system": "<Project Name> Architecture Learning",
  "exportedAt": "ISO timestamp",
  "overallScore": 24,
  "overallTotal": 36,
  "overallPercentage": 67,
  "modules": {
    "01": {
      "title": "Module Title",
      "score": 4, "total": 6, "percentage": 67,
      "questions": [
        { "id": "01-q1", "topic": "...", "question": "...", "correct": false }
      ]
    }
  },
  "instruction": "Analyse wrong answers to identify weak areas and generate a supplementary learning pack."
}
```

### Language Guidelines

The audience is someone who wants to understand their own system but doesn't have deep technical knowledge. Write like a patient tutor, not a textbook:

- Short sentences. One idea per sentence.
- Define jargon immediately: "JWT (a hall pass that expires)"
- Use analogies liberally: restaurant kitchen, pizza delivery tracker, filing cabinets
- "Think of it like..." boxes for every complex concept
- Never assume prior knowledge of any framework or pattern
- Explain WHY before HOW — motivation before mechanism
- MCQ wrong-answer explanations should teach, not just say "wrong"

### localStorage Key

Use a project-specific key to avoid collisions: `<project_slug>_learning` (e.g., `myapp_learning`). The hub page and all modules must use the same key.
