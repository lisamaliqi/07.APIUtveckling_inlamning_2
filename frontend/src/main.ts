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
const activeGamesEl = document.querySelector('#activeGames') as HTMLDivElement;
const last10Games = document.querySelector('#last10Games') as HTMLDivElement;
const rageQuitEl = document.querySelector("#ragequit-page") as HTMLDivElement;


//Form
const joinGameEl = document.querySelector("#login-form") as HTMLFormElement;
const usernameInputEl = document.querySelector("#username") as HTMLInputElement;



/**
 * VARIABLES
 */
let username: string | null = null;
let gameRoomId: string | null =null;
let timerStart: number; 
let timerInterval: number;
let virusClickTimer: number;



/**
 * CREATE GRID
*/
for (let i = 1; i <= 100; i++) {
	gridContainerEl.innerHTML += `<div class="cells">${i}</div>`;
}; //change later to Johan's example of creating grid (not priority)



/**
 * FUNCTIONS
*/

const resetTimer = () => {
	clearTimeout(virusClickTimer)
	virusClickTimer = setTimeout(()=> {
		socket.emit('userAFK');
	}, 3000000000000);
};

const displayCounter = () => {
	const counterEl = document.querySelector('.counter') as HTMLDivElement;

	clearTimeout(timerInterval);

	// Update the counter every 100 milliseconds (0.1 second)
    timerInterval = setInterval(() => {
        const elapsedTime = (Date.now() - timerStart) / 1000; // Calculate elapsed time in seconds
        const formattedTime = elapsedTime.toFixed(2); // Format to 2 decimals
        if (counterEl) {
            counterEl.textContent = formattedTime; // Update the counter element with the time
        }
    }, 100); // Run every 100ms to make it smooth
};

const placeObject = (position: number) => { //Place virus on grid
	//reset the timer when the virus is placed to calculate if longer than 30 sek = userAFK = disconnect
	resetTimer();

	displayCounter();



	const cellsEl = document.querySelectorAll(".cells");

	//Remove all objects from grid (numbers and previous virus positions)
	cellsEl.forEach(cell => cell.innerHTML = "");

	//Place the virus at the random index, index is taken from "virusPosition" socket event
	cellsEl[position].innerHTML = "<span class='object'><img src='/src/assets/img/ledsen-mans2.0.png' width='100px' alt='sad måns'></span>";

	//start timer
	timerStart = Date.now();
	
	//When a user clicks on the virus, emit to server (backend) that new gameRound should start, and virus should be placed at a new position
	const objectEl = document.querySelector('.object') as HTMLSpanElement;


	objectEl.addEventListener('click', () => {
		if (!gameRoomId || !socket.id) {
			console.error('game Room doesnt exist or socket id is missing');
			return;
		};

		resetTimer();

		//calculate the reaction time
		const reactionTime = Date.now() - timerStart;

		//hide the virus when clicked immediately
		objectEl.classList.add('hide');

		//Emit event to server (backend) which one of the users clicked the virus
		socket.emit('virusClickedByUser', { gameRoomId, userId: socket.id, reactionTime });
	});
};


function displayFinalScores(scores: { username: string; score: number }[]) { //display the final scores 
	//Sort all the scores from the players from the highest to lowest 
    scores.sort((a, b) => b.score - a.score);
	console.log('scores has been sorted!', scores);
	
	//Create a function that displays the score 
	//Parameter: what type of page it is (won, lost, draw)
	const showScoreAfterGame = (pageResult: string) => {
		//finalScoresEl is the one INSIDE pageResult
		const finalScoresEl = document.querySelector(`${pageResult} .final-scores`) as HTMLDivElement;
		//empty it out so that id doesn't contain anything
		finalScoresEl.innerHTML = '';
		//print out the score in the finalScoreEl
		return finalScoresEl.innerHTML = `
			<ul>
				<li>
					${scores[0].username} - ${scores[0].score} ------ ${scores[1].score} - ${scores[1].username}
				</li>
			</ul>
		`;
	};
	
	
    //Show if the user won, lost or if its a draw 
    if (scores[0].score > scores[1].score && scores[0].username === username) {
		// Player won
        const wonPageEl = document.querySelector('#won-page');
		if(wonPageEl) {
			wonPageEl.classList.remove('hide');
			wonPageEl.innerHTML = `
				 <h1>YOU WON!</h1>
				 <div class="final-scores"></div> 
				 <button class="play-again btn">Play Again</button>
			`;
		};
		showScoreAfterGame('#won-page');
    } else if (scores[0].score > scores[1].score && scores[0].username !== username) {
        // Player lost
        const lostPageEl = document.querySelector('#lost-page');
		if(lostPageEl) {
			lostPageEl.classList.remove('hide');
			lostPageEl.innerHTML = `
				 <h1>YOU LOST!</h1>
				 <div class="final-scores"></div> 
				 <button class="play-again btn">Play Again</button>
			`;
		};
		showScoreAfterGame('#lost-page');
	} else {
        // It's a draw
        const drawPageEl = document.querySelector('#draw-page');
		if(drawPageEl) {
			drawPageEl.classList.remove('hide');
			drawPageEl.innerHTML = `
				 <h1>ITS A DRAW!</h1>
				 <div class="final-scores"></div> 
				 <button class="play-again btn">Play Again</button>
			`;
		};
		showScoreAfterGame('#draw-page');
	};

	//Hide the gamePage so its not visible 
    gamePageEl.classList.add('hide');
};

/**
 * Socket Event Listeners
*/

// Listen for when connection is established
socket.on("connect", () => {
	console.log("💥 Connected to server", socket.io.opts.hostname + ":" + socket.io.opts.port);
	console.log("🔗 Socket ID:", socket.id);
	socket.emit('getAllActiveRooms');
	socket.emit('get10LastGamesPlayed');
});

// Listen for when server got tired of us
socket.on("disconnect", () => {
	console.log("🥺 Got disconnected from server", socket.io.opts.hostname + ":" + socket.io.opts.port);
	socket.emit("userAFK");
});

// Listen for when we're reconnected (either due to our or the servers connection)
socket.io.on("reconnect", () => {
	console.log("😊 Reconnected to server:", socket.io.opts.hostname + ":" + socket.io.opts.port);
});


//Listen for when the server emits the updateScores event
socket.on("updateScores", (data) => {
    console.log("Updated scores:", data.scores);
   /*  scores.forEach((user) => { //For each user, log their username and score
        console.log(`${user.username}: ${user.score} points`);
		console.log(`${user.username}: ${user.timer} time`);
    }); */

	const scoreDisplayEl = document.querySelector('#score') as HTMLDivElement;
	scoreDisplayEl.innerHTML = `${data.scores[0].score} - ${data.scores[1].score}`;

	const timer1 = data.scores[0].timer;
    const timer2 = data.scores[1].timer;

	document.querySelector('#timer1')!.textContent = timer1;
	document.querySelector('#timer2')!.textContent = timer2;


	// const userTimer = users[0].timer
	
	//update realtime the score to users that are in the landing-page
	socket.emit('getAllActiveRooms');
	socket.emit('get10LastGamesPlayed');
	
});


socket.on('allActiveGameRooms', (allActiveGameRooms) => {
	// console.log('All active game rooms:', allActiveGameRooms);
	activeGamesEl.innerHTML = "Active Games";

	//For each room, do this:
	allActiveGameRooms.forEach((room) => {
		//create a new game room list element
		const roomEl = document.createElement('div');

		//Create a list of users in the room that shows username and score
		const usersList = room.users.map((user) => {
            return `<li class="user">
                        <span class="username">${user.username}</span> - 
                        <span class="score">${user.score}</span>
                    </li>`;
        }).join(`<span class="versus"> VS </span> <hr>`);


		//Set the innerHTML of the room element to the list of users that are in the room
		roomEl.innerHTML = `
		<hr>
            <ul class="users">
                ${usersList}
            </ul>
		
        `;

		//Append the game room element to the active games section
        activeGamesEl.appendChild(roomEl);
	});
});


socket.on('last10GamesPlayed', (last10GamesPlayed) => {
	// console.log('Last 10 games: ', last10GamesPlayed);
	last10Games.innerHTML = "Last 10 Games";

	last10GamesPlayed.forEach((game) => {
		const gameEl = document.createElement('div');
		gameEl.classList.add(".usernameAndScore")

		const usersList = game.users.map((user) => {
			return `
				<li class="user">
					<span class="username" >${user.username}</span> -
					<span class="score" >${user.score}</span>
				</li>
			`;
		}).join(`<span class="versus" > VS </span> `);


		gameEl.innerHTML = `
		<hr>
			<ul class="users" >
				${usersList}
			</ul>
		`;

		last10Games.appendChild(gameEl);
	});
});


//Listen for when the server emits the usersInRoom event
socket.on('usersInRoom', (amountOfUsers: number, usernames: string[]) => {
	console.log('Amount of users in room:', amountOfUsers);
	console.log('Usernames in room:', usernames);
	
	//if there are 2 users in the room, hide waiting for player and show the game page
	if (amountOfUsers === 2) {
		waitingForPlayerEl.classList.add('hide');
		gamePageEl.classList.remove('hide');
		
		console.log('Starting game...');

		// Assign usernames to HTML elements
        document.querySelector('#player1')!.textContent = `${usernames[0]}`;
        document.querySelector('#player2')!.textContent = `${usernames[1]}`;

		socket.emit('getAllActiveRooms');
		socket.emit('get10LastGamesPlayed');	
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

	socket.emit('getAllActiveRooms');
	socket.emit('get10LastGamesPlayed');
});


socket.on("userLeft",(username) =>{

	rageQuitEl.innerHTML = `
		<h1>${username} has rage quit, you won</h1>
		<button class="play-again btn">Play Again</button>
	`;
	rageQuitEl.classList.remove("hide");
	gamePageEl.classList.add("hide");

});


//Listen for when the server emits the virus position
socket.on('virusPosition', (position: number) => {
	console.log('Virus spawned at position:', position);
	//place the virus on the grid with the position taken from server (backend)
	placeObject(position);
    
});


socket.on("gameEnded", ({ scores }) => {
    console.log("Game over! Final scores:", scores);

	//call function that calculates what result-page will be visible for the user (depending on if they won, lost or draw)
    displayFinalScores(scores);
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



