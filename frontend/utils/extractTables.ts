export interface ExtractedTable {
  id: string;
  markdown: string;
  title?: string;
}

function isTableSeparator(line: string): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  return /^\|?[\s\-:]+(\|[\s\-:]+)+\|?\s*$/.test(trimmed);
}

function isTableRow(line: string): boolean {
  if (!line) return false;
  return line.trim().includes("|");
}

export function extractMarkdownTables(content: string): ExtractedTable[] {
  const lines = content.split("\n");
  const tables: ExtractedTable[] = [];
  let inCodeBlock = false;
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
      i++;
      continue;
    }

    if (inCodeBlock) {
      i++;
      continue;
    }

    if (
      isTableSeparator(lines[i]) &&
      i > 0 &&
      isTableRow(lines[i - 1])
    ) {
      const startIndex = i - 1;
      let endIndex = i + 1;

      while (endIndex < lines.length && isTableRow(lines[endIndex])) {
        endIndex++;
      }

      let title: string | undefined;
      if (startIndex > 0) {
        const prevLine = lines[startIndex - 1].trim();
        const headingMatch = prevLine.match(/^#{1,6}\s+(.+)$/);
        if (headingMatch) {
          title = headingMatch[1];
        }
      }

      const tableMarkdown = lines.slice(startIndex, endIndex).join("\n");
      tables.push({
        id: `table-${tables.length}`,
        markdown: tableMarkdown,
        title,
      });

      i = endIndex;
    } else {
      i++;
    }
  }

  return tables;
}
