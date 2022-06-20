const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client');
const fs = require('fs');
const ProgressBar = require('progress');

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
    let progressBar;
    if (!options.ci){
        progressBar = new ProgressBar(' Push to InfluxDB     [:bar] :percent     Remaining: :etas     Time: :elapseds', {
            complete: '=',
            incomplete: ' ',
            width: 40,
            total: reports.length+2
        });
        progressBar.tick();
    } else {
        console.log('Push report to InfluxDB ...');
    }

    // initialise client
    const client = new InfluxDB({url: options.influxdb_hostname, token: options.influxdb_token});
    const writeApi = client.getWriteApi(options.influxdb_org, options.influxdb_bucket);

    // create points from reports
    const points = reports.map((file) => {
        let obj = JSON.parse(fs.readFileSync(file.path).toString());
        let hostname = obj.url.split('/')[2];
        let point = new Point("eco_index")
            .tag("pageName", obj.pageInformations.name)
            .tag("hostname", hostname)
            .stringField("url", obj.url)
            .stringField("hostname", hostname)
            .stringField("grade", obj.grade)
            .intField("ecoindex", obj.ecoIndex)
            .floatField("water", obj.waterConsumption)
            .floatField("ges", obj.greenhouseGasesEmission)
            .floatField("domSize", obj.domSize)
            .stringField("pageSize", `${Math.round(obj.responsesSize / 1000)} (${Math.round(obj.responsesSizeUncompress / 1000)})`)
            .floatField("nbRequest", obj.nbRequest)
            .floatField("nbPlugins", obj.pluginsNumber)
            .floatField("cssFilesNumber", obj.printStyleSheetsNumber)
            .floatField("cssInlineNumber", obj.inlineStyleSheetsNumber)
            .floatField("emptySrcTagNumber", obj.emptySrcTagNumber)
            .floatField("inlineJsScriptsNumber", obj.inlineJsScriptsNumber)
            .floatField("responsesSize", Math.round(obj.responsesSize / 1000))
            .floatField("responsesSizeUncompress", Math.round(obj.responsesSizeUncompress / 1000));

        Object.keys(obj.bestPractices)
            .map(key => point.stringField(key, obj.bestPractices[key].complianceLevel || 'A'));
        
        if (progressBar) progressBar.tick()

        return point
    });

    //upload points and close connexion
    writeApi.writePoints(points);

    writeApi
        .close()
        .then(() => {
            if (progressBar) progressBar.tick();
        })
        .catch(e => {
            console.log('Writing to influx failed\n');
            console.error(e);
            if (e instanceof HttpError && e.statusCode === 401) {
                console.log(`The InfluxDB database: ${bucket} doesn't exist.`);
            }
        });
}

module.exports = {
    write
}