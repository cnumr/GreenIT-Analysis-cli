const fs = require('fs');
const path = require('path');
const { getEcoIndexGrade, getGradeEcoIndex, createProgressBar } = require('./utils');

//Path to the url file
const SUBRESULTS_DIRECTORY = path.join(__dirname, '../results');

// keep track of worst pages based on ecoIndex
function worstPagesHandler(number) {
    return (obj, table) => {
        let index;
        for (index = 0; index < table.length; index++) {
            if (obj.ecoIndex < table[index].ecoIndex) break;
        }
        let addObj = {
            nb: obj.nb,
            url: obj.pageInformations.url,
            grade: obj.grade,
            ecoIndex: obj.ecoIndex,
        };
        table.splice(index, 0, addObj);
        if (table.length > number) table.pop();
        return table;
    };
}

//keep track of the least followed rule based on grade
function handleWorstRule(bestPracticesTotal, number) {
    let table = [];
    for (let key in bestPracticesTotal) {
        table.push({ name: key, total: bestPracticesTotal[key] });
    }
    return table
        .sort((a, b) => a.total - b.total)
        .slice(0, number)
        .map((obj) => obj.name);
}

async function create_global_report(reports, options, translator) {
    //Timeout for an analysis
    const TIMEOUT = options.timeout || 'No data';
    //Concurent tab
    const MAX_TAB = options.max_tab || 'No data';
    //Nb of retry before dropping analysis
    const RETRY = options.retry || 'No data';
    //Nb of displayed worst pages
    const WORST_PAGES = options.worst_pages;
    //Nb of displayed worst rules
    const WORST_RULES = options.worst_rules;

    const DEVICE = options.device;
    const LANGUAGE = options.language;

    let handleWorstPages = worstPagesHandler(WORST_PAGES);

    //initialise progress bar
    const progressBar = createProgressBar(
        options,
        reports.length + 2,
        'Create Global report',
        'Creating global report ...'
    );

    let eco = 0; //future average
    let worstEcoIndexes = [null, null];
    let err = [];
    let hostname;
    let worstPages = [];
    let bestPracticesTotal = {};
    let nbBestPracticesToCorrect = 0;

    //Creating one report sheet per file
    reports.forEach((file) => {
        let obj = JSON.parse(fs.readFileSync(file.path).toString());
        if (!hostname) hostname = obj.pageInformations.url.split('/')[2];
        obj.nb = parseInt(file.name);
        //handle potential failed analyse
        if (obj.success) {
            eco += obj.ecoIndex;
            const pageWorstEcoIndexes = getWorstEcoIndexes(obj);
            if (!worstEcoIndexes[0] || worstEcoIndexes[0].ecoIndex > pageWorstEcoIndexes[0].ecoIndex) {
                // update global worst ecoindex
                worstEcoIndexes[0] = { ...pageWorstEcoIndexes[0] };
            }
            if (!worstEcoIndexes[1] || worstEcoIndexes[1].ecoIndex > pageWorstEcoIndexes[1].ecoIndex) {
                // update global worst ecoindex
                worstEcoIndexes[1] = { ...pageWorstEcoIndexes[1] };
            }

            nbBestPracticesToCorrect += obj.nbBestPracticesToCorrect;
            handleWorstPages(obj, worstPages);
            obj.pages.forEach((page) => {
                if (page.bestPractices) {
                    for (let key in page.bestPractices) {
                        bestPracticesTotal[key] = bestPracticesTotal[key] || 0;
                        bestPracticesTotal[key] += getGradeEcoIndex(page.bestPractices[key].complianceLevel || 'A');
                    }
                }
            });
        } else {
            err.push({
                nb: obj.nb,
                url: obj.pageInformations.url,
                grade: obj.grade,
                ecoIndex: obj.ecoIndex,
            });
        }
        if (progressBar) progressBar.tick();
    });

    let proxy = null;
    if (options.proxy?.server) {
        const { protocol, hostname: host, port } = new URL(options.proxy.server);
        const { user, password } = options.proxy;
        const auth = user && password ? { username: user, password } : undefined;
        proxy = {
            protocol: protocol.slice(0, -1),
            host,
            port,
            auth,
        };
    }
    //Add info the recap sheet
    //Prepare data
    const date = new Date();
    eco = reports.length - err.length != 0 ? Math.round(eco / (reports.length - err.length)) : 'No data'; //Average EcoIndex
    let globalSheet_data = {
        date: `${date.toLocaleDateString(LANGUAGE)} ${date.toLocaleTimeString(LANGUAGE)}`,
        hostname: hostname,
        device: DEVICE,
        connection: options.mobile ? translator.translate('mobile') : translator.translate('wired'),
        grade: getEcoIndexGrade(eco),
        ecoIndex: eco,
        worstEcoIndexes: worstEcoIndexes,
        nbScenarios: reports.length,
        timeout: parseInt(TIMEOUT),
        maxTab: parseInt(MAX_TAB),
        retry: parseInt(RETRY),
        errors: err,
        worstPages: worstPages,
        worstRules: handleWorstRule(bestPracticesTotal, WORST_RULES),
        nbBestPracticesToCorrect: nbBestPracticesToCorrect,
    };

    if (progressBar) progressBar.tick();

    //save report
    let filePath = path.join(SUBRESULTS_DIRECTORY, 'globalReport.json');
    try {
        fs.writeFileSync(filePath, JSON.stringify(globalSheet_data));
    } catch (error) {
        throw ` Global report : Path "${filePath}" cannot be reached.`;
    }
    return {
        globalReport: {
            name: 'Global Report',
            path: filePath,
        },
        reports,
    };
}

function getWorstEcoIndexes(obj) {
    let worstEcoIndexes = [null, null];
    obj.pages.forEach((page) => {
        worstEcoIndexes = worstEcoIndexes.map((worstEcoIndex, i) => {
            if (page.actions.length === 1 || i === 0) {
                // first = last if only one value, otherwise return value of first action
                return getWorstEcoIndex(page.actions[0].ecoIndex, worstEcoIndex);
            } else if (i === 1) {
                // return value of last action
                if (page.actions[page.actions.length - 1].ecoIndex) {
                    return getWorstEcoIndex(page.actions[page.actions.length - 1].ecoIndex, worstEcoIndex);
                }
            }
            return worstEcoIndex;
        });
    });

    return worstEcoIndexes.map((worstEcoIndex) => ({
        ecoIndex: worstEcoIndex,
        grade: getEcoIndexGrade(worstEcoIndex),
    }));
}

function getWorstEcoIndex(current, worst) {
    if (!worst || worst > current) {
        worst = current;
    }
    return worst;
}

module.exports = {
    create_global_report,
};
