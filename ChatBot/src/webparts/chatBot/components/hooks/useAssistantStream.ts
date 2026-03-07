import * as React from "react";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { getChatMessagesReplyFromAssistant } from "../../service/chatMessageServices";
import {
  AssistantValidatedResponse,
  ChatMessageModel,
  CitationModel,
  ConfigModel,
  StreamHandlers,
  UserModel
} from "../../service/model";
import { uniqueId } from "../../service/common";

export interface UseAssistantStreamParams {
  threadId?: string;
  currentUser: UserModel;
  context: WebPartContext;
  globalConfig: ConfigModel;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessageModel[]>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
}

interface UseAssistantStreamResult {
  assistantStatus: string;
  requestAssistantResponse: (newMessage: ChatMessageModel, newThreadId?: string) => Promise<void>;
}

export const useAssistantStream = ({
  threadId,
  currentUser,
  context,
  globalConfig,
  setChatMessages,
  setError
}: UseAssistantStreamParams): UseAssistantStreamResult => {
  const [assistantStatus, setAssistantStatus] = React.useState<string>("");
  const currentStreamStageRef = React.useRef<string>("");

  const requestAssistantResponse = React.useCallback(async (newMessage: ChatMessageModel, newThreadId?: string): Promise<void> => {
    setAssistantStatus("");

    const placeholderReply: ChatMessageModel = {
      content: "",
      createdAt: new Date(),
      context: "",
      id: uniqueId(),
      role: "assistant",
      threadId: threadId ? threadId : newThreadId as string,
      type: "CHAT_MESSAGE",
      userEmail: currentUser.email,
      userName: currentUser.displayName
    };

    setChatMessages(prevMessages => [
      ...prevMessages,
      placeholderReply
    ]);

    const handleStatus = (stage: string): void => {
      currentStreamStageRef.current = stage;
      setAssistantStatus(stage);
    };

    const handleAnswerDelta = (delta: string): void => {
      if (currentStreamStageRef.current !== "validating response") {
        setAssistantStatus("");
      }

      setChatMessages(prevMessages => {
        const lastMessageIndex = prevMessages.length - 1;
        const updatedMessages = [...prevMessages];

        if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === "assistant") {
          updatedMessages[lastMessageIndex] = {
            ...updatedMessages[lastMessageIndex],
            content: updatedMessages[lastMessageIndex].content + delta
          };
        }

        return updatedMessages;
      });
    };

    const handleCitationDelta = (citation: CitationModel): void => {
      if (currentStreamStageRef.current !== "validating response") {
        setAssistantStatus("");
      }

      setChatMessages(prevMessages => {
        const lastMessageIndex = prevMessages.length - 1;
        const updatedMessages = [...prevMessages];

        if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === "assistant") {
          const existing = updatedMessages[lastMessageIndex].citations || [];
          const exists = existing.some(c => c.sourceUrl === citation.sourceUrl);
          if (!exists) {
            updatedMessages[lastMessageIndex] = {
              ...updatedMessages[lastMessageIndex],
              citations: [...existing, citation]
            };
          }
        }

        return updatedMessages;
      });
    };

    const handleAnswerReady = (payload: { answer: string; citations: CitationModel[] }): void => {
      if (currentStreamStageRef.current !== "validating response") {
        setAssistantStatus("");
      }

      setChatMessages(prevMessages => {
        const lastMessageIndex = prevMessages.length - 1;
        const updatedMessages = [...prevMessages];

        if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === "assistant") {
          updatedMessages[lastMessageIndex] = {
            ...updatedMessages[lastMessageIndex],
            content: payload.answer || updatedMessages[lastMessageIndex].content,
            citations: payload.citations || updatedMessages[lastMessageIndex].citations || []
          };
        }

        return updatedMessages;
      });
    };

    const handleFinal = (response: AssistantValidatedResponse): void => {
      setChatMessages(prevMessages => {
        const lastMessageIndex = prevMessages.length - 1;
        const updatedMessages = [...prevMessages];

        if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === "assistant") {
          updatedMessages[lastMessageIndex] = {
            ...updatedMessages[lastMessageIndex],
            content: response.answer || updatedMessages[lastMessageIndex].content,
            citations: response.citations || updatedMessages[lastMessageIndex].citations || [],
            guardrail: response.guardrail || null
          };
        }

        return updatedMessages;
      });
    };

    const handleDone = (): void => {
      setAssistantStatus("");
      currentStreamStageRef.current = "";
    };

    const handleStreamError = (err: Error): void => {
      setAssistantStatus("");
      currentStreamStageRef.current = "";
      setError(err.message);
    };

    const streamHandlers: StreamHandlers = {
      onStatus: handleStatus,
      onAnswerDelta: handleAnswerDelta,
      onCitationDelta: handleCitationDelta,
      onAnswerReady: handleAnswerReady,
      onFinal: handleFinal,
      onDone: handleDone,
      onError: handleStreamError
    };

    await getChatMessagesReplyFromAssistant(
      newMessage,
      streamHandlers,
      context,
      globalConfig
    );
  }, [context, currentUser.displayName, currentUser.email, globalConfig, setChatMessages, setError, threadId]);

  return {
    assistantStatus,
    requestAssistantResponse
  };
};
