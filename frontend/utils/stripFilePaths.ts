export function stripFilePaths(content: string): string {
  return content
    .replace(/`\/[^\s`]+`\s*/g, "")
    .replace(/(?<!\()\/(home|tmp|var|usr|etc|opt)\/[^\s)>\]]+\s*/g, "");
}
