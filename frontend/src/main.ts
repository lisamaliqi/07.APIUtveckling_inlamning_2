import { io, Socket } from "socket.io-client";
import {
	ClientToServerEvents,
	ServerToClientEvents,
} from "@shared/types/SocketEvents.types";
import "./assets/scss/style.scss";

const SOCKET_HOST = import.meta.env.VITE_SOCKET_HOST;
console.log("🙇 Connecting to Socket.IO Server at:", SOCKET_HOST);

// Connect to Socket.IO Server
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_HOST);


/**
 * ELEMENTS
 */
const gridContainerEl = document.querySelector('#grid-container') as HTMLDivElement;


/**
 * DISPLAY VIRUS IN RANDOM POSITION VARIABLE
*/

const gridSize = 10; // 10x10 grid
const totalCells = gridSize * gridSize;


/**
 * CREATE GRID
*/
for (let i = 1; i <= totalCells; i++) {
	gridContainerEl.innerHTML += `<div class="cells">${i}</div>`;
};


/**
 * FUNCTIONS
 */

function placeObject() {
	const cellsEl = document.querySelectorAll(".cells");
	
	// Remove any other object (number and virus) from the grid
	cellsEl.forEach(cell => cell.innerHTML = "");	
	
	// Calculate the random position of the virus
    const randomIndex = Math.floor(Math.random() * totalCells);

	// Place the virus at the random index
	cellsEl[randomIndex].innerHTML = "<span class='object'>🦠</span>";
	
	// When user clicks on the object, restart the function and place the object at a new random position
	const objectEl = document.querySelector('.object') as HTMLDivElement;
	objectEl.addEventListener('click', placeObject);
};







/**
 * Socket Event Listeners
*/

// Listen for when connection is established
socket.on("connect", () => {
	console.log("💥 Connected to server", socket.io.opts.hostname + ":" + socket.io.opts.port);
	console.log("🔗 Socket ID:", socket.id);
});

// Listen for when server got tired of us
socket.on("disconnect", () => {
	console.log("🥺 Got disconnected from server", socket.io.opts.hostname + ":" + socket.io.opts.port);
});

// Listen for when we're reconnected (either due to our or the servers connection)
socket.io.on("reconnect", () => {
	console.log("😊 Reconnected to server:", socket.io.opts.hostname + ":" + socket.io.opts.port);
});






// Initialize the game with placing a virus at a random position
placeObject();