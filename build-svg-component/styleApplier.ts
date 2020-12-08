import { Attribute, AttributeWithExactValue, AttributeWithValue } from "./parser.ts";

export const hasDarkValue = (value: string) => {
    if (value.toLowerCase() === "none") {
        return false;
    }
    return true;
};

export interface EltStyleInfo {
    addFill: boolean;
    addStroke: boolean;
}

export interface AttributesWithStyleAppliedResult {
    eltStyleInfo: EltStyleInfo;
    attributes: Attribute[];
}

export const getAttributesWithStyleApplied = (attributes: Attribute[], classNameToUseInstead: string | null): AttributesWithStyleAppliedResult => {
    const classNameToUse = classNameToUseInstead ? `{${classNameToUseInstead}}` : null;
    const result: AttributesWithStyleAppliedResult = {
        attributes: [],
        eltStyleInfo: {
            addFill: false,
            addStroke: false
        }
    };
    let addFill = false;
    let addStroke = false;
    attributes.forEach(attribute => {
        result.attributes.push(attribute);
        if (attribute.name === "fill" && hasDarkValue((attribute as AttributeWithValue).value)) {
            addFill = true;
        }
        if (attribute.name === "stroke" && hasDarkValue((attribute as AttributeWithValue).value)) {
            addStroke = true;
        }
    });
    if (addFill || addStroke) {
        let exactValue: string | undefined;
        if (addFill && addStroke) {
            exactValue = classNameToUse || "{fillClass + \" \" + strokeClass}";
        }
        else if (addFill) {
            exactValue = classNameToUse || "{fillClass}";
        }
        else if (addStroke) {
            exactValue = classNameToUse || "{strokeClass}";
        }
        else {
            exactValue = undefined;
        }
        result.attributes.splice(1, 0, {
            name: "className",
            exactValue
        } as AttributeWithExactValue);
    }
    result.eltStyleInfo.addFill = addFill;
    result.eltStyleInfo.addStroke = addStroke;
    return result;
};
