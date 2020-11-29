export enum ElementType {
    None = 0,
    Opening = 1,
    Closing = 2,
    Both = 3
}

export interface BaseAttribute {
    name: string;
}

export interface AttributeWithValue extends BaseAttribute {
    value: string;
}

export interface AttributeWithExactValue extends BaseAttribute {
    exactValue: string;
}

export type Attribute = AttributeWithValue | AttributeWithExactValue;


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
    let prevNonWhitespaceCh: string | null = null;
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
                if (prevNonWhitespaceCh === '/') {
                    elementType = ElementType.Both;
                }
            }
            else if (ch === "/") {
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
            else if (ch === ">") {
                if (prevNonWhitespaceCh === '/') {
                    elementType = ElementType.Both;
                }
                state = State.EndOfElement;
            }
        }
        else if (state === State.ParsingAttributeName) {
            if (ch === "=") {
                state = State.ParsingAttributeValue;
                attributeValue = "";
            }
            else if (ch === ">") {
                if (prevNonWhitespaceCh === '/') {
                    elementType = ElementType.Both;
                }
                state = State.EndOfElement;
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
        if (ch !== " " && ch !== "\t") {
            prevNonWhitespaceCh = ch;
        }
        idx++;
    }
    return {
        elementName,
        elementType,
        attributes
    };
}

