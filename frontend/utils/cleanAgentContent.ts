import { stripFilePaths } from "./stripFilePaths";

const STREAMING_NARRATION_RE = /^(Now let me |Let me (also |now )?|I'll (now |also )?|I need to |I should |I will |Next,? I('ll| will| need to))[^\n]*$/gm;

function stripStreamingNarration(text: string): string {
  const sections = text.split(/\n---\n/);
  if (sections.length > 1) {
    return sections
      .map((s) => s.replace(STREAMING_NARRATION_RE, "").replace(/\n{3,}/g, "\n\n").trim())
      .filter(Boolean)
      .join("\n\n---\n\n");
  }
  return text.replace(STREAMING_NARRATION_RE, "").replace(/\n{3,}/g, "\n\n").trim();
}

export function cleanAgentContent(
  content: string,
  hasVisualization: boolean,
): string {
  let cleaned = stripFilePaths(content);
  cleaned = stripStreamingNarration(cleaned);

  if (!hasVisualization) return cleaned;

  const sections = cleaned.split(/\n---\n/);
  const filteredSections: string[] = [];

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si];
    if (si === 0 && !section.startsWith("**→")) {
      filteredSections.push(section);
      continue;
    }

    const lines = section.split("\n");
    const kept: string[] = [];
    let inTable = false;
    let inCodeBlock = false;

    for (const line of lines) {
      if (line.trim().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        kept.push(line);
        continue;
      }

      if (inCodeBlock) {
        kept.push(line);
        continue;
      }

      const trimmed = line.trim();

      if (/^\|.+\|/.test(trimmed)) {
        inTable = true;
        kept.push(line);
        continue;
      }

      if (inTable && trimmed === "") {
        inTable = false;
        kept.push(line);
        continue;
      }

      if (
        trimmed.startsWith("#") ||
        trimmed.startsWith("- ") ||
        trimmed.startsWith("* ") ||
        trimmed.startsWith("**") ||
        /^\d+\./.test(trimmed)
      ) {
        kept.push(line);
        continue;
      }

      if (trimmed === "" || trimmed === "---") {
        kept.push(line);
        continue;
      }
    }

    const sectionResult = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
    if (sectionResult) filteredSections.push(sectionResult);
  }

  return filteredSections.join("\n\n---\n\n").trim();
}
