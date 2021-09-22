const axios = require('axios');

class DatadogClient {
    constructor() {
    }

    async createIntakeLog(msg) {
        return await this.sendIntakeRequest('POST', '/v1/input', {
            ddsource: 'monitor-cron',
            ddtags: 'monitor:prod',
            hostname: 'monitor-cron',
            message: msg,
        });
    }
    async createTransactionQuery(fleetID, fromTime, toTime) {

        const body ={
            compute: [
                {
                    aggregation: "count",
                    type: "total"
                }
            ],
            filter: {
                from: `${fromTime}`,
                indexes: [
                    "main"
                ],
                query: `service:ridecell-api-translation AND @log.customer_id:(${fleetID}) AND 'Sent synthesis to Ridecell' AND RENTAL_KEYS_SET`,
                to: `${toTime}`,
            }
        };

        return this.sendRequest('POST', '/api/v2/logs/analytics/aggregate', body);
    }

    async sendIntakeRequest(method, url, body) {
        const response = await axios({
            method,
            url: 'https://http-intake.logs.datadoghq.com' + url,
            headers: {
                'DD-API-KEY':  process.env.DDAPIKEY,
                'Content-Type': 'application/json',
            },
            data: body,
        });
        //console.log(`Request successfully sent to Datadog - ${response}`);
        return response;
    }  

    async sendRequest(method, url, body) {
        console.log(`Sending request to Datadog - ${JSON.stringify(body)}`);
        const response = await axios({
            method,
            url: 'https://api.datadoghq.com' + url,
            headers: {
                'DD-APPLICATION-KEY': `${process.env.DDAPPLICATIONKEY}`,
                'Content-Type': 'application/json',
                'DD-API-KEY': `${process.env.DDAPIKEY}`,
            },
            data: body,
        });
        //console.log(`Request successfully sent to Datadog - ${JSON.stringify(response)}`);


        return response;
    }
}

module.exports = DatadogClient;
