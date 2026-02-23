import { createContext } from "react";

export const AIChatbotContext = createContext<{
  showChatNavigation?: boolean;
}>({
  showChatNavigation: true,  
});