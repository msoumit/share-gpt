import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ChatBot.module.scss';
import { useChatThreadContext } from './Context/ChatThreadContext';
import { PanelLeft32Regular, PanelRight32Regular, Home32Regular } from "@fluentui/react-icons";


export const GlobalActions: React.FC = () => {
    const navigate = useNavigate();
    const { addChatThread, setShowChatNavigation, showChatNavigation } = useChatThreadContext();
    const [error, setError] = React.useState<string | undefined>(undefined);

    if (error) {
        return <div>Error: {error}</div>;
    }

    const handleGoHome = (): void => {
        navigate('/chatcontent/');
    };


    const handleNewChatThread = async (): Promise<void> => {
        try {
            const newThreadId = await addChatThread();
            navigate(`/chatcontent/${newThreadId}`);
        }
        catch (error) {
            const e = error as Error;
            setError(e.message);
        }
    };

    const handleShowChatNavigation = (): void => {
        setShowChatNavigation(!showChatNavigation);
    };

    return (
        <>
            <div className={styles.GlobalActions}>

                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <div className={[styles.icon, styles.expander].join(" ")} onClick={() => handleShowChatNavigation()}
                            data-tooltip={showChatNavigation ? "Close Sidebar" : "Open Sidebar"}>
                            {showChatNavigation ? <PanelLeft32Regular /> : <PanelRight32Regular />}
                        </div>
                        <div className={[styles.icon, styles.home].join(" ")} onClick={handleGoHome} data-tooltip="Home" aria-label="Go to home">
                            <Home32Regular />
                        </div>
                    </div>
                    
                    <div className={[styles.icon, styles.newChat].join(' ')} onClick={() => handleNewChatThread()}>
                        <button className={styles.newConversation} title="new conversation"> + New Conversation</button>
                    </div>
                </div>

            </div>

        </>
    );
};
