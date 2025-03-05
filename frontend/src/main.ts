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
const loginWrapperEl = document.querySelector('#login-wrapper') as HTMLDivElement;
const gamePageEl = document.querySelector('.game-page') as HTMLDivElement;
const waitingForPlayerEl = document.querySelector('.waiting-for-player') as HTMLDivElement;

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
}; //change later to Johan's example of creating grid (not priority)



/**
 * FUNCTIONS
*/

function placeObject(position: number) { //Place virus on grid
	const cellsEl = document.querySelectorAll(".cells");

	//Remove all objects from grid (numbers and previous virus positions)
	cellsEl.forEach(cell => cell.innerHTML = "");

	//Place the virus at the random index, index is taken from "virusPosition" socket event
	cellsEl[position].innerHTML = "<span class='object'>🦠</span>";
	
	//When a user clicks on the virus, emit to server (backend) that new gameRound should start, and virus should be placed at a new position
	const objectEl = document.querySelector('.object') as HTMLSpanElement;
	objectEl.addEventListener('click', () => {
		if (!gameRoomId) {
			console.error('game Room doesnt exist');
			return;
		};
		socket.emit('gameRound', gameRoomId);
	});
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



//Listen for when the server emits the usersInRoom event
socket.on('usersInRoom', (amountOfUsers: number) => {
	console.log('Users in room:', amountOfUsers);
	
	//if there are 2 users in the room, hide waiting for player and show the game page
	if (amountOfUsers === 2) {
		waitingForPlayerEl.classList.add('hide');
		gamePageEl.classList.remove('hide');
		
		console.log('Starting game...');
		
		//start the game by emitting the gameRound event, the users plays the first round of the game
		if (!gameRoomId) {
			console.error('game Room doesnt exist');
			return;
		};
		socket.emit('gameRound', gameRoomId);
	};
});


//Listen for when the server emits the userJoined event
socket.on("userJoined", ({ username, gameRoomId: roomId }) => {
	console.log(`${username} joined the game room: ${roomId}`);
	
	//hide login-wrapper and show waiting for player
	loginWrapperEl.classList.add("hide");
	waitingForPlayerEl.classList.remove("hide");
	
	//set the gameRoomId (beginning of file) to the roomId taken from the server (backend)
	gameRoomId = roomId; 
	
	//emit the getUsersInRoom event to the server (backend) to get the amount of users in the room
	socket.emit('getUsersInRoom', gameRoomId); 
});


//Listen for when the server emits the virus position
socket.on('virusPosition', (position: number) => {
	console.log('Virus spawned at position:', position);
	//place the virus on the grid with the position taken from server (backend)
	placeObject(position);
});



/**
 * EVENT LISTENERS
*/

//Listen for when the user submits their username in the beginning
joinGameEl.addEventListener("submit", (e) => {	
	e.preventDefault();

	//hide login-wrapper and show game-wrapper
	loginWrapperEl.classList.add("hide");
	waitingForPlayerEl.classList.remove("hide");

	//get username
	username = usernameInputEl.value.trim();

	//no username alert the user
	if(!username){
		alert("No username entered");
		return;
	};
	console.log('Joining game with username:', username);

	//emit the userJoinRequest event to the server (backend) with the username
	socket.emit("userJoinRequest", username);
});



