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
}

export interface UserModel {
  displayName: string;
  email: string;
}

export interface CitationModel {
  name: string;
  fileBlobUrl: string;
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
