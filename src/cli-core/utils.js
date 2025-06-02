const ProgressBar = require('progress');

/**
 * Initialize new progress bar
 */
function createProgressBar(options, total, progressText, defaultText) {
    let progressBar;
    if (!options.ci) {
        progressBar = new ProgressBar(
            ` ${progressText}       [:bar] :percent     Remaining: :etas     Time: :elapseds`,
            {
                complete: '=',
                incomplete: ' ',
                width: 40,
                total: total,
            }
        );
        progressBar.tick();
    } else {
        console.log(`${defaultText}`);
    }

    return progressBar;
}

//EcoIndex -> Grade
function getEcoIndexGrade(ecoIndex) {
    if (ecoIndex > 75) return 'A';
    if (ecoIndex > 65) return 'B';
    if (ecoIndex > 50) return 'C';
    if (ecoIndex > 35) return 'D';
    if (ecoIndex > 20) return 'E';
    if (ecoIndex > 5) return 'F';
    return 'G';
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
    createProgressBar,
    getEcoIndexGrade,
    getGradeEcoIndex,
};
