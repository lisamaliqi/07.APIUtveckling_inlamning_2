export {}

// Events emitted by the server to the client
export interface ServerToClientEvents {
    usersInRoom: (amountOfUsers: number) => void;
    userJoined: (data: { username: string; gameRoomId: string }) => void;
    virusPosition: (position: number) => void;
}

// Events emitted by the client to the server
export interface ClientToServerEvents {
    gameRound: (gameRoomId: string) => void; //round: number inside gameRound parameter?
    getUsersInRoom: (gameRoomId: string) => void;
    userJoinRequest: (username: string, gameRoomId?: string) => void;
}
