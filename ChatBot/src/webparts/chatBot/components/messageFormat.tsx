import * as React from "react";

export const renderTextWithBasicFormatting = (text: string): React.ReactNode => {
  const renderInlineFormatting = (line: string): React.ReactNode[] => {
    const nodes: React.ReactNode[] = [];
    const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_)/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      if (match.index > lastIndex) {
        nodes.push(line.slice(lastIndex, match.index));
      }

      const token = match[0];
      if ((token.startsWith("**") && token.endsWith("**")) || (token.startsWith("__") && token.endsWith("__"))) {
        nodes.push(<strong key={`b-${match.index}`}>{token.slice(2, -2)}</strong>);
      }
      else if ((token.startsWith("*") && token.endsWith("*")) || (token.startsWith("_") && token.endsWith("_"))) {
        nodes.push(<em key={`i-${match.index}`}>{token.slice(1, -1)}</em>);
      }
      else {
        nodes.push(token);
      }

      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < line.length) {
      nodes.push(line.slice(lastIndex));
    }

    return nodes;
  };

  const lines = (text || "").split("\n");
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = (): void => {
    if (listItems.length === 0) {
      return;
    }
    blocks.push(
      <ul key={`ul-${blocks.length}`}>
        {listItems.map((item, idx) => (
          <li key={`li-${idx}`}>{renderInlineFormatting(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const listMatch = line.match(/^\s*[-*]\s+(.+)$/);
    if (listMatch) {
      listItems.push(listMatch[1]);
      return;
    }

    flushList();

    blocks.push(
      <React.Fragment key={`line-${index}`}>
        {renderInlineFormatting(line)}
        <br />
      </React.Fragment>
    );
  });

  flushList();

  return blocks;
};
