// externals
import * as path from "https://deno.land/std@0.79.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.63.0/fs/mod.ts";

// utils
import { addLineToFile } from "./fileChanger.ts";
import { readFileContents, writeFileContents } from "./fileReaderWriter.ts";

const textToLines = (text: string): string[] => {
    return text.split("\n");
};

const spaces = (count: number): string => {
    let result = "";
    for (let i = 0; i < count; i++) {
        result += " ";
    }
    return result;
}

interface Attribute {
    name: string;
    value: string;
}

enum State {
    ParsingElementName = 0,
    ParsingBeforeAttributeName = 1,
    ParsingAttributeName = 2,
    ParsingAttributeValue = 3,
    ParsingAttributeValueQuoted = 4,
    EndOfElement = 5
}

enum ElementType {
    Opening = 1,
    Closing = 2,
    Both = 3
}

interface Content {
    elementName: string;
    elementType: ElementType;
    attributes: Attribute[];
}

const parseContent = (content: string): Content => {
    let elementName = "";
    let elementType = ElementType.Opening;
    const attributes: Attribute[] = [];
    let idx = 0;
    let state = State.ParsingElementName;
    let attributeName = "";
    let attributeValue = "";
    while (idx < content.length) {
        const ch = content[idx];
        if (state === State.ParsingElementName) {
            if (ch === " ") {
                state = State.ParsingAttributeName;
                attributeName = "";
            }
            else if (ch === "<") {
                // Assume that we have an opening tag, but it could be opening/closing/both
                elementType = ElementType.Opening;
            }
            else if (ch === ">") {
                // Do nothing
            }
            else if (ch === "/") {
                // TODO: This could be CLOSING if we encountered "</" or BOTH if this is "/>"
                elementType = ElementType.Closing;
            }
            else {
                elementName += ch;
            }
        }
        else if (state === State.ParsingBeforeAttributeName) {
            if (ch === " ") {
                state = State.ParsingAttributeName;
                attributeName = "";
            }
        }
        else if (state === State.ParsingAttributeName) {
            if (ch === "=") {
                state = State.ParsingAttributeValue;
                attributeValue = "";
            }
            else if (ch === ">") {
                state = State.EndOfElement
                attributes.push({
                    name: attributeName,
                    value: attributeValue
                });
            }
            else if (ch === " ") {
                state = State.ParsingAttributeName;
                attributes.push({
                    name: attributeName,
                    value: attributeValue
                });
            }
            else {
                attributeName += ch;
            }
        }
        else if (state === State.ParsingAttributeValue) {
            if (ch === '"') {
                state = State.ParsingAttributeValueQuoted
            }
        }
        else if (state === State.ParsingAttributeValueQuoted) {
            if (ch === '"') {
                state = State.ParsingBeforeAttributeName;
                attributes.push({
                    name: attributeName,
                    value: attributeValue
                });
            }
            else {
                attributeValue += ch;
            }
            // TODO: Handle escape quotes? e.g. this may be valid: "\""
        }
        idx++;
    }
    return {
        elementName,
        elementType,
        attributes
    };
}

const reformatAttributeName = (attributeName: string): string => {
    const containsDashes = attributeName.indexOf("-") >= 0;
    const parts = containsDashes ? attributeName.split("-") : attributeName.split(":");
    if (parts.length === 1) {
        return parts[0];
    }
    else {
        let result = "";
        let first = true;
        parts.forEach(part => {
            if (!first) {
                result += part[0].toUpperCase() + part.substr(1);
            }
            else {
                result += part;
                first = false;
            }
        })
        return result;
    }
};

const reformatParsedContent = (content: Content, indentationSpaceCount: number, applyIndentationToEltLine: boolean): string => {
    const indentationSpaces = spaces(indentationSpaceCount);
    const eltLineIndentSpaces = applyIndentationToEltLine ? spaces(indentationSpaceCount) : "";
    let reformattedAttributes = "";
    if (!content.attributes.length) {
        if (content.elementType === ElementType.Opening) {
            return `${eltLineIndentSpaces}<${content.elementName}>`;
        }
        else {
            // TODO: Deal with BOTH, e.g. <elt />
            return `${eltLineIndentSpaces}</${content.elementName}>`;
        }
    }
    else {
        content.attributes.forEach(attribute => {
            const attributeName = reformatAttributeName(attribute.name);
            const attributeValue = `"${attribute.value}"`;
            reformattedAttributes += `${indentationSpaces}    ${attributeName}=${attributeValue}\n`;
        });

        return `${eltLineIndentSpaces}<${content.elementName}\n`
            + reformattedAttributes
            + indentationSpaces + ">";
    }
};

const convertEltLine = (line: string, indentationSpaceCount: number, notFirstLine: boolean): string => {
    const whitespaceStartCount = line.length - line.trimStart().length;
    const whitespaceEndCount = line.length - line.trimEnd().length;
    const content = line.trim();
    const parsedContent = parseContent(content);
    const totalIndentationSpaceCount = whitespaceStartCount + indentationSpaceCount;
    if (!parsedContent.elementName) {
        return "";
    }
    return spaces(whitespaceStartCount)
        + reformatParsedContent(parsedContent, totalIndentationSpaceCount, notFirstLine)
        + spaces(whitespaceEndCount);
};

const getInPlaceIndentationCount = (templateContent: string, replacementText: string): number => {
    const lines = templateContent.split("\n");
    const matchingLines = lines.filter(line => line.indexOf(replacementText) >= 0);
    if (matchingLines.length === 1) {
        const line = matchingLines[0];
        const idx = line.indexOf(replacementText);
        return idx;
    }
    else {
        throw new Error(`Multiple lines matched ${replacementText}`);
    }
};

const formatAsComponentName = (assetFileBaseName: string): string => {
    const parts = assetFileBaseName.split("-");
    let result = "";
    parts.forEach(part => {
        result += part[0].toUpperCase() + part.substr(1);
    });
    return result;
};

const convertSvgToReactComponent = (svgAssetText: string, indentationSpaceCount: number): string => {
    const lines = textToLines(svgAssetText);
    const remainingLines: string[] = [];
    let foundStart = false;
    let lineNumber = 0;
    lines.forEach(line => {
        if (line.startsWith("<svg ")) {
            foundStart = true;
        }
        if (foundStart) {
            lineNumber++;
            const convertedLine = convertEltLine(line, indentationSpaceCount, lineNumber > 1);
            if (convertedLine) {
                remainingLines.push(convertedLine);
            }
        }
    });
    const result = remainingLines.join("\n");
    return result;
}

console.log("");
console.log("\"build-svg-component\" script version 1.0");
console.log("========================================");
console.log("");

if (Deno.args.length !== 1) {
    console.log("ERROR: Expected a single argument passed at the command line.");
    console.log("");
    console.log("An SVG asset file name should be placed in the ./src/assets folder and that name (without \".svg\") should be provided");
    console.log("when running the script.");
    console.log("");
    console.log("For example, from \"atoll-shared\" repo use \"npm run build:react-svg status-done-icon\"");
}
else {
    const assetsFileBaseName = Deno.args[0];
    const assetsFileName = assetsFileBaseName.endsWith(".svg") ? assetsFileBaseName : `${assetsFileBaseName}.svg`;
    const assetsFileRelPath = `./src/assets/${assetsFileName}`;
    const assetsFilePath = path.resolve(assetsFileRelPath);

    const scriptBasePathUrl = path.dirname(import.meta.url);
    const templatePathUrl = `${scriptBasePathUrl}/templates/svg-component-template-ts.template`;
    const fileUrlPrefix = "file:///";
    if (!templatePathUrl.startsWith(fileUrlPrefix)) {
        console.log(`ERROR: ${templatePathUrl} didn't seem to use the correct format- unable to continue`);
    }
    else {
        console.log(`Processing asset: ${assetsFilePath}...`); 
        console.log('');
        const excludingFileUrl = templatePathUrl.substr(fileUrlPrefix.length);
        const osSpecificPath = excludingFileUrl.replace(/\//gi, path.SEP);
        const templateContents = await readFileContents(osSpecificPath);
        const svgAssetContents = await readFileContents(assetsFilePath);
        const indentationSpaceCount = getInPlaceIndentationCount(templateContents, "<<-SVG->>");
        const svgComponentCode = convertSvgToReactComponent(svgAssetContents, indentationSpaceCount);
        let newFileContents = templateContents.replace(/\<\<\-SVG\-\>\>/g, svgComponentCode);
        const componentName = formatAsComponentName(assetsFileBaseName);
        newFileContents = newFileContents.replace(/\<\<\-NAME\-\>\>/g, componentName);
        const componentFileRelPath = `./src/components/atoms/icons/${componentName}.tsx`;
        const componentFilePath = path.resolve(componentFileRelPath);
        let oldFileContents: string;
        let updateNeeded: boolean;
        if (!fs.existsSync(componentFilePath)) {
            console.log(`Creating component file: ${componentFilePath}...`);
            oldFileContents = "";
            updateNeeded = true;
        }
        else {
            oldFileContents = await readFileContents(componentFilePath);
            if (oldFileContents === newFileContents) {
                console.log(`No changes needed for component file: ${componentFilePath}.`);
                updateNeeded = false;
            }
            else {
                console.log(`Updating component file: ${componentFilePath}...`);
                updateNeeded = true;
            }
        }
        if (updateNeeded) {
            writeFileContents(componentFilePath, newFileContents);
            console.log(`(component file modified)`);
        }
        const indexFileRelPath = `./src/components/atoms/icons/index.ts`;
        const indexFilePath = path.resolve(indexFileRelPath);
        console.log('');
        console.log(`Updating index file: ${indexFilePath}...`);
        const indexFileModified = addLineToFile(indexFilePath, `export * from "./${componentName}";`);
        if (indexFileModified) {
            console.log(`Index file successfully updated.`);
        }
        else {
            console.log(`Index file is current, no changes needed.`);
        }
    }
}
console.log('');
