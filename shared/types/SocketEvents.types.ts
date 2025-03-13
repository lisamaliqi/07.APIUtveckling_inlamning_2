export {}

import { ScoreBoardUser, User } from "./Models.types";

// Events emitted by the server to the client
export interface ServerToClientEvents {
    allActiveGameRooms: (allActiveGameRooms: {id: string; users: User[] }[]) => void;
    last10GamesPlayed: (last10GamesPlayed: {id: string; gameRoomId: string; users: ScoreBoardUser[] }[]) => void;
    usersInRoom: (amountOfUsers: number, usernames: string[]) => void;
    userJoined: (data: { username: string; gameRoomId: string }) => void;
    userLeft: (username: string) => void;
    virusPosition: (position: number) => void;
    updateScores: (data: { scores: { id: string; username: string; score: number; timer: string }[]}) => void; //3
    gameRound: (gameRoomId: string) => void; //round: number inside gameRound parameter?
    gameEnded: (data: { scores: { id: string; username: string; score: number }[] }) => void;
    afk: (username: string) => void;
}

// Events emitted by the client to the server
export interface ClientToServerEvents {
    gameRound: (gameRoomId: string) => void; //round: number inside gameRound parameter?
    getAllActiveRooms: () => void;
    get10LastGamesPlayed: () => void;
    getUsersInRoom: (gameRoomId: string) => void;
    userJoinRequest: (username: string, gameRoomId?: string) => void;
    userAFK: () => void;
    virusClickedByUser: (data: { gameRoomId: string; userId: string; reactionTime: number }) => void; //4
}
