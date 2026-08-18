import type { LucideIcon } from "lucide-react";
import {
  FileText, Mail, MessageCircle, MessageSquare, Mic, PenLine, Grid3x3, Video, FileEdit, FolderSearch,
  FileCheck, Scissors, Tags, GitCompare, Copy, LayoutGrid, Highlighter, Info, PenTool, Table2, Wand2, ClipboardCheck,
  Tag, ScanSearch, Target, Braces, AlignLeft,
  ListFilter, Layers, AlertTriangle, Smile, Radar, Zap, KeyRound, ArrowUpDown, SpellCheck2,
  AlignJustify, ShieldCheck, ArrowLeftRight, CheckCheck, TrendingUp, ListX, Calculator,
  Volume2, Languages, Ear, AudioWaveform, Users, ListChecks, Captions, UserCheck, FileAudio,
  MicOff, Gauge, SearchCheck, NotebookPen, MessagesSquare,
  DatabaseZap, Network, Share2, Search, History, ListTree, Database, ArrowUpNarrowWide, Blend, RefreshCw,
  ScrollText, Signpost,
  Undo2, ThumbsUp, TriangleAlert, BellRing, SplitSquareHorizontal, HelpCircle, Eye,
  Reply, Ticket, Download, FileSignature, BarChart3, FilePlus2, Archive, Presentation, FileSpreadsheet,
  CalendarPlus, SendHorizontal, Send, Save, Terminal,
  ShieldAlert, EyeOff, Eraser, Lock, ShieldOff, AlertOctagon, FileClock, Fingerprint, Gavel,
} from "lucide-react";

/** One distinct icon per task — the card's dominant visual element (Pinterest-tile style).
 *  Keyed by WorkflowDef.id. Fall back to a neutral glyph if a task is ever added without one. */
export const TASK_ICONS: Record<string, LucideIcon> = {
  // Handling Inputs
  "process-pdf": FileText,
  "read-email": Mail,
  "read-telegram": MessageCircle,
  "read-whatsapp": MessageSquare,
  "transcribe-speech": Mic,
  "read-handwriting": PenLine,
  "read-spreadsheet": Grid3x3,
  "read-video": Video,
  "read-word-document": FileEdit,
  "watch-folder": FolderSearch,

  // Working with Documents
  "assess-document-quality": FileCheck,
  "chunk-document": Scissors,
  "classify-document": Tags,
  "compare-document-versions": GitCompare,
  "detect-duplicate-document": Copy,
  "detect-layout": LayoutGrid,
  "extract-clauses": Highlighter,
  "extract-document-metadata": Info,
  "extract-signatures": PenTool,
  "extract-tables": Table2,
  "normalize-document": Wand2,
  "verify-document-completeness": ClipboardCheck,

  // Working with Text
  "create-tags": Tag,
  "determine-entities": ScanSearch,
  "determine-intent": Target,
  "fill-json": Braces,
  "summarize": AlignLeft,
  "classify-text": ListFilter,
  "cluster-documents": Layers,
  "detect-contradiction": AlertTriangle,
  "detect-sentiment": Smile,
  "detect-text-anomaly": Radar,
  "detect-urgency": Zap,
  "extract-key-values": KeyRound,
  "rank-relevance": ArrowUpDown,
  "rewrite-simplify": SpellCheck2,

  // Comparing & Reconciling
  "align-documents": AlignJustify,
  "check-compliance": ShieldCheck,
  "compute-field-diff": ArrowLeftRight,
  "cross-validate-sources": CheckCheck,
  "detect-deviation": TrendingUp,
  "detect-missing-obligation": ListX,
  "verify-arithmetic": Calculator,

  // Working with Language & Speech
  "text-to-speech": Volume2,
  "translate-text": Languages,
  "detect-audio-language": Ear,
  "detect-emotion-voice": AudioWaveform,
  "diarize-speakers": Users,
  "extract-action-items": ListChecks,
  "generate-subtitles": Captions,
  "identify-speaker": UserCheck,
  "normalize-transcript": FileAudio,
  "redact-audio": MicOff,
  "score-call-quality": Gauge,
  "spot-keywords-audio": SearchCheck,
  "summarize-meeting": NotebookPen,
  "translate-speech": MessagesSquare,

  // Establishing Knowledge
  "encode-vectordb": DatabaseZap,
  "populate-knowledge-graph": Network,
  "retrieve-knowledge-graph": Share2,
  "retrieve-vectordb": Search,
  "detect-knowledge-staleness": History,
  "maintain-taxonomy": ListTree,
  "query-structured-store": Database,
  "rerank-context": ArrowUpNarrowWide,
  "retrieve-hybrid": Blend,
  "update-knowledge-index": RefreshCw,

  // Deciding & Routing
  "apply-policy": ScrollText,
  "route-request": Signpost,

  // Human-in-the-Loop
  "capture-correction": Undo2,
  "collect-approval": ThumbsUp,
  "escalate-exception": TriangleAlert,
  "notify-stakeholder": BellRing,
  "present-comparison": SplitSquareHorizontal,
  "request-clarification": HelpCircle,
  "request-review": Eye,

  // Producing Outputs & Acting
  "compose-reply": Reply,
  "create-ticket": Ticket,
  "export-dataset": Download,
  "fill-form": FileSignature,
  "generate-chart": BarChart3,
  "generate-document": FilePlus2,
  "generate-evidence-pack": Archive,
  "generate-presentation": Presentation,
  "generate-spreadsheet": FileSpreadsheet,
  "schedule-event": CalendarPlus,
  "send-email": SendHorizontal,
  "send-message": Send,
  "write-to-database": Save,
  "write-to-system": Terminal,

  // Safety & Privacy
  "check-guardrails": ShieldAlert,
  "mask-pii": EyeOff,
  "redact-pii": Eraser,
  "classify-data-sensitivity": Lock,
  "detect-prompt-injection": ShieldOff,
  "detect-toxicity-bias": AlertOctagon,
  "log-audit-trail": FileClock,
  "pseudonymize-reversibly": Fingerprint,
  "screen-sanctions": Gavel,
};

/** Fallback icon for any task id not covered above. */
export const DEFAULT_TASK_ICON: LucideIcon = FileText;

export function getTaskIcon(id: string): LucideIcon {
  return TASK_ICONS[id] ?? DEFAULT_TASK_ICON;
}
