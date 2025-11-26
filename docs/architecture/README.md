# Sora AI Architecture

Sora AI’s platform is composed of the following layers:

1. **User Interface** – A Next.js web app that guides teams through tax scenarios, filings, and collaborative workspaces tailored to Rwanda’s compliance needs.
2. **Agent & Workflow Engine** – Chain logic that routes between research-focused workflows, document analysis, and drafting tasks while deciding when to call external data sources.
3. **Search Backends** – SearxNG plus curated regulatory datasets provide grounded insights from RRA, RDB, and regional policy bulletins.
4. **Language Models** – Configurable providers (OpenAI, Claude, Groq, Gemini, Ollama) deliver reasoning, translation, and drafting capabilities with strict instruction templates for compliance.
5. **Embedding & Retrieval** – Vector indices re-rank knowledge base articles, uploaded documents, and recent notices to keep recommendations precise and citeable.

See [WORKING.md](WORKING.md) for a deeper walkthrough of the runtime execution path.
