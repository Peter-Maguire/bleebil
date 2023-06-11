const noble = require('noble');
const fs = require('fs');
const recording = require('./record.json');
const {crc16xmodem} = require('crc');

noble.on('stateChange', (state)=>{
    console.log("State", state);
    if(state === "poweredOn"){
        noble.startScanning(['fee9']);
    }
})

noble.on('discover', onDiscover)
let peripheral;

function onDiscover(periph){
    const name = periph.advertisement.localName;
    console.log(`Discovered peripheral with service 0xFEE9: ${name}`);
    console.log("Attempting to connect...");
    peripheral = periph;
    peripheral.connect(onPeripheralConnect);
    peripheral.on('disconnect', onPeripheralDisconnect);

}

function onPeripheralDisconnect(){
    console.log("Peripheral disconnected!");
}

function onPeripheralConnect(err){
    if(err){
        return console.error("Connection error:", err)
    }

    console.log("Connected successfully!");
    peripheral.discoverServices(['fee9'], onDiscoverServices)
}

function onDiscoverServices(err, services){
    if(err){
        return console.error("Discover Services error:", err)
    }

    let service = services[0];
    console.log(`Successfully discovered service 0x${service.uuid}`);
    service.discoverCharacteristics([], onDiscoverCharacteristics);
}


function writeHandle(handle, str){
    return new Promise((fulfill, reject)=>{
        peripheral.writeHandle(0x0010, Buffer.from([0x00, 0x01]), true, (error)=>{
            if(error){
                reject(error);
                return console.error(`Failed to write ${str} to handle ${handle}`, error)
            }
            fulfill();
            console.log(`Wrote ${str} -> ${handle}`);
        })
    })

}

let increment = 1;
const magic = [0x24, 0x3c, 0x08, 0x00, 0x18, 0x12];

let waitingCommands = {};
let writeChar;

function executeCommand(command, data, inc ){
    const outputArray = [...magic, (inc || increment) % 0xFF, 0x01, command, ...data];

    const crcSegment = outputArray.slice(4);
    const crc = crc16xmodem(crcSegment);
    outputArray.push(...Buffer.from(crc.toString(16), 'hex').reverse()); // I'm sure theres a better way to do this
    let output = Buffer.from(outputArray);

    console.log(`-> cmd=0x${command.toString(16)} data=${data.toString('hex')} (${output.toString('hex')})`)
    writeChar.write(output, true);
}

function awaitResponse(command, data){
    return new Promise((callback)=>{
        let timeout = setTimeout(retry(command, data), 1000);
        waitingCommands[command] = {retries: 0, callback, timeout, increment}
        executeCommand(command, data);
        increment++;
    })
}

function retry(command, data){
    return ()=>{
        if(waitingCommands[command].retries++ > 5){
            console.log(`Timeout waiting for command 0x${command.toString(16)} response`);
            waitingCommands[command].callback(null)
            return;
        }
        executeCommand(command, data, waitingCommands[command].increment);
        waitingCommands[command].timeout = setTimeout(retry(command, data), 1000);
    }
}

function sleep(millis){
    return new Promise((fulfill)=>setTimeout(fulfill, millis));
}

function executeDelay(command, data){
    executeCommand(command, data);
    increment++;

}

async function onDiscoverCharacteristics(err, characteristics){
    if(err){
        return console.error("Discover Characteristics error:", err)
    }


    // noinspection EqualityComparisonWithCoercionJS
    writeChar = characteristics.find((c)=>c.properties[0] == 'writeWithoutResponse')
    // noinspection EqualityComparisonWithCoercionJS
    let readChar = characteristics.find((c)=>c.properties[0] == 'notify')
    console.log(`Found Read/Write characteristics: ${readChar.uuid}/${writeChar.uuid}`);

    readChar.subscribe();

    readChar.on('data', (data, notif)=>{
        try {
            let str = data.toString('hex');
            if (str.startsWith("243e0c001815")) return; // Heartbeat
            const arr = [...data];
            const magic = arr.slice(0, 5);
            const increment = arr[6];
            const oneZero = arr[7];
            const command = arr[8];
            const argument = arr.slice(9, arr.length - 2);
            const checksum = arr.slice(arr.length - 2);
            if(waitingCommands[command]){
                clearTimeout(waitingCommands[command].timeout);
                setTimeout(()=>{
                    waitingCommands[command].callback(argument)
                    delete waitingCommands[command];
                }, 200);

            }

            const argumentHex = toHex(argument);
            let commandText = "0x" + command?.toString(16);

            console.log(`<- inc=${increment} cmd=${commandText} arg=${argumentHex} sum=${toHex(checksum)}\t\t\t(${data.toString('hex')})`);
        }catch(e){
            console.error(e);
        }
    })
    // await writeHandle(0x0010, 0x0001);

    // executeCommand(writeChar, 0x01, Buffer.from("10d40e9177",'hex'));
    // executeCommand(writeChar, 0x02, Buffer.from("100008c810",'hex'));

    //
    // for(let i = 0; i < recording.length; i++){
    //     const line = recording[i];
    //     console.log(`Replaying ${i} - ${line}`);
    //     writeChar.write(Buffer.from(line, "hex"), true);
    //     await sleep(500);
    // }

    // await awaitResponse(0x02, Buffer.from("000000",'hex'));
    // await awaitResponse(0x04, Buffer.from("000000",'hex'));
    // await awaitResponse(0x05, Buffer.from("000000",'hex'));
    // await awaitResponse(0x02, Buffer.from("000000",'hex'));
    // Serial number
    // await awaitResponse(0x7c, Buffer.from("000000e190",'hex'));
    // await awaitResponse(0x7c, Buffer.from("000000a2de",'hex'));
    // await awaitResponse(0x7d, Buffer.from("000000b6ed",'hex'));
    // await awaitResponse(0x7d, Buffer.from("0000005623",'hex'));
    // await awaitResponse(0x7e, Buffer.from("0000002afd",'hex'));
    // await awaitResponse(0x7e, Buffer.from("0000006b35",'hex'));
    // await awaitResponse(0x7f, Buffer.from("0000007f06",'hex'));
    // await awaitResponse(0x7f, Buffer.from("0000009fc8",'hex'));

    // await awaitResponse(0x27, Buffer.from("000000",'hex'));
    // await awaitResponse(0x5e, Buffer.from("80401f",'hex'));
    // writeChar.write(Buffer.from("243c1000181806ffff01737570706f7274000000cc6d", "hex"), true);
    // await sleep(200);
    // await awaitResponse(0x06, Buffer.from("000000",'hex'));
    // await awaitResponse(0x5f, Buffer.from("80401f",'hex'));
    // writeChar.write(Buffer.from("243c1000181806000001000000000000000000006e88", "hex"), true);
    // await sleep(200);
    // await executeDelay(0x5b, Buffer.from("80c80",'hex'));
    // await executeDelay(0x5c, Buffer.from("80f40",'hex'));
    // await executeDelay(0x5d, Buffer.from("80f40",'hex'));
    // await executeDelay(0xf0, Buffer.from("167800000",'hex'));
    // await executeDelay(0x67, Buffer.from("800000",'hex'));
    // await executeDelay(0x01, Buffer.from("10d40e",'hex'));

    // await executeDelay(0x02, Buffer.from("10000",'hex'));

    setInterval(async ()=>{
        // await executeDelay(0x01, Buffer.from("102c01",'hex'));
        // tiltUp();
        // panRight();
        // executeDelay(0x02, Buffer.from("10c211",'hex'));
        // await executeDelay(0x03, Buffer.from("102c01",'hex'));
        // await awaitResponse(0x24, Buffer.from("000000",'hex'));
        console.log(await getPanPos())
    }, 1000)




    // setInterval(async ()=>{
        // await executeDelay(0x01, Buffer.from("1000089354243c080018122d0102100008ef8a",'hex'));
        // await executeDelay(0x03, Buffer.from("102c0119e0",'hex'));
        // await executeDelay(0x01, Buffer.from("102c01d148243c0800181230010210000828de243c08001812310103102c019e3f",'hex'));
        // await executeDelay(0x01, Buffer.from("100008b4ce243c08001812330102100008c810",'hex'));
        // await executeDelay(0x03, Buffer.from("10d40e1817",'hex'));
        // await executeDelay(0x01, Buffer.from("100008f506243c08001812360102100008c953243c0800181237010310d40ef8d9",'hex'));
        // await executeDelay(0x01, Buffer.from("100008b648243c08001812390102100008ca96",'hex'));
        // await executeDelay(0x03, Buffer.from("10d40ebb97",'hex'));
        // await executeDelay(0x01, Buffer.from("1000085686243c080018123c0102100008cbd5",'hex'));
        // await executeDelay(0x03, Buffer.from("10d40efa5f",'hex'));
        // await executeDelay(0x01, Buffer.from("10000857c5243c080018123f01021000082b1b243c0800181240010310d40e2554",'hex'));
        // await executeDelay(0x01, Buffer.from("10d40eedfc243c08001812420102100008f410243c08001812430103100008e023",'hex'));
        // await executeDelay(0x01, Buffer.from("10d40eecbf243c08001812450102100008b5d8",'hex'));
        // await executeDelay(0x03, Buffer.from("100008e160",'hex'));
    // }, 5000);


}

const SP_FORWARD = Buffer.from([0x10, 0x2c, 0x01])
const SP_REVERSE =  Buffer.from([0x10, 0x2c, 0x11]);
const NO_ARGUMENT = Buffer.from([0x00, 0x00, 0x00]);

function rollCw(){
    return executeDelay(0x03, SP_FORWARD);
}

function rollAcw(){
    return executeDelay(0x03, SP_REVERSE);
}

function tiltUp(){
    return executeDelay(0x01, SP_REVERSE);
}

function tiltDown(){
    return executeDelay(0x01, SP_FORWARD);
}

function panLeft(){
    return executeDelay(0x02, SP_FORWARD);
}

function panRight(){
    return executeDelay(0x02, SP_REVERSE);
}

async function getPanPos(){
    let data = await awaitResponse(0x24, NO_ARGUMENT);
    const num = Buffer.from(data).readUInt16LE(1);
    return (num/65535)*360
}


function toHex(arr){
    return arr.map((a)=>(a < 0x10 ? "0" : "")+a.toString(16)).join("")
}



process.on("uncaughtException", (err)=>{
    console.error(err);
    process.exit(1);
})