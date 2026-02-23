import { ChatThreadModel, UserModel, ErrorModel, ConfigModel } from "./model";
import { uniqueId } from "./common";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { AadHttpClient, ISPHttpClientOptions, HttpClient, HttpClientResponse, IHttpClientOptions } from '@microsoft/sp-http';

export const getChatThreadsByUser = async(email:string, context: WebPartContext, globalConfig: ConfigModel): Promise<ChatThreadModel[]>  => {
  try {
    
    const endpointUri = `${globalConfig.chatAPI}/sample-test`;
    // const endpointUri = `${globalConfig.chatAPI}/readItemChatHistory`;

    const body = {
      userEmail: email.toLowerCase(),
      type: "CHAT_THREAD"
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
      throw new Error(`Failed to fetch chat thread. Reason: ${error}`);
    }

    const data = await response.json();
    console.log(data)
    // Dummy payload injection
    const dummyChatThreads: ChatThreadModel[] = [
      {
        createdAt: new Date("2026-02-20T10:15:00Z"),
        id: "thread-001",
        isDeleted: false,
        name: "Project Discussion",
        type: "CHAT_THREAD",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee"
      },
      {
        createdAt: new Date("2026-02-21T14:30:00Z"),
        id: "thread-002",
        isDeleted: false,
        name: "RAG Architecture Review",
        type: "CHAT_THREAD",
        userEmail: "soumit@example.com",
        userName: "Soumit Mukherjee"
      }
    ];
    
    return dummyChatThreads as ChatThreadModel[];
  } 
  catch (error) {
    const e = error as Error;
    console.error(e.message);
    throw new Error(e.message);
  }
};

export const createChatThread = async(user: UserModel, context: WebPartContext, globalConfig: ConfigModel): Promise<ChatThreadModel> => {
  try {
    const id = uniqueId();
    const name = "new chat";
    const body: ChatThreadModel = {
      name: name,
      userName: user.displayName,
      userEmail: user.email.toLowerCase(),
      id: id,
      createdAt: new Date(),
      isDeleted: false,
      type: "CHAT_THREAD"
    };
    const clientId = globalConfig.sharePointOnlineClientId;
    const endpointUri = `${globalConfig.chatAPI}/addItemChatHistory`;
    const headers: Headers = new Headers();
    headers.append("Content-type", "application/json");
    const options: ISPHttpClientOptions = {
      body: JSON.stringify(body),
      headers: headers
    };
    const client: AadHttpClient = await context.aadHttpClientFactory.getClient(clientId);
    const response = await client.post(endpointUri, AadHttpClient.configurations.v1, options);
    if (!response.ok) {
      const errorResponse = await response.json() as ErrorModel;
      const error: string = errorResponse.error;
      throw new Error(`Failed to create chat thread. Reason: ${error}`);
    }
    const data = await response.json();
    return data as ChatThreadModel;
  } 
  catch (error) {
    const e = error as Error;
    console.error(e.message);
    throw new Error(e.message);
  }
};

export const updateChatThread = async(id: string, email:string, name:string, isDeleted: boolean, context: WebPartContext, globalConfig: ConfigModel): Promise<ChatThreadModel> => {
  try {
    const body = {
      id: id,
      userEmail: email.toLowerCase(),
      name: name,
      isDeleted: isDeleted
    };
    const clientId = globalConfig.sharePointOnlineClientId;
    const endpointUri = `${globalConfig.chatAPI}/updateItemChatHistory`;
    const headers: Headers = new Headers();
    headers.append("Content-type", "application/json");
    const options: ISPHttpClientOptions = {
      body: JSON.stringify(body),
      headers: headers
    };
    const client: AadHttpClient = await context.aadHttpClientFactory.getClient(clientId);
    const response = await client.post(endpointUri, AadHttpClient.configurations.v1, options);
    if (!response.ok) {
      const errorResponse = await response.json() as ErrorModel;
      const error: string = errorResponse.error;
      throw new Error(`Failed to update chat thread. Reason: ${error}`);
    }
    const data = await response.json();
    return data as ChatThreadModel;
  } 
  catch (error) {
    const e = error as Error;
    console.error(e.message);
    throw new Error(e.message);
  }
};

export const deleteChatThread = async(id: string, email: string, context: WebPartContext, globalConfig: ConfigModel): Promise<void> => {
  try{
    const body = {
      userEmail: email.toLowerCase(),
      id: id
    };
    const clientId = globalConfig.sharePointOnlineClientId;
    const endpointUri = `${globalConfig.chatAPI}/deleteItemChatHistory`;
    const headers: Headers = new Headers();
    headers.append("Content-type", "application/json");
    const options: ISPHttpClientOptions = {
      body: JSON.stringify(body),
      headers: headers
    };
    const client: AadHttpClient = await context.aadHttpClientFactory.getClient(clientId);
    const response = await client.post(endpointUri, AadHttpClient.configurations.v1, options);
    if(!response.ok){
      const errorResponse = await response.json() as ErrorModel;
      const error: string = errorResponse.error;
      throw new Error(`Failed to delete chat thread. Reason: ${error}`);
    }
  }
  catch(error){
    const e = error as Error;
    console.error(e.message);
    throw new Error(e.message);
  }
};