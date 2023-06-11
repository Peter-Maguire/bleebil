function parseHexInput(element){
    return parseInt(document.getElementById(element).value, 16);
}

function crc16xmodem (current, previous) {
    let crc = typeof previous !== 'undefined' ? ~~previous : 0x0;
    for (let index = 0; index < current.length; index++) {
        let code = (crc >>> 8) & 0xff;
        code ^= current[index] & 0xff;
        code ^= code >>> 4;
        crc = (crc << 8) & 0xffff;
        crc ^= code;
        code = (code << 5) & 0xffff;
        crc ^= code;
        code = (code << 7) & 0xffff;
        crc ^= code;
    }
    return crc;
}

function toHex(arr){
    return [...arr].map((a)=>(a < 0x10 ? "0" : "")+a.toString(16)).join("")
}
