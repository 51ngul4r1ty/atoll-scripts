export const textToLines = (text: string): string[] => {
    return text.split("\n");
};

export const spaces = (count: number): string => {
    let result = "";
    for (let i = 0; i < count; i++) {
        result += " ";
    }
    return result;
}

