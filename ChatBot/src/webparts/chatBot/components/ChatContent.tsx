import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { ChatNavigation } from './ChatNavigation';
import { Spinner } from '@fluentui/react-components';
import { getChatMessagesById, getChatMessagesReplyFromAssistant } from '../service/chatMessageServices';
import { GlobalActions } from './GlobalActions';
import { useChatThreadContext } from './Context/ChatThreadContext';
import { ChatIntroduction } from './ChatIntroduction';
import { Textarea } from "@fluentui/react-components";
import { AssistantValidatedResponse, ChatMessageModel, CitationModel } from '../service/model';
import { useGlobalContext } from './Context/GlobalContext';
import styles from './ChatBot.module.scss';
import { Send32Filled } from "@fluentui/react-icons";


export const ChatContent: React.FC = () => {
  const { id } = useParams();
  const location = useLocation();
  const isChatFromLandingPage = location.state?.isChatFromLandingPage;
  const navigate = useNavigate();
  const [chatMessages, setChatMessages] = useState<ChatMessageModel[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const { showChatNavigation, modifyChatThread } = useChatThreadContext();
  const [chat, setChat] = useState("");
  const { currentUser, context, globalConfig } = useGlobalContext();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const chatHistoryContainerRef = React.useRef<HTMLDivElement>(null);
  const [isChatBoxFocused, setIsChatBoxFocused] = useState<boolean>(false);
  const { addChatThread } = useChatThreadContext();


  const maxTextareaHeight = 100;
  const isInitialLoadRef = React.useRef(true);
  const scrollOnNextUpdateRef = React.useRef(false);

  useEffect(() => {
    const runPageLoad = async (): Promise<void> => {
      if (id) {
        try {
          if(isChatFromLandingPage){
            setLoading(false);
          }
          else{
            setLoading(true);
          }
          setError(null);
          const messages = await getChatMessagesById(currentUser, id, context, globalConfig);
          setChatMessages(messages);
          // ensure we attempt to scroll after these messages render
          scrollOnNextUpdateRef.current = true;
        }
        catch (error) {
          const e = error as Error;
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

    }
    runPageLoad().then().catch((error) => {
      console.log(error);
    });
  }, [id]);

  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = `${Math.min(textarea.scrollHeight, maxTextareaHeight)}px`;
      textarea.style.overflowY = 'auto';
    }
  }, [chat]);

  useEffect(() => {
    const el = chatHistoryContainerRef.current;
    if (!el) return;

    const doScroll = (behavior: 'auto' | 'smooth') => {
      // run in RAF + timeout to ensure layout/styling settled before scrolling
      requestAnimationFrame(() => {
        setTimeout(() => {
          try {
            el.scrollTo({ top: el.scrollHeight, behavior });
          } catch (e) {
            // fallback
            el.scrollTop = el.scrollHeight;
          }
        }, 0);
      });
    };

    if (isInitialLoadRef.current || scrollOnNextUpdateRef.current) {
      // jump instantly to bottom on initial or after loading a thread
      doScroll('auto');
      isInitialLoadRef.current = false;
      scrollOnNextUpdateRef.current = false;
      return;
    }

    // updates: smooth scroll for appended messages
    doScroll('smooth');
  }, [chatMessages, id]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  const handleAssistantResponse = async(newMessage: ChatMessageModel, newThreadId?:string): Promise<void> => {
    const placeholderReply: ChatMessageModel = {
      content: "",
      createdAt: new Date(),
      context: "",
      id: "placeholderReplyId",  // generate a proper id here
      role: "assistant",
      threadId: id?id:newThreadId as string,
      type: "CHAT_MESSAGE",
      userEmail: currentUser.email,
      userName: currentUser.displayName
    };
  
    setChatMessages(prevMessages => [
      ...prevMessages,
      placeholderReply
    ]);
  
    const response: AssistantValidatedResponse = await getChatMessagesReplyFromAssistant(newMessage, context, globalConfig);

    setChatMessages(prevMessages => {
      const lastMessageIndex = prevMessages.length - 1;
      const updatedMessages = [...prevMessages];
      if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === "assistant") {
        updatedMessages[lastMessageIndex] = {
          ...updatedMessages[lastMessageIndex],
          content: response.answer || "",
          citations: response.citations || [],
          guardrail: response.guardrail || null
        };
      }
      return updatedMessages;
    });
  }

  const handleChatSubmit = async (): Promise<void> => {
    if (currentUser && id) {
      try {
        setIsSubmitting(true);
        if (chatMessages.length === 0) {
          const name = chat.slice(0, 100);
          modifyChatThread(id, currentUser.email, name);  // eslint-disable-line @typescript-eslint/no-floating-promises
        }
        const newMessage: ChatMessageModel = {
          content: chat,
          createdAt: new Date(),
          context: "",
          id: "newMessageId",
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
        await handleAssistantResponse(newMessage);
      }
      catch (error) {
        setLoading(false);
        const e = error as Error;
        setError(e.message);
      }
      finally{
        setIsSubmitting(false);
      }

    }
    else if(currentUser && !id) { //When Id is not present, then first need to create the id
        try {
          const newThreadId = await addChatThread();
          try {
            setIsSubmitting(true);
            if (chatMessages.length === 0) {
              const name = chat.slice(0, 100);
              modifyChatThread(newThreadId, currentUser.email, name);  // eslint-disable-line @typescript-eslint/no-floating-promises
            }
            const newMessage: ChatMessageModel = {
              content: chat,
              createdAt: new Date(),
              context: "",
              id: "newMessageId",
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
            await handleAssistantResponse(newMessage,newThreadId);
            const isChatFromLandingPage = true;
            navigate(`/chatcontent/${newThreadId}`,{replace:true, state:{isChatFromLandingPage}});
          }
          catch (error) {
            setLoading(false);
            const e = error as Error;
            setError(e.message);
          }
          finally{
            setIsSubmitting(false);
          }
          
      }
      catch (error) {
          const e = error as Error;
          setError(e.message);
      }
    }
    else {
      throw new Error("Teams user credential failure");
    }
  }

  const handleChatChange = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setChat(event.target.value);
  }

  const handleChatBoxFocus = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setIsChatBoxFocused(true);
  }

  const handleChatBoxBlur = (event: React.ChangeEvent<HTMLTextAreaElement>): void => {
    setIsChatBoxFocused(false);
  }
  
  const handleChatKeyDown = async (event: React.KeyboardEvent<HTMLTextAreaElement>): Promise<void> => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      await handleChatSubmit();
    }
  }

  const convertNewlinesToBreaks = (text: string): React.ReactNode => {
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        <br />
      </React.Fragment>
    ));
  }

  return (
    <div className={styles.MainChatContainer}>
      {location.pathname.indexOf("/chatcontent/") !== -1 &&
        <div><GlobalActions /></div>
      }
      <div className={styles.ChatContentHolder}>
        {location.pathname.indexOf("/chatcontent/") !== -1 &&
          <div className={showChatNavigation ? [styles.sidebar,styles.open].join(' ') : [styles.sidebar, styles.close].join(' ')}><ChatNavigation /></div>
        }
        <div className={styles.ChatContent}>
          <div className={styles.chatMessagesContainer} ref={chatHistoryContainerRef}>
            {loading && <Spinner className={[styles.spinner, styles.spinnerBottom].join(' ')} />}
            {!loading && chatMessages.length > 0 && (
              <>
                {
                  chatMessages.map((message) => {
                    const mainContent: string = message.content;
                    const citations: CitationModel[] = message.citations || [];
                    const uniqueCitations: CitationModel[] = citations.reduce((acc: CitationModel[], current: CitationModel) => {
                      if (!current.sourceUrl) {
                        return acc;
                      }

                      const exists = acc.some((c) => c.sourceUrl === current.sourceUrl);
                      if (!exists) {
                        acc.push(current);
                      }

                      return acc;
                    }, []);
                    return(
                      <React.Fragment key={message.id}>
                            <div className={styles.card} role={message.role}>
                              <div className={styles.container}>
                                <p>{convertNewlinesToBreaks(mainContent)}</p>
                                {message.role === "assistant" && message.content === "" && (
                                  <Spinner className={[styles.spinner, styles.spinnerCentered].join(' ')} />
                                )}
                                {message.role === "assistant" && uniqueCitations.length > 0 && (
                                  <div className={styles.citation}>
                                    {uniqueCitations.map((citation: CitationModel, index) => {
                                      if (!citation.sourceUrl || citation.sourceUrl.indexOf("N/A") >= 0) {
                                        return null; // Skip rendering this citation if the condition is met
                                      }
                                      return(
                                        <React.Fragment key={index}>
                                          <a href={citation.sourceUrl} target='_blank' data-interception="off" rel='noopener noreferrer'>
                                            {citation.title}
                                          </a>
                                        </React.Fragment>
                                      );
                                    })}
                                  </div>
                                )}
                                {message.role === "assistant" && message.guardrail && (
                                  <div className={styles.guardrailMeta}>
                                    <span className={`${styles.verdictBadge} ${message.guardrail.verdict === "grounded" ? styles.verdictGrounded : message.guardrail.verdict === "partially_grounded" ? styles.verdictPartial : styles.verdictNotGrounded}`}>
                                      Verdict: {message.guardrail.verdict}
                                    </span>
                                    <span className={styles.confidenceChip}>
                                      Confidence: {message.guardrail.confidence}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                      </React.Fragment>
                    )
                  })
                }
              </>
            )}
            {!loading && chatMessages.length === 0 && (
              <>
                <ChatIntroduction />
              </>
            )}
          </div>
          <div className={isChatBoxFocused?[styles.searchBoxContainer,styles.searchBoxIsFocused].join(' '):styles.searchBoxContainer}>
            <Textarea
              value={chat}
              id="chatBoxArea"
              className={styles.searchBox}
              // style={{ width: '100%', overflowX: 'hidden', overflowY: 'hidden', border:'0px solid transparent !important' }}
              ref={textareaRef}
              placeholder="Type a message"
              onChange={handleChatChange}
              onKeyDown={handleChatKeyDown}
              onFocus={handleChatBoxFocus}
              disabled={isSubmitting}
              onBlur={handleChatBoxBlur}
            />
          
            <div className={isSubmitting ? [styles.sendIcon, styles.sendIconDisabled].join(' ') : styles.sendIcon} 
              onClick={handleChatSubmit}>
              <Send32Filled />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
