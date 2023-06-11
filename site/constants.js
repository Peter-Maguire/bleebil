const MAGIC = [0x24, 0x3c, 0x08, 0x00, 0x18, 0x12];
const CMD = {
    TILT: 0x01,
    PAN: 0x02,
    ROLL: 0x03,
    GET_SOFTWARE_VERSION: 0x04,
    GET_BATTERY_SET_TILT_POS: 0x06,
    SET_ROLL_POS: 0x07,
    SET_PAN_POS: 0x08,
    PRESS_BUTTON: 0x20,
    SET_CENTER_POINT: 0x21,
    GET_TILT_POS: 0x22,
    GET_ROLL_POS: 0x23,
    GET_PAN_POS: 0x24,
    SET_MODE: 0x27,
    GET_CAMERA_BRAND: 0x68,
    GET_SERIAL_1: 0x7c,
    GET_SERIAL_2: 0x7f,
    GET_SERIAL_3: 0x7d,
    GET_SERIAL_4: 0x7e
};

const CAMERAS = {
    0x00: "None",
    0x01: "Canon",
    0x02: "Sony",
    0x03: "Panasonic",
    0x04: "Nikon",
    0x05: "CCS",
    0x06: "Fuji",
    0x07: "Olympus",
    0x0a: "rcam",
    0x0b: "bmpcc",
    0x0c: "Sigma",
    0xe0: "Sony USB"
};


const MODE = ["PF", "L", "F", "POV", "GO"];
const commandNames = {
    0x01: "Tilt",
    0x02: "Pan",
    0x03: "Roll",
    0x04: "Get Software Version",
    0x06: "Get Battery Percentage/Tilt Pos",
    0x7c: "Get Serial 1",
    0x7f: "Get Serial 2",
    0x7d: "Get Serial 3",
    0x7e: "Get Serial 4",
    0x20: "Press Button",
    0x22: "Read Tilt Position",
    0x23: "Read Roll Position",
    0x24: "Read Pan Position",
    0x27: "Set Mode",
    0x61: "Set Pan Deg",
    0x62: "Set Tilt Deg",
    0x63: "Set Roll Deg",
    0x68: "Get Camera Brand",
    0x69: "Set Strength",
    0x70: "Sync Motion Tilt",
    0x71: "Sync Motion Roll",
    0x72: "Sync Motion Pan",
}

const NO_ARGUMENT = [0x00, 0x00, 0x00];