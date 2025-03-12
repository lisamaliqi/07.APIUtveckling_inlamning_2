export {}

 
export interface User {
    id: string,
	username: string,
	gameRoomId : string | null,
	score: number | null,
	timer: number | null,
} 

export interface ScoreBoardUser {
	id: string,
	username: string,
	score: number,
	scoreboardId: string | null,
}