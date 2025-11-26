# How does Sora AI work?

Curious about how Sora AI orchestrates guidance? Start with the [architecture primer](README.md), then follow this execution walkthrough.

Consider a workspace asking, "How do we compute PAYE for a RWF 1,200,000 salary in Kigali?". The system processes the request in five stages:

1. The message is sent to the `/api/chat` route where it invokes the chain. The chain will depend on your focus mode. For this example, let's assume we use the "webSearch" focus mode.
2. The chain is now invoked; first, the message is passed to another chain where it first predicts (using the chat history and the question) whether there is a need for sources and searching the web. If there is, it will generate a query (in accordance with the chat history) for searching the web that we'll take up later. If not, the chain will end there, and then the answer generator chain, also known as the response generator, will be started.
3. The query returned by the first chain is passed to SearXNG to search the web for information.
4. After the regulations, RRA tables, and relevant guides are fetched, they are embedded, then re-ranked against internal policy notes and workspace documents.
5. The response generator combines chat history, retrieved sources, and internal guidance templates to draft the answer, cite supporting regulations, and push a stream back to the UI.

## How are the answers cited?

The LLM prompts enforce inline citations, ensuring every recommendation points to an RRA notice, legal clause, or workspace document. The UI renders these citations so reviewers can audit the reasoning.

## Image and Video Search

Image and video searches follow the same pipeline. A query is generated, we fetch multimedia evidence (for example, how-to clips on e-Tax submissions), and present the assets alongside their metadata for quick review.
