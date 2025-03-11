export {}

 
export interface User {
    id: string,
	username: string,
	gameRoomId : string | null,
	score: number | null,
	timer: number | null,
} 