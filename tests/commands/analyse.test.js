const fs = require('fs');
const path = require('path');
const analyse_core = require('../../src/commands/analyse.js').analyse_core;

describe('Test de la fonction analyse', () => {
    const inputFilePath = 'samples/greenit-url.yml';
    const outputFolder = 'tests/commands/output';
    const outputFolderPath = path.join(__dirname, 'output');
    const outputPath = path.join(outputFolder, 'json/globalReport.json');
    const reportFilePath = path.join(outputFolder, 'greenit.html');
    const referencePath = 'tests/commands/reference/globalReport.json';
    const referenceFolderPath = path.join(__dirname, 'reference');

    const timeoutTest = 1 * 60 * 1000;

    beforeAll(() => {
        clearDirectory(outputFolderPath);
    });

    afterAll(() => {
        clearDirectory(outputFolderPath);
    });

    it("doit déclencher l'analyse du fichier samples/greenit-url.yml", async() => {
        // Arrange
        const options = {
            url_input_file: inputFilePath,
            report_output_file: reportFilePath,
            max_tab: 1,
            timeout: 10000,
            retry: 3
        }

        // Act
        await analyse_core(options);

        // Assert
        const result = JSON.parse(fs.readFileSync(outputPath, 'utf-8'));
        const expected = JSON.parse(fs.readFileSync(referencePath, 'utf-8'));

        expect(result.nbScenarios).toStrictEqual(expected.nbScenarios);
        expect(result.errors).toStrictEqual(expected.errors);

        for (let indexScenario = 1; indexScenario <= result.nbScenarios; indexScenario++) {
            expectScenario(indexScenario, outputFolderPath, referenceFolderPath);
        }


    }, timeoutTest);
});

function expectScenario(indexScenario, outputFolderPath, referenceFolderPath) {
    const result = JSON.parse(fs.readFileSync(path.join(outputFolderPath, 'json', `${indexScenario}.json`), 'utf-8'));
    const expected = JSON.parse(fs.readFileSync(path.join(referenceFolderPath, `${indexScenario}.json`), 'utf-8'));

    expect(result.pages.length, `Scenario ${indexScenario}`).toStrictEqual(expected.pages.length);

    for (let indexPage = 0; indexPage < result.pages.length; indexPage++) {
        const pageResult = result.pages[indexPage];
        const pageExpected = expected.pages[indexPage];
        expect(pageResult.actions.length, `Scenario ${indexScenario} / Page ${indexPage}`).toStrictEqual(pageExpected.actions.length);
        for (let indexAction = 0; indexAction < pageResult.actions.length; indexAction++) {
            const actionResult = pageResult.actions[indexAction];
            const actionExpected = pageExpected.actions[indexAction];
            const prefixMessageError = `Scenario ${indexScenario} / Page ${indexPage} / Action ${indexAction}`;
            expectToBeNear(`${prefixMessageError} : nbRequest`, actionResult.nbRequest, actionExpected.nbRequest, 5);
            //expectToBeNear(`${prefixMessageError} : responsesSize`, actionResult.responsesSize, actionExpected.responsesSize, 100000);
            //expectToBeNear(`${prefixMessageError} : responsesSizeUncompress`, actionResult.responsesSizeUncompress, actionExpected.responsesSizeUncompress, 100000);
            expectToBeNear(`${prefixMessageError} : domSize`, actionResult.domSize, actionExpected.domSize, 5);
            expectToBeNear(`${prefixMessageError} : ecoIndex`, actionResult.ecoIndex, actionExpected.ecoIndex, 2);
        }
    }
}

// OK if result = expected +/- delta
// expected-delta <= result <= expected+delta
function expectToBeNear(prefixMessageError, result, expected, delta) {
    expect(result, prefixMessageError).toBeGreaterThanOrEqual(expected - delta);
    expect(result, prefixMessageError).toBeLessThanOrEqual(expected + delta);
}


function clearDirectory(outputFolder) {
    if (fs.existsSync(outputFolder)) {
        fs.rmSync(outputFolder, { recursive: true });
    }
}

