export enum ElementType {
    Opening = 1,
    Closing = 2,
    Both = 3
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

export interface Content {
    elementName: string;
    elementType: ElementType;
    attributes: Attribute[];
}

export const parseContent = (content: string): Content => {
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

