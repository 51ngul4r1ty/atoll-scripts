import * as path from "https://deno.land/std@0.79.0/path/mod.ts";

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

if (Deno.args.length !== 1) {
    console.log('');
    console.log('build-svg-component expects a single argument: the svg file name in the ./src/assets folder,');
    console.log('                                               for example, "status-done-icon"');
    console.log('');
}
else {
    const assetsFileBaseName = Deno.args[0];
    const assetsFileName = assetsFileBaseName.endsWith(".svg") ? assetsFileBaseName : `${assetsFileBaseName}.svg`;
    const assetsFileRelPath = `./src/assets/${assetsFileName}`;
    const assetsFilePath = path.resolve(assetsFileRelPath);
    console.log(`ASSET: ${assetsFilePath}`); 
    const readFileContents = async (filePath: string): Promise<string> => {
        const decoder = new TextDecoder("utf-8");
        return decoder.decode(await Deno.readFile(filePath));
    };
    const writeFileWithContents = async (filePath: string, fileContents: string) => {
        await Deno.writeTextFile(filePath, fileContents);
    };

    const scriptBasePathUrl = path.dirname(import.meta.url);
    const templatePathUrl = `${scriptBasePathUrl}/templates/svg-component-template-ts.template`;
    const fileUrlPrefix = "file:///";
    if (templatePathUrl.startsWith(fileUrlPrefix)) {
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
//        console.log(`COMPONENT PATH: ${componentFilePath}`);
        writeFileWithContents(componentFilePath, newFileContents);
//        console.log(newFileContents);
    }
    else {
        console.log(`${templatePathUrl} didn't seem to use the correct format- unable to continue`);
    }
}