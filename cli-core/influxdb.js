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
  const progressBar = createProgressBar(options, reports.length + 2, 'Push to InfluxDB', 'Push report to InfluxDB ...');

  // initialise client
  const client = new InfluxDB({
    url: options.influxdb_hostname,
    token: options.influxdb_token,
  });
  const writeApi = client.getWriteApi(
    options.influxdb_org,
    options.influxdb_bucket,
  );

  // create points from reports
  const points = [];
  reports.forEach((file) => {
    const scenario = JSON.parse(fs.readFileSync(file.path).toString());
    const scenarioName = scenario.pageInformations.name

    if (scenario.pages) {
      scenario.pages.forEach((page) => {
        let ecoIndex = -1;
        let grade = "";
        let waterConsumption = -1;
        let greenhouseGasesEmission = -1;
        let domSize = -1;
        let nbRequest = -1;
        let hostname = scenario.url.split('/')[2];


        page.actions.forEach((action, iAction) => {
          let point = new Point('eco_index');
          let actionName = "";
          if (action.analysis) {
            ecoIndex = action.ecoIndex;
            grade = action.grade;
            waterConsumption = action.waterConsumption;
            greenhouseGasesEmission = action.greenhouseGasesEmission;
            domSize = action.domSize;
          }

          nbRequest += action.nbRequest;

          if (page.actions.length === 1) {
            actionName = "only";
          } else if (iAction === 0) {
            actionName = "first";
          } else if (iAction === (page.actions.length - 1)) {
            actionName = "last";
          }

          if (actionName) {
            // Only keep point if specific action
            point
              .tag('scenarioName', scenarioName)
              .tag('pageName', page.name)
              .tag('hostname', hostname)
              .tag('actionName', actionName)
              .stringField('url', page.name)
              .stringField('hostname', hostname)
              .stringField('grade', grade)
              .intField('ecoindex', ecoIndex)
              .floatField('water', waterConsumption)
              .floatField('ges', greenhouseGasesEmission)
              .floatField('domSize', domSize)
              .floatField('nbRequest', nbRequest);

            points.push(point);
          }

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
        console.log(`Error : `, e);
      }
    });
}

module.exports = {
  write,
};
