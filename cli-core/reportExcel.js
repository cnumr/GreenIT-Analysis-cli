const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');
const translator = require('./translator.js').translator;

//create xlsx report for all the analysed pages and recap on the first sheet
async function create_XLSX_report(reportObject, options, translator) {
    const OUTPUT_FILE = path.resolve(options.report_output_file);
    const fileList = reportObject.reports;
    const globalReport = reportObject.globalReport;

    //initialise progress bar
    const progressBar = utils.createProgressBar(
        options,
        fileList.length + 2,
        'Create Excel report',
        'Creating XLSX report ...'
    );

    const wb = new ExcelJS.Workbook();
    //Creating the recap page
    const globalSheet = wb.addWorksheet(globalReport.name);
    const globalReport_data = JSON.parse(fs.readFileSync(globalReport.path).toString());
    const globalSheet_data = [
        [translator.translate('date'), globalReport_data.date],
        [translator.translate('hostname'), globalReport_data.hostname],
        [translator.translate('platform'), globalReport_data.device],
        [translator.translate('connection'), globalReport_data.connection],
        [translator.translate('grade'), globalReport_data.grade],
        [translator.translate('ecoIndex'), globalReport_data.ecoIndex],
        [translator.translate('nbPages'), globalReport_data.nbPages],
        [translator.translate('timeout'), globalReport_data.timeout],
        [translator.translate('nbConcAnalysis'), globalReport_data.maxTab],
        [translator.translate('nbAdditionalAttemps'), globalReport_data.retry],
        [translator.translate('nbErrors'), globalReport_data.errors.length],
        [translator.translate('analysisErrors')],
    ];
    globalReport_data.errors.forEach((element) => {
        globalSheet_data.push([element.nb, element.url]);
    });
    globalSheet_data.push([], [translator.translate('priorityPages')]);
    globalReport_data.worstPages.forEach((element) => {
        globalSheet_data.push([
            element.nb,
            element.url,
            translator.translate('grade'),
            element.grade,
            translator.translate('ecoIndex'),
            element.ecoIndex,
        ]);
    });
    globalSheet_data.push([], [translator.translate('rulesToApply')]);
    globalReport_data.worstRules.forEach((elem) => {
        globalSheet_data.push([elem]);
    });
    //add data to the recap sheet
    globalSheet.addRows(globalSheet_data);
    globalSheet.getCell('B5').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: getGradeColor(globalReport_data.grade) },
    };

    if (progressBar) progressBar.tick();

    //Creating one report sheet per file
    fileList.forEach((file) => {
        const sheet_name = file.name;
        let obj = JSON.parse(fs.readFileSync(file.path).toString());

        if (obj.pages) {
            obj.pages.forEach((page) => {
                let sheet_data;
                if (page.actions) {
                    // Prepare data
                    sheet_data = [
                        [translator.translate('url'), obj.pageInformations.url],
                        [translator.translate('grade'), page.actions[page.actions.length - 1].grade],
                        [translator.translate('ecoIndex'), page.actions[page.actions.length - 1].ecoIndex],
                        [translator.translate('water'), page.actions[page.actions.length - 1].waterConsumption],
                        [
                            translator.translate('greenhouseGasesEmission'),
                            page.actions[page.actions.length - 1].greenhouseGasesEmission,
                        ],
                        [translator.translate('domSize'), page.actions[page.actions.length - 1].domSize],
                        [
                            translator.translate('pageSize'),
                            `${Math.round(page.actions[page.actions.length - 1].responsesSize / 1000)} (${Math.round(
                                page.actions[page.actions.length - 1].responsesSizeUncompress / 1000
                            )})`,
                        ],
                        [translator.translate('nbRequests'), page.actions[page.actions.length - 1].nbRequest],
                        [translator.translate('nbPlugins'), page.actions[page.actions.length - 1].pluginsNumber],
                        [
                            translator.translate('nbCssFiles'),
                            page.actions[page.actions.length - 1].printStyleSheetsNumber,
                        ],
                        [
                            translator.translate('nbInlineCss'),
                            page.actions[page.actions.length - 1].inlineStyleSheetsNumber,
                        ],
                        [translator.translate('nbEmptySrc'), page.actions[page.actions.length - 1].emptySrcTagNumber],
                        [
                            translator.translate('nbInlineJs'),
                            page.actions[page.actions.length - 1].inlineJsScriptsNumber,
                        ],
                    ];
                }

                sheet_data.push([], [translator.translate('resizedImage')]);
                for (let elem in page.actions[page.actions.length - 1].imagesResizedInBrowser) {
                    sheet_data.push([page.actions[page.actions.length - 1].imagesResizedInBrowser[elem].src]);
                }

                sheet_data.push([], [translator.translate('bestPractices')]);
                for (let key in page.bestPractices) {
                    sheet_data.push([key, page.bestPractices[key].complianceLevel || 'A']);
                }
                //Create sheet
                let sheet = wb.addWorksheet(`${sheet_name} - ${page.name}`);
                sheet.addRows(sheet_data);
                sheet.getCell('B2').fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: getGradeColor(obj.grade) },
                };
            });
        } else {
            // Prepare data
            const sheet_data = [
                [translator.translate('url'), obj.pageInformations.url],
                [translator.translate('grade'), obj.grade],
                [translator.translate('ecoIndex'), obj.ecoIndex],
                [translator.translate('water'), obj.waterConsumption],
                [translator.translate('greenhouseGasesEmission'), obj.greenhouseGasesEmission],
                [translator.translate('domSize'), obj.domSize],
                [
                    translator.translate('pageSize'),
                    `${Math.round(obj.responsesSize / 1000)} (${Math.round(obj.responsesSizeUncompress / 1000)})`,
                ],
                [translator.translate('nbRequests'), obj.nbRequest],
                [translator.translate('nbPlugins'), obj.pluginsNumber],
                [translator.translate('nbCssFiles'), obj.printStyleSheetsNumber],
                [translator.translate('nbInlineCss'), obj.inlineStyleSheetsNumber],
                [translator.translate('nbEmptySrc'), obj.emptySrcTagNumber],
                [translator.translate('nbInlineJs'), obj.inlineJsScriptsNumber],
            ];
            //Create sheet
            let sheet = wb.addWorksheet(sheet_name);
            sheet.addRows(sheet_data);
            sheet.getCell('B2').fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: getGradeColor(obj.grade) },
            };
        }
        if (progressBar) progressBar.tick();
    });
    //save report
    try {
        await wb.xlsx.writeFile(OUTPUT_FILE);
    } catch (error) {
        throw ` report_output_file : Path "${OUTPUT_FILE}" cannot be reached.`;
    }
}

// Get color code by grade
function getGradeColor(grade) {
    if (grade == 'A') return 'ff009b4f';
    if (grade == 'B') return 'ff30b857';
    if (grade == 'C') return 'ffcbda4b';
    if (grade == 'D') return 'fffbe949';
    if (grade == 'E') return 'ffffca3e';
    if (grade == 'F') return 'ffff9349';
    return 'fffe002c';
}

module.exports = {
    create_XLSX_report,
};
