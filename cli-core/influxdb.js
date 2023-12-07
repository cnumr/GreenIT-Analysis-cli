const { InfluxDB, Point, HttpError } = require('@influxdata/influxdb-client');
const fs = require('fs');
const { createProgressBar } = require('./utils');

async function write(reports, options) {
    if (!options.influxdb_hostname) {
        throw `You must define an InfluxDB hostname.`;
    }
    if (!options.influxdb_token) {
        throw `You must define an InfluxDB token.`;
    }
    if (!options.influxdb_bucket) {
        throw `You must define an InfluxDB bucket name.`;
    }
    if (!options.influxdb_org) {
        throw `You must define an InfluxDB organisation.`;
    }

    const url = options.influxdb_hostname;

    //initialise progress bar
    const progressBar = createProgressBar(
        options,
        reports.length + 2,
        'Push to InfluxDB',
        'Push report to InfluxDB ...'
    );

    // initialise client
    const client = new InfluxDB({ url: options.influxdb_hostname, token: options.influxdb_token });
    const writeApi = client.getWriteApi(options.influxdb_org, options.influxdb_bucket);

    // create points from reports
    const points = [];
    const date = new Date();
    reports.forEach((file) => {
        const scenario = JSON.parse(fs.readFileSync(file.path).toString());
        const scenarioName = scenario.pageInformations.name;

        if (scenario.pages) {
            scenario.pages.forEach((page) => {
                let hostname = scenario.url.split('/')[2];

                page.actions.forEach((action) => {
                    let point = new Point('eco_index');
                    point
                        .tag('scenarioName', scenarioName)
                        .tag('pageName', page.name)
                        .tag('hostname', hostname)
                        .tag('actionName', action.name)
                        .stringField('url', page.name)
                        .stringField('hostname', hostname)
                        .stringField('grade', action.grade)
                        .intField('ecoindex', action.ecoIndex)
                        .floatField('water', action.waterConsumption)
                        .floatField('ges', action.greenhouseGasesEmission)
                        .floatField('domSize', action.domSize)
                        .floatField('nbRequest', action.nbRequest)
                        .floatField('responsesSize', action.responsesSize / 1000)
                        .floatField('responsesSizeUncompress', action.responsesSizeUncompress / 1000)
                        .stringField('date', date);

                    points.push(point);
                });

                if (progressBar) progressBar.tick();
            });
        }
    });

    //upload points and close connexion
    writeApi.writePoints(points);

    writeApi
        .close()
        .then(() => {
            if (progressBar) progressBar.tick();
        })
        .catch((e) => {
            console.log('Writing to influx failed\n');
            console.error(e);
            if (e instanceof HttpError && e.statusCode === 401) {
                console.log(`The InfluxDB database: ${bucket} doesn't exist.`);
            }
        });
}

module.exports = {
    write,
};
