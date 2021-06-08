const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');
const TemplateEngine = require('thymeleaf');
const translator = require('./translator.js').translator;

/**
 * Icon converted to base64
 */
const encodedIcons = {
    // icons/A.png
    A : 'iVBORw0KGgoAAAANSUhEUgAAABMAAAAPCAYAAAAGRPQsAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4gweFDsRr0MZ4gAAAtFJREFUOMuVk81v1GUQxz/zPMuvu912MShqgWyiYgyXpsY3kvpSFVPKtrhsyy4FFLOJNdYDiScvpH8CoVKjBoqhlLLaArUFTaMhknDgJSEhoVDqAZtwEWvSNrDdl+cZL0jYmJjsXGYOM598JzNfqDLaRncA0D2Uta+Mb3kiPdWzWr9QAEy1sJ+6TqAo87VLPVa4e7fw15306z2tAFINaEtuF2czw7wzur23EFne76UcCBDyNX/XLofbHir77vpQRf7PeicynM0M0/b9zmwxvDygUg4MHoel7EurSkFpozSPJLjQfYamg832+Q0b1tyen1u8nJ5aAEgc34aTMD93jwCwOZfOLkbzh9WWVRVRMVin1Jqa23EbTz1Ys1HeGFv3aSlgQJzOBUXb9lt6cvpfVYqy6Yd0byGSH1DjFVQURVWo8dHZuF+TOfp+/1XZfmyPnY8sfFwISgdcyAVGDZS5GcqbrvOZyesA743t6F0O7u13xgWIgioeoc7Vz8RNQ2qw/cD027lOZOPh1loTk5NEpVUUvIBR0KL8YRZsU10ksm0pmh/0xmHUoyKoCnWu/veYj7aMJQfv2L7VXNx3DvlTr8nu8b72e7ZwVK15zEsZoxbEY0osYm3Mi1ejKmWj4A1hDW6tl3jyUKL/xqNHMk9Ko04lT02Ei5HPxLkF6w2qHrzgrcQ8HlTFC6CGsF9x65nyul2HEv03bN/jFRc3zYMJAH7tHDtu8+EucepUHv1lBQGnwkpXN9tQemrrkeTBK899+SIX952rhF3InqEjlwHgfPrUL/U+9pYt6n3EP2ixOIWYj86srWnYNJL6duaFr15jpHeIl0ONFbAKB+ye+IRjHd+w+XTmw6UV94+gGJESIR+eXVt6umM49fXMJXeNV21jdR5sP73n8zcnE3MtE8mrH/249yWAluGt1UE+GN/7sG4d3dnUeTL7LMC7uRSXytP/O/sP/dcsxHBZL+8AAAAASUVORK5CYII=',
    // icons/B.png
    B : 'iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4wsGFCo4UvnSWwAAAwJJREFUKM9Fkk9sVHUcxD/f39v39i272y5dTXugpEVsFyitwdZKpAiFEhM1xHjRAxcVUDCpMR6Ug3/wZgyEbawxaiKJjTGKYjmARqQRNRK1EtM0SlpbtUhL24Utpd332/d+Pw+1Ya6TmUlmBv7H8DvNyYnjddUT515dCfBbQxOF67PLNBePNCQvf9hYM3i0KQkwOfE3CmCkb0ttwglOKzGTwVhf76nDG1PNl4YYymQB+CW/IZtKms9UsHAlk9JfDPQ+VF2zajVy8a21yXRC+iv9oFPKFly4oeOfjxdX7d3WPTB78uWt/l21E/2pZNiFNognzGvv5Oh0/AmVydZUulG50wkjxLWgDSnRj9SmL/c0bH0h1lz/7/m0V+5ywgiLYLUlbsqbs8ngDjU2VZxZIJYPIzBlBZ5CuYaMU3r87J6PpyriutVaS2QE5YGI6IKpeK/lwOjPzvEzV6OO+7YPVHmz1a4K73ZiFqNBsHgxEkQGEYUSiEJMYcF9Zd3+S68BOL+23MPOvq/D2+tavqqv0FW+r9scyy2IwlpLKXJ1cVHtzx0czwN8l2tDCjdm+T6d5WGAzX+qf/bdP71CTNWyUFgqsVhyv71SquxafWBEX93ezqZzZ5HlgE9eb/c3VRfOr0wttkZawAXXWIwDVluUgpn5WM91lXu+7ekvw+G6HA7Ahbc3Zu9MF09kUqUOyiCeoMRiQotVAkYAZf0Vpt1Ri0071qj+Laf/CmWkb1eF3Bz7tDIVLO0oS6k6iBFGnPAd/aijxFpEsAalYC7wPpgpVjynzMJI3CXocsSiBJQYjCaaK/PUVLz+sWumutdaK4IFURir8HzzoO+WcqqgM8XAJo6WAyGKCVHM0dPl9BuN+8beT+z5Jmx4cvDZmaJ3LLKyZBxT5ua8fLSh+48L6t6Dg7r/99tenC/7PWGJ0ak59/D6vcOHAMwDuwHsZLTtUFEn3g2UO3KtKMfWPjPevXT6dS0A5F/aGf/hyJrG5fZ/2rELgKG2TgBOvbk7+WN+/S2+tYP/AN18S2VvWJduAAAAAElFTkSuQmCC',
    // icons/C.png
    C : 'iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH4gweFDs2CkmsiQAAAu9JREFUKM9FkU1oXGUUhp/z3Ts/mclfE81EiElszGQyTpLSJC0SKzHNiGAkKAiCuFAUN+LC4kpBXbixqJhCF4ILQSko1hgXElEyWkMpalLbWEk7qcVGmx8zTUjbzNy59zsuktQDZ3NeXp5z3gM7daGrN77Ysjex+ObbewDOJTMU1td2ZWaT++L/JDONM5kDcYClxb8wAPmBwbtjpfI3TqBL3iefHp/o6qvsvjjHXG09AL/ct7++KiifNLeK12pLW1/lRp5INDY1I2fvTcer0YnqUnlI1AABm1H3yytNrS8M5ibXxh8cie5bXJioKpezqiAoN8Kh8Xw0/JypTTTUuL4OOVYQfFCXypJ9vHnx6rHkkSNu998Lp6q8ctZYQdnuSDm4/46S1yZTXd3hu7b8o/Vb5ZfFCKIBgqIYbokUYtg6VQFAsEDIW66JHU3/Pvu68/HKcnBo8HCurlBIhHy/10GxGEQhrFSggohgFAIRWwi5b3RePP8WgDPbc4Dh3KR/Z0/Xt/d4Whf1iv3ODmkHhwLFkOOtG/fF1JU/xgB+SvUjhc01pqvqeQzgt8vm6kh2NWalbtco2ymxEXJ/vFYTyzafveStPHSQ/VPfcxvx+cGBaO/axqna4lZfgAFRQhasKKoGg/Kv6xxbT3W+0j857l9oTW2bz3R11zfc9E/UeKUs6qLiI4Cqg0oACIKoaiCblfGT565vPT26ki86+exIdeVq4bNqz8vq9p4AlN0wJdf5wvU17QgKiGCo8LzOPVG36ZmWdM7YhXzE9byso4pRxViDFRNsiH1+uS3x1PXGhuNqrWzfrlgRwmofjRRvpsxabc2GF42+X5YQgUDgWG+1KvZOx5/zH1V8N+UnZ6ZfWo3EPghEMFaxJrA3xJzIzM+cAeDdgQfCl9szY0tN7fm5ts7XdkM8/8goAD88+2psob3nw6WW5KX51vR7t9/4a2cPAGPDw5HpvR0du/OfDz8MwFz/EABfjz4ZP53O/K/3HeI/3gY8SBA1nqkAAAAASUVORK5CYII='
}

//create html report for all the analysed pages and recap on the first sheet
async function create_html_report(reportObject,options){
    //Path of the output file
    const OUTPUT_FILE = path.resolve(options.report_output_file);
    if (!OUTPUT_FILE.toLowerCase().endsWith('.html')) {
        throw ` report_output_file : File "${OUTPUT_FILE}" does not end with the ".html" extension.`
    }

    const fileList = reportObject.reports;
    const globalReport = reportObject.globalReport;

    //initialise progress bar
    let progressBar;
    if (!options.ci){
        progressBar = new ProgressBar(' Create HTML report       [:bar] :percent     Remaining: :etas     Time: :elapseds', {
            complete: '=',
            incomplete: ' ',
            width: 40,
            total: fileList.length+2
        });
        progressBar.tick()
    } else {
        console.log('Creating HTML report ...');
    }
    
    // Read all reports
    const allReportsVariables = readAllReports(fileList);

    // Read global report
    const globalReportVariables = readGlobalReport(globalReport.path, allReportsVariables);

    // write global report
    const templateEngine = new TemplateEngine.TemplateEngine(); 
    writeGlobalReport(templateEngine, globalReportVariables, OUTPUT_FILE);

    // write all reports
    const outputFolder = path.dirname(OUTPUT_FILE);
    writeAllReports(templateEngine, allReportsVariables, outputFolder)
}

function readAllReports(fileList) {
    let allReportsVariables = [];
    let reportVariables = {};
    fileList.forEach((file)=>{
        let report_data = JSON.parse(fs.readFileSync(file.path).toString());
        const pageName = report_data.pageInformations.name || report_data.pageInformations.url;
        const pageFilename = report_data.pageInformations.name ? `${removeForbiddenCharacters(report_data.pageInformations.name)}.html` : `${report_data.tabId}.html`;

        if (report_data.success) {
            let bestPractices = extractBestPractices(report_data.bestPractices);
            reportVariables = {
                date: report_data.date,
                success: report_data.success,
                cssRowError: '',
                name: pageName,
                link: `<a href="${pageFilename}">${pageName}</a>`,
                filename: pageFilename,
                header: `GreenIT-Analysis report > <a class="text-white" href="${report_data.pageInformations.url}">${pageName}</a>`,
                bigEcoIndex: `${report_data.ecoIndex} <span class="grade big-grade ${report_data.grade}">${report_data.grade}</span>`,
                smallEcoIndex: `${report_data.ecoIndex} <span class="grade ${report_data.grade}">${report_data.grade}</span>`,
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
                cssRowError: 'bg-danger',
                name: pageName,
                link: `<a href="${pageFilename}">${pageName}</a>`,
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
    const hasWorstRules = globalReport_data.worstRules?.length > 0 ? true : false;
    const globalReportVariables = {
        date: globalReport_data.date,
        hostname: globalReport_data.hostname,
        device: globalReport_data.device,
        connection: globalReport_data.connection,
        ecoIndex: `${globalReport_data.ecoIndex} <span class="grade big-grade ${globalReport_data.grade}">${globalReport_data.grade}</span>`,
        grade: globalReport_data.grade,
        nbBestPracticesToCorrect: globalReport_data.nbBestPracticesToCorrect,
        nbPages: globalReport_data.nbPages,
        nbErrors: globalReport_data.errors.length,
        allReportsVariables,
        worstRulesHeader: hasWorstRules ? `Top ${globalReport_data.worstRules.length} des règles à corriger` : '',
        worstRules: hasWorstRules ? globalReport_data.worstRules.map((worstRule, index) => `#${index+1} ${translator.translateRule(worstRule)}`) : '',
        cssTablePagesSize: hasWorstRules ? 'col-md-9' : 'col-md-12'
    };
    return globalReportVariables;
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
            name: translator.translateRule(key),
            comment: bestPracticesFromReport[key].comment || '',
            iconGrade: `data:image/png;base64,${encodedIcons[bestPracticesFromReport[key].complianceLevel || 'A']}`
        };
        bestPractices.push(bestPractice);
    })

    return bestPractices;
}

function writeGlobalReport(templateEngine, globalReportVariables, outputFile) {
    templateEngine.processFile('cli-core/template/global.html', globalReportVariables)
    .then(globalReportHtml => {
        fs.writeFileSync(outputFile, globalReportHtml);
    })
    .catch(error => {
        console.log("Error while reading HTML global template : ", error)
    });
}

function writeAllReports(templateEngine, allReportsVariables, outputFolder) {
    allReportsVariables.forEach(reportVariables => {
        templateEngine.processFile('cli-core/template/page.html', reportVariables)
        .then(singleReportHtml => {
            fs.writeFileSync(`${outputFolder}/${reportVariables.filename}`, singleReportHtml);
        })
        .catch(error => {
            console.log(`Error while reading HTML template ${reportVariables.filename} : `, error)
        });
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
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

module.exports = {
    create_html_report
}