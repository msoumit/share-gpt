import * as React from 'react';
import styles from './ChatBot.module.scss';
import { useGlobalContext } from '../components/Context/GlobalContext';

export const ChatIntroduction: React.FC = () => {
    const { currentUser, globalConfig } = useGlobalContext();
    const introductionMessage: string = globalConfig.introductionMessage?.trim() || "I'm ShareGPT, your AI-powered assistant designed to help you with all your company-related questions. Whether you're looking for IT support, HR information, or details from any other places, I've got you covered. Simply ask me about anything, and I'll do my best to guide you to the right information. Let's make your workday easier and more efficient!";

    return (
        <div className={styles.ChatIntro}>
            <div className={styles.introductionContainer}>
                <h2>Hello, <span>{currentUser.displayName ? currentUser.displayName : ""}</span></h2>
                <div className={styles.introduction}>
                    {introductionMessage}
                </div>
            </div>  
        </div>
    );
};
