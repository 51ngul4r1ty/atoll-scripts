// interfaces/types
import { Content, ElementType } from "./parser.ts";

// utils
import { spaces, textToLines } from "./stringUtils.ts";
import { parseContent } from "./parser.ts";

export const reformatAttributeName = (attributeName: string): string => {
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

export const reformatParsedContent = (content: Content, indentationSpaceCount: number, applyIndentationToEltLine: boolean): string => {
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

export const convertEltLine = (line: string, indentationSpaceCount: number, notFirstLine: boolean): string => {
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

export const convertSvgToReactComponent = (svgAssetText: string, indentationSpaceCount: number): string => {
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
