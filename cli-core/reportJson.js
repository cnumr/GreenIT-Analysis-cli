const fs = require('fs');
const path = require('path');
const ProgressBar = require('progress');

//create json report for all the analysed pages and recap
async function create_JSON_report(reportObject, options){
    //Path of the output file
    let OUTPUT_FILE = path.resolve(options.report_output_file);
    if (OUTPUT_FILE.toLowerCase().endsWith('results.xlsx')) {
        OUTPUT_FILE = OUTPUT_FILE.substring(0, OUTPUT_FILE.length-'.xlsx'.length) + '.json'
    }
    if (!OUTPUT_FILE.toLowerCase().endsWith('.json')) {
        throw ` report_output_file : File "${OUTPUT_FILE}" does not end with the ".json" extension.`
    }

    const fileList = reportObject.reports;
    const globalReport = reportObject.globalReport;

    //initialise progress bar
    let progressBar;
    if (!options.ci){
        progressBar = new ProgressBar(' Create Json report      [:bar] :percent     Remaining: :etas     Time: :elapseds', {
            complete: '=',
            incomplete: ' ',
            width: 40,
            total: fileList.length+2
        });
        progressBar.tick()
    } else {
        console.log('Creating JSON report ...');
    }

    let global = JSON.parse(fs.readFileSync(globalReport.path).toString());
    let pages = {};
    if (progressBar) progressBar.tick()

    fileList.forEach((file)=>{
        pages[file.name] = JSON.parse(fs.readFileSync(file.path).toString());
        if (progressBar) progressBar.tick()
    })

    try {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify({global, pages}));
    } catch (error) {
        throw ` report_output_file : Path "${OUTPUT_FILE}" cannot be reached.`
    }
}

module.exports = {
    create_JSON_report
}
