import { WebPartContext } from "@microsoft/sp-webpart-base";
import { AssistantValidatedResponse, ChatMessageModel, ConfigModel, ErrorModel, UserModel } from "./model";
import { HttpClient, HttpClientResponse, IHttpClientOptions } from '@microsoft/sp-http';

export const getChatMessagesById = async(user:UserModel, id:string, context: WebPartContext, globalConfig: ConfigModel): Promise<ChatMessageModel[]> => {
  try {
    const body = {
      userEmail: user.email,
      threadId: id,
      type: "CHAT_MESSAGE"  
    };

    const endpointUri = `${globalConfig.chatAPI}/read-chat-messages`;
    
    const headers: Headers = new Headers();
    headers.append("Content-type", "application/json");
    
    const options: IHttpClientOptions = {
      body: JSON.stringify(body),
      headers: headers
    };

    const response: HttpClientResponse = await context.httpClient.post(endpointUri, HttpClient.configurations.v1, options);
    
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
  context: WebPartContext, 
  globalConfig: ConfigModel
): Promise<AssistantValidatedResponse> => {
  try {
    const endpointUri = `${globalConfig.chatAPI}/get-response`;
    const body = {
      ...newMessage
    };

    const headers: Headers = new Headers();
    headers.append("Content-type", "application/json");

    const options: IHttpClientOptions = {
      body: JSON.stringify(body),
      headers: headers
    };

    const response: HttpClientResponse = await context.httpClient.post(endpointUri, HttpClient.configurations.v1, options);

    if (!response.ok) {
      const errorResponse = await response.json() as ErrorModel;
      const error: string = errorResponse.error;
      throw new Error(`Failed to fetch reply from assistant. Reason: ${error}`);
    }

    const data = await response.json();
    return data as AssistantValidatedResponse;
  }
  catch (error) {
    const e = error as Error;
    console.error('Failed to fetch chat reply from assistant:', e);
    throw new Error(e.message);
  }
};
