const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const axios = require('axios');

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

async function create_global_report(reports, options) {
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

    let handleWorstPages = worstPagesHandler(WORST_PAGES);

    //initialise progress bar
    let progressBar;
    if (!options.ci) {
        progressBar = new ProgressBar(
            ' Create Global report     [:bar] :percent     Remaining: :etas     Time: :elapseds',
            {
                complete: '=',
                incomplete: ' ',
                width: 40,
                total: reports.length + 2,
            }
        );
        progressBar.tick();
    } else {
        console.log('Creating global report ...');
    }

    let err = [];
    let hostname;
    let worstPages = [];
    let bestPracticesTotal = {};
    //Creating one report sheet per file
    reports.forEach((file) => {
        let obj = JSON.parse(fs.readFileSync(file.path).toString());
        if (!hostname) hostname = obj.pageInformations.url.split('/')[2];
        obj.nb = parseInt(file.name);
        //handle potential failed analyse
        if (obj.success) {
            handleWorstPages(obj, worstPages);
            for (let key in obj.bestPractices) {
                bestPracticesTotal[key] = bestPracticesTotal[key] || 0;
                bestPracticesTotal[key] += getGradeEcoIndex(obj.bestPractices[key].complianceLevel || 'A');
            }
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
    let isMobile = DEVICE !== 'desktop';
    try {
        isMobile = (await axios.get('http://ip-api.com/json/?fields=mobile', { proxy }))?.data?.mobile ?? isMobile; //get connection type
    } catch (error) {
        console.error(
            `WARN - Unable to get the connection type from http://ip-api.com (default value for isMobile will be: ${isMobile}): ${error}`
        );
    }
    const date = new Date();
    let globalSheet_data = {
        date: `${date.toLocaleDateString('fr')} ${date.toLocaleTimeString('fr')}`,
        hostname: hostname,
        device: DEVICE,
        connection: isMobile ? 'Mobile' : 'Filaire',
        nbPages: reports.length,
        timeout: parseInt(TIMEOUT),
        maxTab: parseInt(MAX_TAB),
        retry: parseInt(RETRY),
        errors: err,
        worstPages: worstPages,
        worstRules: handleWorstRule(bestPracticesTotal, WORST_RULES),
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

//Grade -> EcoIndex
function getGradeEcoIndex(grade) {
    if (grade == 'A') return 75;
    if (grade == 'B') return 65;
    if (grade == 'C') return 50;
    if (grade == 'D') return 35;
    if (grade == 'E') return 20;
    if (grade == 'F') return 5;
    return 0;
}

module.exports = {
    create_global_report,
};
