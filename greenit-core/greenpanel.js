/*
 *  Copyright (C) 2019  didierfred@gmail.com 
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU Affero General Public License as published
 *  by the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU Affero General Public License for more details.
 *
 *  You should have received a copy of the GNU Affero General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

const utils = require('./utils.js');
const {start_analyse_core} = require("./analyseFrameCore");
const {
    computeEcoIndex, computeWaterConsumptionfromEcoIndex, computeGreenhouseGasesEmissionfromEcoIndex,
    getEcoIndexGrade
} = require("./ecoIndex");
const {isNetworkResource, isDataResource} = require("./utils");
const {registerAddExpiresOrCacheControlHeaders} = require("./rules/AddExpiresOrCacheControlHeaders");
const {registerCompressHttp} = require("./rules/CompressHttp");
const {registerDontResizeImageInBrowser} = require("./rules/DontResizeImageInBrowser");
const {registerDomainsNumber} = require("./rules/DomainsNumber");
const {registerEmptySrcTag} = require("./rules/EmptySrcTag");
const {registerExternalizeCss} = require("./rules/ExternalizeCss");
const {registerExternalizeJs} = require("./rules/ExternalizeJs");
const {registerHttpError} = require("./rules/HttpError");
const {registerHttpRequests} = require("./rules/HttpRequests");
const {registerImageDownloadedNotDisplayed} = require("./rules/ImageDownloadedNotDisplayed");
const {registerJsValidate} = require("./rules/JsValidate");
const {registerMaxCookiesLength} = require("./rules/MaxCookiesLength");
const {registerMinifiedCss} = require("./rules/MinifiedCss");
const {registerMinifiedJs} = require("./rules/MinifiedJs");
const {registerNoCookieForStaticRessources} = require("./rules/NoCookieForStaticRessources");
const {registerNoRedirect} = require("./rules/NoRedirect");
const {registerOptimizeBitmapImages} = require("./rules/OptimizeBitmapImages");
const {registerOptimizeSvg} = require("./rules/OptimizeSvg");
const {registerPlugins} = require("./rules/Plugins");
const {registerPrintStyleSheet} = require("./rules/PrintStyleSheet");
const {registerSocialNetworkButton} = require("./rules/SocialNetworkButton");
const {registerStyleSheets} = require("./rules/StyleSheets");
const {registerUseETags} = require("./rules/UseETags");
const {registerUseStandardTypefaces} = require("./rules/UseStandardTypefaces");
const RulesManager = require('./rulesManager.js').RulesManager

let backgroundPageConnection;
let currentRulesChecker;
let lastAnalyseStartingTime = 0;
let measuresAcquisition;
let analyseBestPractices = true;

function handleResponseFromBackground(frameMeasures) {
    if (isOldAnalyse(frameMeasures.analyseStartingTime)) {
        utils.debug(() => `Analyse is too old for url ${frameMeasures.url} , time = ${frameMeasures.analyseStartingTime}`);
        return;
    }
    measuresAcquisition.aggregateFrameMeasures(frameMeasures);
}


function computeEcoIndexMeasures(measures) {
    measures.ecoIndex = computeEcoIndex(measures.domSize, measures.nbRequest, Math.round(measures.responsesSize / 1000));
    measures.waterConsumption = computeWaterConsumptionfromEcoIndex(measures.ecoIndex);
    measures.greenhouseGasesEmission = computeGreenhouseGasesEmissionfromEcoIndex(measures.ecoIndex);
    measures.grade = getEcoIndexGrade(measures.ecoIndex);
}

function registerRules(rulesManager) {
    registerAddExpiresOrCacheControlHeaders(rulesManager)
    registerCompressHttp(rulesManager)
    registerDontResizeImageInBrowser(rulesManager)
    registerDomainsNumber(rulesManager)
    registerEmptySrcTag(rulesManager)
    registerExternalizeCss(rulesManager)
    registerExternalizeJs(rulesManager)
    registerHttpError(rulesManager)
    registerHttpRequests(rulesManager)
    registerImageDownloadedNotDisplayed(rulesManager)
    registerJsValidate(rulesManager)
    registerMaxCookiesLength(rulesManager)
    registerMinifiedCss(rulesManager)
    registerMinifiedJs(rulesManager)
    registerNoCookieForStaticRessources(rulesManager)
    registerNoRedirect(rulesManager)
    registerOptimizeBitmapImages(rulesManager)
    registerOptimizeSvg(rulesManager)
    registerPlugins(rulesManager)
    registerPrintStyleSheet(rulesManager)
    registerSocialNetworkButton(rulesManager)
    registerStyleSheets(rulesManager)
    registerUseETags(rulesManager)
    registerUseStandardTypefaces(rulesManager)
}

async function launchAnalyse(document, har, resources) {

    let now = Date.now();

    // // To avoid parallel analyse , force 1 secondes between analysis
    // if (now - lastAnalyseStartingTime < 1000) {
    //     utils.debug(() => "Ignore click");
    //     return;
    // }

    lastAnalyseStartingTime = now;
    let rulesManager = new RulesManager()
    registerRules(rulesManager);
    currentRulesChecker = rulesManager.getNewRulesChecker();
    measuresAcquisition = new MeasuresAcquisition(currentRulesChecker);
    measuresAcquisition.initializeMeasures();
    measuresAcquisition.aggregateFrameMeasures(start_analyse_core(document, analyseBestPractices))
    measuresAcquisition.startMeasuring(har, resources);
    let returnObj = measuresAcquisition.getMeasures();

    returnObj.bestPractices = measuresAcquisition.getBestPractices()

    return returnObj;
}

function MeasuresAcquisition(rules) {

    let measures;
    let localRulesChecker = rules;
    let nbGetHarTry = 0;

    this.initializeMeasures = () => {
        measures = {
            "url": "",
            "domSize": 0,
            "nbRequest": 0,
            "responsesSize": 0,
            "responsesSizeUncompress": 0,
            "ecoIndex": 100,
            "grade": 'A',
            "waterConsumption": 0,
            "greenhouseGasesEmission": 0,
            "pluginsNumber": 0,
            "printStyleSheetsNumber": 0,
            "inlineStyleSheetsNumber": 0,
            "emptySrcTagNumber": 0,
            "inlineJsScriptsNumber": 0,
            "imagesResizedInBrowser": []
        };
    }

    this.startMeasuring = function (har, resources) {
        getNetworkMeasure(har);
        if (analyseBestPractices) getResourcesMeasure(resources);
    }

    this.getMeasures = () => measures;

    this.getBestPractices = () => Object.fromEntries(localRulesChecker.getAllRules())

    this.aggregateFrameMeasures = function (frameMeasures) {
        measures.domSize += frameMeasures.domSize;
        computeEcoIndexMeasures(measures);

        if (analyseBestPractices) {
            measures.pluginsNumber += frameMeasures.pluginsNumber;

            measures.printStyleSheetsNumber += frameMeasures.printStyleSheetsNumber;
            if (measures.inlineStyleSheetsNumber < frameMeasures.inlineStyleSheetsNumber) measures.inlineStyleSheetsNumber = frameMeasures.inlineStyleSheetsNumber;
            measures.emptySrcTagNumber += frameMeasures.emptySrcTagNumber;
            if (frameMeasures.inlineJsScript.length > 0) {
                const resourceContent = {
                    url: "inline js",
                    type: "script",
                    content: frameMeasures.inlineJsScript
                }
                localRulesChecker.sendEvent('resourceContentReceived', measures, resourceContent);
            }
            if (measures.inlineJsScriptsNumber < frameMeasures.inlineJsScriptsNumber) measures.inlineJsScriptsNumber = frameMeasures.inlineJsScriptsNumber;

            measures.imagesResizedInBrowser = frameMeasures.imagesResizedInBrowser;

            localRulesChecker.sendEvent('frameMeasuresReceived', measures);

        }
    }


    const getNetworkMeasure = (har) => {

        // only account for network traffic, filtering resources embedded through data urls
        let entries = har.entries.filter(entry => isNetworkResource(entry));

        // Get the "mother" url
        if (entries.length > 0) measures.url = entries[0].request.url;
        else {
            // Bug with firefox  when we first get har.entries when starting the plugin , we need to ask again to have it
            if (nbGetHarTry < 1) {
                utils.debug(() => 'No entries, try again to get HAR in 1s');
                nbGetHarTry++;
                setTimeout(getNetworkMeasure, 1000);
            }
        }

        measures.entries = entries;
        measures.dataEntries = har.entries.filter(entry => isDataResource(entry)); // embeded data urls

        if (entries.length) {
            measures.nbRequest = entries.length;
            entries.forEach(entry => {


                // If chromium :
                // _transferSize represent the real data volume transfert
                // while content.size represent the size of the page which is uncompress
                if (entry.response._transferSize) {
                    measures.responsesSize += entry.response._transferSize;
                    measures.responsesSizeUncompress += entry.response.content.size;
                } else {
                    // In firefox , entry.response.content.size can sometimes be undefined
                    if (entry.response.content.size) measures.responsesSize += entry.response.content.size;
                    //debug(() => `entry size = ${entry.response.content.size} , responseSize = ${measures.responsesSize}`);
                }
            });
            if (analyseBestPractices) localRulesChecker.sendEvent('harReceived', measures);

            computeEcoIndexMeasures(measures);

        }
    }

    function getResourcesMeasure(resources) {
        resources.forEach(resource => {
            if (resource.url.startsWith("file") || resource.url.startsWith("http")) {
                if ((resource.type === 'script') || (resource.type === 'stylesheet') || (resource.type === 'image')) {
                    let resourceAnalyser = new ResourceAnalyser(resource);
                    resourceAnalyser.analyse();
                }
            }
        });
    }

    function ResourceAnalyser(resource) {
        let resourceToAnalyse = resource;

        this.analyse = () => resourceToAnalyse.getContent(this.analyseContent);

        this.analyseContent = (code) => {
            // exclude from analyse the injected script
            if ((resourceToAnalyse.type === 'script') && (resourceToAnalyse.url.includes("script/analyseFrame.js"))) return;

            let resourceContent = {
                url: resourceToAnalyse.url,
                type: resourceToAnalyse.type,
                content: code
            };
            localRulesChecker.sendEvent('resourceContentReceived', measures, resourceContent);

        }
    }

}

/**
 Add to the history the result of an analyse
 **/
function storeAnalysisInHistory() {
    let measures = measuresAcquisition.getMeasures();
    if (!measures) return;

    var analyse_history = [];
    var string_analyse_history = localStorage.getItem("analyse_history");
    var analyse_to_store = {
        resultDate: new Date(),
        url: measures.url,
        nbRequest: measures.nbRequest,
        responsesSize: Math.round(measures.responsesSize / 1000),
        domSize: measures.domSize,
        greenhouseGasesEmission: measures.greenhouseGasesEmission,
        waterConsumption: measures.waterConsumption,
        ecoIndex: measures.ecoIndex,
        grade: measures.grade
    };

    if (string_analyse_history) {
        analyse_history = JSON.parse(string_analyse_history);
        analyse_history.reverse();
        analyse_history.push(analyse_to_store);
        analyse_history.reverse();
    } else analyse_history.push(analyse_to_store);


    localStorage.setItem("analyse_history", JSON.stringify(analyse_history));
}

module.exports = {
    launchAnalyse
}