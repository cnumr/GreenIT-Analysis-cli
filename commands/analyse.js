const fs = require('fs');
const YAML = require('yaml');
const path = require('path');
const puppeteer = require('puppeteer');
const createJsonReports = require('../cli-core/analysis.js').createJsonReports;
const login = require('../cli-core/analysis.js').login;
const create_global_report = require('../cli-core/reportGlobal.js').create_global_report;
const create_XLSX_report = require('../cli-core/reportExcel.js').create_XLSX_report;
const create_html_report = require('../cli-core/reportHtml.js').create_html_report;
const writeToInflux = require("../cli-core/influxdb").write;

//launch core
async function analyse_core(options) {
    const URL_YAML_FILE = path.resolve(options.url_input_file);
    //Get list of pages to analyze and its informations
    let pagesInformations;
    try {
        pagesInformations = YAML.parse(fs.readFileSync(URL_YAML_FILE).toString());
    } catch (error) {
        throw ` url_input_file : "${URL_YAML_FILE}" is not a valid YAML file.`
    }

    let browserArgs = [
        "--no-sandbox",                 // can't run inside docker without
        "--disable-setuid-sandbox"      // but security issues
    ]

    // Add proxy conf in browserArgs
    let proxy = {};
    if(options.proxy) {
        proxy = readProxy(options.proxy);
    }

    // Read headers http file
    let headers;
    if (options.headers) {
        headers = readHeaders(options.headers);
    }

    // Get and check report format
    const reportFormat = getReportFormat(options.format, options.report_output_file);
    if (!reportFormat) {
        throw 'Format not supported. Use --format option or report file extension to define a supported extension.'
    }

    //start browser
    const browser = await puppeteer.launch({
        headless: true,
        args: browserArgs,
        // Keep gpu horsepower in headless
        ignoreDefaultArgs: [
            '--disable-gpu'
        ]
    });
    //handle analyse
    let reports;
    try {
        //handle login
        if (options.login){
            const LOGIN_YAML_FILE = path.resolve(options.login);
            let loginInfos;
            try {
                loginInfos = YAML.parse(fs.readFileSync(LOGIN_YAML_FILE).toString());
            } catch (error) {
                throw ` --login : "${LOGIN_YAML_FILE}" is not a valid YAML file.`
            }
            //console.log(loginInfos)
            await login(browser, loginInfos, options)
        }
        //analyse
        reports = await createJsonReports(browser, pagesInformations, options, proxy, headers);
    } finally {
        //close browser
        await browser.close()
    }
    //create report
    let reportObj = await create_global_report(reports, options);
    if (reportFormat === 'html') {
        await create_html_report(reportObj, options);
    } else if (reportFormat === 'influxdb') {
        await writeToInflux(reports, options);
    }
    else {
        await create_XLSX_report(reportObj, options);
    }
    
}

function readProxy(proxyFile) {
    const PROXY_FILE = path.resolve(proxyFile);
    let proxy;
    try {
        proxy = YAML.parse(fs.readFileSync(PROXY_FILE).toString());
        if (!proxy.server || !proxy.user || !proxy.password) {
            throw `proxy_config_file : Bad format "${PROXY_FILE}". Expected server, user and password.`
        }
        browserArgs.push(`--proxy-server=${proxy.server}`);
    } catch (error) {
        throw ` proxy_config_file : "${PROXY_FILE}" is not a valid YAML file.`
    }
    return proxy;
}

function readHeaders(headersFile) {
    const HEADERS_YAML_FILE = path.resolve(headersFile);
    let headers;
    try {
        headers = YAML.parse(fs.readFileSync(HEADERS_YAML_FILE).toString());
    } catch (error) {
        throw ` --headers : "${HEADERS_YAML_FILE}" is not a valid YAML file.`
    }
    return headers;
}

function getReportFormat(format, filename) {
    // Check if format is defined
    const formats = ['xlsx', 'html', 'influxdb'];
    if (format && formats.includes(format.toLowerCase())) {
        return format.toLowerCase();
    }

    // Else, check extension
    const filenameLC = filename.toLowerCase();
    const extensionFormat = formats.find(format => filenameLC.endsWith(`.${format}`));
    if (extensionFormat) {
        console.log(`No output format specified, defaulting to ${extensionFormat} based on output file name.`);
    }
    return extensionFormat;
}

//export method that handle error
function analyse(options) {
    analyse_core(options).catch(e=>console.error("ERROR : \n", e))
}

module.exports = analyse;