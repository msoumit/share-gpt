import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { ChatNavigation } from "./ChatNavigation";
import { getChatMessagesById } from "../service/chatMessageServices";
import { GlobalActions } from "./GlobalActions";
import { useChatThreadContext } from "./Context/ChatThreadContext";
import { ChatMessageModel } from "../service/model";
import { useGlobalContext } from "./Context/GlobalContext";
import styles from "./ChatBot.module.scss";
import { uniqueId } from "../service/common";
import { ChatMessageList } from "./ChatMessageList";
import { ChatInputBar } from "./ChatInputBar";
import { UseSpeechDictationParams, useSpeechDictation } from "./hooks/useSpeechDictation";
import { UseAssistantStreamParams, useAssistantStream } from "./hooks/useAssistantStream";

export const ChatContent: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const isChatFromLandingPage = location.state?.isChatFromLandingPage;
  const navigate = useNavigate();
  const [chatMessages, setChatMessages] = useState<ChatMessageModel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { showChatNavigation, modifyChatThread, addChatThread } = useChatThreadContext();
  const [chat, setChat] = useState("");
  const { currentUser, context, globalConfig } = useGlobalContext();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const chatHistoryContainerRef = React.useRef<HTMLDivElement>(null);
  const [isChatBoxFocused, setIsChatBoxFocused] = useState<boolean>(false);

  const maxTextareaHeight = 100;
  const isInitialLoadRef = React.useRef(true);
  const scrollOnNextUpdateRef = React.useRef(false);

  const onSpeechTranscript = React.useCallback((transcript: string): void => {
    setChat((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) {
        return transcript;
      }
      return `${prev}${prev.endsWith(" ") ? "" : " "}${transcript}`;
    });
    textareaRef.current?.focus();
  }, []);

  const speechDictationParams: UseSpeechDictationParams = {
    onTranscript: onSpeechTranscript,
    disabled: isSubmitting
  };

  const {isDictationSupported, isListening, dictationError, startDictation, stopDictation} = useSpeechDictation(speechDictationParams);

  const assistantStreamParams: UseAssistantStreamParams = {
    threadId: id,
    currentUser,
    context,
    globalConfig,
    setChatMessages,
    setError
  };

  const { assistantStatus, requestAssistantResponse } = useAssistantStream(assistantStreamParams);

  useEffect(() => {
    const runPageLoad = async (): Promise<void> => {
      if (id) {
        try {
          if (isChatFromLandingPage) {
            setLoading(false);
          }
          else {
            setLoading(true);
          }
          setError(null);
          const messages = await getChatMessagesById(currentUser, id, context, globalConfig);
          setChatMessages(messages);
          scrollOnNextUpdateRef.current = true;
        } 
        catch (loadError) {
          const e = loadError as Error;
          setError(e.message);
        } 
        finally {
          setLoading(false);
        }
      } 
      else {
        setChatMessages([]);
        setError(null);
        setLoading(false);
      }
    };

    runPageLoad().then().catch((loadError) => {
      console.log(loadError);
    });
  }, [id]);

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxTextareaHeight)}px`;
      textarea.style.overflowY = "auto";
    }
  }, [chat]);

  useEffect(() => {
    const el = chatHistoryContainerRef.current;
    if (!el) return;

    const doScroll = (behavior: "auto" | "smooth") => {
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            el.scrollTo({ top: el.scrollHeight, behavior });
          } 
          catch {
            el.scrollTop = el.scrollHeight;
          }
        }, 0);
      });
    };

    if (isInitialLoadRef.current || scrollOnNextUpdateRef.current) {
      doScroll("auto");
      isInitialLoadRef.current = false;
      scrollOnNextUpdateRef.current = false;
      return;
    }

    doScroll("smooth");
  }, [chatMessages, id]);

  const handleChatSubmit = async (): Promise<void> => {
    const normalizedChat = chat.trim();
    if (!normalizedChat || isSubmitting) {
      return;
    }

    if (currentUser && id) {
      try {
        setIsSubmitting(true);
        if (chatMessages.length === 0) {
          const name = normalizedChat.slice(0, 100);
          modifyChatThread(id, currentUser.email, name); // eslint-disable-line @typescript-eslint/no-floating-promises
        }
        const newMessage: ChatMessageModel = {
          content: chat,
          createdAt: new Date(),
          context: "",
          id: uniqueId(),
          role: "user",
          threadId: id,
          type: "CHAT_MESSAGE",
          userEmail: currentUser.email.toLowerCase(),
          userName: currentUser.displayName
        };
        setChat("");
        setChatMessages((prevMessages) => [
          ...prevMessages,
          newMessage
        ]);
        await requestAssistantResponse(newMessage);
      } 
      catch (submitError) {
        setLoading(false);
        const e = submitError as Error;
        setError(e.message);
      } 
      finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (currentUser && !id) {
      try {
        const newThreadId = await addChatThread();
        try {
          setIsSubmitting(true);
          if (chatMessages.length === 0) {
            const name = normalizedChat.slice(0, 100);
            modifyChatThread(newThreadId, currentUser.email, name); // eslint-disable-line @typescript-eslint/no-floating-promises
          }
          const newMessage: ChatMessageModel = {
            content: chat,
            createdAt: new Date(),
            context: "",
            id: uniqueId(),
            role: "user",
            threadId: newThreadId,
            type: "CHAT_MESSAGE",
            userEmail: currentUser.email.toLowerCase(),
            userName: currentUser.displayName
          };
          setChat("");
          setChatMessages((prevMessages) => [
            ...prevMessages,
            newMessage
          ]);
          await requestAssistantResponse(newMessage, newThreadId);
          navigate(`/chatcontent/${newThreadId}`, { replace: true, state: { isChatFromLandingPage: true } });
        } 
        catch (submitError) {
          setLoading(false);
          const e = submitError as Error;
          setError(e.message);
        } 
        finally {
          setIsSubmitting(false);
        }
      } 
      catch (createError) {
        const e = createError as Error;
        setError(e.message);
      }
      return;
    }

    throw new Error("Teams user credential failure");
  };

  const handleChatChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setChat(event.target.value);
  };

  const handleChatBoxFocus = (): void => {
    setIsChatBoxFocused(true);
  };

  const handleChatBoxBlur = (): void => {
    setIsChatBoxFocused(false);
  };

  const handleChatKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>): Promise<void> => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (chat.trim() && !isSubmitting) {
        await handleChatSubmit();
      }
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  const canSubmit = chat.trim().length > 0 && !isSubmitting;

  return (
    <div className={styles.MainChatContainer}>
      {location.pathname.indexOf("/chatcontent/") !== -1 &&
        <div><GlobalActions /></div>
      }
      <div className={styles.ChatContentHolder}>
        {location.pathname.indexOf("/chatcontent/") !== -1 &&
          <div className={showChatNavigation ? [styles.sidebar, styles.open].join(" ") : [styles.sidebar, styles.close].join(" ")}><ChatNavigation /></div>
        }
        <div className={styles.ChatContent}>
          <ChatMessageList
            loading={loading}
            chatMessages={chatMessages}
            assistantStatus={assistantStatus}
            chatHistoryContainerRef={chatHistoryContainerRef}
          />
          <ChatInputBar
            chat={chat}
            isChatBoxFocused={isChatBoxFocused}
            isSubmitting={isSubmitting}
            canSubmit={canSubmit}
            isDictationSupported={isDictationSupported}
            isListening={isListening}
            dictationError={dictationError}
            textareaRef={textareaRef}
            onChatChange={handleChatChange}
            onChatKeyDown={handleChatKeyDown}
            onChatBoxFocus={handleChatBoxFocus}
            onChatBoxBlur={handleChatBoxBlur}
            onSubmit={handleChatSubmit}
            onStartDictation={startDictation}
            onStopDictation={stopDictation}
          />
        </div>
      </div>
    </div>
  );
};
