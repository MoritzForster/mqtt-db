"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/*
* index.ts
*/
const fs = __importStar(require("fs"));
const mqtt = __importStar(require("mqtt"));
const config_1 = require("./config");
const interfaces_1 = require("./interfaces");
const pg_1 = __importDefault(require("pg"));
var config;
// Function to process received MQTT messages
function processMessageReceived(t, m, dbClient) {
    return __awaiter(this, void 0, void 0, function* () {
        // Split the topic into components
        const components = t.split('/');
        // Extract deviceId and metric from the topic
        let deviceId = components[6];
        let metric = components[7];
        // Parse the message payload
        let payload = JSON.parse(m.toString());
        if (!(0, interfaces_1.is_iMQTTPayload)(payload)) {
            console.log("invalid payload structure: ", payload);
            return;
        }
        let ts = payload.timestamp;
        let value = payload.value;
        try {
            // Construct SQL command to insert telemetry data
            let sql_command = "INSERT INTO telemetry(timestamp,deviceid,metric,value) " +
                `VALUES('${ts}', '${deviceId}', '${metric}', ${value});`;
            console.log(sql_command);
            // Execute the SQL command
            yield dbClient.query(sql_command);
        }
        catch (err) {
            console.log('Error at Database insert' + err);
        }
    });
}
// Main function to initialize and run the application
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Read the configuration file
        let configFileName = config_1.Configuration.setConfigurationFilename('config.json');
        config = config_1.Configuration.readFileAsJSON(configFileName);
        // Retrieve environment variables
        let userID = eval("process.env." + config.env.system_user);
        let computerID = eval("process.env." + config.env.system_name);
        console.log(`Hello ${userID} on system ${computerID}`);
        // Set up SQL configuration
        config.sql_config.database = eval("process.env." + config.env.dbname);
        config.sql_config.user = eval("process.env." + config.env.dbuser);
        config.sql_config.password = eval("process.env." + config.env.dbpw);
        try {
            // Connect to the MQTT broker
            let url = config.mqtt.brokerUrl + ":" + config.mqtt.mqttPort;
            const mqttClient = yield mqtt.connectAsync(url);
            console.log("mqtt connected!");
            // Execute SQL setup command
            let sql_command = fs.readFileSync('./sql/setup_create.txt').toString();
            // Connect to the database
            let dbpool = new pg_1.default.Pool(config.sql_config);
            let dbclient = yield dbpool.connect();
            // Execute
            yield dbpool.query(sql_command);
            // Subscribe to the MQTT topic
            let topic = 'magna/iotacademy/conestoga/smart/presorter/3/robot2/#';
            yield mqttClient.subscribeAsync(topic);
            console.log("subscription established!");
            // Set up message handler
            mqttClient.on('message', (topic, message) => processMessageReceived(topic, message, dbclient));
            // Set up asynchronous disconnection support via signals
            const shutdown = () => __awaiter(this, void 0, void 0, function* () {
                console.log("disconnecting our services now");
                yield mqttClient.endAsync();
                // Disconnect
                yield dbpool.end();
                process.exit();
            });
            // Handle signals
            process.on('SIGINT', shutdown);
            process.on('SIGTERM', shutdown);
        }
        catch (err) {
            console.log('Error in Main: ', err);
        }
    });
}
main(); // Call the main function to start the application
//# sourceMappingURL=index.js.map