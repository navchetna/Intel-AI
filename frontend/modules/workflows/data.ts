// ── Types ──────────────────────────────────────────────────────────────────────

export type CategoryName =
  | "Working with Text"
  | "Handling Inputs"
  | "Working with Language & Speech"
  | "Establishing Knowledge"
  | "Safety & Privacy";

export type FieldType = "text" | "number" | "select" | "bool" | "password" | "textarea";

export interface ConfigField {
  key:          string;
  label:        string;
  type:         FieldType;
  defaultValue: string | number | boolean;
  options?:     string[];
  note?:        string;
  placeholder?: string;
}

export interface WorkflowDef {
  id:           string;
  name:         string;
  category:     CategoryName;
  description:  string;
  tags:         string[];
  tool:         "n8n" | "custom";
  configFields: ConfigField[];
}

// ── Category palette ───────────────────────────────────────────────────────────

export const CATEGORY_META: Record<CategoryName, { accent: string; accentRgb: string; icon: string }> = {
  "Working with Text":              { accent: "#818cf8", accentRgb: "129,140,248", icon: "T" },
  "Handling Inputs":                { accent: "#fbbf24", accentRgb: "251,191,36",  icon: "↓" },
  "Working with Language & Speech": { accent: "#22d3ee", accentRgb: "34,211,238",  icon: "◎" },
  "Establishing Knowledge":         { accent: "#34d399", accentRgb: "52,211,153",  icon: "⬡" },
  "Safety & Privacy":               { accent: "#f87171", accentRgb: "248,113,113", icon: "⚑" },
};

export const CATEGORY_ORDER: CategoryName[] = [
  "Working with Text",
  "Handling Inputs",
  "Working with Language & Speech",
  "Establishing Knowledge",
  "Safety & Privacy",
];

// ── Workflow catalog ───────────────────────────────────────────────────────────

export const WORKFLOWS: WorkflowDef[] = [
  // ── Working with Text ──────────────────────────────────────────────────────
  {
    id: "create-tags",
    name: "Create Tags",
    category: "Working with Text",
    description: "Automatically extract and assign topic tags from free-form text using LLM classification.",
    tags: ["NLP", "Classification", "Tagging"],
    tool: "custom",
    configFields: [
      { key: "model", label: "LLM Model", type: "select", defaultValue: "llama3-8b", options: ["llama3-8b", "llama3-70b", "mistral-7b", "phi-3"] },
      { key: "max_tags", label: "Max Tags", type: "number", defaultValue: 10, note: "Max tags per document" },
      { key: "language", label: "Language", type: "select", defaultValue: "en", options: ["en", "es", "fr", "de", "zh", "ar"] },
      { key: "min_confidence", label: "Min Confidence", type: "number", defaultValue: 0.7, note: "0.0 – 1.0" },
    ],
  },
  {
    id: "determine-entities",
    name: "Determine Entities & Relationships",
    category: "Working with Text",
    description: "Identify named entities and map relationships between them using structured extraction.",
    tags: ["NER", "Knowledge Extraction", "NLP"],
    tool: "custom",
    configFields: [
      { key: "model", label: "LLM Model", type: "select", defaultValue: "llama3-70b", options: ["llama3-8b", "llama3-70b", "mistral-7b"] },
      { key: "entity_types", label: "Entity Types", type: "text", defaultValue: "PERSON,ORG,LOC,PRODUCT", note: "Comma-separated" },
      { key: "extract_relations", label: "Extract Relations", type: "bool", defaultValue: true },
      { key: "confidence_threshold", label: "Confidence Threshold", type: "number", defaultValue: 0.75 },
    ],
  },
  {
    id: "summarize",
    name: "Summarize",
    category: "Working with Text",
    description: "Condense long documents or conversations into structured summaries with configurable length and format.",
    tags: ["Summarization", "NLP", "Compression"],
    tool: "custom",
    configFields: [
      { key: "model", label: "LLM Model", type: "select", defaultValue: "llama3-70b", options: ["llama3-8b", "llama3-70b", "mistral-7b", "phi-3"] },
      { key: "max_length", label: "Max Length (words)", type: "number", defaultValue: 200 },
      { key: "format", label: "Output Format", type: "select", defaultValue: "prose", options: ["prose", "bullets", "structured"] },
      { key: "language", label: "Output Language", type: "select", defaultValue: "en", options: ["en", "es", "fr", "de", "zh"] },
      { key: "focus", label: "Focus Area", type: "text", defaultValue: "", placeholder: "e.g. action items, financial details", note: "Optional topic focus" },
    ],
  },
  {
    id: "determine-intent",
    name: "Determine Intent",
    category: "Working with Text",
    description: "Classify the intent behind user messages or documents against a configurable intent taxonomy.",
    tags: ["Intent Detection", "Classification", "NLU"],
    tool: "custom",
    configFields: [
      { key: "model", label: "LLM Model", type: "select", defaultValue: "llama3-8b", options: ["llama3-8b", "llama3-70b", "phi-3"] },
      { key: "intent_categories", label: "Intent Categories", type: "textarea", defaultValue: "inquiry,complaint,purchase,support,feedback", note: "Comma-separated" },
      { key: "fallback_intent", label: "Fallback Intent", type: "text", defaultValue: "unknown" },
      { key: "multi_label", label: "Multi-label Classification", type: "bool", defaultValue: false },
    ],
  },
  {
    id: "fill-json",
    name: "Filling JSON",
    category: "Working with Text",
    description: "Extract structured data from unstructured text and populate a predefined JSON schema automatically.",
    tags: ["Structured Extraction", "JSON", "Data"],
    tool: "custom",
    configFields: [
      { key: "model", label: "LLM Model", type: "select", defaultValue: "llama3-70b", options: ["llama3-8b", "llama3-70b", "mistral-7b"] },
      { key: "schema_url", label: "JSON Schema URL", type: "text", defaultValue: "", placeholder: "https://…/schema.json" },
      { key: "strict_mode", label: "Strict Schema Validation", type: "bool", defaultValue: true },
      { key: "allow_null", label: "Allow Null for Missing Fields", type: "bool", defaultValue: false },
    ],
  },

  // ── Handling Inputs ────────────────────────────────────────────────────────
  {
    id: "read-email",
    name: "Read Email",
    category: "Handling Inputs",
    description: "Ingest email messages via IMAP, parse headers and body, and forward to downstream processing pipelines.",
    tags: ["Email", "IMAP", "Ingestion"],
    tool: "n8n",
    configFields: [
      { key: "imap_server", label: "IMAP Server", type: "text", defaultValue: "imap.gmail.com" },
      { key: "port", label: "Port", type: "number", defaultValue: 993 },
      { key: "username", label: "Username / Email", type: "text", defaultValue: "" },
      { key: "password", label: "Password / App Token", type: "password", defaultValue: "" },
      { key: "folder", label: "Folder", type: "text", defaultValue: "INBOX" },
      { key: "since_days", label: "Look-back (days)", type: "number", defaultValue: 7 },
      { key: "mark_read", label: "Mark as Read After Ingest", type: "bool", defaultValue: false },
    ],
  },
  {
    id: "read-whatsapp",
    name: "Read WhatsApp",
    category: "Handling Inputs",
    description: "Receive and process WhatsApp messages via the WhatsApp Business Cloud API webhook.",
    tags: ["WhatsApp", "Messaging", "Webhook"],
    tool: "n8n",
    configFields: [
      { key: "api_token", label: "WhatsApp API Token", type: "password", defaultValue: "" },
      { key: "phone_number_id", label: "Phone Number ID", type: "text", defaultValue: "" },
      { key: "verify_token", label: "Webhook Verify Token", type: "text", defaultValue: "" },
      { key: "include_media", label: "Include Media Messages", type: "bool", defaultValue: true },
    ],
  },
  {
    id: "read-telegram",
    name: "Read Telegram",
    category: "Handling Inputs",
    description: "Poll or receive Telegram messages via Bot API, supporting text, documents, and voice notes.",
    tags: ["Telegram", "Bot", "Messaging"],
    tool: "n8n",
    configFields: [
      { key: "bot_token", label: "Bot Token", type: "password", defaultValue: "" },
      { key: "chat_id", label: "Chat ID (optional)", type: "text", defaultValue: "", note: "Leave blank to accept any chat" },
      { key: "polling_interval_s", label: "Polling Interval (s)", type: "number", defaultValue: 5 },
      { key: "include_voice", label: "Transcribe Voice Notes", type: "bool", defaultValue: false },
    ],
  },
  {
    id: "process-pdf",
    name: "Process PDF",
    category: "Handling Inputs",
    description: "Extract text, tables, and images from PDF files with optional OCR for scanned documents.",
    tags: ["PDF", "OCR", "Document"],
    tool: "custom",
    configFields: [
      { key: "enable_ocr", label: "Enable OCR", type: "bool", defaultValue: false, note: "Required for scanned PDFs" },
      { key: "extract_tables", label: "Extract Tables", type: "bool", defaultValue: true },
      { key: "extract_images", label: "Extract Images", type: "bool", defaultValue: false },
      { key: "chunk_size", label: "Chunk Size (chars)", type: "number", defaultValue: 1000 },
      { key: "overlap", label: "Chunk Overlap (chars)", type: "number", defaultValue: 100 },
    ],
  },
  {
    id: "crawl-web",
    name: "Crawl Web",
    category: "Handling Inputs",
    description: "Recursively crawl web pages, extract clean text, and feed into document processing pipelines.",
    tags: ["Web", "Scraping", "Crawling"],
    tool: "n8n",
    configFields: [
      { key: "start_url", label: "Start URL", type: "text", defaultValue: "https://", placeholder: "https://example.com" },
      { key: "max_depth", label: "Max Depth", type: "number", defaultValue: 2 },
      { key: "max_pages", label: "Max Pages", type: "number", defaultValue: 50 },
      { key: "include_pattern", label: "URL Include Pattern (regex)", type: "text", defaultValue: "", note: "Leave blank for all" },
      { key: "exclude_pattern", label: "URL Exclude Pattern (regex)", type: "text", defaultValue: "\\.(jpg|png|gif|pdf|zip)" },
      { key: "respect_robots", label: "Respect robots.txt", type: "bool", defaultValue: true },
    ],
  },
  {
    id: "transcribe-speech",
    name: "Transcribe – Speech to Text",
    category: "Handling Inputs",
    description: "Convert audio and video recordings to text using Whisper-based models with optional translation.",
    tags: ["ASR", "Whisper", "Audio"],
    tool: "custom",
    configFields: [
      { key: "model", label: "Model", type: "select", defaultValue: "whisper-large-v3", options: ["whisper-tiny", "whisper-base", "whisper-medium", "whisper-large-v3"] },
      { key: "language", label: "Source Language", type: "select", defaultValue: "auto", options: ["auto", "en", "es", "fr", "de", "zh", "ar", "ja"] },
      { key: "translate_to_en", label: "Translate to English", type: "bool", defaultValue: false },
      { key: "diarize", label: "Speaker Diarization", type: "bool", defaultValue: false },
      { key: "word_timestamps", label: "Word-level Timestamps", type: "bool", defaultValue: false },
    ],
  },
  {
    id: "describe-scene",
    name: "Describe Scene",
    category: "Handling Inputs",
    description: "Generate natural-language descriptions of images or video frames using vision-language models.",
    tags: ["Vision", "VLM", "Captioning"],
    tool: "custom",
    configFields: [
      { key: "model", label: "Vision Model", type: "select", defaultValue: "llava-1.6", options: ["llava-1.6", "llava-1.5", "moondream2", "idefics3"] },
      { key: "detail_level", label: "Detail Level", type: "select", defaultValue: "detailed", options: ["brief", "standard", "detailed"] },
      { key: "include_objects", label: "List Detected Objects", type: "bool", defaultValue: true },
      { key: "include_ocr", label: "Extract Text in Image", type: "bool", defaultValue: false },
      { key: "language", label: "Output Language", type: "select", defaultValue: "en", options: ["en", "es", "fr", "de"] },
    ],
  },

  // ── Working with Language & Speech ────────────────────────────────────────
  {
    id: "translate-text",
    name: "Translate – Text 2 Text",
    category: "Working with Language & Speech",
    description: "Translate documents or messages between languages using neural MT or LLM-based translation.",
    tags: ["Translation", "NMT", "Multilingual"],
    tool: "custom",
    configFields: [
      { key: "model", label: "Model", type: "select", defaultValue: "llama3-70b", options: ["llama3-70b", "nllb-200", "opus-mt", "seamless-m4t"] },
      { key: "source_lang", label: "Source Language", type: "select", defaultValue: "auto", options: ["auto", "en", "es", "fr", "de", "zh", "ar", "ja", "pt"] },
      { key: "target_lang", label: "Target Language", type: "select", defaultValue: "en", options: ["en", "es", "fr", "de", "zh", "ar", "ja", "pt"] },
      { key: "formality", label: "Formality", type: "select", defaultValue: "default", options: ["default", "formal", "informal"] },
      { key: "preserve_formatting", label: "Preserve Formatting", type: "bool", defaultValue: true },
    ],
  },
  {
    id: "text-to-speech",
    name: "Text 2 Speech – T2S",
    category: "Working with Language & Speech",
    description: "Convert text into natural-sounding speech using neural TTS models with configurable voice and speed.",
    tags: ["TTS", "Audio", "Voice"],
    tool: "custom",
    configFields: [
      { key: "model", label: "TTS Model", type: "select", defaultValue: "xtts-v2", options: ["xtts-v2", "bark", "speecht5", "vits"] },
      { key: "voice", label: "Voice", type: "select", defaultValue: "en_speaker_0", options: ["en_speaker_0", "en_speaker_1", "en_speaker_2", "en_speaker_3"] },
      { key: "speed", label: "Speed", type: "number", defaultValue: 1.0, note: "0.5 – 2.0" },
      { key: "output_format", label: "Output Format", type: "select", defaultValue: "mp3", options: ["mp3", "wav", "ogg"] },
      { key: "sample_rate", label: "Sample Rate (Hz)", type: "select", defaultValue: "22050", options: ["16000", "22050", "44100"] },
    ],
  },

  // ── Establishing Knowledge ─────────────────────────────────────────────────
  {
    id: "encode-vectordb",
    name: "Encode Data to VectorDB",
    category: "Establishing Knowledge",
    description: "Generate embeddings from documents and upsert them into a vector database for semantic search.",
    tags: ["Embeddings", "VectorDB", "RAG"],
    tool: "custom",
    configFields: [
      { key: "db_type", label: "Vector DB", type: "select", defaultValue: "qdrant", options: ["qdrant", "pgvector", "weaviate", "pinecone"] },
      { key: "endpoint_url", label: "DB Endpoint URL", type: "text", defaultValue: "http://localhost:6333" },
      { key: "collection", label: "Collection / Index", type: "text", defaultValue: "documents" },
      { key: "embedding_model", label: "Embedding Model", type: "select", defaultValue: "bge-large-en-v1.5", options: ["bge-large-en-v1.5", "bge-m3", "e5-large-v2", "all-minilm-l6-v2"] },
      { key: "batch_size", label: "Batch Size", type: "number", defaultValue: 64 },
      { key: "chunk_size", label: "Chunk Size (chars)", type: "number", defaultValue: 512 },
    ],
  },
  {
    id: "retrieve-vectordb",
    name: "Retrieve Context from VectorDB",
    category: "Establishing Knowledge",
    description: "Perform semantic similarity search against a vector store to retrieve relevant document chunks.",
    tags: ["RAG", "Retrieval", "Semantic Search"],
    tool: "custom",
    configFields: [
      { key: "db_type", label: "Vector DB", type: "select", defaultValue: "qdrant", options: ["qdrant", "pgvector", "weaviate", "pinecone"] },
      { key: "endpoint_url", label: "DB Endpoint URL", type: "text", defaultValue: "http://localhost:6333" },
      { key: "collection", label: "Collection / Index", type: "text", defaultValue: "documents" },
      { key: "embedding_model", label: "Embedding Model", type: "select", defaultValue: "bge-large-en-v1.5", options: ["bge-large-en-v1.5", "bge-m3", "e5-large-v2", "all-minilm-l6-v2"] },
      { key: "top_k", label: "Top-K Results", type: "number", defaultValue: 5 },
      { key: "score_threshold", label: "Score Threshold", type: "number", defaultValue: 0.7, note: "0.0 – 1.0" },
    ],
  },
  {
    id: "populate-knowledge-graph",
    name: "Populate Knowledge Graph",
    category: "Establishing Knowledge",
    description: "Extract entity relationships from text and persist them as nodes and edges in a graph database.",
    tags: ["Knowledge Graph", "Neo4j", "Graph"],
    tool: "custom",
    configFields: [
      { key: "graph_db_url", label: "Graph DB URL", type: "text", defaultValue: "bolt://localhost:7687" },
      { key: "username", label: "DB Username", type: "text", defaultValue: "neo4j" },
      { key: "password", label: "DB Password", type: "password", defaultValue: "" },
      { key: "relation_types", label: "Relation Types", type: "text", defaultValue: "WORKS_AT,LOCATED_IN,PART_OF,OWNED_BY", note: "Comma-separated" },
      { key: "confidence_threshold", label: "Confidence Threshold", type: "number", defaultValue: 0.8 },
      { key: "merge_existing", label: "Merge Existing Nodes", type: "bool", defaultValue: true },
    ],
  },
  {
    id: "retrieve-knowledge-graph",
    name: "Retrieve Context from Knowledge Graph",
    category: "Establishing Knowledge",
    description: "Query a knowledge graph to retrieve multi-hop relationship chains relevant to a given entity.",
    tags: ["Knowledge Graph", "Retrieval", "Graph RAG"],
    tool: "custom",
    configFields: [
      { key: "graph_db_url", label: "Graph DB URL", type: "text", defaultValue: "bolt://localhost:7687" },
      { key: "username", label: "DB Username", type: "text", defaultValue: "neo4j" },
      { key: "password", label: "DB Password", type: "password", defaultValue: "" },
      { key: "query_depth", label: "Traversal Depth", type: "number", defaultValue: 2, note: "Max hops from seed entity" },
      { key: "max_nodes", label: "Max Nodes Returned", type: "number", defaultValue: 50 },
    ],
  },

  // ── Safety & Privacy ──────────────────────────────────────────────────────
  {
    id: "mask-pii",
    name: "Mask PII",
    category: "Safety & Privacy",
    description: "Detect and mask personally identifiable information in text using NER and pattern matching.",
    tags: ["PII", "Privacy", "GDPR"],
    tool: "custom",
    configFields: [
      { key: "entity_types", label: "PII Entity Types", type: "text", defaultValue: "NAME,EMAIL,PHONE,SSN,CREDIT_CARD,ADDRESS", note: "Comma-separated" },
      { key: "mask_char", label: "Mask Character", type: "text", defaultValue: "*" },
      { key: "consistent_masking", label: "Consistent Masking", type: "bool", defaultValue: true, note: "Same value → same mask token" },
      { key: "model", label: "NER Model", type: "select", defaultValue: "presidio", options: ["presidio", "gliner", "custom-regex"] },
    ],
  },
  {
    id: "redact-pii",
    name: "Reduct PII",
    category: "Safety & Privacy",
    description: "Permanently replace PII with synthetic or category-level substitutes to produce anonymized output.",
    tags: ["PII", "Redaction", "Anonymization"],
    tool: "custom",
    configFields: [
      { key: "entity_types", label: "PII Entity Types", type: "text", defaultValue: "NAME,EMAIL,PHONE,SSN,ADDRESS" },
      { key: "replacement_strategy", label: "Replacement Strategy", type: "select", defaultValue: "category", options: ["category", "synthetic", "random", "fixed"] },
      { key: "preserve_format", label: "Preserve Format", type: "bool", defaultValue: true, note: "Phone stays phone-shaped" },
      { key: "model", label: "NER Model", type: "select", defaultValue: "presidio", options: ["presidio", "gliner", "custom-regex"] },
    ],
  },
  {
    id: "check-guardrails",
    name: "Check Guardrails",
    category: "Safety & Privacy",
    description: "Screen input and output content against configurable safety policies using LLM-based classification.",
    tags: ["Safety", "Content Moderation", "Guardrails"],
    tool: "custom",
    configFields: [
      { key: "model", label: "Safety Model", type: "select", defaultValue: "llama-guard-3", options: ["llama-guard-3", "llama-guard-2", "shieldgemma-2b"] },
      { key: "categories", label: "Policy Categories", type: "text", defaultValue: "violence,hate_speech,sexual,self_harm,illegal", note: "Comma-separated" },
      { key: "action_on_violation", label: "Action on Violation", type: "select", defaultValue: "reject", options: ["reject", "redact", "flag", "log_only"] },
      { key: "check_input", label: "Check Input", type: "bool", defaultValue: true },
      { key: "check_output", label: "Check Output", type: "bool", defaultValue: true },
      { key: "threshold", label: "Violation Threshold", type: "number", defaultValue: 0.8, note: "0.0 – 1.0" },
    ],
  },
];
