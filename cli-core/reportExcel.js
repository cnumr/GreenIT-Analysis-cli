const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const utils = require('./utils');

//create xlsx report for all the analysed pages and recap on the first sheet
async function create_XLSX_report(reportObject, options) {
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
        ['Date', globalReport_data.date],
        ['Hostname', globalReport_data.hostname],
        ['Plateforme', globalReport_data.device],
        ['Connexion', globalReport_data.connection],
        ['Grade', globalReport_data.grade],
        ['EcoIndex', globalReport_data.ecoIndex],
        ['Nombre de pages', globalReport_data.nbPages],
        ['Timeout', globalReport_data.timeout],
        ["Nombre d'analyses concurrentes", globalReport_data.maxTab],
        ["Nombre d'essais supplémentaires en cas d'échec", globalReport_data.retry],
        ["Nombre d'erreurs d'analyse", globalReport_data.errors.length],
        ["Erreurs d'analyse :"],
    ];
    globalReport_data.errors.forEach((element) => {
        globalSheet_data.push([element.nb, element.url]);
    });
    globalSheet_data.push([], ['Pages prioritaires:']);
    globalReport_data.worstPages.forEach((element) => {
        globalSheet_data.push([element.nb, element.url, 'Grade', element.grade, 'EcoIndex', element.ecoIndex]);
    });
    globalSheet_data.push([], ['Bonnes pratiques à mettre en oeuvre :']);
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
                        ['URL', obj.pageInformations.url],
                        ['Grade', page.actions[page.actions.length - 1].grade],
                        ['EcoIndex', page.actions[page.actions.length - 1].ecoIndex],
                        ['Eau (cl)', page.actions[page.actions.length - 1].waterConsumption],
                        ['GES (gCO2e)', page.actions[page.actions.length - 1].greenhouseGasesEmission],
                        ['Taille du DOM', page.actions[page.actions.length - 1].domSize],
                        [
                            'Taille de la page (Ko)',
                            `${Math.round(page.actions[page.actions.length - 1].responsesSize / 1000)} (${Math.round(
                                page.actions[page.actions.length - 1].responsesSizeUncompress / 1000
                            )})`,
                        ],
                        ['Nombre de requêtes', page.actions[page.actions.length - 1].nbRequest],
                        ['Nombre de plugins', page.actions[page.actions.length - 1].pluginsNumber],
                        ['Nombre de fichier CSS', page.actions[page.actions.length - 1].printStyleSheetsNumber],
                        ['Nombre de "inline" CSS', page.actions[page.actions.length - 1].inlineStyleSheetsNumber],
                        ['Nombre de tag src vide', page.actions[page.actions.length - 1].emptySrcTagNumber],
                        ['Nombre de "inline" JS', page.actions[page.actions.length - 1].inlineJsScriptsNumber],
                    ];
                }

                sheet_data.push([], ['Image retaillée dans le navigateur :']);
                for (let elem in page.actions[page.actions.length - 1].imagesResizedInBrowser) {
                    sheet_data.push([page.actions[page.actions.length - 1].imagesResizedInBrowser[elem].src]);
                }

                sheet_data.push([], ['Best practices :']);
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
                ['URL', obj.pageInformations.url],
                ['Grade', obj.grade],
                ['EcoIndex', obj.ecoIndex],
                ['Eau (cl)', obj.waterConsumption],
                ['GES (gCO2e)', obj.greenhouseGasesEmission],
                ['Taille du DOM', obj.domSize],
                [
                    'Taille de la page (Ko)',
                    `${Math.round(obj.responsesSize / 1000)} (${Math.round(obj.responsesSizeUncompress / 1000)})`,
                ],
                ['Nombre de requêtes', obj.nbRequest],
                ['Nombre de plugins', obj.pluginsNumber],
                ['Nombre de fichier CSS', obj.printStyleSheetsNumber],
                ['Nombre de "inline" CSS', obj.inlineStyleSheetsNumber],
                ['Nombre de tag src vide', obj.emptySrcTagNumber],
                ['Nombre de "inline" JS', obj.inlineJsScriptsNumber],
                ['Nombre de requêtes', obj.nbRequest],
            ];
            sheet_data.push([], ['Image retaillée dans le navigateur :']);
            for (let elem in obj.imagesResizedInBrowser) {
                sheet_data.push([obj.imagesResizedInBrowser[elem].src]);
            }
            sheet_data.push([], ['Best practices :']);
            for (let key in obj.bestPractices) {
                sheet_data.push([key, obj.bestPractices[key].complianceLevel || 'A']);
            }
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
