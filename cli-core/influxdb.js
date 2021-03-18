const {InfluxDB, Point, HttpError} = require('@influxdata/influxdb-client')
const fs = require('fs');
const ProgressBar = require('progress');

async function write(reports, options) {

    if (!options.influxdb_hostname) {
        throw `You must define an InfluxDB hostname.`
    }
    if (!options.influxdb_login) {
        throw `You must define an InfluxDB login.`
    }
    if (!options.influxdb_password) {
        throw `You must define an InfluxDB password.`
    }
    if (!options.influxdb_database) {
        throw `You must define an InfluxDB database name.`
    }

    const url = options.influxdb_hostname;
    const org = 'ecoindex'
    const bucket = options.influxdb_database;

    //initialise progress bar
    let progressBar;
    if (!options.ci){
        progressBar = new ProgressBar(' Push to InfluxDB     [:bar] :percent     Remaining: :etas     Time: :elapseds', {
            complete: '=',
            incomplete: ' ',
            width: 40,
            total: reports.length+2
        });
        progressBar.tick()
    } else {
        console.log('Push report to InfluxDB ...');
    }

    const writeApi = new InfluxDB({url, timeout: 15})
        .getWriteApi(org, bucket, 'ms')
    writeApi.useDefaultTags({location: url})

    reports.forEach((file) => {
        let obj = JSON.parse(fs.readFileSync(file.path).toString());
        let hostname = obj.url.split('/')[2]
        writePoint(writeApi, hostname, 'url', obj.url)
        writePoint(writeApi, hostname, 'grade', obj.grade)
        writePoint(writeApi, hostname, 'ecoIndex', obj.ecoIndex)
        writePoint(writeApi, hostname, 'water', obj.waterConsumption)
        writePoint(writeApi, hostname, 'ges', obj.greenhouseGasesEmission)
        writePoint(writeApi, hostname, 'domSize', obj.domSize)
        writePoint(writeApi, hostname, 'pageSize', `${Math.round(obj.responsesSize / 1000)} (${Math.round(obj.responsesSizeUncompress / 1000)})`)
        writePoint(writeApi, hostname, 'nbRequest', obj.nbRequest)
        writePoint(writeApi, hostname, 'nbPlugins', obj.pluginsNumber)
        writePoint(writeApi, hostname, 'cssFilesNumber', obj.printStyleSheetsNumber)
        writePoint(writeApi, hostname, 'cssInlineNumber', obj.inlineStyleSheetsNumber)
        writePoint(writeApi, hostname, 'emptySrcTagNumber', obj.emptySrcTagNumber)
        writePoint(writeApi, hostname, 'inlineJsScriptsNumber', obj.inlineJsScriptsNumber)
        writePoint(writeApi, hostname, 'responsesSize', Math.round(obj.responsesSize / 1000))
        for (let key in obj.bestPractices) {
            writePoint(writeApi, hostname, key, obj.bestPractices[key].complianceLevel || 'A')
        }
        if (progressBar) progressBar.tick()
    })

    writeApi
        .close()
        .then(() => {
            if (progressBar) progressBar.tick()
        })
        .catch(e => {
            console.log('Writing to influx failed\n')
            console.error(e)
            if (e instanceof HttpError && e.statusCode === 401) {
                console.log(`The InfluxDB database: ${bucket} doesn't exist.`)
            }
        })
}

/**
 * write point with the current (client-side) timestamp
 */
async function writePoint(writeApi, hostname, fieldName, fieldValue) {
    const point = new Point('eco_index')
        .tag('Hostname', hostname)
        .stringField(fieldName, fieldValue)
    writeApi.writePoint(point)
}

module.exports = {
    write
}