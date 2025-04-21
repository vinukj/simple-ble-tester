// BLE Constants to be used
const SERVICE_UUID = "4fafc201-1fb5-459e-8fcc-c5c9c331914b";
const CHARACTERISTIC_UUID = "beb5483e-36e1-4688-b7f5-ea07361b26a8";

// DOM Elements
const bleButton = document.getElementById("ble-button");
const sendReadyButton = document.getElementById("send-ready-button");
const bleStatus = document.getElementById("ble-status");
const bleConsole = document.getElementById("ble-console");

let bluetoothDevice = null;
let characteristic = null;

// Buffer to hold multi-line messages
let messageBuffer = "";

// Function to append data to the console
function appendToConsole(message) {
    bleConsole.value += message + "\n";
    bleConsole.scrollTop = bleConsole.scrollHeight; // Auto-scroll to bottom
}

// Connect to BLE Device
async function connectToBLE() {
    try {
        if (bluetoothDevice && bluetoothDevice.gatt.connected) {
            bleStatus.textContent = `Status: Already connected to ${bluetoothDevice.name}`;
            return;
        }

        // Request BLE devices with a name prefix of "Power"
        bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ namePrefix: "Power" }], // Filter for devices starting with "Power"
            optionalServices: [SERVICE_UUID] // Specify the service we're interested in
        });

        bleStatus.textContent = `Status: Connecting to ${bluetoothDevice.name || "Unknown Device"}...`;
        appendToConsole(`Connecting to ${bluetoothDevice.name || "Unknown Device"}...`);

        // Connect to GATT server
        const server = await bluetoothDevice.gatt.connect();
        appendToConsole("GATT server connected.");

        // Get the primary service
        const service = await server.getPrimaryService(SERVICE_UUID);

        // Get the characteristic
        characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

        // Start notifications
        await characteristic.startNotifications();
        characteristic.addEventListener("characteristicvaluechanged", handleBLEData);
        appendToConsole("Subscribed to BLE notifications.");

        // Update UI
        bleStatus.textContent = `Status: Connected to ${bluetoothDevice.name || "Unknown Device"}`;
        bleButton.textContent = "Disconnect from BLE";
        sendReadyButton.disabled = false; // Enable the "Send Ready" button
        appendToConsole(`Connected to ${bluetoothDevice.name || "Unknown Device"}`);
    } catch (error) {
        appendToConsole(`Connection failed: ${error.message}`);
        bleStatus.textContent = "Status: Connection failed!";
    }
}

// Handle Incoming BLE Data
function handleBLEData(event) {
    try {
        const rawValue = event.target.value;
        let value = new TextDecoder().decode(rawValue); // Decode bytes to string
        value = value.trim();

        appendToConsole(`Received: ${value}`);

        // Append to message buffer
        messageBuffer += value + "\n";

        // // Check for "END" marker to process complete data
        // if (value === "end") {
        //     appendToConsole(`Complete Data:\n${messageBuffer.trim()}`);
        //     processCompleteMessage(messageBuffer.trim());
        //     messageBuffer = ""; // Clear buffer for the next batch
        // }
    } catch (error) {
        appendToConsole(`Error in handleBLEData: ${error.message}`);
    }
}

// Process Complete Message
function processCompleteMessage(data) {
    appendToConsole(`Processing Complete Data:\n${data}`);
    // Here you can handle the full data set as needed
}

// Disconnect BLE Device
function disconnectBLE() {
    if (bluetoothDevice && bluetoothDevice.gatt.connected) {
        bluetoothDevice.gatt.disconnect();
        bleStatus.textContent = "Status: Disconnected";
        bleButton.textContent = "Connect to BLE";
        sendReadyButton.disabled = true; // Disable the "Send Ready" button
        appendToConsole("Disconnected from BLE.");
    }
}

// Send "ready" to ESP32
async function sendReady() {
    if (!characteristic) {
        appendToConsole("Error: Not connected to BLE.");
        return;
    }

    try {
        const encoder = new TextEncoder();
        const data = encoder.encode("ready");
        await characteristic.writeValue(data);
        appendToConsole('Sent "ready" to ESP32.');
    } catch (error) {
        appendToConsole(`Error sending "ready": ${error.message}`);
    }
}

// Button Event Listeners
bleButton.addEventListener("click", () => {
    if (!bluetoothDevice || !bluetoothDevice.gatt.connected) {
        connectToBLE();
    } else {
        disconnectBLE();
    }
});

sendReadyButton.addEventListener("click", sendReady);