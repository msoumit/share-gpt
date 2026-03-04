import { v4 } from 'uuid';

export const uniqueId = ():string => {
  const uuid = v4()
  return uuid;
}