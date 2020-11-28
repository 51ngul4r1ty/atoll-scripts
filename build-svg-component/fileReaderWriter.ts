export const readFileContents = async (filePath: string): Promise<string> => {
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(await Deno.readFile(filePath));
};

export const writeFileContents = async (filePath: string, fileContents: string) => {
    await Deno.writeTextFile(filePath, fileContents);
};
