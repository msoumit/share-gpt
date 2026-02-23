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
import { ChatMessageModel, CitationModel } from '../service/model';
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

  const handleStreamingResponse = async(newMessage: ChatMessageModel,newThreadId?:string): Promise<void> => {
    const placeholderReply: ChatMessageModel = {
      content: "",
      createdAt: new Date(),
      context: "",
      id: "placeholderReplyId",  // generate a proper id here
      isDeleted: false,
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

    const handleStreamedMessage = (message: string): void => {
      setChatMessages(prevMessages => {
        const lastMessageIndex = prevMessages.length - 1;
        const updatedMessages = [...prevMessages];
        if (lastMessageIndex >= 0 && updatedMessages[lastMessageIndex].role === "assistant") {
          updatedMessages[lastMessageIndex] = {
            ...updatedMessages[lastMessageIndex],
            content: updatedMessages[lastMessageIndex].content + message
          };
        }
        return updatedMessages;
      });
    };

    const handleError = (error: Error): void => {
      console.error('Streaming error:', error);
      const e = error as Error;
      setError(e.message);
    };
    await getChatMessagesReplyFromAssistant(newMessage, handleStreamedMessage, handleError, context, globalConfig);
  }

  const handleChatSubmit = async (): Promise<void> => {
    if (currentUser && id) {
      try {
        setIsSubmitting(true);
        if (chatMessages.length === 0) {
          const name = chat.slice(0, 100);
          modifyChatThread(id, currentUser.email, name, false);  // eslint-disable-line @typescript-eslint/no-floating-promises
        }
        const newMessage: ChatMessageModel = {
          content: chat,
          createdAt: new Date(),
          context: "",
          id: "newMessageId",
          isDeleted: false,
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
        await handleStreamingResponse(newMessage);
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
              modifyChatThread(newThreadId, currentUser.email, name, false);  // eslint-disable-line @typescript-eslint/no-floating-promises
            }
            const newMessage: ChatMessageModel = {
              content: chat,
              createdAt: new Date(),
              context: "",
              id: "newMessageId",
              isDeleted: false,
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
            await handleStreamingResponse(newMessage,newThreadId);
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

  const parseForCitation = (content: string): { mainContent: string, citations: CitationModel[] } => {
    const citationPattern = /{% citation items=(\[.*?\]) ?\/?%}/g;
  
    let mainContent = content;
    let citationItems: CitationModel[] = [];
    let match: RegExpExecArray | null;
  
    while ((match = citationPattern.exec(content)) !== null) {
      const citationItemsString = match[1];
      mainContent = mainContent.replace(match[0], '').trim();
      try {
        const items = JSON.parse(citationItemsString) as CitationModel[];
        citationItems = citationItems.concat(items);
      } 
      catch (error) {
        console.error("Error parsing citation items:", error);
      }
    }
    
    const uniqueCitations = citationItems.reduce((unique, item) => {
      if (!unique.some(citation => citation.fileBlobUrl === item.fileBlobUrl)) {
        unique.push(item);
      }
      return unique;
    }, [] as CitationModel[]);
  
    return { mainContent, citations: uniqueCitations };
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
            {loading && <Spinner style={{ marginTop: 'auto' }} />}
            {!loading && chatMessages.length > 0 && (
              <>
                {
                  chatMessages.map((message) => {
                    let mainContent: string = "", citations: CitationModel[] = [];
                    if(message.content.indexOf('{% citation items') > 0 && message.content.indexOf('%}') > 0 ){
                      ({ mainContent, citations } = parseForCitation(message.content));
                    }
                    else{
                      mainContent = message.content; 
                      citations = [];
                    }
                    return(
                      <React.Fragment key={message.id}>
                        {/* {message.role === "assistant" && message.content === "" ? (
                            <Spinner style={{ marginTop:'auto', alignSelf:'end'}} />
                          ) :  */}
                          {/* ( */}
                            <div className={styles.card} role={message.role}>
                              <div className={styles.container}>
                                {/*<div className={[styles.gb,styles.userName].join(' ')}>
                                  {message.role === "user" ? message.userName : "Hubert"}
                                </div>*/}
                                <p>{convertNewlinesToBreaks(mainContent)}</p>
                                {message.role === "assistant" && message.content === "" && (
                                  <Spinner style={{ margin:'10px auto', alignSelf:'center'}} />
                                )}
                                {message.role === "assistant" && citations.length > 0 && (
                                  <div className={styles.citation}>
                                    {citations.map((citation: CitationModel, index) => {
                                      if (citation.fileBlobUrl && (citation.fileBlobUrl.indexOf("file filebloburl") >= 0 || citation.fileBlobUrl.indexOf("N/A") >= 0)) {
                                        return null; // Skip rendering this citation if the condition is met
                                      }
                                      return(
                                        <React.Fragment key={index}>
                                          <a href={citation.fileBlobUrl} target='_blank' data-interception="off" rel='noopener noreferrer'>
                                            {citation.name}
                                          </a>
                                        </React.Fragment>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          {/* ) */}
                        {/* } */}
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