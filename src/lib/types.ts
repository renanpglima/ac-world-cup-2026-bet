export interface Prediction {
	matchNo: number;
	group: string;
	date: string;
	time: string;
	team1: string;
	p1: number;
	team2: string;
	p2: number;
}

export interface Participant {
	name: string;
	photoURL?: string | null;
	predictions: Prediction[];
}

export interface Game {
	id: number;
	group: string;
	matchday: number;
	localDate: string;
	homeTeam: string;
	awayTeam: string;
	homeScore: number;
	awayScore: number;
	finished: boolean;
	timeElapsed: string;
}

export interface GamesFile {
	fetchedAt: string;
	games: Game[];
}

export type MatchStatus = 'notstarted' | 'live' | 'finished';
