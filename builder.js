const concat = require('concat-files');
const glob = require('glob');
const fs = require('fs');

const DIR = './dist';

if (!fs.existsSync(DIR)) {
    fs.mkdirSync(DIR);
}

const rules = glob.sync('./src/greenit-core/rules/*.js');

//One script to analyse them all
concat(
    [
        './src/greenit-core/analyseFrameCore.js',
        './src/greenit-core/utils.js',
        './src/greenit-core/rulesManager.js',
        './src/greenit-core/ecoIndex.js',
        ...rules,
        './src/greenit-core/greenpanel.js',
    ],
    './dist/greenItBundle.js',
    function (err) {
        if (err) throw err;
        console.log('build complete');
    }
);
