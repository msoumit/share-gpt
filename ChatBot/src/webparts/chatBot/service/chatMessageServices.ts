import { WebPartContext } from "@microsoft/sp-webpart-base";
import { ChatMessageModel, ConfigModel, ErrorModel, UserModel } from "./model";
import { AadHttpClient, ISPHttpClientOptions } from '@microsoft/sp-http';

export const getChatMessagesById = async(user:UserModel, id:string, context: WebPartContext, globalConfig: ConfigModel): Promise<ChatMessageModel[]> => {
  try {
    // Dummy payload injection
    const dummyChatMessages: ChatMessageModel[] = [
      {
        id: "msg-001",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:00:00Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "Can you explain how hybrid search works in Azure AI Search?",
        role: "user",
        threadId: "thread-001",
        context: ""
      },
      {
        id: "msg-002",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:00:10Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "Hybrid search combines traditional BM25 keyword search with vector similarity search to retrieve more relevant results by leveraging both lexical and semantic matching.",
        role: "assistant",
        threadId: "thread-001",
        context: "Hybrid search = BM25 + Vector ANN + optional semantic reranking."
      },
      {
        id: "msg-003",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:02:00Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "What is the role of semantic configuration in this setup?",
        role: "user",
        threadId: "thread-001",
        context: ""
      },
      {
        id: "msg-004",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:02:15Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "Semantic configuration enables features like extractive captions and semantic reranking, improving the quality and readability of search results.",
        role: "assistant",
        threadId: "thread-001",
        context: "Uses query_type='semantic' and semantic_configuration_name."
      },
      {
        id: "msg-005",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:00:00Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "Can you explain how hybrid search works in Azure AI Search?",
        role: "user",
        threadId: "thread-001",
        context: ""
      },
      {
        id: "msg-006",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:00:10Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "Hybrid search combines traditional BM25 keyword search with vector similarity search to retrieve more relevant results by leveraging both lexical and semantic matching.",
        role: "assistant",
        threadId: "thread-001",
        context: "Hybrid search = BM25 + Vector ANN + optional semantic reranking."
      },
      {
        id: "msg-007",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:02:00Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "What is the role of semantic configuration in this setup?",
        role: "user",
        threadId: "thread-001",
        context: ""
      },
      {
        id: "msg-008",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:02:15Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "Semantic configuration enables features like extractive captions and semantic reranking, improving the quality and readability of search results.",
        role: "assistant",
        threadId: "thread-001",
        context: "Uses query_type='semantic' and semantic_configuration_name."
      },
      {
        id: "msg-009",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:00:00Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "Can you explain how hybrid search works in Azure AI Search?",
        role: "user",
        threadId: "thread-001",
        context: ""
      },
      {
        id: "msg-010",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:00:10Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "Hybrid search combines traditional BM25 keyword search with vector similarity search to retrieve more relevant results by leveraging both lexical and semantic matching.",
        role: "assistant",
        threadId: "thread-001",
        context: "Hybrid search = BM25 + Vector ANN + optional semantic reranking."
      },
      {
        id: "msg-011",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:02:00Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "What is the role of semantic configuration in this setup?",
        role: "user",
        threadId: "thread-001",
        context: ""
      },
      {
        id: "msg-012",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee",
        createdAt: new Date("2026-02-21T10:02:15Z"),
        type: "CHAT_MESSAGE",
        isDeleted: false,
        content: "Semantic configuration enables features like extractive captions and semantic reranking, improving the quality and readability of search results.",
        role: "assistant",
        threadId: "thread-001",
        context: "Uses query_type='semantic' and semantic_configuration_name."
      }
    ];
    return dummyChatMessages;

    // const body = {
    //   userEmail: user.email,
    //   threadId: id,
    //   isDeleted: false,
    //   type: "CHAT_MESSAGE"  
    // };
    // const clientId = globalConfig.sharePointOnlineClientId;
    // const endpointUri = `${globalConfig.chatAPI}/readItemChatMessages`;
    // const headers: Headers = new Headers();
    // headers.append("Content-type", "application/json");
    // const options: ISPHttpClientOptions = {
    //   body: JSON.stringify(body),
    //   headers: headers
    // };
    // const client: AadHttpClient = await context.aadHttpClientFactory.getClient(clientId);
    // const response = await client.post(endpointUri, AadHttpClient.configurations.v1, options);
    // if (!response.ok) {
    //   const errorResponse = await response.json() as ErrorModel;
    //   const error: string = errorResponse.error;
    //   throw new Error(`Failed to fetch chat messages. Reason: ${error}`);
    // }
    // const data = await response.json();
    // return data as ChatMessageModel[];
  } 
  catch (error) {
    const e = error as Error;
    console.error(e.message);
    throw new Error(e.message);
  }
}

export const getChatMessagesReplyFromAssistant = async (
  newMessage: ChatMessageModel, 
  onMessage: (message: string) => void, 
  onError: (error: Error) => void, 
  context: WebPartContext, 
  globalConfig: ConfigModel
): Promise<void> => {
  try {
    const clientId = globalConfig.sharePointOnlineClientId;
    const endpointUri = `${globalConfig.chatAPI}/getResponseFromAssistant`;
    const body = {
      ...newMessage
    };
    const headers: Headers = new Headers();
    headers.append("Content-type", "application/json");
    const options: ISPHttpClientOptions = {
      body: JSON.stringify(body),
      headers: headers
    };
    const client: AadHttpClient = await context.aadHttpClientFactory.getClient(clientId);
    const response: any = await client.post(endpointUri, AadHttpClient.configurations.v1, options);
    if (!response.ok) {
      const errorResponse = await response.json() as ErrorModel;
      const error: string = errorResponse.error;
      throw new Error(`Failed to fetch reply from assistant. Reason: ${error}`);
    }
    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');
    let isDone = false;
    while (!isDone) {
      const { done, value } = await reader?.read() || {};
      if (done){
        isDone = true;
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      onMessage(chunk);
    }
  } 
  catch (error) {
    console.error('Failed to fetch chat reply from assistant:', error);
    const err = error instanceof Error ? error : new Error(String(error));
    onError(err);
  }
};
