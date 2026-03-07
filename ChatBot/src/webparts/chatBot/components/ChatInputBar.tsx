import * as React from "react";
import { Textarea } from "@fluentui/react-components";
import { Mic24Regular, Send32Filled, Stop24Filled } from "@fluentui/react-icons";
import styles from "./ChatBot.module.scss";

interface ChatInputBarProps {
  chat: string;
  isChatBoxFocused: boolean;
  isSubmitting: boolean;
  canSubmit: boolean;
  isDictationSupported: boolean;
  isListening: boolean;
  dictationError: string | null;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  onChatChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onChatKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => Promise<void>;
  onChatBoxFocus: () => void;
  onChatBoxBlur: () => void;
  onSubmit: () => Promise<void>;
  onStartDictation: () => void;
  onStopDictation: () => void;
}

export const ChatInputBar: React.FC<ChatInputBarProps> = ({
  chat,
  isChatBoxFocused,
  isSubmitting,
  canSubmit,
  isDictationSupported,
  isListening,
  dictationError,
  textareaRef,
  onChatChange,
  onChatKeyDown,
  onChatBoxFocus,
  onChatBoxBlur,
  onSubmit,
  onStartDictation,
  onStopDictation
}) => {
  return (
    <>
      <div className={isChatBoxFocused ? [styles.searchBoxContainer, styles.searchBoxIsFocused].join(" ") : styles.searchBoxContainer}>
        <Textarea
          value={chat}
          id="chatBoxArea"
          className={styles.searchBox}
          ref={textareaRef}
          placeholder="Type a message"
          onChange={onChatChange}
          onKeyDown={onChatKeyDown}
          onFocus={onChatBoxFocus}
          disabled={isSubmitting}
          onBlur={onChatBoxBlur}
        />
        {isDictationSupported && (
          <div className={styles.dictationControls}>
            {!isListening && (
              <div
                className={isSubmitting ? [styles.dictationIcon, styles.sendIconDisabled].join(" ") : styles.dictationIcon}
                onClick={!isSubmitting ? onStartDictation : undefined}
                data-tooltip="Dictate"
                aria-label="Dictate"
                role="button"
                aria-disabled={isSubmitting}
              >
                <Mic24Regular />
              </div>
            )}
            {isListening && (
              <div
                className={[styles.dictationIcon, styles.dictationIconStop].join(" ")}
                onClick={onStopDictation}
                aria-label="Stop dictation"
                role="button"
              >
                <Stop24Filled />
              </div>
            )}
          </div>
        )}
        <div
          className={canSubmit ? styles.sendIcon : [styles.sendIcon, styles.sendIconDisabled].join(" ")}
          onClick={canSubmit ? onSubmit : undefined}
          aria-disabled={!canSubmit}
        >
          <Send32Filled />
        </div>
      </div>
      {dictationError && (
        <div className={styles.dictationError}>
          {dictationError}
        </div>
      )}
    </>
  );
};
