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

// Handle a user connecting
export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
	debug("🙋 A user connected", socket.id);


	socket.on('gameRound', () => {
		debug("🎮 Game round started");
		io.emit('virusPosition', calculateVirusPosition());
	});


	socket.on("userJoinRequset", async (username,) => {
		const user = await prisma.user.create({
			data:{
				id: socket.id,
				username: username,
				gameRoomId: null,
				score: null,
				timer: null,
			},
		});
		debug("create a user", user);
	});

	// Handle a user disconnecting
	socket.on("disconnect", () => {
		debug("👋 A user disconnected", socket.id);
	});
};


