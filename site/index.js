function initControls(){
    ["pan", "tilt", "roll"].forEach((c)=>{
        document.getElementById(c+"Forward").onmousedown = movementControlDown(c, true);
        document.getElementById(c+"Forward").onmouseup = movementControlUp(c);
        document.getElementById(c+"Reverse").onmousedown = movementControlDown(c, false);
        document.getElementById(c+"Reverse").onmouseup = movementControlUp(c);
    });

    document.getElementById("command").oninput = (ev)=>{
        const commandName = document.getElementById("commandName")
        const cmd = parseInt(ev.target.value, 16)
        if(isNaN(cmd)){
            commandName.innerText = "Invalid Hex";
            return;
        }
        if(commandNames[cmd]){
            commandName.innerText = `(${commandNames[cmd]})`;
        }
    };

    document.getElementById("sendCommand").onclick = ()=>{
        const {command, data} = getCustomCommandInput();
        executeCommand(command, data);
    }

    document.getElementById("getValue").onclick = async ()=>{
       const {command, data} = getCustomCommandInput();
       document.getElementById("commandResponse").innerText = "Waiting for response...";
       let resp = await awaitResponse(command, data);

       document.getElementById("commandResponse").innerText = toHex(resp);
    }

    document.getElementById("setPos").onclick = async ()=>{
        const pan = parseInt(document.getElementById("pan").value);
        const tilt = parseInt(document.getElementById("tilt").value);
        const roll = parseInt(document.getElementById("roll").value);
        if(!isNaN(pan))setPanPos(pan);
        if(!isNaN(tilt))setTiltPos(tilt);
        if(!isNaN(roll))setRollPos(roll);
    }
}

function getCustomCommandInput(){
    const command = parseHexInput("command");
    const data1 = parseHexInput("data1");
    const data2 = parseHexInput("data2")
    const data3 = parseHexInput("data3");
    if(isNaN(command) || isNaN(data1) || isNaN(data2) || isNaN(data3)){
        alert("Invalid hex input");
        return;
    }
    return {command, data: [data1, data2, data3]}
}

function movementControlUp(control){
    return ()=>{
        movement[control] = 0;
    }
}

function movementControlDown(control, forward){
    return ()=>{
        movement[control] = forward ? 1 : -1;
        if(!isMoving)movementCycle();
    }
}

// -1 = backward, 0 = none, 1 = forward
let movement = {
    pan: 0,
    roll: 0,
    tilt: 0,
}
let isMoving = false;
async function movementCycle(){
    isMoving = movement.pan !== 0 || movement.roll !== 0 || movement.tilt !== 0;
    if(!isMoving)return;
    if(movement.pan !== 0)await executeCommand(CMD.PAN, [0x10, 0xc2, movement.pan > 0 ? 0x01 : 0x11]);
    if(movement.roll !== 0)await executeCommand(CMD.ROLL, [0x10, 0xc2, movement.roll > 0 ? 0x01 : 0x11]);
    if(movement.tilt !== 0)await executeCommand(CMD.TILT, [0x10, 0xc2, movement. tilt > 0 ? 0x01 : 0x11]);
    setTimeout(movementCycle, 200)
}

const recordings = [];
async function recordPos(){

}


async function handleUpdatePos(){
    let [panPos, rollPos, tiltPos] = await Promise.all([
        getPanPos(),
        getRollPos(),
        getTiltPos()
    ]);

    let output = `Pan: ${Math.floor(panPos)}`;
    output += ` Tilt: ${Math.floor(tiltPos)}°`;
    output += `  Roll ${Math.floor(rollPos)}°`;
    document.getElementById("position").innerText = output;
    setTimeout(handleUpdatePos, 1000);
}


document.getElementById("connect").onclick = connect;

async function connect(){
    await start();
    handleUpdatePos();
    setTimeout(async ()=>{
        document.getElementById("version").innerText = await getSoftwareVersion();
        document.getElementById("battery").innerText = (await getBatteryLevel())+"%";
        document.getElementById("camera").innerText = await getCameraBrand();
    }, 1000);
    setInterval(async ()=>{
        document.getElementById("battery").innerText = (await getBatteryLevel())+"%";
    }, 60000);
}







