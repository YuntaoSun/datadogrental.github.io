require('dotenv').config();
const simpleGit = require('simple-git');
const git = simpleGit();
const fs = require('fs');
const moment = require('moment');
const DatadogClient = require('./DatadogClient');
const DATA_URL = './fleet_stats.json';

(async() => {
    //We go back 3 days
    for(let i = 3; i > 0 ; i--){
        await dailyFleet(i - 1);
        //     .catch(err =>{
        //     console.log(`Error occured in loop: ${i}. err is: ${err}`);
        // });
    }
})();

async function dailyFleet(daysBack) {
    let time = moment().utc();
    time.hour(0);
    time.minute(0);
    time.second(0);
    time.millisecond(0);
    time.add(0 - daysBack, 'day')

    let startTime = Math.round(new Date(time.toISOString()).setUTCHours(0,0,0,0)/1000);
    time.add(1, 'day')
    let endTime = Math.round(new Date(time.toISOString())/1000);

    var data = [];
    var fleetTotal = [0,0];
    var total = 0;
    var fleetStats = {};

    // get daily rental totals from datadog query
    data = fs.readFileSync(DATA_URL, { flag: 'r' });
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
                fleetStats[idx].stats[i].rentals = resp.data.logs.length;
                foundIt = true;
                break;
            }
        }
        if (!foundIt) {  // new entry needed
            fleetStats[idx].stats.push(
                {
                    "date": fmoment,
                    "rentals": resp.data.logs.length
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

    fs.writeFileSync(DATA_URL, updatedFleet, { flag: 'w'});

    await commitChanges(dateToday.toLocaleDateString());

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
