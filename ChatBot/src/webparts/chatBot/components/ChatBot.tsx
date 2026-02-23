import * as React from 'react';
import type { IChatBotProps } from './IChatBotProps';
import { Route, Routes, HashRouter as Router, Navigate } from 'react-router-dom';
import { ChatContent } from './ChatContent';
import { ChatThreadProvider } from './Context/ChatThreadContext';
import { GlobalProvider } from './Context/GlobalContext';

const ChatBot: React.FC<IChatBotProps> = (props) => {
  return(
    <>
      <GlobalProvider value={props}>
        <Router>
          <ChatThreadProvider>
            <Routes>
              <Route path="/">
                <Route index element={<Navigate to="/chatcontent/" replace />} />
                <Route path="/chatcontent/:id?" element={<ChatContent />} />
                <Route path="*" element={<Navigate to="/chatcontent/" replace />} />
              </Route>
            </Routes>
          </ChatThreadProvider>
        </Router>
      </GlobalProvider>
    </>
  );
}
export default ChatBot