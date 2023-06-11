async function getPanPos(){
    let data = await awaitResponse(CMD.GET_PAN_POS, NO_ARGUMENT);
    const num = (new DataView(data.buffer)).getUint16(1, true);
    return (num/65535)*360
}

async function getRollPos(){
    let data = await awaitResponse(CMD.GET_ROLL_POS, NO_ARGUMENT);
    const num = (new DataView(data.buffer)).getUint16(1, true);
    return (num/65535)*360
}

async function getTiltPos(){
    let data = await awaitResponse(CMD.GET_TILT_POS, NO_ARGUMENT);
    const num = (new DataView(data.buffer)).getUint16(1, true);
    return (num/65535)*360
}

async function getSoftwareVersion(){
    let data = await awaitResponse(CMD.GET_SOFTWARE_VERSION, NO_ARGUMENT);
    const num = (new DataView(data.buffer)).getUint16(1, true);
    return num/100;
}

async function getCameraBrand(){
    let data = await awaitResponse(CMD.GET_CAMERA_BRAND, NO_ARGUMENT);
    const brand = (new DataView(data.buffer)).getUint8(1);
    return CAMERAS[brand] || brand;
}


let outgoingBuffer = [];
let increment = 1;
let writeChar;


async function start() {
    const device = await navigator.bluetooth.requestDevice({
        filters: [{
            services: [0xfee9]
        }]
    });
    initControls();
    document.getElementById("connect").setAttribute("disabled", true);

    console.log("Connecting to device...");
    const gattServer = await device.gatt.connect();
    const service = await gattServer.getPrimaryService(0xfee9);

    const characteristics = await service.getCharacteristics();
    writeChar = characteristics.find((c) => c.properties.writeWithoutResponse);
    const readChar = characteristics.find((c) => c.properties.notify);
    readChar.addEventListener("characteristicvaluechanged", onRead);
    await readChar.startNotifications();
    handleOutgoingBuffer();
}


function executeCommand(command, data, inc){
    const outputArray = [...MAGIC, (inc || increment++) % 0xFF, 0x01, command, ...data];
    const crcSegment = outputArray.slice(4);
    const crc = crc16xmodem(crcSegment);
    const output = [...outputArray, crc & 0xff, crc >> 8];
    console.log(`-> cmd=0x${command.toString(16)} data=${toHex(data)} (${toHex(output)})`);
    outgoingBuffer.push(output);
}

function awaitResponse(command, data){
    return new Promise((callback)=>{
        let timeout = setTimeout(retry(command, data), 1000);
        waitingCommands[command] = {retries: 0, callback, timeout, increment}
        executeCommand(command, data);
    })
}


async function handleOutgoingBuffer(){
    if(outgoingBuffer.length === 2) {
        await writeChar.writeValueWithoutResponse(new Uint8Array(outgoingBuffer.flat()));
        outgoingBuffer = [];
    }else {
        let nextMessage = outgoingBuffer.shift()
        if (nextMessage) {
            await writeChar.writeValueWithoutResponse(new Uint8Array(nextMessage));
        }
    }
    setTimeout(handleOutgoingBuffer, 100);
}

let waitingCommands = {};

function onRead(e){
    const arr = new Uint8Array(e.target.value.buffer);
    // const magic = arr.slice(0, 4);
    const messageType = arr[5];
    if(messageType === 0x15){
        handleHeartbeat(arr);
        return
    }
    const increment = arr[6];
    // const oneZero = arr[7];
    const command = arr[8];
    const argument = arr.slice(9, arr.length - 2);
    const checksum = arr.slice(arr.length - 2);
    if(waitingCommands[command]){
        clearTimeout(waitingCommands[command].timeout);
        waitingCommands[command].callback(argument)
        delete waitingCommands[command];
    }

    const argumentHex = toHex(argument);
    let commandText = "0x" + command?.toString(16);

    console.log(`<- inc=${increment} cmd=${commandText} arg=${argumentHex} sum=${toHex(checksum)}\t\t\t(${toHex(arr)})`);

}

function handleHeartbeat(arr){
    const dv = new DataView(arr.buffer);
    const mode = dv.getUint8(8);
    const axisLock = dv.getUint8(9);
    document.getElementById("mode").innerText = MODE[mode] || mode;
    if(axisLock !== 0x80)
        document.getElementById("mode").innerText += " (AXIS LOCK)";
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


async function getBatteryLevel(){
    let data = await awaitResponse(CMD.GET_BATTERY_SET_TILT_POS, NO_ARGUMENT);
    const num = (new DataView(data.buffer)).getUint16(1, true);
    return num/10;
}

function setMode(mode){
    return executeCommand(CMD.SET_MODE, [0x80, MODE.indexOf(mode), 0x00])
}

function setCenterPoint(){
    return executeCommand(CMD.SET_CENTER_POINT, NO_ARGUMENT);
}

function pressButton(){
    return executeCommand(CMD.PRESS_BUTTON, [0xc0, 0x3c, 0x00]);
}

function setPanPos(pos){
    const data = new Uint8Array(3);
    const dv = new DataView(data.buffer);
    dv.setUint8(0, 0x10)
    dv.setUint16(1, Math.floor((pos/360)*65535), true)
    console.log("SET POS PAN", toHex(data), Math.floor((pos/360)*65535))
    return executeCommand(CMD.SET_PAN_POS, data)
}

function setTiltPos(pos){
    const data = new Uint8Array(3);
    const dv = new DataView(data.buffer);
    dv.setUint8(0, 0x10)
    dv.setUint16(1, Math.floor((pos/360)*65535), true)
    console.log("SET POS TILT", toHex(data))
    return executeCommand(CMD.GET_BATTERY_SET_TILT_POS, data)
}

function setRollPos(pos){
    const data = new Uint8Array(3);
    const dv = new DataView(data.buffer);
    dv.setUint8(0, 0x10)
    dv.setUint16(1, Math.floor((pos/360)*65535), true)
    console.log("SET POS ROLL", toHex(data))
    return executeCommand(CMD.SET_ROLL_POS, data)
}


