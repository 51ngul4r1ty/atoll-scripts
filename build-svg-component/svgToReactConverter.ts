// interfaces/types
import { Attribute, AttributeWithExactValue, AttributeWithValue, Content, ElementType } from "./parser.ts";

// utils
import { spaces, textToLines } from "./stringUtils.ts";
import { parseContent } from "./parser.ts";
import { EltStyleInfo, getAttributesWithStyleApplied } from "./styleApplier.ts";

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

export interface ReformattedParseContentResult {
    content: string;
    eltStyleInfo: EltStyleInfo;
}

export const reformatParsedContent = (content: Content, indentationSpaceCount: number, applyIndentationToEltLine: boolean, classNameToUseInstead: string | null): ReformattedParseContentResult => {
    const result: ReformattedParseContentResult = {
        content: "",
        eltStyleInfo: {
            addFill: false,
            addStroke: false
        }
    };
    const indentationSpaces = spaces(indentationSpaceCount);
    const eltLineIndentSpaces = applyIndentationToEltLine ? spaces(indentationSpaceCount) : "";
    let reformattedAttributes = "";
    if (!content.attributes.length) {
        if (content.elementType === ElementType.Opening) {
            result.content = `${eltLineIndentSpaces}<${content.elementName}>`;
            return result;
        }
        else if (content.elementType === ElementType.Closing) {
            result.content = `${eltLineIndentSpaces}</${content.elementName}>`;
            return result;
        }
        else if (content.elementType === ElementType.Both) {
            result.content = `${eltLineIndentSpaces}<${content.elementName} />`;
            return result;
        }
        else {
            throw new Error(`Unexpected condition- elementType is not Opening, Closing or Both, it has value: ${content.elementType}`);
        }
    }
    else {
        const styleApplierResult = getAttributesWithStyleApplied(content.attributes, classNameToUseInstead);
        styleApplierResult.attributes.forEach(attribute => {
            if (includeAttribute(attribute)) {
                const attributeName = reformatAttributeName(attribute.name);
                if ((attribute as AttributeWithExactValue).exactValue) {
                    const attributeExactValue = (attribute as AttributeWithExactValue).exactValue;
                    reformattedAttributes += `${indentationSpaces}    ${attributeName}=${attributeExactValue}\n`;
                }
                else {
                    const attributeValue = `"${(attribute as AttributeWithValue).value}"`;
                    reformattedAttributes += `${indentationSpaces}    ${attributeName}=${attributeValue}\n`;
                }
            }
        });

        const closingChars = content.elementType === ElementType.Both ? "/>" : ">";
        result.content = `${eltLineIndentSpaces}<${content.elementName}\n${reformattedAttributes}${indentationSpaces}${closingChars}`;
        result.eltStyleInfo = styleApplierResult.eltStyleInfo;
        return result;
    }
};

export interface EltLineContent {
    text: string;
    elementType: ElementType;
    eltStyleInfo: EltStyleInfo;
}

export const convertEltLine = (line: string, indentationSpaceCount: number, notFirstLine: boolean, firstLineClassNameToUse: string): EltLineContent => {
    const content = line.trim();
    const parsedContent = parseContent(content);
    const elementTypeAdjust = parsedContent.elementType === ElementType.Closing ? -4 : 0;
    const totalIndentationSpaceCount = indentationSpaceCount + elementTypeAdjust;
    if (!parsedContent.elementName) {
        return {
            text: "",
            elementType: ElementType.None,
            eltStyleInfo: {
                addFill: false,
                addStroke: false
            }
        };
    }
    const classNameToUseInstead = notFirstLine ? null : firstLineClassNameToUse;
    const result = reformatParsedContent(parsedContent, totalIndentationSpaceCount, notFirstLine, classNameToUseInstead);
    return {
        text: result.content,
        elementType: parsedContent.elementType,
        eltStyleInfo: result.eltStyleInfo
    };
};

export interface ConvertSvgToReactComponentResult {
    svgComponentCode: string;
    addClassNameStroke: boolean;
    addClassNameFill: boolean;
}

export const convertSvgToReactComponent = (svgAssetText: string, indentationSpaceCount: number, classNameVariable: string): ConvertSvgToReactComponentResult => {
    const result: ConvertSvgToReactComponentResult = {
        svgComponentCode: "",
        addClassNameFill: false,
        addClassNameStroke: false
    };
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
            const convertedLine = convertEltLine(line, indentationSpaceCount + indentLevel * 4, lineNumber > 1, classNameVariable);
            if (lineNumber === 1) {
                result.addClassNameFill = convertedLine.eltStyleInfo.addFill;
                result.addClassNameStroke = convertedLine.eltStyleInfo.addStroke;
            }
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
    result.svgComponentCode = remainingLines.join("\n");
    return result;
}
