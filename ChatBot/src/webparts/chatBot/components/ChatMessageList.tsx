import * as React from "react";
import { Spinner } from "@fluentui/react-components";
import { ChatMessageModel, CitationModel } from "../service/model";
import styles from "./ChatBot.module.scss";
import { ChatIntroduction } from "./ChatIntroduction";
import { renderTextWithBasicFormatting } from "./messageFormat";
import { GuardrailVerdict } from "./GuardrailVerdict";

interface ChatMessageListProps {
  loading: boolean;
  chatMessages: ChatMessageModel[];
  assistantStatus: string;
  chatHistoryContainerRef: React.RefObject<HTMLDivElement>;
}

const getUniqueCitations = (citations: CitationModel[]): CitationModel[] => {
  return citations.reduce((acc: CitationModel[], current: CitationModel) => {
    if (!current.sourceUrl) {
      return acc;
    }

    const exists = acc.some((c) => c.sourceUrl === current.sourceUrl);
    if (!exists) {
      acc.push(current);
    }

    return acc;
  }, []);
};

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  loading,
  chatMessages,
  assistantStatus,
  chatHistoryContainerRef
}) => {
  return (
    <div className={styles.chatMessagesContainer} ref={chatHistoryContainerRef}>
      {loading && <Spinner className={[styles.spinner, styles.spinnerBottom].join(" ")} />}
      {!loading && chatMessages.length > 0 && (
        <>
          {chatMessages.map((message, index) => {
            const mainContent: string = message.content;
            const uniqueCitations = getUniqueCitations(message.citations || []);

            return (
              <React.Fragment key={message.id}>
                <div className={styles.card} role={message.role}>
                  <div className={styles.container}>
                    <p>{renderTextWithBasicFormatting(mainContent)}</p>
                    {message.role === "assistant" && message.content === "" && (
                      <Spinner className={[styles.spinner, styles.spinnerCentered].join(" ")} />
                    )}
                    {message.role === "assistant" && uniqueCitations.length > 0 && (
                      <div className={styles.citation}>
                        <ul className={styles.citationList}>
                          {uniqueCitations.map((citation: CitationModel, citationIndex) => {
                            if (!citation.sourceUrl || citation.sourceUrl.indexOf("N/A") >= 0) {
                              return null;
                            }
                            return (
                              <li key={citationIndex} className={styles.citationItem}>
                                <a href={citation.sourceUrl} target="_blank" data-interception="off" rel="noopener noreferrer">
                                  {citation.title}
                                </a>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    {message.role === "assistant" && message.guardrail && (
                      <GuardrailVerdict guardrail={message.guardrail} />
                    )}
                    {message.role === "assistant" && index === chatMessages.length - 1 && assistantStatus && (
                      <div className={styles.streamStatus}>Status: {assistantStatus}</div>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </>
      )}
      {!loading && chatMessages.length === 0 && (
        <>
          <ChatIntroduction />
        </>
      )}
    </div>
  );
};

