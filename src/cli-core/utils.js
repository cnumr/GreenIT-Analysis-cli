const ProgressBar = require('progress');
const reference = require('ecoindex_reference/ecoindex_reference.json');

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
    const sortedGrades = reference.grades.toSorted((a, b) => b.value - a.value);
    const found = sortedGrades.find(grade => ecoIndex > grade.value);
    return found ? found.grade : 'G';
}

//Grade -> EcoIndex
function getGradeEcoIndex(grade) {
    const found = reference.grades.find(g => g.grade === grade);
    return found ? found.value : 0;
}

module.exports = {
    createProgressBar,
    getEcoIndexGrade,
    getGradeEcoIndex,
};
