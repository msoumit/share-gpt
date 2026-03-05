export interface ChatThreadModel {
  createdAt: Date;
  id: string
  name: string;
  type: 'CHAT_THREAD';
  userEmail: string;
  userName: string;
}

export interface ChatMessageModel {
  id: string;
  userEmail: string;
  userName: string;
  createdAt: Date;
  type: 'CHAT_MESSAGE';
  content: string;
  role: "user" | "assistant";
  threadId: string;
  context: string;
  citations?: CitationModel[];
  guardrail?: GuardrailModel | null;
}

export interface UserModel {
  displayName: string;
  email: string;
}

export interface CitationModel {
  title: string;
  sourceUrl: string;
  chunkId: string;
}

export interface GuardrailModel {
  verdict: string;
  confidence: number;
  issues: unknown[];
  notes: string | null;
}

export interface AssistantValidatedResponse {
  answer: string;
  citations: CitationModel[];
  guardrail: GuardrailModel | null;
}

export interface StreamHandlers {
  onStatus?: (stage: string) => void;
  onAnswerDelta: (delta: string) => void;
  onCitationDelta?: (citation: CitationModel) => void;
  onAnswerReady?: (payload: { answer: string; citations: CitationModel[] }) => void;
  onFinal: (response: AssistantValidatedResponse) => void;
  onDone?: () => void;
  onError: (error: Error) => void;
}

export interface ErrorModel {
  error: string;
}

export type HeadersType = {
  'Content-Type': string;
  'Ocp-Apim-Subscription-Key'?: string;
};

export interface ConfigModel {
  chatAPI: string;
  sharePointOnlineClientId: string;
}
