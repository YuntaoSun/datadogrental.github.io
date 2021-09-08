require('dotenv').config();
const simpleGit = require('simple-git');
const git = simpleGit();
const fs = require('fs');
const moment = require('moment');
const DatadogClient = require('./DatadogClient');
const AxiosWrapper = require('axios-wrapper');
const DATA_URL = './fleet_stats.json';
// const startTime = Math.round(new Date().setUTCHours(0,0,0,0)/1000);
// const endTime = Math.round(Date.now()/1000);

 const startTime = Math.round(new Date('2021-09-08T00:00:00Z').setUTCHours(0,0,0,0)/1000);
 const endTime = Math.round(new Date('2021-09-09T00:00:00Z')/1000);

dailyFleet();

async function dailyFleet() {
    var data = [];
    var fleetTotal = [0,0];
    var total = 0;
    var fleetStats = {};

    // get daily rental totals from datadog query
    data = fs.readFileSync(DATA_URL, {encoding:'utf8', flag: 'r'});
    fleetStats = JSON.parse(data);
    
    var fleetIndex = 0;

    var momentEpoch = moment().unix();
    var fmoment = moment.unix(parseInt(startTime, 10)).utc().format("MM-DD-YY");
    console.log(`Tesitng fmoment is ${fmoment}`);
    var updateMoment = moment.unix(momentEpoch).format("MM-DD-YY HH:mm");
    const datadogClient = new DatadogClient();
    //var resp = await datadogClient.createTransactionQuery(fleetStats[0].fleetID, new Date(parseInt(startTime, 10)*1000).toISOString(), new Date(parseInt(endTime, 10)*1000).toISOString());
    var dateToday = new Date();

    var foundIt = false;
    for (let idx = 0; idx < fleetStats.length; idx++) {
        var resp = await datadogClient.createTransactionQuery(fleetStats[idx].fleetID, new Date(parseInt(startTime, 10)*1000).toISOString(), new Date(parseInt(endTime, 10)*1000).toISOString());
        for (let i = 0; i < fleetStats[idx].stats.length; i++) {
            if (fleetStats[idx].stats[i].date === fmoment)  { // existing entry - update 
                fleetStats[idx].stats[i].rentals = resp.logs.length;
                foundIt = true;
                break;
            }
        }
        if (!foundIt) {  // new entry needed
            fleetStats[idx].stats.push(
                {
                    "date": fmoment,
                    "rentals": resp.logs.length
                }       
            );
        }

    }

    fleetStats[0].updated = updateMoment;
    fleetStats[1].updated = updateMoment;
    fleetStats[2].updated = updateMoment;
    const updatedFleet = JSON.stringify(fleetStats, null, 4);
    
    var darwinRentals = 0, dragonRentals = 0, totalRentals = 0;
    var doneMessage = '';
    var bDarwin = false;
    fleetStats.forEach(function(d){
        if (d.fleetID === 'darwin-prod') {
            bDarwin = true;
        } else {
            bDarwin = false;
        }
        d.stats.forEach(function(t) {
            totalRentals += t.rentals;
            if (bDarwin) {
                darwinRentals += t.rentals;
            } else {
                dragonRentals += t.rentals;
            }
        });
    });

    fs.writeFile(DATA_URL, updatedFleet, 'utf8', (err) => {
        if (err) {
            console.log(`Error writing file: ${err}`);
        } else {
            console.log('Successful write');
            commitChanges(dateToday.toLocaleDateString());
        }
    });
    
}

async function commitChanges(commitMsg) {
    try {
        await git.pull();
        await git.add('./fleet_stats.json');
        await git.commit(`new version of fleet stats...${commitMsg}`);
        await git.push();
        console.log('Done');

    } catch (ex) {
        console.log(`error ${ex}`);
    }
}
