import * as React from 'react';
import { useState } from 'react';
import styles from './ChatBot.module.scss';
import { ChatNavigation } from './ChatNavigation';
import { GlobalActions } from './GlobalActions';
import { useChatThreadContext } from './Context/ChatThreadContext';
import { ChatIntroduction } from './ChatIntroduction';

export const ChatContainer: React.FC = () => {

  const { showChatNavigation } = useChatThreadContext();
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <>
      <div className={styles.MainChatContainer}>
        <div><GlobalActions /></div>
        <div className={styles.ChatContentHolder}>
          
        <div className={showChatNavigation ? [styles.sidebar,styles.open].join(' ') : [styles.sidebar,styles.close].join(' ')}><ChatNavigation /></div>
          <div className={styles.ChatContent} >
            <ChatIntroduction />
          </div>
        </div>
      </div>
    </>
  );
};
