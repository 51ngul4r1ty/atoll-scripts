// utils
import { readFileContents, writeFileContents } from "./fileReaderWriter.ts";
import { sortTextLines } from "./sorter.ts";

/**
 * If the line doesn't exist, it will add it and return true otherwise it will return false.
 * @param filePath file that will be modified
 * @param line line to add to file (if it doesn't exist)
 */
export const addLineToFile = async (filePath: string, line: string): Promise<boolean> => {
    let contents = await readFileContents(filePath);
    const hasLine = contents.indexOf(line) >= 0;
    if (!hasLine) {
        contents += `${line}\n`;
        contents = sortTextLines(contents);
        await writeFileContents(filePath, contents);
        return true;
    }
    return false;
};
