import { customAlphabet } from "nanoid";
import { HeadersType } from "../service/model";

export const uniqueId = ():string => {
  const alphabet =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const nanoid = customAlphabet(alphabet, 36);
  return nanoid();
}

export const getHeaders = async(isLocalEnvironment: boolean): Promise<HeadersType> => {
  const headers: HeadersType = {
    'Content-Type': 'application/json'
  };
  if (!isLocalEnvironment) {
    headers['Ocp-Apim-Subscription-Key'] = 'db17101241344da98c90e697d6a3c823';
  }
  return headers;
};