import * as React from 'react';
import { createContext, useState, useEffect, ReactNode } from 'react';
import { getChatThreadsByUser, createChatThread, deleteChatThread, updateChatThread } from '../../service/chatThreadServices';
import { ChatThreadModel } from '../../service/model';
import { useGlobalContext } from './GlobalContext';

interface ChatThreadContextProps {
  chatThread: ChatThreadModel[];
  loading: boolean;
  error: string | undefined;
  addChatThread: () => Promise<string>;
  modifyChatThread: (id: string, email: string, name: string) => Promise<void>;
  removeChatThread: (id: string) => Promise<void>;
  showChatNavigation: boolean;
  setShowChatNavigation: (show: boolean) => void;
}

const ChatThreadContext = createContext<ChatThreadContextProps | undefined>(undefined);

interface ChatThreadProviderProps {
  children: ReactNode;
}

export const ChatThreadProvider: React.FC<ChatThreadProviderProps> = ({ children}) => {
  const [chatThread, setChatThread] = useState<ChatThreadModel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showChatNavigation, setShowChatNavigation] = useState<boolean>(true);
  const { currentUser, context, globalConfig } = useGlobalContext();

  useEffect(() => {
    const runPageLoad = async (): Promise<void> => {
      try {
        const result = await getChatThreadsByUser(currentUser.email, context, globalConfig);
        setChatThread(result);
        setLoading(false);
      } 
      catch (error) {
        const e = error as Error;
        setError(e.message);
        setLoading(false);
        throw new Error(e.message);
      }
    };
    runPageLoad().then().catch((error) => {
      console.log(error);
    });
  }, [currentUser.email]);

  const addChatThread = async (): Promise<string> => {
    try {
      setLoading(true);
      const newChatThread = await createChatThread(currentUser, context, globalConfig);
      setChatThread(prevThreads => [newChatThread, ...prevThreads]);
      setLoading(false);
      return newChatThread.id;
    } 
    catch (error) {
      const e = error as Error;
      setError(e.message);
      throw new Error(e.message);
    }
  };

  const modifyChatThread = async(id: string, email:string, name:string): Promise<void> => {
    try {
      setLoading(true);
      const updatedChatThread = await updateChatThread(id, email, name, context, globalConfig);
      setChatThread((prevThreads) => {
        return prevThreads.map(chatThread =>
            chatThread.id === updatedChatThread.id ? updatedChatThread : chatThread
        );
      });
      setLoading(false);
    } 
    catch (error) {
      const e = error as Error;
      setError(e.message);
      throw new Error(e.message);
    }
  }

  const removeChatThread = async (id: string): Promise<void> => {
    try {
      setLoading(true);
      await deleteChatThread(id, currentUser.email, context, globalConfig);
      setChatThread(prevThreads => prevThreads.filter(thread => thread.id !== id));
      setLoading(false);
    } 
    catch (error) {
      const e = error as Error;
      setError(e.message);
      throw new Error(e.message);
    }
  };

  return (
    <ChatThreadContext.Provider value={{ chatThread, loading, error, addChatThread, modifyChatThread, removeChatThread, showChatNavigation, setShowChatNavigation }}>
      {children}
    </ChatThreadContext.Provider>
  );
};

export const useChatThreadContext = ():ChatThreadContextProps => {
  const context = React.useContext(ChatThreadContext);
  if (context === undefined) {
    throw new Error('useChatThreadContext must be used within a ChatThreadProvider');
  }
  return context;
};
