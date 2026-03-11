import { v4 } from 'uuid';
import { CitationModel } from './model';

export const uniqueId = ():string => {
  const uuid = v4()
  return uuid;
}

export const getUniqueCitations = (citations: CitationModel[]): CitationModel[] => {
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
}

export const isValidCitationSource = (sourceUrl?: string): boolean => {
  if (!sourceUrl) {
    return false;
  }

  return sourceUrl.indexOf("N/A") < 0;
}
