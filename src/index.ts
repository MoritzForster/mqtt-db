/*
* index.ts
*/
import * as fs from 'fs';
import * as mqtt from 'mqtt';
import { Configuration } from "./config";
import { iMQTTPayload, is_iMQTTPayload } from "./interfaces";
import pg from 'pg';
var config:any;

// Function to process received MQTT messages
async function processMessageReceived (t:string, m:Buffer,dbClient:pg.PoolClient) {
    // Split the topic into components
    const components:string[] = t.split('/');

    // Extract deviceId and metric from the topic
    let deviceId:string = components[6];
    let metric:string = components[7];

    // Parse the message payload
    let payload:iMQTTPayload = JSON.parse(m.toString());
    if (!is_iMQTTPayload(payload)) {
        console.log ("invalid payload structure: ", payload);
        return;
    }

    let ts:string = payload.timestamp;
    let value:number = payload.value;

    try {
        // Construct SQL command to insert telemetry data
        let sql_command:string =
        "INSERT INTO telemetry(timestamp,deviceid,metric,value) " +
        `VALUES('${ts}', '${deviceId}', '${metric}', ${value});`;
        console.log (sql_command);
        // Execute the SQL command
        await dbClient.query(sql_command);
    
    } catch (err){
        console.log('Error at Database insert'+err);
    }
}

// Main function to initialize and run the application
async function main(){

    // Read the configuration file
    let configFileName:string = Configuration.setConfigurationFilename('config.json'); 
    config = Configuration.readFileAsJSON(configFileName); 

    // Retrieve environment variables
    let userID:string = eval ("process.env." + config.env.system_user);
    let computerID:string = eval ("process.env." + config.env.system_name);
    console.log (`Hello ${userID} on system ${computerID}`);
    
    // Set up SQL configuration
    config.sql_config.database = eval ("process.env." + config.env.dbname);
    config.sql_config.user = eval ("process.env." + config.env.dbuser);
    config.sql_config.password = eval ("process.env." + config.env.dbpw);

    try {
        // Connect to the MQTT broker
        let url:string = config.mqtt.brokerUrl + ":" + config.mqtt.mqttPort;
        const mqttClient:mqtt.MqttClient = await mqtt.connectAsync(url);
        console.log ("mqtt connected!");
        
        // Execute SQL setup command
        let sql_command:string = fs.readFileSync('./sql/setup_create.txt').toString();
        // Connect to the database
        let dbpool = new pg.Pool (config.sql_config);
        let dbclient = await dbpool.connect();
        // Execute
        await dbpool.query(sql_command);

        // Subscribe to the MQTT topic
        let topic:string = 'magna/iotacademy/conestoga/smart/presorter/3/robot2/#';
        await mqttClient.subscribeAsync (topic);
        console.log ("subscription established!");

        // Set up message handler
        mqttClient.on ('message', (topic,message) => processMessageReceived(topic, message, dbclient));

        // Set up asynchronous disconnection support via signals
        const shutdown = async() => {
            console.log ("disconnecting our services now");
            await mqttClient.endAsync();
            // Disconnect
            await dbpool.end();
            process.exit();
        }
        // Handle signals
        process.on ('SIGINT', shutdown);
        process.on ('SIGTERM', shutdown);

    } catch (err){
        console.log('Error in Main: ',err);
    }
}
main();  // Call the main function to start the application