export {}

 
export interface User {
    id: string,
	username: string,
	gameRoomId : string,
	score: number | null,
	timer: number | null,
} 


export interface ScoreBoardUser {
	id: string,
	username: string,
	score: number,
	scoreboardId: string | null,
}