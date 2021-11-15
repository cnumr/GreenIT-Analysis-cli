const PuppeteerHar = require('puppeteer-har');
const fs = require('fs')
const path = require('path');
const ProgressBar = require('progress');
const sizes = require('../sizes.js');
const translator = require('./translator.js').translator;

//Path to the url file
const SUBRESULTS_DIRECTORY = path.join(__dirname,'../results');

//Analyse a webpage
async function analyseURL(browser, pageInformations, options) {
    let result = {};

    const TIMEOUT = options.timeout
    const TAB_ID = options.tabId
    const TRY_NB =  options.tryNb || 1
    const DEVICE = options.device || "desktop"
    const PROXY = options.proxy

    try {
        const page = await browser.newPage();

        // configure proxy in page browser
        if (PROXY) {
            await page.authenticate({ username: PROXY.user, password: PROXY.password });
        }

        // configure headers http
        if (options.headers) {
            await page.setExtraHTTPHeaders(options.headers);
        }

        await page.setViewport(sizes[DEVICE]);

        // disabling cache
        await page.setCacheEnabled(false);    

        //get har file
        const pptrHar = new PuppeteerHar(page);
        await pptrHar.start();
        
        try {
            //go to url
            await page.goto(pageInformations.url, {timeout : TIMEOUT});

            // waiting for page to load
            await waitPageLoading(page, pageInformations, TIMEOUT);

            if(pageInformations.actions) {
                // Execute actions on page (click, text, ...)
                await startActions(page, pageInformations.actions, TIMEOUT);
            }


        } finally {
            // Take screenshot (even if the page fails to load)
            if (pageInformations.screenshot) {
                await takeScreenshot(page, pageInformations.screenshot);
            }
        }

        let harObj = await pptrHar.stop();
        //get ressources
        const client = await page.target().createCDPSession();
        let ressourceTree = await client.send('Page.getResourceTree');
        await client.detach()
    
        // replace chrome.i18n.getMessage call by i18n custom implementation working in page 
        // fr is default catalog
        await page.evaluate(language_array =>(chrome = { "i18n" : {"getMessage" : function (message, parameters = []) {
            return language_array[message].replace(/%s/g, function() {
                // parameters is string or array
                return Array.isArray(parameters) ? parameters.shift() : parameters;
            });
        }}}), translator.getCatalog());
        
        //add script, get run, then remove it to not interfere with the analysis
        let script = await page.addScriptTag({ path: path.join(__dirname,'../dist/bundle.js')});
        await script.evaluate(x=>(x.remove()));
        
        //pass node object to browser
        await page.evaluate(x=>(har = x), harObj.log);
        await page.evaluate(x=>(resources = x), ressourceTree.frameTree.resources);
    
        //launch analyse
        result = await page.evaluate(()=>(launchAnalyse()));

        page.close();
        result.success = true;
        result.nbBestPracticesToCorrect = 0;

        // Compute number of times where best practices are not respected
        for (let key in result.bestPractices) {
            if((result.bestPractices[key].complianceLevel || "A") !== "A") {
                result.nbBestPracticesToCorrect++;
            }
        }
    } catch (error) {
        result.success = false;
        console.error(`Error while analyzing URL ${pageInformations.url} : `, error);
    }
    const date = new Date();
    result.date = `${date.toLocaleDateString('fr')} ${date.toLocaleTimeString('fr')}`;
    result.pageInformations = pageInformations;
    result.tryNb = TRY_NB;
    result.tabId = TAB_ID;
    return result;
}

async function waitPageLoading(page, pageInformations, TIMEOUT){
    if (pageInformations.waitForSelector) {
        await page.waitForSelector(pageInformations.waitForSelector, {visible: true, timeout: TIMEOUT})
    } else if (pageInformations.waitForXPath) {
        await page.waitForXPath(pageInformations.waitForXPath, {visible: true, timeout: TIMEOUT})
    } else if (isValidWaitForNavigation(pageInformations.waitForNavigation)) {
        await page.waitForNavigation({waitUntil: pageInformations.waitForNavigation, timeout: TIMEOUT});
    }
}

function isValidWaitForNavigation(waitUntilParam) {
    return waitUntilParam && 
            ("load" === waitUntilParam ||
            "domcontentloaded" === waitUntilParam ||
            "networkidle0" === waitUntilParam ||
            "networkidle2" === waitUntilParam);
}

async function startActions(page, actions, TIMEOUT) {
    for (let index = 0; index < actions.length; index++) {
        let action = actions[index];
        let actionName = action.name || index+1;
        //console.log("Action : " + actionName);
        if(action.timeoutBefore) {
            let timeout = action.timeoutBefore > 0 ? action.timeoutBefore : 0;
            await page.waitForTimeout(timeout);
        }

        if (action.type === "click") {
            await page.click(action.element);
            await waitPageLoading(page, action, TIMEOUT);
        } else if (action.type === "text") {
            await page.type(action.element, action.content, {delay: 100});
            await waitPageLoading(page, action, TIMEOUT);
        } else if (action.type === "select") {
            let args = [action.element].concat(action.values);
            // equivalent to : page.select(action.element, action.values[0], action.values[1], ...)
            await page.select.apply(page, args);
            await waitPageLoading(page, action, TIMEOUT);
        } else if (action.type === "scroll") {
            await scrollToBottom(page);
            await waitPageLoading(page, action, TIMEOUT);
        } else {
            console.log("Unknown action for '" + actionName + "' : " + action.type);
        }
    }
}

async function scrollToBottom(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var distance = 400;
            var timeoutBetweenScroll = 1500;
            var totalHeight = 0;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if(totalHeight >= scrollHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, timeoutBetweenScroll);
        });
    });
}

async function takeScreenshot(page, screenshotPath) {
    // create screenshot folder if not exists
    const folder = path.dirname(screenshotPath);
    if (!fs.existsSync(folder)){
        fs.mkdirSync(folder, { recursive: true });
    }
    // remove old screenshot
    if (fs.existsSync(screenshotPath)) {
        fs.unlinkSync(screenshotPath);
    }
    // take screenshot
    await page.screenshot({path: screenshotPath});
}

//handle login
async function login(browser,loginInformations) {
    //use the tab that opens with the browser
    const page = (await browser.pages())[0];
    //go to login page
    await page.goto(loginInformations.url)
    //ensure page is loaded
    await page.waitForSelector(loginInformations.loginButtonSelector);
    //complete fields
    for (let index = 0; index < loginInformations.fields.length; index++) {
        let field = loginInformations.fields[index]
        await page.type(field.selector, field.value)  
    }
    //click login button
    await page.click(loginInformations.loginButtonSelector);
    //make sure to not wait for the full authentification procedure
    await page.waitForNavigation();
}

//Core
async function createJsonReports(browser, pagesInformations, options, proxy, headers) {
    //Timeout for an analysis
    const TIMEOUT = options.timeout;
    //Concurent tab
    const MAX_TAB = options.max_tab;
    //Nb of retry before dropping analysis
    const RETRY = options.retry;
    //Device to emulate
    const DEVICE = options.device;

    //initialise progress bar
    let progressBar;
    if (!options.ci){
        progressBar = new ProgressBar(' Analysing                [:bar] :percent     Remaining: :etas     Time: :elapseds', {
            complete: '=',
            incomplete: ' ',
            width: 40,
            total: pagesInformations.length+2
        });
        progressBar.tick();
    } else {
        console.log("Analysing ...");
    }

    let asyncFunctions = [];
    let results;
    let resultId = 1;
    let index = 0
    let reports = [];
    let writeList = [];

    let convert = [];

    for (let i = 0; i < MAX_TAB; i++) {
        convert[i] = i;
    }

    //create directory for subresults
    if (fs.existsSync(SUBRESULTS_DIRECTORY)){
        fs.rmdirSync(SUBRESULTS_DIRECTORY, { recursive: true });
    }
    fs.mkdirSync(SUBRESULTS_DIRECTORY);
    //Asynchronous analysis with MAX_TAB open simultaneously to json
    for (let i = 0; i < MAX_TAB && index < pagesInformations.length; i++) {
        asyncFunctions.push(analyseURL(browser,pagesInformations[index],{
            device: DEVICE,
            timeout:TIMEOUT,
            tabId: i,
            proxy: proxy,
            headers: headers
        }));
        index++;
        //console.log(`Start of analysis #${index}/${pagesInformations.length}`)
    }

    while (asyncFunctions.length != 0) {
        results = await Promise.race(asyncFunctions);
        if (!results.success && results.tryNb <= RETRY) {
            asyncFunctions.splice(convert[results.tabId],1,analyseURL(browser,results.pageInformations,{
                device: DEVICE,
                timeout:TIMEOUT,
                tabId: results.tabId,
                tryNb: results.tryNb + 1,
                proxy: proxy,
                headers: headers
            })); // convert is NEEDED, variable size array
        }else{
            let filePath = path.resolve(SUBRESULTS_DIRECTORY,`${resultId}.json`)
            writeList.push(fs.promises.writeFile(filePath, JSON.stringify(results)));
            reports.push({name:`${resultId}`, path: filePath});
            //console.log(`End of an analysis (${resultId}/${pagesInformations.length}). Results will be saved in ${filePath}`);
            if (progressBar){
                progressBar.tick()
            } else {
                console.log(`${resultId}/${pagesInformations.length}`);
            }
            resultId++;
            if (index == (pagesInformations.length)){
                asyncFunctions.splice(convert[results.tabId],1); // convert is NEEDED, varialbe size array
                for (let i = results.tabId+1; i < convert.length; i++) {
                    convert[i] = convert[i]-1;
                }
            } else {
                asyncFunctions.splice(results.tabId,1,analyseURL(browser,pagesInformations[index],{
                    device: DEVICE,
                    timeout:TIMEOUT,
                    tabId: results.tabId,
                    proxy: proxy,
                    headers: headers
                })); // No need for convert, fixed size array
                index++;
                //console.log(`Start of analysis #${index}/${pagesInformations.length}`)
            }
        }
    }

    //wait for all file to be written
    await Promise.all(writeList);
    //results to xlsx file
    if (progressBar){
        progressBar.tick()
    } else {
        console.log("Analyse done");
    }
    return reports
}

module.exports = {
    createJsonReports,
    login
}