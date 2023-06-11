const bleno = require('bleno');
const fs = require("fs");
let outputs = JSON.parse(fs.readFileSync("outputs.json").toString());
require('colors');
const userDescription = new bleno.Descriptor({
    uuid: '2901'
});

const clientDescription = new bleno.Descriptor({
    uuid: '2902'
})

bleno.on('stateChange', (state)=>{
    console.log(state);
    if(state === "poweredOn"){
        bleno.startAdvertising("WEEBIL_S_9E9F")
        // Basically copies the weebil advertising data
        bleno.startAdvertisingWithEIRData(Buffer.from('0201060303E9FE0F0857454542494C4C20535F3543453506FF0905330501', 'hex'))
        bleno.setServices(new bleno.PrimaryService({
            uuid: 'fee9',
            characteristics: [
                new bleno.Characteristic({
                    uuid: 'd44bc439abfd45a2b575925416129600',
                    properties: ['writeWithoutResponse'],
                    onWriteRequest,
                    descriptors: [userDescription]
                }),
                new bleno.Characteristic({
                    uuid: 'd44bc439abfd45a2b575925416129601',
                    properties: ['notify'],
                    onReadRequest,
                    onSubscribe,
                    descriptors: [userDescription]
                }),
            ]
        }))
    }
});

bleno.on('advertisingStart', ()=>{
    console.log("Advertising Started...");
})

bleno.on('accept', (add)=>{
    console.log("Accepted incoming ", add);

});

bleno.on('disconnect', ()=>{
    console.log("Disconnected, save recording");
    fs.writeFileSync("record.json", JSON.stringify(inputRecord, undefined, 1));
})

function onReadRequest(data, callback){
    console.log("Read", data);
    callback(bleno.Characteristic.RESULT_SUCCESS, Buffer.from([0x00]));
}


const commandNames = {
    0x01: "Tilt",
    0x02: "Pan",
    0x03: "Roll",
    0x04: "Get Software Version",
    0x06: "Get Battery Percentage",
    0x7c: "Get Serial 1",
    0x7f: "Get Serial 2",
    0x7d: "Get Serial 3",
    0x7e: "Get Serial 4",
    0x20: "Press Button",
    0x21: "Set Center point",
    0x22: "Read Tilt Position",
    0x23: "Read Roll Position",
    0x24: "Read Pan Position",
    0x27: "Set Mode",
    0x61: "Set Pan Deg",
    0x62: "Set Tilt Deg",
    0x63: "Set Roll Deg",
    0x68: "Set Camera Brand",
    0x69: "Set Strength",
    0x70: "Sync Motion Tilt",
    0x71: "Sync Motion Roll",
    0x72: "Sync Motion Pan",
}


const outgoingMagic = [0x24, 0x3e, 0x08, 0x00, 0x18, 0x12];
let outgoingIncrement = 1;
const responseDatas = {
    0x00: Buffer.from("00330507d8"), // unknown arg=0100000000000000000000 arg=013000
    0x01: null, // Movement related
    0x02: Buffer.from('003305ffff', 'hex'), // This seems to need to be '00330507d8' this or it doesn't work
    0x03: null, // Movement related
    0x04: Buffer.from('0001010000', 'hex'), // Possibly the software version number
    0x05: Buffer.from('0003040000', 'hex'),
    0x06: "rand", // Battery percentage? / sync motion?
    0x07: null, // Sync motion related, embedded into 0x06
    0x08: null, // Sync motion related
    0x09: null, // Six-side calibration related
    0x12: null, // Get 6s calibration status?
    0x1e: null, // Get 6s calibration status?
    0x1d: null, // Get 6s calibration status?
    0x20: Buffer.from('1516170000', 'hex'), // Send button command
    0x21: null, // Sync motion related centerpoint
    0x22: "rand", // Read tilt position
    0x23: "rand", // Read roll position
    0x24: "rand", // Read pan position
    0x25: Buffer.from("fefefe0000", 'hex'), // Get calibration?
    0x26: Buffer.from("efefef0000", 'hex'), // Get calibration?
    0x27: Buffer.from("18191a0000", 'hex'), // Set mode?
    0x30: null, // Panorama related arg=c00100
    0x31: null, // Panorama related arg=c00000 arg=c00100 arg=c00300 - Sent at start and end of panorama
    0x32: null, // Panorama related arg=c00000 - Regularly polled during panorama
    0x33: null, // Panorama related arg=c0b80b
    0x34: null, // Panorama related arg=c0f300
    0x35: null, // Panorama related arg=c05046
    0x36: null, // Panorama related arg=c00000
    0x37: null, // Panorama related arg=c00000
    0x5b: null, //arg=80c800
    0x5c: null,
    0x5d: null,
    0x5e: null,
    0x5f: null, // Setting smoothing
    0x60: null, // Setting smoothing
    0x61: null, // Involved in setting smoothing degrees? roll
    0x62: null, // Involved in setting smoothing degrees? tilt
    0x63: null, // Involved in setting smoothing degrees? pan
    0x64: null, // Setting smoothing
    0x65: null, // arg=80c409
    0x66: null, // Setting smoothing
    0x67: null, // Involved in setting parameters
    0x68: Buffer.from('1b1c0000', 'hex'), // Get camera brand?
    0x69: null, // Get strength
    0x70: null, // Sync motion Tilt
    0x71: null, // Sync motion Roll
    0x72: Buffer.from("dddddddd", 'hex'), // Sync motion Pan
    0x7c: Buffer.from('00a3a40000', 'hex'), // Contains serial
    0x7f: Buffer.from('000b0c0000', 'hex'), // Contains serial
    0x7d: Buffer.from('000f100000', 'hex'), // Contains serial
    0x7e: Buffer.from('0015160000', 'hex'), // Contains serial
    0x90: null, //Set strength
    0x91: null, //Set strength
    0x92: null, //Set strength
    0xFF: {
        "01737570706f7274000000": Buffer.from("abcdefg"),
    }
}



const inputRecord = [];
function onWriteRequest(data){
    inputRecord.push(data.toString('hex'))
    const arr = [...data];
    const magic = arr.slice(0, 4); // 24 3c 08 00 18
    const cmdByte = arr[5]; // 12 = first format 18 = second format

    // For some reason there are two formats
    //if(cmdByte === 12) {
        handleFirstTypeLogic(data, arr);
    //}else if(cmdByte === 18){
    //    console.log("?? ", data.toString('hex'));
        // I don't think these need handling
    //}
}



function handleFirstTypeLogic(data, arr){
    const increment = arr[6]; // Increments for each message
    const zeroOne = arr[7]; // Always 0x01
    const command = arr[8]; // Probably the command
    const argument = arr.slice(9, arr.length-2);
    const checksum = arr.slice(arr.length-2);

    const argumentHex = toHex(argument);
    // if(!outputs[command]){
    //     outputs[command] = [];
    // }
    // outputs[command].push(argumentHex);

    let commandText = "0x"+command.toString(16);
    if(commandNames[command])
        commandText += `(${commandNames[command]})`

    console.log(`<- cmd=${commandText} arg=${argumentHex} sum=${toHex(checksum)}\t\t\t(${data.toString('hex')})`.green);

    if(updateValueCallback){
        if(command === 0x01 || command === 0x03){
            return;
        }
        let respData = responseDatas[command];
        if(!respData){
            if(respData === undefined)
                console.log("New!!");
            respData = Buffer.from([0x01, 0x01, 0x01, 0x01]);
        }
        if(!Buffer.isBuffer(respData)){
            if(respData === "rand"){
                respData = Buffer.from([parseInt(Math.random()*0xFF), parseInt(Math.random()*0xFF),parseInt(Math.random()*0xFF),parseInt(Math.random()*0xFF), 0x00, 0x00]);
            }else if(!respData[argumentHex]){
                console.log("Known command with unknown input", argumentHex);
                respData = respData[Object.keys(respData)[0]]
            }else {
                respData = respData[argumentHex];
            }
        }
        const outputData = Buffer.from([...outgoingMagic, outgoingIncrement++ % 0xFF, 0x10, command, ...respData]);
        console.log(`-> cmd=0x${command.toString(16)} arg=${respData.toString('hex')}\t\t\t(${outputData.toString('hex')})`.red);
        updateValueCallback(outputData);
    }


}

// setInterval(()=>{
//     fs.writeFileSync("outputs.json", JSON.stringify(outputs, null, 1));
//     console.log("Saved!");
// }, 30000);

let updateValueCallback;

function onSubscribe(data, callback){
    console.log("Subscribe", data);
    updateValueCallback = callback;
    setInterval(()=>{
        updateValueCallback(Buffer.from("243e0c00181508000AABBCCDDEEFF0011223", "hex")) //243e0c001815080001805010c2010000984b
    }, 1000)

}

function toHex(arr){
    return arr.map((a)=>(a < 0x10 ? "0" : "")+a.toString(16)).join("")
}

process.on("uncaughtException", (err)=>{
    console.error(err);
    process.exit(1);
})