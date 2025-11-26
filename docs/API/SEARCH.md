# Sora AI Search API Documentation

## Overview

Sora AI’s Search API makes it easy to embed Rwanda-focused tax guidance directly into your workflows. Run compliance checks, draft filings, and trigger research requests while selecting the right model for each task.

## Endpoints

### Get Available Providers and Models

Before making search requests, you'll need to get the available providers and their models.

#### **GET** `/api/providers`

**Full URL**: `http://localhost:3000/api/providers`

Returns a list of all active providers with their available chat and embedding models.

**Response Example:**

```json
{
  "providers": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "OpenAI",
      "chatModels": [
        {
          "name": "GPT 4 Omni Mini",
          "key": "gpt-4o-mini"
        },
        {
          "name": "GPT 4 Omni",
          "key": "gpt-4o"
        }
      ],
      "embeddingModels": [
        {
          "name": "Text Embedding 3 Large",
          "key": "text-embedding-3-large"
        }
      ]
    }
  ]
}
```

Use the `id` field as the `providerId` and the `key` field from the models arrays when making search requests.

### Search Query

#### **POST** `/api/search`

**Full URL**: `http://localhost:3000/api/search`

**Note**: Replace `localhost:3000` with your Sora AI instance URL if running on a different host or port

### Request

The API accepts a JSON object in the request body, where you define the focus mode, chat models, embedding models, and your query.

#### Request Body Structure

```json
{
  "chatModel": {
    "providerId": "550e8400-e29b-41d4-a716-446655440000",
    "key": "gpt-4o-mini"
  },
  "embeddingModel": {
    "providerId": "550e8400-e29b-41d4-a716-446655440000",
    "key": "text-embedding-3-large"
  },
  "optimizationMode": "speed",
  "focusMode": "webSearch",
  "query": "Which incentives apply to Made in Rwanda exporters?",
  "history": [
    ["human", "Hi, how are you?"],
    ["assistant", "I am doing well, how can I help you today?"]
  ],
  "systemInstructions": "Explain the VAT implications for export-focused SMEs operating in Rwanda.",
  "stream": false
}
```

**Note**: The `providerId` must be a valid UUID obtained from the `/api/providers` endpoint. The example above uses a sample UUID for demonstration.

### Request Parameters

- **`chatModel`** (object, optional): Defines the chat model to be used for the query. To get available providers and models, send a GET request to `http://localhost:3000/api/providers`.

  - `providerId` (string): The UUID of the provider. You can get this from the `/api/providers` endpoint response.
  - `key` (string): The model key/identifier (e.g., `gpt-4o-mini`, `llama3.1:latest`). Use the `key` value from the provider's `chatModels` array, not the display name.

- **`embeddingModel`** (object, optional): Defines the embedding model for similarity-based searching. To get available providers and models, send a GET request to `http://localhost:3000/api/providers`.

  - `providerId` (string): The UUID of the embedding provider. You can get this from the `/api/providers` endpoint response.
  - `key` (string): The embedding model key (e.g., `text-embedding-3-large`, `nomic-embed-text`). Use the `key` value from the provider's `embeddingModels` array, not the display name.

- **`focusMode`** (string, required): Specifies which focus mode to use. Available modes:

  - `webSearch`, `academicSearch`, `writingAssistant`, `wolframAlphaSearch`, `youtubeSearch`, `redditSearch`.

- **`optimizationMode`** (string, optional): Specifies the optimization mode to control the balance between performance and quality. Available modes:

  - `speed`: Prioritize speed and return the fastest answer.
  - `balanced`: Provide a balanced answer with good speed and reasonable quality.

- **`query`** (string, required): The search query or question.

- **`systemInstructions`** (string, optional): Custom instructions provided by the user to guide the AI's response. These instructions are treated as user preferences and have lower priority than the system's core instructions. For example, you can specify a particular writing style, format, or focus area.

- **`history`** (array, optional): An array of message pairs representing the conversation history. Each pair consists of a role (either 'human' or 'assistant') and the message content. This allows the system to use the context of the conversation to refine results. Example:

  ```json
  [
    ["human", "How can Sora AI help us prep for quarterly VAT?"],
    ["assistant", "Sora AI consolidates the latest RRA guidance and checks your ledgers against VAT return templates."]
  ]
  ```

- **`stream`** (boolean, optional): When set to `true`, enables streaming responses. Default is `false`.

### Response

The response from the API includes both the final message and the sources used to generate that message.

#### Standard Response (stream: false)

```json
{
  "message": "Rwanda’s ‘Made in Rwanda’ exporters qualify for a 0% VAT rate on goods shipped abroad, provided exports are documented with customs declarations and proof of payment within 90 days. You must also submit quarterly VAT returns even if all sales were zero-rated, and maintain purchase records to reclaim input VAT. Sora AI can draft the supporting memo, surface the latest RRA public notices, and prepare the schedule needed for the e-Tax upload.",
  "sources": [
    {
      "pageContent": "Zero-rated exports require customs documentation and timely VAT reconciliation; exporters still file quarterly returns to avoid penalties.",
      "metadata": {
        "title": "Rwanda VAT guidance for exporters",
        "url": "https://rra.gov.rw/exporters-guide"
      }
    },
    {
      "pageContent": "Export-focused SMEs must retain customer invoices, airway bills, and proof of receipt for zero-rated goods.",
      "metadata": {
        "title": "Made in Rwanda incentives overview",
        "url": "https://www.rdb.rw/incentives/made-in-rwanda"
      }
    }
        ....
  ]
}
```

#### Streaming Response (stream: true)

When streaming is enabled, the API returns a stream of newline-delimited JSON objects using Server-Sent Events (SSE). Each line contains a complete, valid JSON object. The response has `Content-Type: text/event-stream`.

Example of streamed response objects:

```
{"type":"init","data":"Stream connected"}
{"type":"sources","data":[{"pageContent":"...","metadata":{"title":"...","url":"..."}},...]}
{"type":"response","data":"Rwanda applies a 0% VAT rate on qualifying exports..."}
{"type":"done"}
```

Clients should process each line as a separate JSON object. The different message types include:

- **`init`**: Initial connection message
- **`sources`**: All sources used for the response
- **`response`**: Chunks of the generated answer text
- **`done`**: Indicates the stream is complete

### Fields in the Response

- **`message`** (string): The search result, generated based on the query and focus mode.
- **`sources`** (array): A list of sources that were used to generate the search result. Each source includes:
  - `pageContent`: A snippet of the relevant content from the source.
  - `metadata`: Metadata about the source, including:
    - `title`: The title of the webpage.
    - `url`: The URL of the webpage.

### Error Handling

If an error occurs during the search process, the API will return an appropriate error message with an HTTP status code.

- **400**: If the request is malformed or missing required fields (e.g., no focus mode or query).
- **500**: If an internal server error occurs during the search.
