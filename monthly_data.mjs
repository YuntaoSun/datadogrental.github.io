#!/usr/bin/env zx
const moment = require('moment');
const AxiosWrapper = require('axios-wrapper');
const csvjson = require('csvjson');
const fs = require('fs');
const writeFile = require('fs').writeFile;
const { GoogleSpreadsheet } = require('google-spreadsheet');
const creds = require('./credentials.json');
const delay = require('delay');

/// port forward setup for billing 
await $`kubectl config use-context prod`;
let pod = await $`kubectl get pods -n prod -o go-template --template '{{range .items}}{{.metadata.name}}{{"\\n"}}{{end}}' | awk '{print $1}' | grep billing-service | tail -n 1`;
try {
    $`kubectl port-forward ${pod} 7000:8000 -n prod`;
} catch (p) {
    console.log(`Exit code: ${p.exitCode}`);
    console.log(`Could not setup port forward (check for existing forward): ${p.stderr}`);
    process.exit();
}

await delay(10000);

// Add Sheet and label based on time of request
const titleDateTime = 'DIAM-MENSA-Data-' + moment().format('MMM DD YYYY HH:mm');

let body = {
    customerId: "ridecell",
    startDate: moment().format('YYYY-MM' + '-01'),
    endDate: moment().format('YYYY-MM-DD'),
    fleetIds: ["darwin-prod", "dragon-prod", "hercules-prod"]
};

var axios = new AxiosWrapper();
var method = 'GET';
const result = await axios({
    method,
    url: `http://localhost:7000/billing/api/v1/history`,
    data: body
});

// Open MENSA-Test Google Sheet
let doc = new GoogleSpreadsheet('1lMysq15rBOPT9N_OC8cM2TCCIUwjryJMd0G886bFrok');
await doc.useServiceAccountAuth(creds);
await doc.loadInfo();
await doc.updateProperties({ title: titleDateTime});


let outputValues = [];

// Hercules Sheet
Object.entries(result.fleets["hercules-prod"].customerDevices).forEach(entry => {
    let key = entry[0];
    let value = entry[1];
    if (value.data) {
        console.log(key, value);
        let vinData = {
            vin: key,
            data: value.data
        };
        outputValues.push(vinData);
    }
});

const sheet0 = doc.sheetsByIndex[2];
sheet0.clear();
await sheet0.setHeaderRow(['vin','data']);
outputValues = outputValues.sort(function(a,b) {
    if (a["data"] < b["data"])
        return 1;
    else if (a["data"] > b["data"])
        return -1;
    return 0;
});

for (let idx = 0; idx < outputValues.length; idx++) {
    const row = {
        vin: outputValues[idx].vin,
        data: outputValues[idx].data
    };
    // programmed sleep after every 10 rows added - limitation of sheets API
    if (idx%10 == 0) {
        await delay(12000);
    }
    await sheet0.addRow(row);
}

await sheet0.loadCells('1:803');
const s0d2 = sheet0.getCellByA1('D2');
const s0d3 = sheet0.getCellByA1('D3');
const s0d4 = sheet0.getCellByA1('D4');
const s0c2 = sheet0.getCellByA1('C2');
const s0c3 = sheet0.getCellByA1('C3');
const s0c4 = sheet0.getCellByA1('C4');
s0d2.formula = '=average(B:B)';
s0d3.formula = '=stdev(B:B)';
s0d4.formula = '=count(B:B)';
s0c2.value = 'Average';
s0c3.value = 'StdDev';
s0c4.value = 'Count';
await sheet0.saveUpdatedCells();

await delay(20000);

// Darwin Sheet
outputValues = [];
Object.entries(result.fleets["darwin-prod"].customerDevices).forEach(entry => {
    let key = entry[0];
    let value = entry[1];
    if (value.data) {
        console.log(key, value);
        let vinData = {
            vin: key,
            data: value.data
        };
        outputValues.push(vinData);
    }
});

const sheet1 = doc.sheetsByIndex[0];
sheet1.clear();
await sheet1.setHeaderRow(['vin','data']);
outputValues = outputValues.sort(function(a,b) {
    if (a["data"] < b["data"])
        return 1;
    else if (a["data"] > b["data"])
        return -1;
    return 0;
});

for (let idx = 0; idx < outputValues.length; idx++) {
    const row = {
        vin: outputValues[idx].vin,
        data: outputValues[idx].data
    };
    // programmed sleep after every 10 rows added - limitation of sheets API
    if (idx%10 == 0) {
        await delay(12000);
    }
    await sheet1.addRow(row);
}

await sheet1.loadCells('1:803');
const d2 = sheet1.getCellByA1('D2');
const d3 = sheet1.getCellByA1('D3');
const d4 = sheet1.getCellByA1('D4');
const c2 = sheet1.getCellByA1('C2');
const c3 = sheet1.getCellByA1('C3');
const c4 = sheet1.getCellByA1('C4');
d2.formula = '=average(B:B)';
d3.formula = '=stdev(B:B)';
d4.formula = '=count(B:B)';
c2.value = 'Average';
c3.value = 'StdDev';
c4.value = 'Count';
await sheet1.saveUpdatedCells();

// Dragon Sheet
outputValues = [];
Object.entries(result.fleets["dragon-prod"].customerDevices).forEach(entry => {
    let key = entry[0];
    let value = entry[1];
    if (value.data) {
        console.log(key, value);
        let vinData = {
            vin: key,
            data: value.data
        };
        outputValues.push(vinData);
    }
});

const sheet2 = doc.sheetsByIndex[1];
sheet2.clear();

await sheet2.setHeaderRow(['vin','data']);
outputValues = outputValues.sort(function(a,b) {
    if (a["data"] < b["data"])
        return 1;
    else if (a["data"] > b["data"])
        return -1;
    return 0;
});

for (let idx = 0; idx < outputValues.length; idx++) {
    const row = {
        vin: outputValues[idx].vin,
        data: outputValues[idx].data
    };
    // programmed sleep after every 10 rows added - limitation of sheets API
    if (idx%10 == 0) {
        await delay(12000);
    }
    await sheet2.addRow(row);
}

await sheet2.loadCells('A1:E10');
const s2d2 = sheet2.getCellByA1('D2')
const s2d3 = sheet2.getCellByA1('D3')
const s2d4 = sheet2.getCellByA1('D4');
const s2c2 = sheet2.getCellByA1('C2');
const s2c3 = sheet2.getCellByA1('C3');
const s2c4 = sheet2.getCellByA1('C4');
s2d2.formula = '=average(B:B)';
s2d3.formula = '=stdev(B:B)';
s2d4.formula = '=count(B:B)';
s2c2.value = 'Average';
s2c3.value = 'StdDev';
s2c4.value = 'Count';
await sheet2.saveUpdatedCells();

process.exit();





