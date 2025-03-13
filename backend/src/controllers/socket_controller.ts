/**
 * Socket Controller
 */
import Debug from "debug";
import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@shared/types/SocketEvents.types";
import prisma from "../prisma";
import { get } from "node:http";
import { Prisma } from "@prisma/client";

// Create a new debug instance
const debug = Debug("backend:socket_controller");


/**
 * FUNCTIONS
 */
const calculateVirusPosition = () => { //Calculate the random position the virus will be put on in the grid
	return Math.floor(Math.random() * 100);
};

const calculateRandomDelay = ()=> { //Calculate the random delay for the virus to appear on the grid, between 1500ms and 10000ms
	// return Math.floor(Math.random() * (10000 - 1500 + 1)) + 1500;
	return 500;
};


const handleDisconnectOrRageQuit = async (socket: Socket) => {//Handle a user disconnecting or rage quitting
	debug("👋 A user disconnected", socket.id);

	//find user, if any
	const user = await prisma.user.findUnique({
		where: {
			id: socket.id,
		},
		include: {
			room: true,
		},
	});
	debug('user that disconnected: ', user);

	//if no user found, return
	if(!user){
		debug('No user to find');
		return;
	};

	socket.emit("afk", "You've been in the sauna for too long so you've become AFK.")

	//Find the gameRoom that the user was in
	const gameRoom = await prisma.gameRoom.findUnique({
		where: {
			id: user.gameRoomId,
		},
		include: {
			users: true,
		},
	});

	if(!gameRoom){
		debug('No gameRoom to find');
		return;
	};


	//emit to the gameRoom that the user has left to the other user in the room
	socket.to(user.gameRoomId).emit('userLeft', user.username);

	//Find the user who is still in the room
	const remainingUser = gameRoom.users.find(u => u.id !== user.id);

	if (remainingUser) {
		// Emit 'playAgain' to the user still in the room with their username
		socket.to(user.gameRoomId).emit('playAgain', remainingUser.username);
	};

	debug(`${user.username} left game room ${user.gameRoomId}`);



	try {
		//try again to see if the room still exists before trying to delete
        const existingRoom = await prisma.gameRoom.findUnique({
            where: { id: user.gameRoomId },
        });

		//if room exists, do this:
		if (existingRoom) {
            await prisma.gameRoom.delete({
                where: {
					id: user.gameRoomId
				},
            });
            debug(`Deleted the gameRoom: ${user.gameRoomId}`);
        };

	} catch (err) {
		if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
            debug(`GameRoom ${user.gameRoomId} was already deleted`);
		} else {
            debug('Error deleting game room:', err);
        }
	};


/*
	//if that gameRoom exist for the user:
	if(gameRoom){



		//delete the gameRoom, it will automatically delete the users aswell bc "onDelete: Cascade" in prisma schema
		await prisma.gameRoom.delete({
			where: {
				id: user.gameRoomId,
			},
		});

		debug('Deleted the gameRoom: ', user.gameRoomId);
	} else {
		//if user exists, but somehow not part of a gameRoom, delete the user
		await prisma.user.delete({
			where: {
				id: socket.id,
			},
		});

	}; */
};



// Handle a user connecting
export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
	debug("🙋 A user connected", socket.id);


	socket.on("virusClickedByUser", async ({ gameRoomId, userId, reactionTime }) => {
		debug(`Virus clicked by user ${userId}, reaction time is: ${reactionTime}`);

		try {
			//Find the user that clicked the virus and update their timer with the reaction time
			const user = await prisma.user.update({
				where: {
					id: userId
				},
				data: {
					timer: reactionTime, //users reaction time is added to the timer in schema
				},
			});

			debug('user that clicked the virus: ', user);

			//this helps for the play again button, honestly dont know how it works but it does
			const { username } = user;
			debug('PLEASE WORK: ', username);
			socket.emit('playAgain', username);

			//Find all the users in the gameRoom so that i later can calculate if both of them have pressed the virus AND check who's the fastest
			const usersInRoom = await prisma.user.findMany({
				where: {
					gameRoomId
				},
				select: {
					id: true,
					username: true,
					score: true,
					timer: true,
				},
			});


			//Check if both users has a value of not NULL in their timer
			const bothUsersReacted = usersInRoom.every(user => user.timer !== 0);

			//If both users have a timer thats not NULL
			if(bothUsersReacted){
				//Reduce all the users to the fastest user, compare which user has the fastest timer and return that user
				const fastestUser = usersInRoom.reduce((fastest, user) => {
					if(!fastest || user.timer! < fastest.timer!) {
						return user;
					};
					return fastest;
				}, usersInRoom[0]); //start with first user in the array

				//Take the fastest user and increment their score with +1
				const roundWinnerUser = await prisma.user.update({
					where: {
						id: fastestUser.id,
					},
					data: {
						score: {
							increment: 1,
						},
					},
				});

				debug(`the round winner is ${roundWinnerUser.username} and their score is ${roundWinnerUser.score}`);


				//Increment the game round with +1
				const updateGameRound = await prisma.gameRoom.update({
					where: {
						id: gameRoomId
					},
					data: {
						gameRound: {
							increment: 1
						},
					},
				});

				debug(`Updated game round for ${gameRoomId}, new game round is ${updateGameRound.gameRound}:`);

				//return if gameRound somehow is null
				if(!updateGameRound.gameRound) {
					debug('gameround apparently is null?');
					return;
				};

				//If 10 rounds has been played -> END GAME
				if (updateGameRound.gameRound > 2) {
					debug(`game over!! No more games for room ${gameRoomId}`);

					//take out the score for the users
					const finalScoreForUsers = await prisma.user.findMany({
						where: {
							gameRoomId
						},
						select: {
							id: true,
							username: true,
							score: true,
						},
					});

					debug('final score for users: ', finalScoreForUsers);

					io.to(gameRoomId).emit('gameEnded', { scores: finalScoreForUsers });

					//Emit 'playAgain' to each user in the gameRoom with their specific username
					finalScoreForUsers.forEach(user => {
						io.to(user.id).emit('playAgain', user.username); // Emit only to the socket corresponding to this user
					});

					try {
						//take the information from the gameRoom and add that information to the scoreBoard database
						const createScoreBoard = await prisma.scoreBoard.create({
							data: {
								gameRoomId,
								users: {
									create: finalScoreForUsers.map(user => ({
										id: user.id,
										username: user.username,
										score: user.score,
									})),
								},
							},
						});

						debug('ScoreBoard created: ', createScoreBoard );

						//delete the gameRoom after adding information to scoreBoard, it will automatically delete the users aswell bc "onDelete: Cascade" in prisma schema
						 await prisma.gameRoom.delete({
							where: {
								id: gameRoomId,
							},
						});

						// debug('Deleted the gameRoom: ', gameRoomId);
						return;

					} catch (err) {
						debug('Error when adding the game to the scoreBoard or when deleting the gameRoom', err)
					};
				};

				// Emit updated scores and start new round
				const updatedUsersInRoom = await prisma.user.findMany({
					where: {
						gameRoomId
					},
					select: {
						id: true,
						username: true,
						score: true,
						timer: true,
					},
				});

				io.to(gameRoomId).emit("updateScores", {
					scores: updatedUsersInRoom.map(user => ({
						id: user.id,
						username: user.username,
						score: user.score,
						timer: (user.timer / 1000).toFixed(2), // Convert milliseconds to seconds and keep two decimals
					}))
				});

				// Start new round
				const virusPosition = calculateVirusPosition();
				const delay = calculateRandomDelay();
				debug('the delay is:', delay);


				setTimeout(() => {
					//emit the virusPosition to the client (frontend) with the gameRoomId that corresponds to the game room the user is in
					io.to(gameRoomId).emit('virusPosition', virusPosition);
				}, delay);

				// Reset timers for the next round to NULL
				await prisma.user.updateMany({
					where: {
						gameRoomId
					},
					data: {
						timer: 0,
					},
				});
			};

		} catch (err) {
			debug("Error updating score", err);
		}
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
					data: {
						gameRound: 1,
					},
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
					timer: 0,
				},
			});
			debug("create a user", user);

			//Join the socket.io room with the gameRoomId
			socket.join(gameRoomId);

			//Emit to the client (frontend) that the user has joined the game room
			io.to(gameRoomId).emit("userJoined", { username, gameRoomId });

			const usersInRoom = await prisma.user.findMany({
				where:	{
					gameRoomId
				},
			});

			debug('users in game room: ', usersInRoom)
			debug('useres in game room length: ', usersInRoom.length)

			if(usersInRoom.length === 2) {
				debug('starting game in gameroom: ', gameRoomId);
				// io.to(gameRoomId).emit('usersInRoom', usersInRoom.length);

				// Start new round
				const virusPosition = calculateVirusPosition();
				const delay = calculateRandomDelay();
				debug('the delay is:', delay);

				setTimeout(() => {
					//emit the virusPosition to the client (frontend) with the gameRoomId that corresponds to the game room the user is in
					io.to(gameRoomId).emit('virusPosition', virusPosition);
				}, delay);
			};

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

		//Create array of the usernames in the gameRoom so that i can display it in the frontEnd
		const usernames = gameRoom.users.map(user => user.username);

		//Emit to the client (frontend) the amount of users in the game room
		socket.emit("usersInRoom", gameRoom.users.length, usernames);
	});



	socket.on('getAllActiveRooms', async () => {
		//Get all the gameRooms that are in the database, inlduding the users in the room
		const allActiveGameRooms = await prisma.gameRoom.findMany({
			include: {
				users: true
			},
		});

		// debug("All active game rooms", allActiveGameRooms);

		//Send all the active game rooms to the client (frontend)
		io.emit('allActiveGameRooms', allActiveGameRooms);
	});


	socket.on('get10LastGamesPlayed', async () => {
		const last10GamesPlayed = await prisma.scoreBoard.findMany({
			include: {
				users: true,
			},
			take: -10,
		});

		// debug('10 last games played: ', last10GamesPlayed);

		io.emit('last10GamesPlayed', last10GamesPlayed); //io.emit so that it sends to ALL users in the landing page
	});


	socket.on("userAFK", () =>{
		handleDisconnectOrRageQuit(socket);
	});




	// Handle a user disconnecting
	socket.on("disconnect", () => {
		handleDisconnectOrRageQuit(socket);
	});
};


