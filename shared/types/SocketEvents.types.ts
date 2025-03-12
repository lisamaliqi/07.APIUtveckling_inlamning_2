export {}

import { User } from "./Models.types";

// Events emitted by the server to the client
export interface ServerToClientEvents {
    allActiveGameRooms: (allActiveGameRooms: {id: string; users: User[] }[]) => void;
    usersInRoom: (amountOfUsers: number) => void;
    userJoined: (data: { username: string; gameRoomId: string }) => void;
    userLeft: (username:string) => void
    virusPosition: (position: number) => void;
    updateScores: (users: { id: string; username: string; score: number }[]) => void; //3
}

// Events emitted by the client to the server
export interface ClientToServerEvents {
    gameRound: (gameRoomId: string) => void; //round: number inside gameRound parameter?
    getAllActiveRooms: () => void;
    getUsersInRoom: (gameRoomId: string) => void;
    userJoinRequest: (username: string, gameRoomId?: string) => void;
    virusClickedByUser: (data: { gameRoomId: string; userId: string }) => void; //4
}
