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
const calculateVirusPosition = () => {
	return Math.floor(Math.random() * 100);
};

const startGameRound = (io: Server<ClientToServerEvents, ServerToClientEvents>, gameRoomId: string) => {
	debug("🎮 Game round started");
	const virusPosition = calculateVirusPosition();
	io.to(gameRoomId).emit('virusPosition', virusPosition);
};




// Handle a user connecting
export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
	debug("🙋 A user connected", socket.id);


	socket.on('gameRound', (gameRoomId) => {
		debug("🎮 Game round started");
		// io.emit('virusPosition', calculateVirusPosition());
		// io.to(gameRoomId).emit('virusPosition', calculateVirusPosition());
		startGameRound(io, gameRoomId);
	});


	socket.on("userJoinRequest", async (username) => {
		debug("👤 User join request", username);

		// Check if a user with the same id already exists, if they exist, return
        const existingUser = await prisma.user.findUnique({
            where: { id: socket.id },
        });

		if(existingUser){
			debug("User already exists");
			return;
		};


		try {
			// find all game rooms
			const allGameRooms = await prisma.gameRoom.findMany({
				include: { users: true },
			});
			debug("All game rooms", allGameRooms);

			let gameRoomId;

			// Filter game rooms to find one with less than 2 users
            const availableGameRoom = allGameRooms.find(room => room.users.length < 2);
			debug("Available game room", availableGameRoom);

			// If a game room is available, join room
			if( availableGameRoom){
				//add the user to the gameroom
				gameRoomId = availableGameRoom.id;
				debug("Joining game room", gameRoomId);
				debug("Available game room users", availableGameRoom.users);
			} else {
				//create a new gameroom
				const newGameRoom = await prisma.gameRoom.create({
					data: {},
				});

				//add the user to the new gameroom
				gameRoomId = newGameRoom.id;
				debug("Creating new game room", gameRoomId);
			};

		// Create a new user
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

		// Join the socket.io room
		socket.join(gameRoomId);

		io.to(gameRoomId).emit("userJoined", { username, gameRoomId });

		// Start the game round in the specific room
		startGameRound(io, gameRoomId);

		} catch (err) {
			debug("Error joining game room", err);
		};
	});

	// Handle a user disconnecting
	socket.on("disconnect", () => {
		debug("👋 A user disconnected", socket.id);
	});
};


