import { WebPartContext } from "@microsoft/sp-webpart-base";
import { ConfigModel, UserModel } from "../service/model";

export interface IChatBotProps {
  description: string;
  isDarkTheme: boolean;
  environmentMessage: string;
  hasTeamsContext: boolean;
  userDisplayName: string;
  currentUser: UserModel;
  context: WebPartContext;
  globalConfig: ConfigModel;
}
