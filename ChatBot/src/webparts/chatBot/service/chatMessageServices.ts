import { WebPartContext } from "@microsoft/sp-webpart-base";
import { ChatMessageModel, ConfigModel, ErrorModel, UserModel } from "./model";
import { AadHttpClient, ISPHttpClientOptions, HttpClient, HttpClientResponse, IHttpClientOptions } from '@microsoft/sp-http';

export const getChatMessagesById = async(user:UserModel, id:string, context: WebPartContext, globalConfig: ConfigModel): Promise<ChatMessageModel[]> => {
  try {
    const body = {
      userEmail: user.email,
      threadId: id,
      isDeleted: false,
      type: "CHAT_MESSAGE"  
    };

    const endpointUri = `${globalConfig.chatAPI}/read-chat-messages`;
    
    const headers: Headers = new Headers();
    headers.append("Content-type", "application/json");
    
    const options: IHttpClientOptions = {
      body: JSON.stringify(body),
      headers: headers
    };

    const response = await context.httpClient.post(endpointUri, HttpClient.configurations.v1, options);
    
    if (!response.ok) {
      const errorResponse = await response.json() as ErrorModel;
      const error: string = errorResponse.error;
      throw new Error(`Failed to fetch chat messages. Reason: ${error}`);
    }
    const data = await response.json();
    return data as ChatMessageModel[];
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
