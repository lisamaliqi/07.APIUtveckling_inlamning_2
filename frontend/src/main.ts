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
const logginWrapperEl = document.querySelector('#login-wrapper') as HTMLDivElement;
const gamePageEl = document.querySelector('.game-page') as HTMLDivElement;

//Form
const joinGameEl = document.querySelector("#login-form") as HTMLFormElement
const usernameInputEl = document.querySelector("#username") as HTMLInputElement



/**
 * VARIABLES
 */
let username: string | null = null;
let gameRoomId: string | null =null



/**
 * CREATE GRID
*/
for (let i = 1; i <= 100; i++) {
	gridContainerEl.innerHTML += `<div class="cells">${i}</div>`;
}; //change later to johans example of creating grid (not prio)



/**
 * FUNCTIONS
*/

function placeObject(position: number) {
	const cellsEl = document.querySelectorAll(".cells");

	//remove all objects from grid (numbers and previous virus positions)
	cellsEl.forEach(cell => cell.innerHTML = "");

	// Place the virus at the random index
	cellsEl[position].innerHTML = "<span class='object'>🦠</span>";
	
	// When a user clicks on the object, restart the function and place the object at a new random position
	const objectEl = document.querySelector('.object') as HTMLSpanElement;
	objectEl.addEventListener('click', () => {
		socket.emit('gameRound');
	});
};



/**
 * Socket Event Listeners
*/

// start first game round when user connects
socket.emit('gameRound');


// Listen for when the server emits the virus position
socket.on('virusPosition', (position: number) => {
	console.log('Virus spawned at position:', position);
	placeObject(position);
});


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



/**
 * EVENT LISTENERS
*/

//Save Username
joinGameEl.addEventListener("submit", (e) => {	
	e.preventDefault();

	//hide login-wrapper and show game-wrapper
	logginWrapperEl.classList.add("hide");
	gamePageEl.classList.remove("hide");

	//get username
	username = usernameInputEl.value.trim();

	//gameRoomId // behövs inte än?

	// no username alert the user
	if(!username){
		alert("No username entered");
		return;
	};

	socket.emit("userJoinRequest", username);
	console.log('Joining game with username:', username);
});

socket.on("userJoined", ({ username, gameRoomId }) => {
	console.log(`${username} joined the game room: ${gameRoomId}`);
});


