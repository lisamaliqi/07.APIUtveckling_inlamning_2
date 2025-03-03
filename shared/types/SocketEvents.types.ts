export {}

// Events emitted by the server to the client
export interface ServerToClientEvents {
    virusPosition: (position: number) => void;
}

// Events emitted by the client to the server
export interface ClientToServerEvents {
    gameRound: () => void; //round: number inside gameRound parameter?
}
