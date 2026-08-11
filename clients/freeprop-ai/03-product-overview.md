# Product Overview — Freeprop AI

---

## What Freeprop AI Is

Freeprop AI is a digital operating system for Indonesian property agents — solo or team-based — that unifies listing management, promotional content production, and lead/buyer handling in one place. It's not a marketplace where buyers browse listings; it's the behind-the-scenes work layer an agent or agency runs on, turning raw listing data into organized records, ready-to-post content, and handled leads, so agents spend their time closing deals instead of doing admin work.

---

## Core Value Proposition

- **For solo agents:** register your identity and region scope once, then let the system keep listings organized and content flowing so you can look as professional as a full team while working alone.
- **For team/agency agents:** recruit and manage freelance agents under one shared brand, keep every listing in a single database regardless of source, and give every agent access to consistent, ready-to-use promotional content and handled leads.
- **Across both:** less time on manual listing entry, content creation, and lead follow-up — more time on client conversations and closing.

---

## Core Modules

1. **Team Building & Brand Setup**
   Recruit/invite freelance agents into a team; set up an agent brand profile for teams, or register personal identity and region scope for solo agents.

2. **Listing Intelligence**
   Manual listing entry plus auto-scraping from external sources (Acehome.com, OLX, Rumah123, etc.), with all data stored automatically in a centralized database.

3. **Content Engine**
   Content calendar (per listing or across a full portfolio), AI-generated professional visuals, video scripts and storyboard scripts (script-level, not rendered video), and captions — produced collaboratively by a team or consumed solo.

4. **Lead Capture & WhatsApp Follow-Up**
   Centralized lead collection, a WhatsApp chatbot to handle initial buyer questions, and scheduled automatic follow-up for leads that haven't closed — built on a WhatsApp API/gateway (e.g. WAHA or a similar provider), with the agent able to take over the conversation at any point.

5. **Landing Page Generator & Referral Engine**
   A per-listing landing page generated automatically from listing data, editable via prompt (natural-language edits regenerate the page rather than manual page-building), published to a shareable URL. Each page connects to a Meta Ads Pixel for ad tracking. Every agent has one permanent referral link per listing they own, which keeps working even if the agent later joins or upgrades to a team.
6. **AI Data Suggested**
   AI can make suggested based leads, followup, and listings data to suggested step by step to increase potential Leads, and Sales, The judgment still agent it self to decide it. 
---

## Data & States to Design For

- **Listings:** manually entered vs. scraped (with source attribution), active vs. sold/off-market, complete vs. missing key fields, duplicate listings pulled from multiple sources
- **Team/Agents:** invited-but-not-yet-joined, active agent, agent with no assigned listings yet, solo agent (no team context at all)
- **Content:** draft vs. scheduled vs. posted, awaiting approval (team context) vs. self-approved (solo context), per-listing content vs. portfolio-wide/batch content
- **Leads:** new/unanswered, chatbot-handled, awaiting agent takeover, in follow-up sequence, gone cold/unresponsive, converted/closed
- **Sync/scraping status:** successful sync, failed/partial sync, source temporarily unavailable, new external listing matched to an existing internal one

---

## Platform Context

- Primary users are field-based and mobile-first — agents check in between client meetings and site visits, so core actions (approve content, respond to a lead, check a listing) need to work well on a phone.
- WhatsApp is the primary communication channel with buyers, so the WhatsApp integration (chatbot + follow-up) sits close to the core workflow rather than as a bolt-on feature.
- Usage is high-frequency and short-session for agents, with a denser, less frequent review pattern for team/agency owners overseeing multiple agents.
- Listing data originates from a mix of manual input and third-party scraped sources, so the system needs to reconcile and de-duplicate data from outside its own direct control.

---

## Competitors (for positioning reference)

| Player | Their position | Freeprop AI's position |
|---|---|---|
| Rumah123, OLX, Acehome.com | Marketplace/storefront for buyers | A scraped data source, not a competitor — Freeprop AI operates behind the agent's scenes |
| Generic property CRM software | Focused on data & pipeline only | Combines listing data with a promotional content engine in one system |
| Freelance designers/social media services | Manual, slow, project-based | Automated and integrated with real-time listing data |
| Generic WhatsApp chatbot/CRM tools (e.g. WAHA-based, Qontak, etc.) | Focused on chat & leads only, separate from listing data | Chatbot and follow-up connect directly to the listing and content database, so replies are always based on current listing info |
