import { WebPartContext } from "@microsoft/sp-webpart-base";
import { AssistantValidatedResponse, ChatMessageModel, ConfigModel, ErrorModel, StreamHandlers, UserModel } from "./model";
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
  handlers: StreamHandlers,
  context: WebPartContext, 
  globalConfig: ConfigModel
): Promise<void> => {
  try {
    const endpointUri = `${globalConfig.chatAPI}/get-streamed-response`;
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

    const nativeResponse = response as unknown as Response;
    const reader = nativeResponse.body?.getReader();

    if (!reader) {
      throw new Error("Streaming response body is not available");
    }

    const decoder = new TextDecoder('utf-8');
    let buffer = "";

    const processEvent = (eventName: string, dataText: string): void => {
      if (eventName === "status") {
        try {
          const payload = JSON.parse(dataText) as { stage?: string };
          handlers.onStatus?.(payload.stage || "");
        } catch {
          // ignore malformed status payload
        }
        return;
      }

      if (eventName === "answer_delta") {
        const payload = JSON.parse(dataText) as { delta?: string };
        if (payload.delta) {
          handlers.onAnswerDelta(payload.delta);
        }
        return;
      }

      if (eventName === "citation_delta") {
        const payload = JSON.parse(dataText) as { citation?: AssistantValidatedResponse["citations"][number] };
        if (payload.citation) {
          handlers.onCitationDelta?.(payload.citation);
        }
        return;
      }

      if (eventName === "answer_ready") {
        const payload = JSON.parse(dataText) as { answer?: string; citations?: AssistantValidatedResponse["citations"] };
        handlers.onAnswerReady?.({
          answer: payload.answer || "",
          citations: payload.citations || []
        });
        return;
      }

      if (eventName === "final") {
        const payload = JSON.parse(dataText) as AssistantValidatedResponse;
        handlers.onFinal(payload);
        return;
      }

      if (eventName === "done") {
        handlers.onDone?.();
        return;
      }

      if (eventName === "error") {
        const payload = JSON.parse(dataText) as { error?: string };
        throw new Error(payload.error || "Unknown streaming error");
      }
    };

    const processBuffer = (): void => {
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const rawEvent of events) {
        const lines = rawEvent.split("\n");
        let eventName = "message";
        const dataLines: string[] = [];

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventName = line.substring(6).trim();
          } else if (line.startsWith("data:")) {
            dataLines.push(line.substring(5).trim());
          }
        }

        const dataText = dataLines.join("\n");
        processEvent(eventName, dataText);
      }
    };

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        if (buffer.trim()) {
          buffer += "\n\n";
          processBuffer();
        }
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      processBuffer();
    }
  }
  catch (error) {
    const e = error as Error;
    console.error('Failed to fetch chat reply from assistant:', e);
    handlers.onError(new Error(e.message));
  }
};
