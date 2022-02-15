const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const translator = require('./translator.js').translator;

/**
 * Css class best practices
 */
const statusBestPractices = {
    A: 'success',
    B: 'warning',
    C: 'error'
}

//create html report for all the analysed pages and recap on the first sheet
async function create_json_report(reportObject, options) {
    //Path of the output file
    const OUTPUT_FILE = path.resolve(options.report_output_file);
    if (!OUTPUT_FILE.toLowerCase().endsWith('.json')) {
        throw ` report_output_file : File "${OUTPUT_FILE}" does not end with the ".json" extension.`
    }

    const fileList = reportObject.reports;
    const globalReport = reportObject.globalReport;

    //initialise progress bar
    let progressBar;
    if (!options.ci) {
        progressBar = new ProgressBar(' Create JSON report       [:bar] :percent     Remaining: :etas     Time: :elapseds', {
            complete: '=',
            incomplete: ' ',
            width: 40,
            total: fileList.length + 2
        });
        progressBar.tick()
    } else {
        console.log('Creating JSON report ...');
    }

    // Read all reports
    const allReportsVariables = readAllReports(fileList);

    // Read global report
    const globalReportVariables = readGlobalReport(globalReport.path, allReportsVariables);

    // write global report
    writeGlobalReport(globalReportVariables, OUTPUT_FILE);
}

function readAllReports(fileList) {
    let allReportsVariables = [];
    let reportVariables = {};
    fileList.forEach((file) => {
        let report_data = JSON.parse(fs.readFileSync(file.path).toString());
        const pageName = report_data.pageInformations.name || report_data.pageInformations.url;
        const pageFilename = report_data.pageInformations.name ? `${removeForbiddenCharacters(report_data.pageInformations.name)}.json` : `${report_data.tabId}.json`;

        if (report_data.success) {
            let bestPractices = extractBestPractices(report_data.bestPractices);
            reportVariables = {
                url: report_data.url,
                date: report_data.date,
                success: report_data.success,
                name: pageName,
                filename: pageFilename,
                ecoIndex: report_data.ecoIndex,
                grade: report_data.grade,
                waterConsumption: report_data.waterConsumption,
                greenhouseGasesEmission: report_data.greenhouseGasesEmission,
                nbRequest: report_data.nbRequest,
                pageSize: `${Math.round(report_data.responsesSizeUncompress / 1000)} (${Math.round(report_data.responsesSize / 1000)})`,
                domSize: report_data.domSize,
                nbBestPracticesToCorrect: report_data.nbBestPracticesToCorrect,
                bestPractices
            };
        } else {
            reportVariables = {
                date: report_data.date,
                success: report_data.success,
                name: pageName,
                filename: pageFilename,
                bestPractices: []
            }
        }
        allReportsVariables.push(reportVariables);
    });
    return allReportsVariables;
}

function readGlobalReport(path, allReportsVariables) {
    let globalReport_data = JSON.parse(fs.readFileSync(path).toString());
    const hasWorstRules = globalReport_data.worstRules?.length > 0;
    return {
        date: globalReport_data.date,
        hostname: globalReport_data.hostname,
        device: globalReport_data.device,
        connection: globalReport_data.connection,
        ecoIndex: globalReport_data.ecoIndex,
        grade: globalReport_data.grade,
        nbBestPracticesToCorrect: globalReport_data.nbBestPracticesToCorrect,
        nbPages: globalReport_data.nbPages,
        nbErrors: globalReport_data.errors.length,
        allReportsVariables,
        worstRulesHeader: hasWorstRules ? `Top ${globalReport_data.worstRules.length} des règles à corriger` : '',
        worstRules: hasWorstRules ? globalReport_data.worstRules.map((worstRule, index) => `#${index + 1} ${translator.translateRule(worstRule)}`) : '',
    };
}

function extractBestPractices(bestPracticesFromReport) {
    const bestPracticesKey = [
        'AddExpiresOrCacheControlHeaders',
        'CompressHttp',
        'DomainsNumber',
        'DontResizeImageInBrowser',
        'EmptySrcTag',
        'ExternalizeCss',
        'ExternalizeJs',
        'HttpError',
        'HttpRequests',
        'ImageDownloadedNotDisplayed',
        'JsValidate',
        'MaxCookiesLength',
        'MinifiedCss',
        'MinifiedJs',
        'NoCookieForStaticRessources',
        'NoRedirect',
        'OptimizeBitmapImages',
        'OptimizeSvg',
        'Plugins',
        'PrintStyleSheet',
        'SocialNetworkButton',
        'StyleSheets',
        'UseETags',
        'UseStandardTypefaces'
    ];

    let bestPractices = [];

    bestPracticesKey.forEach(key => {
        const bestPractice = {
            key: key,
            comment: bestPracticesFromReport[key].comment || '',
            status: statusBestPractices[bestPracticesFromReport[key].complianceLevel || 'A']
        };
        bestPractices.push(bestPractice);
    })

    return bestPractices;
}

function writeGlobalReport(globalReportVariables, outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(globalReportVariables));
}

function removeForbiddenCharacters(str) {
    str = removeForbiddenCharactersInFile(str);
    str = removeAccents(str);
    return str;
}

function removeForbiddenCharactersInFile(str) {
    return str.replace(/[/\\?%*:|"<>° ]/g, '');
}

function removeAccents(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

module.exports = {
    create_json_report
}