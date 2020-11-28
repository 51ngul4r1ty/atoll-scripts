export const sortTextLines = (text: string): string => {
    const lines = text.split("\n");
    lines.sort((a, b) => a > b ? 1 : -1);
    return lines.join("\n");
};
