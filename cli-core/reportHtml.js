const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');
const rules = require('../conf/rules');
const utils = require('./utils');

/**
 * Css class best practices
 */
const cssBestPractices = {
    A: 'checkmark-success',
    B: 'close-warning',
    C: 'close-error',
};
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
    'UseStandardTypefaces',
];

//create html report for all the analysed pages and recap on the first sheet
async function create_html_report(reportObject, options, translator, grafanaLinkPresent) {
    const OUTPUT_FILE = path.resolve(options.report_output_file);
    const fileList = reportObject.reports;
    const globalReport = reportObject.globalReport;

    // initialise progress bar
    const progressBar = utils.createProgressBar(
        options,
        fileList.length + 2,
        'Create HTML report',
        'Creating HTML report ...'
    );

    // Read all reports
    const { allReportsVariables, waterTotal, greenhouseGasesEmissionTotal } = readAllReports(
        fileList,
        options.grafana_link,
        translator
    );

    // Read global report
    const globalReportVariables = readGlobalReport(
        globalReport.path,
        allReportsVariables,
        waterTotal,
        greenhouseGasesEmissionTotal,
        grafanaLinkPresent,
        translator
    );

    // write global report
    writeGlobalReport(globalReportVariables, OUTPUT_FILE, progressBar, translator);

    // write all reports
    const outputFolder = path.dirname(OUTPUT_FILE);
    writeAllReports(allReportsVariables, outputFolder, progressBar, translator);
}

/**
 * Use all reports to generate global and detail data
 * @param {*} fileList
 * @returns
 */
function readAllReports(fileList, grafanaLink, translator) {
    // init variables
    const allReportsVariables = [];
    let waterTotal = 0;
    let greenhouseGasesEmissionTotal = 0;

    // Read all json files
    fileList.forEach((file) => {
        let reportVariables = {};
        const report_data = JSON.parse(fs.readFileSync(file.path).toString());

        const hostname = report_data.pageInformations.url.split('/')[2];
        const scenarioName = report_data.pageInformations.name || report_data.pageInformations.url;
        const pageFilename = report_data.pageInformations.name
            ? `${removeForbiddenCharacters(report_data.pageInformations.name)}.html`
            : `${report_data.index}.html`;

        if (report_data.success) {
            let pages = [];
            let nbRequestTotal = 0;
            let responsesSizeTotal = 0;
            let responsesSizeUncompressTotal = 0;
            let domSizeTotal = 0;
            let id = 0;

            // Loop over each page (i.e scenario)
            report_data.pages.forEach((page) => {
                const actions = [];
                const analyzePage = {};

                analyzePage.name = page.name;
                analyzePage.url = page.url;

                analyzePage.id = id;
                id += 1;

                // Loop on each recorded action
                page.actions.forEach((action) => {
                    const res = {};
                    res.name = action.name;
                    res.ecoIndex = action.ecoIndex;
                    res.grade = action.grade;
                    res.waterConsumption = action.waterConsumption;
                    res.greenhouseGasesEmission = action.greenhouseGasesEmission;
                    res.nbRequest = action.nbRequest;
                    res.domSize = action.domSize;
                    res.responsesSize = action.responsesSize / 1000;
                    res.responsesSizeUncompress = action.responsesSizeUncompress;
                    actions.push(res);
                });

                analyzePage.actions = actions;

                const lastAction = actions[actions.length - 1];
                analyzePage.lastEcoIndex = lastAction.ecoIndex;
                analyzePage.lastGrade = lastAction.grade;
                analyzePage.deltaEcoIndex = actions[0].ecoIndex - lastAction.ecoIndex;
                analyzePage.waterConsumption = lastAction.waterConsumption;
                analyzePage.greenhouseGasesEmission = lastAction.greenhouseGasesEmission;
                analyzePage.domSize = lastAction.domSize;
                analyzePage.nbRequest = lastAction.nbRequest;
                analyzePage.ecoIndex = lastAction.ecoIndex;
                analyzePage.grade = lastAction.grade;

                // update total page measure
                nbRequestTotal += lastAction.nbRequest;
                responsesSizeTotal += lastAction.responsesSize;
                domSizeTotal += lastAction.domSize;
                responsesSizeUncompressTotal += lastAction.responsesSizeUncompress;

                const pageBestPractices = extractBestPractices(translator);

                // Manage best practices
                let nbBestPracticesToCorrect = 0;
                pageBestPractices.forEach((bp) => {
                    if (page.bestPractices) {
                        bp.note = cssBestPractices[page.bestPractices[bp.key].complianceLevel || 'A'];
                        bp.comment = page.bestPractices[bp.key].comment || '';
                        bp.errors = page.bestPractices[bp.key].detailComment;

                        if (
                            cssBestPractices[page.bestPractices[bp.key].complianceLevel || 'A'] !== 'checkmark-success'
                        ) {
                            // if error, increment number of incorrect best practices
                            nbBestPracticesToCorrect += 1;
                        }
                    } else {
                        bp.note = 'A';
                        bp.comment = '';
                    }
                });

                if (analyzePage.waterConsumption) {
                    waterTotal += analyzePage.waterConsumption;
                }
                if (analyzePage.greenhouseGasesEmission) {
                    greenhouseGasesEmissionTotal += analyzePage.greenhouseGasesEmission;
                }
                analyzePage.bestPractices = pageBestPractices;
                analyzePage.nbBestPracticesToCorrect = nbBestPracticesToCorrect;
                analyzePage.nbBestPracticesToCorrectLabel = translator.translateWithArgs(
                    'bestPracticesToImplementWithNumber',
                    nbBestPracticesToCorrect
                );
                analyzePage.grafanaLink = `${grafanaLink}&var-scenarioName=${scenarioName}&var-actionName=${analyzePage.name}`;
                pages.push(analyzePage);
            });

            // Manage state of global best practices, for each page of the scenario
            const bestPractices = manageScenarioBestPratices(pages, translator);

            reportVariables = {
                date: report_data.date,
                success: report_data.success,
                cssRowError: '',
                name: scenarioName,
                link: `<a href="${pageFilename}">${scenarioName}</a>`,
                filename: pageFilename,
                header: `${translator.translate('greenItAnalysisReport')} > <a class="text-white" href="${
                    report_data.pageInformations.url
                }">${scenarioName}</a>`,
                bigEcoIndex: `${report_data.ecoIndex} <span class="grade big-grade ${report_data.grade}">${report_data.grade}</span>`,
                smallEcoIndex: `${report_data.ecoIndex} <span class="grade ${report_data.grade}">${report_data.grade}</span>`,
                grade: report_data.grade,
                nbRequest: nbRequestTotal,
                responsesSize: Math.round(responsesSizeTotal * 1000) / 1000,
                pageSize: `${Math.round(responsesSizeTotal)} (${Math.round(responsesSizeUncompressTotal / 1000)})`,
                domSize: domSizeTotal,
                pages,
                bestPractices,
            };
        } else {
            reportVariables = {
                date: report_data.date,
                name: scenarioName,
                filename: pageFilename,
                success: false,
                header: `${translator.translate('greenItAnalysisReport')} > <a class="text-white" href="${
                    report_data.pageInformations.url
                }">${scenarioName}</a>`,
                cssRowError: 'bg-danger',
                nbRequest: 0,
                pages: [],
                link: `<a href="${pageFilename}">${scenarioName}</a>`,
                bestPractices: [],
            };
        }
        allReportsVariables.push(reportVariables);
    });

    return { allReportsVariables, waterTotal, greenhouseGasesEmissionTotal };
}

/**
 * Read and generate data for global template
 * @param {*} path
 * @param {*} allReportsVariables
 * @param {*} waterTotal
 * @param {*} greenhouseGasesEmissionTotal
 * @param {*} grafanaLinkPresent
 * @returns
 */
function readGlobalReport(
    path,
    allReportsVariables,
    waterTotal,
    greenhouseGasesEmissionTotal,
    grafanaLinkPresent,
    translator
) {
    const globalReport_data = JSON.parse(fs.readFileSync(path).toString());

    let ecoIndex = '';

    if (globalReport_data.worstEcoIndexes) {
        try {
            globalReport_data.worstEcoIndexes.forEach((worstEcoIndex) => {
                ecoIndex = `${ecoIndex} ${ecoIndex === '' ? '' : '/'} ${
                    worstEcoIndex.ecoIndex
                } <span class="grade big-grade ${worstEcoIndex.grade}">${worstEcoIndex.grade}</span>`;
            });
        } catch (err) {
            console.error(err);
        }
    }

    const globalReportVariables = {
        date: globalReport_data.date,
        hostname: globalReport_data.hostname,
        device: globalReport_data.device,
        connection: globalReport_data.connection,
        ecoIndex: ecoIndex,
        grade: globalReport_data.grade,
        nbScenarios: globalReport_data.nbScenarios,
        waterTotal: Math.round(waterTotal * 100) / 100,
        greenhouseGasesEmissionTotal: Math.round(greenhouseGasesEmissionTotal * 100) / 100,
        nbErrors: globalReport_data.errors.length,
        allReportsVariables,
        bestsPractices: constructBestPracticesGlobal(allReportsVariables, translator),
        grafanaLinkPresent,
    };
    return globalReportVariables;
}

function constructBestPracticesGlobal(allReportsVariables, translator) {
    const bestPracticesGlobal = [];
    const bestPractices = extractBestPractices(translator);

    bestPractices.forEach((bestPractice) => {
        let note = 'checkmark-success';
        let errors = [];
        let success = true;

        allReportsVariables.forEach((scenario) => {
            if (scenario.pages) {
                scenario.pages.forEach((page) => {
                    const best = page.bestPractices.filter((bp) => bp.key === bestPractice.key)[0];

                    if (success && best.note === 'close-error') {
                        success = false;
                        note = 'close-error';
                    }
                });
            }
        });

        const bestPracticeGlobal = {
            id: bestPractice.id,
            description: bestPractice.description,
            name: bestPractice.name,
            comment: bestPractice.comment,
            note: note,
            errors: errors,
            priority: bestPractice.priority,
            impact: bestPractice.impact,
            effort: bestPractice.effort,
        };

        bestPracticesGlobal.push(bestPracticeGlobal);
    });
    return bestPracticesGlobal;
}

/**
 * Extract best practices from report
 * @param {} bestPracticesFromReport
 * @returns
 */
function extractBestPractices(translator) {
    let bestPractices = [];
    let bestPractice;
    let rule;
    let index = 0;

    bestPracticesKey.forEach((bestPracticeName) => {
        rule = rules.find((p) => p.bestPractice === bestPracticeName);
        bestPractice = {
            key: bestPracticeName,
            id: `collapse${index}`,
            name: translator.translateRule(bestPracticeName),
            description: translator.translateRule(`${bestPracticeName}_DetailDescription`),
            priority: rule.priority,
            impact: rule.impact,
            effort: rule.effort,
            notes: [],
            pages: [],
            comments: [],
        };
        index++;
        bestPractices.push(bestPractice);
    });

    return bestPractices;
}

/**
 * Manage best practice state for each page
 * @param {*} pages
 */
function manageScenarioBestPratices(pages, translator) {
    const bestPractices = extractBestPractices(translator);
    // loop over each best practice
    pages.forEach((page) => {
        bestPractices.forEach((bp) => {
            if (!bp.pages) {
                bp.pages = [];
            }
            if (!bp.notes) {
                bp.notes = [];
            }
            if (!bp.comments) {
                bp.comments = [];
            }

            bp.pages.push(page.name);
            if (page.bestPractices) {
                // Get mapping best practice and update data
                const currentBestPractice = page.bestPractices.find((element) => element.key === bp.key);
                bp.notes.push(currentBestPractice.note || 'A');
                bp.comments.push(currentBestPractice.comment || '');
            }
        });
    });
    return bestPractices;
}

/**
 * Write global report from global template
 */
function writeGlobalReport(globalReportVariables, outputFile, progressBar, translator) {
    const globalReportVariablesWithLabels = {
        labels: {
            header: translator.translate('greenItAnalysisReport'),
            executionDate: translator.translate('executionDate'),
            hostname: translator.translate('hostname'),
            platform: translator.translate('platform'),
            connection: translator.translate('connection'),
            scenarios: translator.translate('scenarios'),
            errors: translator.translate('errors'),
            error: translator.translate('error'),
            scenario: translator.translate('scenario'),
            ecoIndex: translator.translate('ecoIndex'),
            shareDueToActions: translator.translate('shareDueToActions'),
            greenhouseGasesEmission: translator.translate('greenhouseGasesEmission'),
            water: translator.translate('water'),
            bestPracticesToImplement: translator.translate('bestPracticesToImplement'),
            bestPractices: translator.translate('bestPractices'),
            priority: translator.translate('priority'),
            allPriorities: translator.translate('allPriorities'),
            bestPractice: translator.translate('bestPractice'),
            effort: translator.translate('effort'),
            impact: translator.translate('impact'),
            note: translator.translate('note'),
            footerEcoIndex: translator.translate('footerEcoIndex'),
            footerBestPractices: translator.translate('footerBestPractices'),
            trend: translator.translate('trend'),
        },
        tooltips: {
            ecoIndex: translator.translate('tooltip_ecoIndex'),
            shareDueToActions: translator.translate('tooltip_shareDueToActions'),
            bestPracticesToImplement: translator.translate('tooltip_bestPracticesToImplement'),
        },
        values: globalReportVariables,
    };

    const template = fs.readFileSync(path.join(__dirname, 'template/global.html')).toString();
    var rendered = Mustache.render(template, globalReportVariablesWithLabels);
    fs.writeFileSync(outputFile, rendered);

    if (progressBar) {
        progressBar.tick();
    } else {
        console.log(`Global report : ${outputFile} created`);
    }
}

/**
 * Write scenarios report from page template
 */
function writeAllReports(allReportsVariables, outputFolder, progressBar, translator) {
    const labels = {
        requests: translator.translate('requests'),
        pageSize: translator.translate('pageSize'),
        domSize: translator.translate('domSize'),
        steps: translator.translate('steps'),
        step: translator.translate('step'),
        ecoIndex: translator.translate('ecoIndex'),
        water: translator.translate('water'),
        greenhouseGasesEmission: translator.translate('greenhouseGasesEmission'),
        bestPractices: translator.translate('bestPractices'),
        bestPractice: translator.translate('bestPractice'),
        result: translator.translate('result'),
        effort: translator.translate('effort'),
        impact: translator.translate('impact'),
        priority: translator.translate('priority'),
        note: translator.translate('note'),
    };

    const template = fs.readFileSync(path.join(__dirname, 'template/page.html')).toString();
    let reportVariablesWithLabels;
    allReportsVariables.forEach((reportVariables) => {
        reportVariablesWithLabels = {
            labels: labels,
            values: reportVariables,
        };

        var rendered = Mustache.render(template, reportVariablesWithLabels);

        fs.writeFileSync(`${outputFolder}/${reportVariables.filename}`, rendered);

        if (progressBar) {
            progressBar.tick();
        } else {
            console.log(`Global report : ${outputFolder}/${reportVariables.filename} created`);
        }
    });
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
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

module.exports = {
    create_html_report,
};
