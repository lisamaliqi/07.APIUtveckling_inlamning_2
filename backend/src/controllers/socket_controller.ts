/**
 * Socket Controller
 */
import Debug from "debug";
import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@shared/types/SocketEvents.types";
import prisma from "../prisma";

// Create a new debug instance
const debug = Debug("backend:socket_controller");


/**
 * FUNCTIONS
 */
const calculateVirusPosition = () => { //Calculate the random position the virus will be put on in the grid
	return Math.floor(Math.random() * 100);
};



// Handle a user connecting
export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
	debug("🙋 A user connected", socket.id);


	//Listen for the gameRound event from the client (frontend)
	socket.on('gameRound', (gameRoomId) => {
		debug("🎮 Game round started");

		//make the position of the virus random with calculateVirusPosition function
		const virusPosition = calculateVirusPosition();

		//emit the virusPosition to the client (frontend) with the gameRoomId that corresponds to the game room the user is in
		io.to(gameRoomId).emit('virusPosition', virusPosition);
	});



	socket.on("userJoinRequest", async (username) => {
		debug("👤 User join request", username);

		//Check if a user with the same id already exists, if they exist, return
        const existingUser = await prisma.user.findUnique({
            where: { id: socket.id },
        });
		if(existingUser){
			debug("User already exists");
			return;
		};


		try {
			//--------- CREATE OR JOIN GAME ROOM ---------//
			//Find all game rooms
			const allGameRooms = await prisma.gameRoom.findMany({
				include: { users: true },
			});
			debug("All game rooms", allGameRooms);

			let gameRoomId: string;

			//Filter game rooms to find one with less than 2 users
            const availableGameRoom = allGameRooms.find(room => room.users.length < 2);
			debug("Available game room", availableGameRoom);

			//If a game room with less than 2 users is found, join it
			if( availableGameRoom){
				//Add the id of available game room to gameRoomId
				gameRoomId = availableGameRoom.id;
				debug("Joining game room", gameRoomId);
				debug("Available game room users", availableGameRoom.users);
			} else { //If no game room with less than 2 users is found, create a new game room
				//Create a new game room
				const newGameRoom = await prisma.gameRoom.create({
					data: {},
				});

				//Add the id of new game room to gameRoomId
				gameRoomId = newGameRoom.id;
				debug("Creating new game room", gameRoomId);
			};

			//--------- CREATE USER ---------//
			//Create a new user and add the gameRoomId to their data (gameRoomId)
			const user = await prisma.user.create({
				data:{
					id: socket.id,
					username: username,
					gameRoomId: gameRoomId,
					score: 0,
					timer: null,
				},
			});
			debug("create a user", user);

			//Join the socket.io room with the gameRoomId
			socket.join(gameRoomId);

			//Emit to the client (frontend) that the user has joined the game room
			io.to(gameRoomId).emit("userJoined", { username, gameRoomId });

		} catch (err) {
			debug("Error joining game room", err);
		};
	});



	socket.on("getUsersInRoom", async (gameRoomId) => {
		//Get the game room with the gameRoomId and its users
		const gameRoom = await prisma.gameRoom.findUnique({
			where: {
				id: gameRoomId
			},
			include: {
				users: true
			},
		});

		debug("Game room", gameRoom);

		if (!gameRoom) {
			debug("Game room not found");
			return;
		};

		//Emit to the client (frontend) the amount of users in the game room
		socket.emit("usersInRoom", gameRoom.users.length);
	});



	// Handle a user disconnecting
	socket.on("disconnect", () => {
		debug("👋 A user disconnected", socket.id);
	});
};


