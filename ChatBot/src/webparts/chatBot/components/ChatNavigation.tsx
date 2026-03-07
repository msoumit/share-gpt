import * as React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styles from './ChatBot.module.scss';
import { useChatThreadContext } from './Context/ChatThreadContext';
import { Spinner, Button } from '@fluentui/react-components';
import { Dialog, DialogActions, DialogContent, DialogBody, DialogSurface, DialogTrigger } from "@fluentui/react-components";
import { Delete20Regular } from '@fluentui/react-icons';
import { ChatThreadModel } from '../service/model';
import { useGlobalContext } from './Context/GlobalContext';

export const ChatNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { globalConfig } = useGlobalContext();
  const { chatThread, loading, error, removeChatThread } = useChatThreadContext();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = React.useState(false);
  const [threadToDelete, setThreadToDelete] = React.useState("");
  const disclaimerBody: string = globalConfig.sidebarDisclaimer?.trim() || "ShareGPT provides AI-generated responses based on available company knowledge. Responses may be incomplete or occasionally incorrect, so please verify important information before taking action.";

  if (loading) {
    return <Spinner className={[styles.spinner, styles.spinnerCentered].join(' ')} />;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }


  const handleDeleteChatThread = async (id: string): Promise<void> => {
    setThreadToDelete(id);
    setShowDeleteConfirmation(true);
  };
  const confirmDelete = async (): Promise<void> => {
    try {
      const currentPath = location.pathname;
      setShowDeleteConfirmation(false);
      await removeChatThread(threadToDelete);
      const isCurrentPathDeleted = currentPath === `/chatcontent/${threadToDelete}`;
      if (isCurrentPathDeleted) {
        navigate('/chatcontent/', { replace: true })
      }
    } 
    catch (err) {
      throw new Error(`Error deleting chat thread: Status text - ${err}`);
    } finally {
      setShowDeleteConfirmation(false);
    }
  };

  return (
    <div className={styles.sidebarInner}>
    <h3>Recent Conversations</h3>
      <ul>
        {chatThread && chatThread.map((chat: ChatThreadModel) => {
            return (
              <li title={chat.name} className={location.pathname === `/chatcontent/${chat.id}` ? [styles.spaceBetween,styles.activeLink].join(' ') : styles.spaceBetween} key={chat.id}>
                <Link 
                  to={`/chatcontent/${chat.id}`} 
                >
                  {chat.name}
                </Link>
                <Button 
                  className={styles.iconButton}
                  appearance="subtle" 
                  icon={<Delete20Regular />} 
                  onClick={() => handleDeleteChatThread(chat.id)} 
                />
            </li>
            );
          }
        )}
      </ul>
      <div className={styles.sidebarDisclaimer}>
            <strong>Disclaimer:</strong><br />
            {disclaimerBody}
        </div>
      <Dialog open={showDeleteConfirmation}>
        <DialogSurface>
          <DialogBody>
            <DialogContent>
              Are you sure you want to delete this chat thread
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button className={styles.secondaryBtn} appearance="secondary" onClick={() => setShowDeleteConfirmation(false)}>No</Button>
              </DialogTrigger>
              <Button className={styles.primaryBtn} appearance="primary" onClick={confirmDelete}>Yes</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </div>
  );
};

