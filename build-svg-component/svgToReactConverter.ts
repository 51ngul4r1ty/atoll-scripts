// interfaces/types
import { Attribute, Content, ElementType } from "./parser.ts";

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

export const includeAttribute = (attribute: Attribute) => {
    return attribute.name.toLowerCase() !== 'style';
};

export const reformatParsedContent = (content: Content, indentationSpaceCount: number, applyIndentationToEltLine: boolean): string => {
    const indentationSpaces = spaces(indentationSpaceCount);
    const eltLineIndentSpaces = applyIndentationToEltLine ? spaces(indentationSpaceCount) : "";
    let reformattedAttributes = "";
    if (!content.attributes.length) {
        if (content.elementType === ElementType.Opening) {
            return `${eltLineIndentSpaces}<${content.elementName}>`;
        }
        else if (content.elementType === ElementType.Closing) {
            return `${eltLineIndentSpaces}</${content.elementName}>`;
        }
        else if (content.elementType === ElementType.Both) {
            return `${eltLineIndentSpaces}<${content.elementName} />`;
        }
        else {
            throw new Error(`Unexpected condition- elementType is not Opening, Closing or Both, it has value: ${content.elementType}`);
        }
    }
    else {
        content.attributes.forEach(attribute => {
            if (includeAttribute(attribute)) {
                const attributeName = reformatAttributeName(attribute.name);
                const attributeValue = `"${attribute.value}"`;
                reformattedAttributes += `${indentationSpaces}    ${attributeName}=${attributeValue}\n`;
            }
        });

        const closingChars = content.elementType === ElementType.Both ? "/>" : ">";
        return `${eltLineIndentSpaces}<${content.elementName}\n${reformattedAttributes}${indentationSpaces}${closingChars}`;
    }
};

export interface EltLineContent {
    text: string;
    elementType: ElementType;
}

export const convertEltLine = (line: string, indentationSpaceCount: number, notFirstLine: boolean): EltLineContent => {
    const content = line.trim();
    const parsedContent = parseContent(content);
    const elementTypeAdjust = parsedContent.elementType === ElementType.Closing ? -4 : 0;
    const totalIndentationSpaceCount = indentationSpaceCount + elementTypeAdjust;
    if (!parsedContent.elementName) {
        return {
            text: "",
            elementType: ElementType.None
        };
    }
    return {
        text: reformatParsedContent(parsedContent, totalIndentationSpaceCount, notFirstLine),
        elementType: parsedContent.elementType
    };
};

export const convertSvgToReactComponent = (svgAssetText: string, indentationSpaceCount: number): string => {
    const lines = textToLines(svgAssetText);
    const remainingLines: string[] = [];
    let foundStart = false;
    let lineNumber = 0;
    let indentLevel = 0;
    lines.forEach(line => {
        if (line.startsWith("<svg ")) {
            foundStart = true;
        }
        if (foundStart) {
            lineNumber++;
            const convertedLine = convertEltLine(line, indentationSpaceCount + indentLevel * 4, lineNumber > 1);
            switch (convertedLine.elementType) {
                case ElementType.Opening: {
                    indentLevel++;
                    break;
                }
                case ElementType.Closing: {
                    indentLevel--;
                }
            }
            if (convertedLine.elementType)
            if (convertedLine) {
                remainingLines.push(convertedLine.text);
            }
        }
    });
    const result = remainingLines.join("\n");
    return result;
}
