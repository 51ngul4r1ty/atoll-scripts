// externals
import * as path from "https://deno.land/std@0.79.0/path/mod.ts";
import * as fs from "https://deno.land/std@0.63.0/fs/mod.ts";

// utils
import { addLineToFile } from "./fileChanger.ts";
import { readFileContents, writeFileContents } from "./fileReaderWriter.ts";
import { convertSvgToReactComponent } from "./svgToReactConverter.ts";

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
    console.log("For example, from \"atoll-shared\" repo use \"npm run gen:react-svg -- status-done-icon\"");
}
else {
    const assetsFileBaseName = Deno.args[0];
    const assetsFileName = assetsFileBaseName.endsWith(".svg") ? assetsFileBaseName : `${assetsFileBaseName}.svg`;
    const assetsFileRelPath = `./src/assets/${assetsFileName}`;
    const assetsFilePath = path.resolve(assetsFileRelPath);

    const scriptBasePathUrl = path.dirname(import.meta.url);
    const templatePathUrl = `${scriptBasePathUrl}/templates/svg-component-template-ts.template`;
    // NOTE: file:/// was used previously, but that resulted in a Users/* path instead of /Users/*
    const fileUrlPrefix = "file://";
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
        const classNameVariable = "classNameToUse";
        const svgToReactResult = convertSvgToReactComponent(svgAssetContents, indentationSpaceCount, classNameVariable);
        let firstEltClassNames: string;
        if (svgToReactResult.addClassNameFill && svgToReactResult.addClassNameStroke) {
            firstEltClassNames = "fillClass, strokeClass, ";
        }
        else if (svgToReactResult.addClassNameFill) {
            firstEltClassNames = "fillClass, ";
        }
        else if (svgToReactResult.addClassNameStroke) {
            firstEltClassNames = "strokeClass, ";
        }
        else {
            firstEltClassNames = "";
        }
        const svgComponentCode = svgToReactResult.svgComponentCode;
        const componentName = formatAsComponentName(assetsFileBaseName);

        let newFileContents = templateContents.replace(/\<\<\-SVG-ELT1-CLS\-\>\>\,\ /g, firstEltClassNames);
        newFileContents = newFileContents.replace(/\<\<\-SVG\-\>\>/g, svgComponentCode);
        newFileContents = newFileContents.replace(/\<\<\-NAME\-\>\>/g, componentName);
        newFileContents = newFileContents.replace(/\<\<\-CLS-NAME-VAR\-\>\>/g, classNameVariable);

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
