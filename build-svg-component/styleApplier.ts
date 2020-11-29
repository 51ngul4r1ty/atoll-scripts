import { Attribute, AttributeWithExactValue, AttributeWithValue } from "./parser.ts";

export const hasDarkValue = (value: string) => {
    if (value.toLowerCase() === "none") {
        return false;
    }
    return true;
};

export const getAttributesWithStyleApplied = (attributes: Attribute[]): Attribute[] => {
    const result: Attribute[] = [];
    let addFill = false;
    let addStroke = false;
    attributes.forEach(attribute => {
        result.push(attribute);
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
            exactValue = "{fillClass + \" \" + strokeClass}";
        }
        else if (addFill) {
            exactValue = "{fillClass}";
        }
        else if (addStroke) {
            exactValue = "{strokeClass}";
        }
        else {
            exactValue = undefined;
        }
        result.splice(1, 0, {
            name: "className",
            exactValue
        } as AttributeWithExactValue);
    }
    return result;
};
